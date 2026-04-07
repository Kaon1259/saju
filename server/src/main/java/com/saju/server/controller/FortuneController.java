package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.dto.FortuneResponse;
import com.saju.server.dto.UserResponse;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.*;
import com.saju.server.util.SseEmitterUtils;
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
    private final HeartPointService heartPointService;
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
    public SseEmitter streamTodayFortune(
            @RequestParam("zodiac") String zodiacAnimal,
            @RequestParam(required = false) Long userId) {
        SseEmitter emitter = new SseEmitter(180000L);

        // 캐시 체크 (읽기 전용, INSERT 없음)
        FortuneResponse existing = fortuneService.getCachedFortune(zodiacAnimal);

        // 캐시 히트 → cached 이벤트로 즉시 반환 (무료)
        if (existing != null && existing.getOverall() != null && !existing.getOverall().isBlank()) {
            try {
                String json = objectMapper.writeValueAsString(existing);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "TODAY_FORTUNE");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        // 캐시 없으면 AI 스트리밍
        String systemPrompt = promptBuilder.fortuneStreamSystemPrompt();
        String userPrompt = promptBuilder.fortuneStreamUserPrompt(zodiacAnimal, LocalDate.now());
        final Long uid = userId;

        return claudeApiService.generateStream(systemPrompt, userPrompt, 1500, (fullText) -> {
            fortuneService.parseAndSaveStreamResult(zodiacAnimal, fullText);
            if (uid != null) heartPointService.deductPoints(uid, "TODAY_FORTUNE", "오늘의 운세");
        });
    }

    /**
     * 유저 기반 운세 스트리밍 엔드포인트
     */
    @GetMapping(value = "/user/{userId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamUserFortune(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        return streamTodayFortune(user.getZodiacAnimal(), userId);
    }
}
