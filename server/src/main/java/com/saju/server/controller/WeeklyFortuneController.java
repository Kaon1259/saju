package com.saju.server.controller;

import com.saju.server.service.WeeklyFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/weekly-fortune")
@RequiredArgsConstructor
public class WeeklyFortuneController {

    private final WeeklyFortuneService weeklyFortuneService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getWeeklyFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(
            weeklyFortuneService.getWeeklyFortune(birthDate, birthTime, gender)
        );
    }
}
