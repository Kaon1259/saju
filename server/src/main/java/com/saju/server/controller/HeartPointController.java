package com.saju.server.controller;

import com.saju.server.entity.HeartPointConfig;
import com.saju.server.entity.HeartPointLog;
import com.saju.server.entity.User;
import com.saju.server.repository.HeartPointConfigRepository;
import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.repository.UserRepository;
import com.saju.server.service.HeartPointService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hearts")
@RequiredArgsConstructor
public class HeartPointController {

    private final HeartPointService heartPointService;
    private final HeartPointLogRepository heartPointLogRepository;
    private final HeartPointConfigRepository heartPointConfigRepository;
    private final UserRepository userRepository;

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

    /**
     * 하트 비용 설정 전체 조회 (그룹별 정렬)
     */
    @GetMapping("/config")
    public ResponseEntity<List<Map<String, Object>>> getAllConfig() {
        return ResponseEntity.ok(
            heartPointConfigRepository.findAll().stream()
                .sorted(Comparator.comparing(HeartPointConfig::getMenuGroup, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(HeartPointConfig::getAnalysisCategory))
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.getId());
                    m.put("category", c.getAnalysisCategory());
                    m.put("cost", c.getCost());
                    m.put("group", c.getMenuGroup());
                    m.put("description", c.getDescription());
                    return m;
                })
                .collect(Collectors.toList())
        );
    }

    /**
     * 하트 비용 개별 수정
     * PUT /api/hearts/config?category=TAROT_THREE&cost=5
     */
    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @RequestParam String category,
            @RequestParam int cost) {
        var config = heartPointConfigRepository.findByAnalysisCategory(category);
        if (config.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "카테고리를 찾을 수 없습니다: " + category));
        }
        HeartPointConfig c = config.get();
        int oldCost = c.getCost();
        c.setCost(cost);
        heartPointConfigRepository.save(c);
        return ResponseEntity.ok(Map.of(
                "category", category,
                "oldCost", oldCost,
                "newCost", cost,
                "message", category + " 비용 변경: " + oldCost + " → " + cost
        ));
    }

    /**
     * 하트 비용 신규 추가
     * POST /api/hearts/config?category=NEW_MENU&cost=5&group=기타&description=새메뉴
     */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> addConfig(
            @RequestParam String category,
            @RequestParam int cost,
            @RequestParam(defaultValue = "기타") String group,
            @RequestParam(defaultValue = "") String description) {
        var existing = heartPointConfigRepository.findByAnalysisCategory(category);
        if (existing.isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "이미 존재하는 카테고리: " + category));
        }
        heartPointConfigRepository.save(HeartPointConfig.builder()
                .analysisCategory(category)
                .cost(cost)
                .menuGroup(group)
                .description(description)
                .build());
        return ResponseEntity.ok(Map.of(
                "category", category,
                "cost", cost,
                "group", group,
                "message", category + " 추가 완료 (비용: " + cost + ")"
        ));
    }

    /**
     * 전체 유저 일괄 하트 지급
     * POST /api/hearts/bulk-grant?amount=1000&description=일괄지급
     */
    @PostMapping("/bulk-grant")
    @Transactional
    public ResponseEntity<Map<String, Object>> bulkGrant(
            @RequestParam int amount,
            @RequestParam(defaultValue = "관리자 일괄 지급") String description) {
        List<User> allUsers = userRepository.findAll();
        int count = 0;
        for (User user : allUsers) {
            int cur = user.getHeartPoints() != null ? user.getHeartPoints() : 0;
            user.setHeartPoints(cur + amount);
            userRepository.save(user);
            heartPointLogRepository.save(HeartPointLog.builder()
                    .userId(user.getId())
                    .transactionType("BULK_GRANT")
                    .amount(amount)
                    .balanceAfter(user.getHeartPoints())
                    .description(description)
                    .build());
            count++;
        }
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "grantedUsers", count,
                "amountPerUser", amount,
                "message", count + "명에게 " + amount + "하트 지급 완료"
        ));
    }
}
