package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.WeeklyFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/weekly-fortune")
@RequiredArgsConstructor
public class WeeklyFortuneController {

    private final WeeklyFortuneService weeklyFortuneService;
    private final ClaudeApiService claudeApiService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getWeeklyFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(
            weeklyFortuneService.getWeeklyFortune(birthDate, birthTime, gender)
        );
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamWeeklyFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender) {

        Object[] ctx = weeklyFortuneService.buildStreamContext(birthDate, birthTime, gender);
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

        return claudeApiService.generateStream(systemPrompt, userPrompt, 1600, (fullText) ->
            weeklyFortuneService.saveStreamResult(birthDate, birthTime, gender, fullText)
        );
    }
}
