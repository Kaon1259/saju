package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.service.ConstellationFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/constellation")
@RequiredArgsConstructor
public class ConstellationController {

    private final ConstellationFortuneService service;
    private final ObjectMapper objectMapper;

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
    public SseEmitter streamFortune(@RequestParam String sign) {
        SseEmitter emitter = new SseEmitter(180000L);

        // 캐시 확인
        Map<String, Object> cached = service.getCachedFortune(sign);
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

        // 캐시 없으면 AI 스트리밍
        return service.streamFortune(sign);
    }
}
