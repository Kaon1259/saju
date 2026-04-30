package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.DailyTarotService;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/daily-tarot")
@RequiredArgsConstructor
public class DailyTarotController {

    private final DailyTarotService dailyTarotService;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;

    /** 캐시 단순 조회 — 오늘 이미 분석한 적 있으면 반환, 없으면 빈 객체 */
    @GetMapping("/basic")
    public ResponseEntity<Map<String, Object>> basic(
            @RequestParam int cardId,
            HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        Map<String, Object> cached = dailyTarotService.getCached(userId, cardId);
        if (cached == null) return ResponseEntity.ok(Map.of());
        return ResponseEntity.ok(cached);
    }

    /** SSE 스트리밍 — 캐시 히트면 cached 이벤트, 미스면 AI 호출 (하트 차감) */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam int cardId,
            @RequestParam String cardNameKr,
            @RequestParam(required = false, defaultValue = "") String cardNameEn,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false, defaultValue = "SOLAR") String calendarType,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String dayMaster,
            HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);

        // 캐시 확인
        Map<String, Object> cached = dailyTarotService.getCached(userId, cardId);
        if (cached != null) {
            SseEmitter emitter = new SseEmitter(5000L);
            try {
                String json = objectMapper.writeValueAsString(cached);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 일간 결정 — 클라이언트가 보내준 dayMaster 우선, 없으면 birthDate 로 계산
        String resolvedDayMaster = (dayMaster != null && !dayMaster.isBlank())
                ? dayMaster
                : dailyTarotService.resolveDayMaster(birthDate, calendarType, birthTime);

        // 하트 잔액 확인
        try {
            heartPointService.checkPoints(userId, "DAILY_TAROT");
        } catch (InsufficientHeartsException e) {
            return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
        }

        return dailyTarotService.streamAnalysis(userId, cardId, cardNameKr, cardNameEn, resolvedDayMaster,
                () -> heartPointService.deductPoints(userId, "DAILY_TAROT", "오늘의 타로"));
    }
}
