package com.saju.server.controller;

import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.SpecialFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/special")
@RequiredArgsConstructor
public class SpecialFortuneController {

    private final SpecialFortuneService specialFortuneService;
    private final ClaudeApiService claudeApiService;

    /**
     * 오늘의 연애 온도 (만20세 기준, 로그인 불필요)
     */
    @GetMapping("/love-temperature")
    public ResponseEntity<Map<String, Object>> getLoveTemperature(
            @RequestParam(required = false) Long userId) {
        if (userId != null) {
            return ResponseEntity.ok(specialFortuneService.getUserLoveTemperature(userId));
        }
        return ResponseEntity.ok(specialFortuneService.getLoveTemperature());
    }

    /**
     * 특수 운세 (연애운, 재회운, 재혼운, 소개팅운)
     */
    @GetMapping("/love")
    public ResponseEntity<Map<String, Object>> getLoveFortune(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String partnerDate,
            @RequestParam(required = false) String partnerGender,
            @RequestParam(required = false) String breakupDate,
            @RequestParam(required = false) String meetDate,
            @RequestParam(required = false) String relationshipStatus) {
        return ResponseEntity.ok(
            specialFortuneService.getLoveFortune(type, birthDate, birthTime, gender, calendarType,
                partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus)
        );
    }

    /**
     * 연애운 basic (캐시 체크 + 사주 기본만, AI 없음)
     */
    @GetMapping("/love/basic")
    public ResponseEntity<Map<String, Object>> getLoveFortuneBasic(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String partnerDate,
            @RequestParam(required = false) String partnerGender,
            @RequestParam(required = false) String breakupDate,
            @RequestParam(required = false) String meetDate,
            @RequestParam(required = false) String relationshipStatus) {
        return ResponseEntity.ok(
            specialFortuneService.getLoveFortuneBasic(type, birthDate, birthTime, gender, calendarType,
                partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus)
        );
    }

    /**
     * 스트리밍 완료 후 캐시 저장
     */
    @PostMapping("/love/cache")
    public ResponseEntity<String> saveLoveCache(@RequestBody Map<String, Object> body) {
        String type = (String) body.getOrDefault("type", "relationship");
        String birthDate = (String) body.get("birthDate");
        String gender = (String) body.get("gender");
        String partnerDate = (String) body.get("partnerDate");
        String partnerGender = (String) body.get("partnerGender");
        String breakupDate = (String) body.get("breakupDate");
        String meetDate = (String) body.get("meetDate");
        specialFortuneService.saveLoveFortuneCache(type, birthDate, gender, partnerDate, partnerGender, breakupDate, meetDate, body);
        return ResponseEntity.ok("saved");
    }

    /**
     * 연애운 스트리밍 (AI 부분만)
     */
    @GetMapping(value = "/love/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLoveFortune(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String partnerDate,
            @RequestParam(required = false) String partnerGender,
            @RequestParam(required = false) String breakupDate,
            @RequestParam(required = false) String meetDate,
            @RequestParam(required = false) String relationshipStatus) {
        // 캐시 체크 먼저
        Map<String, Object> cached = specialFortuneService.getLoveFortuneBasic(
            type, birthDate, birthTime, gender, calendarType,
            partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus);
        if (cached.containsKey("score") && cached.containsKey("overall")) {
            // 캐시 히트 → cached 이벤트로 즉시 반환
            SseEmitter emitter = new SseEmitter(5000L);
            new Thread(() -> {
                try {
                    emitter.send(SseEmitter.event().name("cached").data(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(cached)));
                    emitter.complete();
                } catch (Exception ignored) {}
            }).start();
            return emitter;
        }

        String[] prompts = specialFortuneService.buildLoveStreamPrompts(
            type, birthDate, birthTime, gender, calendarType,
            partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus);
        return claudeApiService.generateStream(prompts[0], prompts[1], 1200, (fullText) -> {
            specialFortuneService.parseAndSaveLoveStreamResult(type, birthDate, gender,
                partnerDate, partnerGender, breakupDate, meetDate, fullText);
        });
    }

    /**
     * 아침/점심/저녁 운세 (3블록)
     */
    @GetMapping("/timeblock")
    public ResponseEntity<Map<String, Object>> getTimeblockFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(
            specialFortuneService.getTimeblockFortune(birthDate, birthTime, gender, calendarType)
        );
    }

    /**
     * 시간대별 운세 (12시진)
     */
    @GetMapping("/hourly")
    public ResponseEntity<Map<String, Object>> getHourlyFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(
            specialFortuneService.getHourlyFortune(birthDate, birthTime, gender, calendarType)
        );
    }
}
