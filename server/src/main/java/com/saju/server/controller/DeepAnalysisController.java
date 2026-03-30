package com.saju.server.controller;

import com.saju.server.repository.SpecialFortuneRepository;
import com.saju.server.service.DeepAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/deep")
@RequiredArgsConstructor
public class DeepAnalysisController {

    private final DeepAnalysisService deepAnalysisService;
    private final SpecialFortuneRepository specialFortuneRepository;

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
        long count = specialFortuneRepository.count();
        specialFortuneRepository.deleteAll();
        return ResponseEntity.ok(Map.of("status", "ok", "deleted", count, "message", "전체 캐시 " + count + "건 삭제 완료"));
    }

}
