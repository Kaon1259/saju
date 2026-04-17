package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.repository.*;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.DeepAnalysisService;
import com.saju.server.service.FortunePromptBuilder;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/deep")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class DeepAnalysisController {

    private final DeepAnalysisService deepAnalysisService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final DailyFortuneRepository dailyFortuneRepository;
    private final BloodTypeFortuneRepository bloodTypeFortuneRepository;
    private final MbtiFortuneRepository mbtiFortuneRepository;
    private final ConstellationFortuneRepository constellationFortuneRepository;

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> deepFortune(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String extra,
            @RequestParam(required = false) String context) {
        return ResponseEntity.ok(deepAnalysisService.analyze(type, birthDate, birthTime, gender, calendarType, extra, context));
    }

    /**
     * 스트리밍 심화분석 - SSE (GET - 하위호환)
     */
    @GetMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter deepFortuneStreamGet(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String extra,
            @RequestParam(required = false) Long userId,
            @RequestParam(value = "targetType", defaultValue = "me") String targetType,
            @RequestParam(value = "targetName", required = false) String targetName,
            @RequestParam(required = false) String context) {
        return deepFortuneStream(type, birthDate, birthTime, gender, calendarType, extra, userId, targetType, targetName, context);
    }

    /**
     * 스트리밍 심화분석 - SSE (POST - context를 body로 전달)
     */
    @PostMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter deepFortuneStreamPost(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String extra,
            @RequestParam(required = false) Long userId,
            @RequestParam(value = "targetType", defaultValue = "me") String targetType,
            @RequestParam(value = "targetName", required = false) String targetName,
            @RequestBody(required = false) String context) {
        return deepFortuneStream(type, birthDate, birthTime, gender, calendarType, extra, userId, targetType, targetName, context);
    }

    private SseEmitter deepFortuneStream(
            String type, String birthDate, String birthTime, String gender,
            String calendarType, String extra, Long userId,
            String targetType, String targetName, String context) {
        log.info("심화분석 요청: type={}, birthDate={}, context길이={}", type, birthDate, context != null ? context.length() : 0);
        // 캐시 확인 - 있으면 즉시 완료 (무료)
        Map<String, Object> cached = deepAnalysisService.getCached(type, birthDate, birthTime, gender, calendarType, extra);
        if (cached != null) {
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
                configKey = mapDeepTypeToConfigKey(type);
                heartPointService.checkPoints(userId, configKey);
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        } else {
            configKey = null;
        }

        String systemPrompt = deepAnalysisService.getSystemPrompt(type) + "\n" + FortunePromptBuilder.TARGET_AWARE_RULES;
        String personContext = promptBuilder.buildPersonContext(birthDate, gender);
        String targetContext = promptBuilder.buildTargetContext(targetType, targetName);
        String userPrompt = deepAnalysisService.getUserPrompt(type, birthDate, birthTime, gender, calendarType, extra, context) + personContext + targetContext;
        final Long uid = userId;
        return claudeApiService.generateStream(systemPrompt, userPrompt, 4000, (fullText) -> {
            deepAnalysisService.saveStreamResult(type, birthDate, birthTime, gender, calendarType, extra, fullText);
            if (uid != null) heartPointService.deductPoints(uid, configKey, "심화분석 - " + type);
        });
    }

    private String mapDeepTypeToConfigKey(String type) {
        return switch (type) {
            case "today" -> "DEEP_TODAY";
            case "love" -> "DEEP_LOVE";
            case "reunion" -> "DEEP_REUNION";
            case "remarriage" -> "DEEP_REMARRIAGE";
            case "blind_date" -> "DEEP_BLIND_DATE";
            case "yearly" -> "DEEP_YEARLY";
            case "monthly" -> "DEEP_MONTHLY";
            case "weekly" -> "DEEP_WEEKLY";
            case "bloodtype" -> "DEEP_BLOODTYPE";
            case "mbti" -> "DEEP_MBTI";
            case "constellation" -> "DEEP_CONSTELLATION";
            case "tojeong" -> "DEEP_TOJEONG";
            default -> "DEEP_TODAY";
        };
    }

    @DeleteMapping("/cache")
    @Transactional
    public ResponseEntity<Map<String, String>> clearDeepCache() {
        specialFortuneRepository.deleteByFortuneTypeStartingWith("deep-");
        return ResponseEntity.ok(Map.of("status", "ok", "message", "심화분석 캐시가 삭제되었습니다."));
    }

    @DeleteMapping("/cache/all")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearAllCache() {
        Map<String, Object> result = new LinkedHashMap<>();
        long total = 0;

        long c1 = specialFortuneRepository.count();
        specialFortuneRepository.deleteAll();
        total += c1;

        long c2 = dailyFortuneRepository.count();
        dailyFortuneRepository.deleteAll();
        total += c2;

        long c3 = bloodTypeFortuneRepository.count();
        bloodTypeFortuneRepository.deleteAll();
        total += c3;

        long c4 = mbtiFortuneRepository.count();
        mbtiFortuneRepository.deleteAll();
        total += c4;

        long c5 = constellationFortuneRepository.count();
        constellationFortuneRepository.deleteAll();
        total += c5;

        result.put("status", "ok");
        result.put("special", c1);
        result.put("daily", c2);
        result.put("bloodType", c3);
        result.put("mbti", c4);
        result.put("constellation", c5);
        result.put("total", total);
        result.put("message", "전체 캐시 " + total + "건 삭제 완료");
        return ResponseEntity.ok(result);
    }
}
