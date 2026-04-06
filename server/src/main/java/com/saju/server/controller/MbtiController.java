package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.MbtiFortuneService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mbti")
@RequiredArgsConstructor
public class MbtiController {

    private final MbtiFortuneService mbtiFortuneService;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;

    @GetMapping("/types")
    public ResponseEntity<List<Map<String, Object>>> getAllTypes() {
        return ResponseEntity.ok(mbtiFortuneService.getAllTypes());
    }

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> getFortune(
            @RequestParam String type,
            @RequestParam(required = false) String zodiac) {
        return ResponseEntity.ok(zodiac != null
            ? mbtiFortuneService.getTodayFortune(type, zodiac)
            : mbtiFortuneService.getTodayFortune(type));
    }

    @GetMapping("/compatibility")
    public ResponseEntity<Map<String, Object>> getCompatibility(
            @RequestParam(required = false) String type1,
            @RequestParam(required = false) String type2) {
        if (type1 == null || type1.isBlank() || type2 == null || type2.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "type1과 type2를 모두 선택해주세요."));
        }
        return ResponseEntity.ok(mbtiFortuneService.getCompatibility(type1, type2));
    }

    /**
     * MBTI 운세 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFortune(
            @RequestParam String type,
            @RequestParam(required = false) String zodiac,
            @RequestParam(required = false) Long userId) {
        String mbtiType = type.toUpperCase();
        String zodiacAnimal = (zodiac != null && !zodiac.isBlank()) ? zodiac : "용";
        SseEmitter emitter = new SseEmitter(180000L);

        // 캐시 확인
        Map<String, Object> cached = mbtiFortuneService.getCachedFortune(mbtiType, zodiacAnimal);
        if (cached != null) {
            try {
                String json = objectMapper.writeValueAsString(cached);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 하트 차감
        if (userId != null) {
            try {
                heartPointService.deductPoints(userId, "MBTI", "MBTI 운세");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        // 캐시 없으면 AI 스트리밍
        return mbtiFortuneService.streamFortune(mbtiType, zodiacAnimal);
    }
}
