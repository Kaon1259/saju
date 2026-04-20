package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.ConstellationFortuneService;
import com.saju.server.service.FortuneHistoryService;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/constellation")
@RequiredArgsConstructor
public class ConstellationController {

    private final ConstellationFortuneService service;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;
    private final FortuneHistoryService fortuneHistoryService;

    /** 별자리 운세 히스토리 저장 헬퍼 */
    private void saveConstellationHistory(Long userId, String sign, Map<String, Object> result) {
        if (userId == null || result == null) return;
        try {
            int sc = result.get("score") instanceof Number ? ((Number) result.get("score")).intValue() : 0;
            String summary = (sc > 0 ? sc + "점" : "");
            String oneLiner = result.get("summary") instanceof String ? (String) result.get("summary") : null;
            if (oneLiner != null && !oneLiner.isBlank()) summary = (sc > 0 ? sc + "점 · " : "") + oneLiner;
            String title = sign + " 운세";
            Map<String, Object> payload = new LinkedHashMap<>(result);
            payload.put("sign", sign);
            fortuneHistoryService.saveIfAbsent(userId, "constellation", title, summary, payload);
        } catch (Exception ignored) {}
    }

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> getFortune(@RequestParam String sign) {
        return ResponseEntity.ok(service.getTodayFortune(sign));
    }

    @GetMapping("/fortune/by-date")
    public ResponseEntity<Map<String, Object>> getFortuneByDate(@RequestParam String birthDate) {
        LocalDate date = LocalDate.parse(birthDate);
        String sign = service.getSignFromDate(date);
        return ResponseEntity.ok(service.getTodayFortune(sign));
    }

    @GetMapping("/signs")
    public ResponseEntity<List<Map<String, Object>>> getAllSigns() {
        return ResponseEntity.ok(service.getAllSigns());
    }

    /**
     * 별자리 운세 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFortune(@RequestParam String sign,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false, defaultValue = "me") String targetType,
            @RequestParam(required = false) String targetName) {
        SseEmitter emitter = new SseEmitter(180000L);

        // 캐시 확인
        Map<String, Object> cached = service.getCachedFortune(sign);
        if (cached != null) {
            try {
                String json = objectMapper.writeValueAsString(cached);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
                // 캐시 히트도 히스토리 저장 (saveIfAbsent로 dedupe)
                saveConstellationHistory(userId, sign, cached);
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "CONSTELLATION");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        // 캐시 없으면 AI 스트리밍
        final Long uid = userId;
        return service.streamFortune(sign, birthDate, gender, targetType, targetName, () -> {
            if (uid != null) heartPointService.deductPoints(uid, "CONSTELLATION", "별자리 운세");
            // AI 완료 후 캐시 저장된 결과 다시 조회해서 히스토리 저장
            Map<String, Object> result = service.getCachedFortune(sign);
            saveConstellationHistory(uid, sign, result);
        });
    }
}
