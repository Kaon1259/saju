package com.saju.server.controller;

import com.saju.server.service.MbtiFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mbti")
@RequiredArgsConstructor
public class MbtiController {

    private final MbtiFortuneService mbtiFortuneService;

    @GetMapping("/types")
    public ResponseEntity<List<Map<String, Object>>> getAllTypes() {
        return ResponseEntity.ok(mbtiFortuneService.getAllTypes());
    }

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> getFortune(
            @RequestParam String type,
            @RequestParam(required = false) String zodiac) {
        return ResponseEntity.ok(zodiac != null
            ? mbtiFortuneService.getTodayFortune(type, zodiac)
            : mbtiFortuneService.getTodayFortune(type));
    }

    @GetMapping("/compatibility")
    public ResponseEntity<Map<String, Object>> getCompatibility(
            @RequestParam String type1,
            @RequestParam String type2) {
        return ResponseEntity.ok(mbtiFortuneService.getCompatibility(type1, type2));
    }
}
