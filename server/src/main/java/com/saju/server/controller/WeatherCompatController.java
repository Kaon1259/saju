package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.WeatherCompatService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/weather-compat")
@RequiredArgsConstructor
public class WeatherCompatController {

    private final WeatherCompatService weatherCompatService;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;

    /** 캐시 단순 조회 (캐시 미스 시 null) */
    @GetMapping("/basic")
    public ResponseEntity<Map<String, Object>> basic(
            @RequestParam Long userId,
            @RequestParam String condition) {
        Map<String, Object> cached = weatherCompatService.getCached(userId, condition);
        if (cached == null) return ResponseEntity.ok(Map.of());
        return ResponseEntity.ok(cached);
    }

    /** SSE 스트리밍 — 캐시 히트면 cached 이벤트, 미스면 AI 스트리밍 */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam Long userId,
            @RequestParam(required = false) String dayMaster,
            @RequestParam String condition,
            @RequestParam(required = false, defaultValue = "noon") String timeBand,
            @RequestParam(required = false) Double temp) {

        // 캐시 확인
        Map<String, Object> cached = weatherCompatService.getCached(userId, condition);
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

        // 하트 잔액 확인
        try {
            heartPointService.checkPoints(userId, "WEATHER_COMPAT");
        } catch (InsufficientHeartsException e) {
            return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
        }

        return weatherCompatService.streamFortune(userId, dayMaster, condition, timeBand, temp,
                () -> heartPointService.deductPoints(userId, "WEATHER_COMPAT", "날씨 궁합"));
    }
}
