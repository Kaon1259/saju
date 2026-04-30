package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.BiorhythmService;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.LunarCalendarService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/biorhythm")
@RequiredArgsConstructor
public class BiorhythmController {

    private final BiorhythmService biorhythmService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final LunarCalendarService lunarCalendarService;
    private final ObjectMapper objectMapper;

    /** 음력 → 양력 변환 (바이오리듬 계산은 양력 기준) */
    private String resolveBirthDate(String birthDate, String calendarType) {
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            try {
                LocalDate solar = lunarCalendarService.lunarToSolar(LocalDate.parse(birthDate));
                return solar.toString();
            } catch (Exception ignored) {}
        }
        return birthDate;
    }

    /**
     * 바이오리듬 조회
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getBiorhythm(
            @RequestParam String birthDate,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(biorhythmService.getBiorhythm(resolveBirthDate(birthDate, calendarType)));
    }

    /**
     * 바이오리듬 AI 스트리밍 분석
     * GET /api/biorhythm/stream?birthDate=1990-05-15&calendarType=SOLAR&userId=123
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamBiorhythm(
            @RequestParam("birthDate") String birthDate,
            @RequestParam(required = false) String calendarType,
            HttpServletRequest req) {
        Long userId = AuthUtil.optionalUserId(req);

        final String resolvedBd = resolveBirthDate(birthDate, calendarType);
        Object[] ctx = biorhythmService.buildStreamContext(resolvedBd);
        String systemPrompt = (String) ctx[0];
        String userPrompt = (String) ctx[1];
        @SuppressWarnings("unchecked")
        Map<String, Object> cached = (Map<String, Object>) ctx[3];

        // 캐시 히트 → 즉시 반환
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

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "BIORHYTHM");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        final Long uid = userId;
        return claudeApiService.generateStream(systemPrompt, userPrompt, 1500,
                ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            biorhythmService.saveStreamResult(resolvedBd, fullText);
            if (uid != null) heartPointService.deductPoints(uid, "BIORHYTHM", "바이오리듬");
        });
    }
}
