package com.saju.server.controller;

import com.saju.server.service.BloodTypeFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bloodtype")
@RequiredArgsConstructor
public class BloodTypeController {

    private final BloodTypeFortuneService bloodTypeFortuneService;

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
}
