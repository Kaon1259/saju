package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.DreamService;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/dream")
@RequiredArgsConstructor
public class DreamController {

    private final DreamService dreamService;
    private final HeartPointService heartPointService;

    /**
     * 꿈 해몽 API (기존 동기 방식)
     */
    @PostMapping("/interpret")
    public ResponseEntity<Map<String, Object>> interpretDream(
            @RequestParam String dreamText,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(dreamService.interpretDream(dreamText, birthDate, gender));
    }

    /**
     * 꿈 해몽 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamDream(
            @RequestParam String dreamText,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) Long userId) {
        // 하트 차감
        if (userId != null) {
            try {
                heartPointService.deductPoints(userId, "DREAM", "꿈해몽");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }
        return dreamService.streamDream(dreamText, birthDate, gender);
    }
}
