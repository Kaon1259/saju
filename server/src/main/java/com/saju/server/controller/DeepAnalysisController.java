package com.saju.server.controller;

import com.saju.server.repository.*;
import com.saju.server.service.DeepAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/deep")
@RequiredArgsConstructor
public class DeepAnalysisController {

    private final DeepAnalysisService deepAnalysisService;
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
