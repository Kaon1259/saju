package com.saju.server.controller;

import com.saju.server.repository.*;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.DeepAnalysisService;
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
public class DeepAnalysisController {

    private final DeepAnalysisService deepAnalysisService;
    private final ClaudeApiService claudeApiService;
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
            @RequestParam(required = false) String extra) {
        return ResponseEntity.ok(deepAnalysisService.analyze(type, birthDate, birthTime, gender, calendarType, extra));
    }

    /**
     * 스트리밍 심화분석 - SSE
     */
    @GetMapping(value = "/fortune/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter deepFortuneStream(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String extra) {
        // 캐시 확인 - 있으면 즉시 완료
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

        String systemPrompt = deepAnalysisService.getSystemPrompt(type);
        String userPrompt = deepAnalysisService.getUserPrompt(type, birthDate, birthTime, gender, calendarType, extra);
        return claudeApiService.generateStream(systemPrompt, userPrompt, 4000, (fullText) -> {
            deepAnalysisService.saveStreamResult(type, birthDate, birthTime, gender, calendarType, extra, fullText);
        });
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
