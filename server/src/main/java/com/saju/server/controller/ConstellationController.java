package com.saju.server.controller;

import com.saju.server.service.ConstellationFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/constellation")
@RequiredArgsConstructor
public class ConstellationController {

    private final ConstellationFortuneService service;

    @GetMapping("/fortune")
    public ResponseEntity<Map<String, Object>> getFortune(@RequestParam String sign) {
        return ResponseEntity.ok(service.getTodayFortune(sign));
    }

    @GetMapping("/fortune/by-date")
    public ResponseEntity<Map<String, Object>> getFortuneByDate(@RequestParam String birthDate) {
        LocalDate date = LocalDate.parse(birthDate);
        String sign = service.getSignFromDate(date);
        return ResponseEntity.ok(service.getTodayFortune(sign));
    }

    @GetMapping("/signs")
    public ResponseEntity<List<Map<String, Object>>> getAllSigns() {
        return ResponseEntity.ok(service.getAllSigns());
    }
}
