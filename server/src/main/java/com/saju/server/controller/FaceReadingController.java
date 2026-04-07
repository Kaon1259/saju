package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.FaceReadingService;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/face-reading")
@RequiredArgsConstructor
public class FaceReadingController {

    private final FaceReadingService faceReadingService;
    private final HeartPointService heartPointService;

    /**
     * 관상 분석 (기존 동기 방식)
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam String faceShape,
            @RequestParam String eyeShape,
            @RequestParam String noseShape,
            @RequestParam String mouthShape,
            @RequestParam String foreheadShape,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(
            faceReadingService.analyzeFace(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender)
        );
    }

    /**
     * 관상 분석 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAnalyze(
            @RequestParam String faceShape,
            @RequestParam String eyeShape,
            @RequestParam String noseShape,
            @RequestParam String mouthShape,
            @RequestParam String foreheadShape,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) Long userId) {
        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "FACE_READING");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }
        final Long uid = userId;
        return faceReadingService.streamFace(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender, () -> {
            if (uid != null) heartPointService.deductPoints(uid, "FACE_READING", "관상분석");
        });
    }
}
