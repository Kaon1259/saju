package com.saju.server.controller;

import com.saju.server.service.YearFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/year-fortune")
@RequiredArgsConstructor
public class YearFortuneController {

    private final YearFortuneService yearFortuneService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getYearFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(
            yearFortuneService.getYearFortune(birthDate, birthTime, gender, calendarType)
        );
    }
}
