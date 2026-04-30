package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.BloodTypeFortuneService;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bloodtype")
@RequiredArgsConstructor
public class BloodTypeController {

    private final BloodTypeFortuneService bloodTypeFortuneService;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper;

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> getFortune(
            @RequestParam String type,
            @RequestParam(required = false) String zodiac) {
        return ResponseEntity.ok(zodiac != null
            ? bloodTypeFortuneService.getTodayFortune(type.toUpperCase(), zodiac)
            : bloodTypeFortuneService.getTodayFortune(type.toUpperCase()));
    }

    @GetMapping("/fortune/all")
    public ResponseEntity<List<Map<String, Object>>> getAllFortunes() {
        return ResponseEntity.ok(bloodTypeFortuneService.getAllTodayFortunes());
    }

    @GetMapping("/compatibility")
    public ResponseEntity<Map<String, Object>> getCompatibility(
            @RequestParam String type1,
            @RequestParam String type2) {
        return ResponseEntity.ok(bloodTypeFortuneService.getCompatibility(type1.toUpperCase(), type2.toUpperCase()));
    }

    @GetMapping("/compatibility/basic")
    public ResponseEntity<Map<String, Object>> getCompatibilityBasic(
            @RequestParam String type1,
            @RequestParam String type2) {
        return ResponseEntity.ok(bloodTypeFortuneService.getCompatibilityBasic(type1.toUpperCase(), type2.toUpperCase()));
    }

    @GetMapping(value = "/compatibility/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamCompatibility(
            @RequestParam String type1,
            @RequestParam String type2) {
        return bloodTypeFortuneService.streamCompatibility(type1.toUpperCase(), type2.toUpperCase());
    }

    /**
     * 혈액형 운세 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFortune(
            @RequestParam String type,
            @RequestParam(required = false) String zodiac,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false, defaultValue = "me") String targetType,
            @RequestParam(required = false) String targetName,
            HttpServletRequest req) {
        Long userId = AuthUtil.optionalUserId(req);
        String bloodType = type.toUpperCase();
        String zodiacAnimal = (zodiac != null && !zodiac.isBlank()) ? zodiac : "용";
        SseEmitter emitter = new SseEmitter(180000L);

        // 캐시 확인
        Map<String, Object> cached = bloodTypeFortuneService.getCachedFortune(bloodType, zodiacAnimal);
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

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "BLOOD_TYPE");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        // 캐시 없으면 AI 스트리밍
        final Long uid = userId;
        return bloodTypeFortuneService.streamFortune(bloodType, zodiacAnimal, birthDate, gender, targetType, targetName, () -> {
            if (uid != null) heartPointService.deductPoints(uid, "BLOOD_TYPE", "혈액형 운세");
        });
    }
}
