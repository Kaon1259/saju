package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.LunarCalendarService;
import com.saju.server.service.MonthlyFortuneService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/monthly-fortune")
@RequiredArgsConstructor
@Slf4j
public class MonthlyFortuneController {

    private final MonthlyFortuneService monthlyFortuneService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final LunarCalendarService lunarCalendarService;
    private final ObjectMapper objectMapper;

    private String resolveBirthDate(String birthDate, String calendarType) {
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            try {
                LocalDate solar = lunarCalendarService.lunarToSolar(LocalDate.parse(birthDate));
                return solar.toString();
            } catch (Exception ignored) {}
        }
        return birthDate;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMonthlyFortune(
            @RequestParam String birthDate,
            @RequestParam int month,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        String bd = resolveBirthDate(birthDate, calendarType);
        return ResponseEntity.ok(
            monthlyFortuneService.getMonthlyFortune(bd, month, birthTime, gender)
        );
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMonthlyFortune(
            @RequestParam String birthDate,
            @RequestParam int month,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetName,
            @RequestParam(required = false, defaultValue = "false") boolean extra,
            HttpServletRequest req) {
        Long userId = AuthUtil.optionalUserId(req);

        // 음력 → 양력 변환 (사주 계산은 양력 기준)
        final String resolvedBd = resolveBirthDate(birthDate, calendarType);

        Object[] ctx = monthlyFortuneService.buildStreamContext(resolvedBd, month, birthTime, gender, targetType, targetName);
        String systemPrompt = (String) ctx[0];
        String userPrompt = (String) ctx[1];
        @SuppressWarnings("unchecked")
        Map<String, Object> cached = (Map<String, Object>) ctx[3];

        if (cached != null) {
            SseEmitter emitter = new SseEmitter(5000L);
            try {
                emitter.send(SseEmitter.event().name("cached").data(objectMapper.writeValueAsString(cached)));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        String heartCategory = extra ? "MONTHLY_FORTUNE_EXTRA" : "MONTHLY_FORTUNE";

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, heartCategory);
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        final int finalMonth = month;
        final Long uid = userId;
        final String finalCategory = heartCategory;
        // 22개 필드 JSON 스키마(weeklyAdvice 배열 4주차 + overall 5-6문장 + 5개 카테고리 3-4문장 + advice/caution 등).
        // 1600 토큰은 advice(끝 필드)가 잘리고 점수까지 못 살리는 사례가 발생. YearFortune(3500)·DeepAnalysis 수준은 아니지만
        // MyFortune(2500)보다는 더 필요해 3000으로 상향.
        return claudeApiService.generateStream(systemPrompt, userPrompt, 3000,
                ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            try {
                boolean ok = monthlyFortuneService.saveStreamResult(resolvedBd, finalMonth, birthTime, gender, fullText);
                if (ok && uid != null) {
                    heartPointService.deductPoints(uid, finalCategory, "월간운세");
                } else if (!ok) {
                    log.warn("[NoDeduct] 파싱 실패로 차감 스킵: cat={}, uid={}", finalCategory, uid);
                }
            } catch (Exception e) {
                log.error("[onComplete] 월간운세 처리 실패: {}", e.getMessage(), e);
            }
        });
    }
}
