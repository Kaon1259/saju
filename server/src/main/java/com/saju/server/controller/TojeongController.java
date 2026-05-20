package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.dto.UserResponse;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.saju.TojeongResult;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.*;
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
@RequestMapping("/api/tojeong")
@RequiredArgsConstructor
@Slf4j
public class TojeongController {

    private final TojeongService tojeongService;
    private final UserService userService;
    private final LunarCalendarService lunarCalendarService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;

    /**
     * 토정비결 분석 (생년월일 직접 입력)
     * GET /api/tojeong/analyze?birthDate=1990-05-15&calendarType=SOLAR
     */
    @GetMapping("/analyze")
    public ResponseEntity<TojeongResult> analyzeTojeong(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType) {

        LocalDate birthDate = LocalDate.parse(birthDateStr);

        // 음력이면 양력으로 변환
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        TojeongResult result = tojeongService.analyze(birthDate);
        return ResponseEntity.ok(result);
    }

    /**
     * 등록된 사용자의 토정비결 분석
     * GET /api/tojeong/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<TojeongResult> getUserTojeong(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        LocalDate birthDate = user.getBirthDate();

        // 사용자가 음력으로 등록했으면 양력 변환
        if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        TojeongResult result = tojeongService.analyze(birthDate);
        return ResponseEntity.ok(result);
    }

    /**
     * 토정비결 스트리밍
     * GET /api/tojeong/stream?birthDate=1990-05-15&calendarType=SOLAR
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTojeong(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetName,
            HttpServletRequest req) {
        Long userId = AuthUtil.optionalUserId(req);

        LocalDate birthDate = LocalDate.parse(birthDateStr);
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }
        final LocalDate finalBirthDate = birthDate;

        Object[] ctx = tojeongService.buildStreamContext(finalBirthDate, gender, targetType, targetName);
        String systemPrompt = (String) ctx[0];
        String userPrompt = (String) ctx[1];
        @SuppressWarnings("unchecked")
        Map<String, Object> cached = (Map<String, Object>) ctx[3];
        TojeongResult base = ctx.length >= 5 ? (TojeongResult) ctx[4] : null;

        if (cached != null) {
            SseEmitter emitter = new SseEmitter(10000L);
            try {
                emitter.send(SseEmitter.event().name("cached").data(objectMapper.writeValueAsString(cached)));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "TOJEONG");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        final Long uid = userId;
        final String finalGender = gender;
        final String finalTargetType = targetType;
        final String finalTargetName = targetName;
        SseEmitter emitter = claudeApiService.generateStream(systemPrompt, userPrompt, 2500,
                ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            try {
                // saveStreamResult는 성공 시 Map, 실패 시 null 반환
                Map<String, Object> saved = tojeongService.saveStreamResult(finalBirthDate, finalGender, finalTargetType, finalTargetName, fullText);
                if (saved != null && uid != null) {
                    heartPointService.deductPoints(uid, "TOJEONG", "토정비결");
                } else if (saved == null) {
                    log.warn("[NoDeduct] 파싱 실패로 차감 스킵: cat=TOJEONG, uid={}", uid);
                }
            } catch (Exception e) {
                log.error("[onComplete] 토정비결 처리 실패: {}", e.getMessage(), e);
            }
        });

        // AI 스트림 시작 전에 base 이벤트 전송 (sangsu/jungsu/hasu/totalGwae/gwaeName/monthlyFortunes 기본값)
        if (base != null) {
            try {
                emitter.send(SseEmitter.event().name("base").data(objectMapper.writeValueAsString(base)));
            } catch (Exception e) {
                // ignore — base 누락돼도 AI 스트림은 진행
            }
        }
        return emitter;
    }
}
