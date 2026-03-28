package com.saju.server.controller;

import com.saju.server.service.MonthlyFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/monthly-fortune")
@RequiredArgsConstructor
public class MonthlyFortuneController {

    private final MonthlyFortuneService monthlyFortuneService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMonthlyFortune(
            @RequestParam String birthDate,
            @RequestParam int month,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(
            monthlyFortuneService.getMonthlyFortune(birthDate, month, birthTime, gender)
        );
    }
}
