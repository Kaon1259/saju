package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.FortuneHistoryService;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.LunarCalendarService;
import com.saju.server.service.ZodiacFortuneService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping("/api/zodiac")
@RequiredArgsConstructor
public class ZodiacController {

    private final ZodiacFortuneService service;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;
    private final FortuneHistoryService fortuneHistoryService;
    private final LunarCalendarService lunarCalendarService;

    private void saveZodiacHistory(Long userId, String animal, Map<String, Object> result) {
        if (userId == null || result == null) return;
        try {
            int sc = result.get("score") instanceof Number ? ((Number) result.get("score")).intValue() : 0;
            String summary = (sc > 0 ? sc + "점" : "");
            String oneLiner = result.get("summary") instanceof String ? (String) result.get("summary") : null;
            if (oneLiner != null && !oneLiner.isBlank()) summary = (sc > 0 ? sc + "점 · " : "") + oneLiner;
            String title = animal + "띠 운세";
            Map<String, Object> payload = new LinkedHashMap<>(result);
            payload.put("animal", animal);
            fortuneHistoryService.saveIfAbsent(userId, "zodiac", title, summary, payload);
        } catch (Exception ignored) {}
    }

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> getFortune(@RequestParam String animal) {
        return ResponseEntity.ok(service.getTodayFortune(animal));
    }

    @GetMapping("/fortune/by-date")
    public ResponseEntity<Map<String, Object>> getFortuneByDate(
            @RequestParam String birthDate,
            @RequestParam(required = false) String calendarType) {
        LocalDate date = LocalDate.parse(birthDate);
        // 띠는 양력 연도 기준 — 음력 입력 시 양력 변환 (정확 띠 산출)
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            try { date = lunarCalendarService.lunarToSolar(date); } catch (Exception ignored) {}
        }
        String animal = service.getAnimalFromBirthDate(date);
        return ResponseEntity.ok(service.getTodayFortune(animal));
    }

    @GetMapping("/animals")
    public ResponseEntity<List<Map<String, Object>>> getAllAnimals() {
        return ResponseEntity.ok(service.getAllAnimals());
    }

    @GetMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFortune(@RequestParam String animal,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false, defaultValue = "me") String targetType,
            @RequestParam(required = false) String targetName,
            HttpServletRequest req) {
        Long userId = AuthUtil.optionalUserId(req);
        SseEmitter emitter = new SseEmitter(180000L);

        Map<String, Object> cached = service.getCachedFortune(animal);
        if (cached != null) {
            try {
                String json = objectMapper.writeValueAsString(cached);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
                saveZodiacHistory(userId, animal, cached);
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "ZODIAC");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        final Long uid = userId;
        return service.streamFortune(animal, birthDate, gender, targetType, targetName, () -> {
            if (uid != null) heartPointService.deductPoints(uid, "ZODIAC", "띠 운세");
            Map<String, Object> result = service.getCachedFortune(animal);
            saveZodiacHistory(uid, animal, result);
        });
    }
}
