package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.YearFortuneService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/year-fortune")
@RequiredArgsConstructor
public class YearFortuneController {

    private final YearFortuneService yearFortuneService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getYearFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(
            yearFortuneService.getYearFortune(birthDate, birthTime, gender, calendarType)
        );
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamYearFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetName,
            HttpServletRequest req) {
        Long userId = AuthUtil.optionalUserId(req);

        Object[] ctx = yearFortuneService.buildStreamContext(birthDate, birthTime, gender, calendarType, targetType, targetName);
        String systemPrompt = (String) ctx[0];
        String userPrompt = (String) ctx[1];
        @SuppressWarnings("unchecked")
        Map<String, Object> cached = (Map<String, Object>) ctx[3];

        // 캐시 히트 → cached 이벤트로 즉시 반환
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
                heartPointService.checkPoints(userId, "YEAR_FORTUNE");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        final Long uid = userId;
        return claudeApiService.generateStream(systemPrompt, userPrompt, 3500,
                ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            yearFortuneService.saveStreamResult(birthDate, birthTime, gender, calendarType, fullText);
            if (uid != null) heartPointService.deductPoints(uid, "YEAR_FORTUNE", "신년운세");
        });
    }
}
