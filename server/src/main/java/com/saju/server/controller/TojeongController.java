package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.dto.UserResponse;
import com.saju.server.saju.TojeongResult;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.LunarCalendarService;
import com.saju.server.service.TojeongService;
import com.saju.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/tojeong")
@RequiredArgsConstructor
public class TojeongController {

    private final TojeongService tojeongService;
    private final UserService userService;
    private final LunarCalendarService lunarCalendarService;
    private final ClaudeApiService claudeApiService;
    private final ObjectMapper objectMapper;

    /**
     * 토정비결 분석 (생년월일 직접 입력)
     * GET /api/tojeong/analyze?birthDate=1990-05-15&calendarType=SOLAR
     */
    @GetMapping("/analyze")
    public ResponseEntity<TojeongResult> analyzeTojeong(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType) {

        LocalDate birthDate = LocalDate.parse(birthDateStr);

        // 음력이면 양력으로 변환
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        TojeongResult result = tojeongService.analyze(birthDate);
        return ResponseEntity.ok(result);
    }

    /**
     * 등록된 사용자의 토정비결 분석
     * GET /api/tojeong/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<TojeongResult> getUserTojeong(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        LocalDate birthDate = user.getBirthDate();

        // 사용자가 음력으로 등록했으면 양력 변환
        if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        TojeongResult result = tojeongService.analyze(birthDate);
        return ResponseEntity.ok(result);
    }

    /**
     * 토정비결 스트리밍
     * GET /api/tojeong/stream?birthDate=1990-05-15&calendarType=SOLAR
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTojeong(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType) {

        LocalDate birthDate = LocalDate.parse(birthDateStr);
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }
        final LocalDate finalBirthDate = birthDate;

        Object[] ctx = tojeongService.buildStreamContext(finalBirthDate);
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

        return claudeApiService.generateStream(systemPrompt, userPrompt, 2500, (fullText) ->
            tojeongService.saveStreamResult(finalBirthDate, fullText)
        );
    }
}
