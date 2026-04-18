package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.FortuneHistoryService;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.SpecialFortuneService;
import com.saju.server.util.SseEmitterUtils;
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
    private final HeartPointService heartPointService;
    private final FortuneHistoryService fortuneHistoryService;

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
            @RequestParam(required = false) String relationshipStatus,
            @RequestParam(required = false) Long userId) {
        // 캐시 체크 먼저
        Map<String, Object> cached = specialFortuneService.getLoveFortuneBasic(
            type, birthDate, birthTime, gender, calendarType,
            partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus);
        if (cached.containsKey("score") && cached.containsKey("overall")) {
            // 캐시 히트도 '본 운세'이므로 히스토리에 1회 저장 (중복 시 스킵)
            if (userId != null) {
                Map<String, Object> payload = new java.util.LinkedHashMap<>(cached);
                payload.put("type", type);
                payload.put("birthDate", birthDate);
                payload.put("birthTime", birthTime);
                payload.put("gender", gender);
                payload.put("calendarType", calendarType);
                payload.put("partnerDate", partnerDate);
                payload.put("partnerGender", partnerGender);
                payload.put("breakupDate", breakupDate);
                payload.put("meetDate", meetDate);
                payload.put("relationshipStatus", relationshipStatus);
                String title = buildLoveTitle(type, birthDate, partnerDate);
                Object score = cached.get("score");
                Object overall = cached.get("overall");
                String summary = (score != null ? score + "점" : "")
                    + (overall != null ? " · " + overall : "");
                fortuneHistoryService.saveIfAbsent(userId, "love_11", title, summary, payload);
            }
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

        // 하트 잔액 확인 (차감은 AI 완료 후)
        final String configKey;
        if (userId != null) {
            try {
                configKey = mapLoveTypeToConfigKey(type);
                heartPointService.checkPoints(userId, configKey);
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        } else {
            configKey = null;
        }

        String[] prompts = specialFortuneService.buildLoveStreamPrompts(
            type, birthDate, birthTime, gender, calendarType,
            partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus);
        int maxTokens = "ideal_type".equals(type) ? 2500 : 1200;
        final Long uid = userId;
        return claudeApiService.generateStream(prompts[0], prompts[1], maxTokens, (fullText) -> {
            specialFortuneService.parseAndSaveLoveStreamResult(type, birthDate, gender,
                partnerDate, partnerGender, breakupDate, meetDate, fullText);
            if (uid != null) heartPointService.deductPoints(uid, configKey, "1:1연애운 - " + type);

            // 히스토리 저장 — 재열람 시 동일 입력값으로 캐시 히트
            if (uid != null) {
                Map<String, Object> result = specialFortuneService.getLoveFortuneBasic(
                    type, birthDate, birthTime, gender, calendarType,
                    partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus);
                Map<String, Object> payload = new java.util.LinkedHashMap<>(result);
                payload.put("type", type);
                payload.put("birthDate", birthDate);
                payload.put("birthTime", birthTime);
                payload.put("gender", gender);
                payload.put("calendarType", calendarType);
                payload.put("partnerDate", partnerDate);
                payload.put("partnerGender", partnerGender);
                payload.put("breakupDate", breakupDate);
                payload.put("meetDate", meetDate);
                payload.put("relationshipStatus", relationshipStatus);
                String title = buildLoveTitle(type, birthDate, partnerDate);
                Object score = result.get("score");
                Object overall = result.get("overall");
                String summary = (score != null ? score + "점" : null)
                    + (overall != null ? " · " + overall : "");
                fortuneHistoryService.saveIfAbsent(uid, "love_11", title, summary, payload);
            }
        });
    }

    /**
     * 히스토리 dedupe용 unique 타이틀.
     * 같은 타입+같은 입력 조합이면 같은 타이틀 → saveIfAbsent로 중복 방지.
     * 파트너 정보가 있으면 파트너 생년월일로 구분 (다른 파트너면 다른 기록).
     */
    private String buildLoveTitle(String type, String birthDate, String partnerDate) {
        String base = loveTypeLabel(type);
        if (partnerDate != null && !partnerDate.isBlank()) {
            return base + " · " + partnerDate;
        }
        return base;
    }

    private String loveTypeLabel(String type) {
        return switch (type) {
            case "relationship" -> "연애 진단";
            case "crush" -> "짝사랑 분석";
            case "some_check" -> "썸 진단";
            case "blind_date" -> "소개팅 궁합";
            case "couple_fortune" -> "데이트운";
            case "confession_timing" -> "고백 타이밍";
            case "ideal_type" -> "이상형 분석";
            case "reunion" -> "재회 가능성";
            case "remarriage" -> "재혼 운세";
            case "marriage" -> "결혼 운세";
            case "past_life" -> "전생 인연";
            case "meeting_timing" -> "만남 타이밍";
            case "contact_fortune" -> "연락 운세";
            default -> "1:1 연애 운세";
        };
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

    private String mapLoveTypeToConfigKey(String type) {
        return switch (type) {
            case "relationship" -> "LOVE_RELATIONSHIP";
            case "crush" -> "LOVE_CRUSH";
            case "some_check" -> "LOVE_SOME_CHECK";
            case "blind_date" -> "LOVE_BLIND_DATE";
            case "couple_fortune" -> "LOVE_COUPLE";
            case "confession_timing" -> "LOVE_CONFESSION";
            case "ideal_type" -> "LOVE_IDEAL_TYPE";
            case "reunion" -> "LOVE_REUNION";
            case "remarriage" -> "LOVE_REMARRIAGE";
            case "marriage" -> "LOVE_MARRIAGE";
            case "past_life" -> "LOVE_PAST_LIFE";
            case "meeting_timing" -> "LOVE_MEETING_TIMING";
            case "contact_fortune" -> "LOVE_CONTACT";
            default -> "LOVE_RELATIONSHIP";
        };
    }
}
