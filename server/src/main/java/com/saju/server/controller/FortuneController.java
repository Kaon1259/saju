package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.dto.FortuneResponse;
import com.saju.server.dto.UserResponse;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.FortuneService;
import com.saju.server.service.FortunePromptBuilder;
import com.saju.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/fortune")
@RequiredArgsConstructor
public class FortuneController {

    private final FortuneService fortuneService;
    private final UserService userService;
    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;

    @GetMapping("/today")
    public ResponseEntity<FortuneResponse> getTodayFortune(@RequestParam("zodiac") String zodiacAnimal) {
        FortuneResponse response = fortuneService.getTodayFortune(zodiacAnimal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/today/all")
    public ResponseEntity<List<FortuneResponse>> getAllTodayFortunes() {
        List<FortuneResponse> responses = fortuneService.getAllTodayFortunes();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<FortuneResponse> getUserFortune(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        FortuneResponse response = fortuneService.getTodayFortune(user.getZodiacAnimal());
        return ResponseEntity.ok(response);
    }

    /**
     * 오늘의 운세 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/today/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTodayFortune(@RequestParam("zodiac") String zodiacAnimal) {
        SseEmitter emitter = new SseEmitter(180000L);

        // 기존 데이터(캐시) 체크
        FortuneResponse existing = fortuneService.getTodayFortune(zodiacAnimal);

        // overall이 있으면 이미 생성된 운세 → cached 이벤트로 즉시 반환
        if (existing.getOverall() != null && !existing.getOverall().isBlank()) {
            try {
                String json = objectMapper.writeValueAsString(existing);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 캐시 없으면 AI 스트리밍
        String systemPrompt = promptBuilder.fortuneStreamSystemPrompt();
        String userPrompt = promptBuilder.fortuneStreamUserPrompt(zodiacAnimal, LocalDate.now());

        return claudeApiService.generateStream(systemPrompt, userPrompt, 1500, (fullText) -> {
            // 스트리밍 완료 → 서버에서 직접 파싱 후 캐시 저장
            fortuneService.parseAndSaveStreamResult(zodiacAnimal, fullText);
        });
    }

    /**
     * 유저 기반 운세 스트리밍 엔드포인트
     */
    @GetMapping(value = "/user/{userId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUserFortune(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        return streamTodayFortune(user.getZodiacAnimal());
    }
}
