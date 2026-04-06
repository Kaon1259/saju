package com.saju.server.controller;

import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.service.HeartPointService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/hearts")
@RequiredArgsConstructor
public class HeartPointController {

    private final HeartPointService heartPointService;
    private final HeartPointLogRepository heartPointLogRepository;

    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalance(@RequestParam Long userId) {
        int balance = heartPointService.getBalance(userId);
        return ResponseEntity.ok(Map.of("userId", userId, "heartPoints", balance));
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkSufficient(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "BASIC_ANALYSIS") String category) {
        int balance = heartPointService.getBalance(userId);
        int cost = heartPointService.getCost(category);
        return ResponseEntity.ok(Map.of(
                "userId", userId,
                "balance", balance,
                "cost", cost,
                "sufficient", balance >= cost
        ));
    }
}
