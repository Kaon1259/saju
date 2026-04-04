package com.saju.server.controller;

import com.saju.server.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DailyFortuneRepository dailyFortuneRepository;
    private final BloodTypeFortuneRepository bloodTypeFortuneRepository;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ConstellationFortuneRepository constellationFortuneRepository;
    private final MbtiFortuneRepository mbtiFortuneRepository;

    @DeleteMapping("/cache/clear")
    public ResponseEntity<Map<String, String>> clearAllCache(@RequestParam(defaultValue = "") String key) {
        if (!"clear2026".equals(key)) {
            return ResponseEntity.status(403).body(Map.of("error", "Invalid key"));
        }
        dailyFortuneRepository.deleteAll();
        bloodTypeFortuneRepository.deleteAll();
        specialFortuneRepository.deleteAll();
        constellationFortuneRepository.deleteAll();
        mbtiFortuneRepository.deleteAll();
        return ResponseEntity.ok(Map.of("result", "All cache cleared"));
    }
}
