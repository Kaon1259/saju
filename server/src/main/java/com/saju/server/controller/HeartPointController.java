package com.saju.server.controller;

import com.saju.server.entity.HeartPointConfig;
import com.saju.server.entity.HeartPointLog;
import com.saju.server.entity.User;
import com.saju.server.repository.HeartPointConfigRepository;
import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.repository.UserRepository;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.HeartPointService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

    @Value("${admin.secret:}")
    private String adminSecret;

    // 관리자 엔드포인트 인증 — 빈 시크릿(미설정)은 차단, 일치하지 않으면 403
    private boolean isAdmin(String header) {
        if (adminSecret == null || adminSecret.isBlank()) return false;
        return adminSecret.equals(header);
    }

    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalance(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        int balance = heartPointService.getBalance(userId);
        return ResponseEntity.ok(Map.of("userId", userId, "heartPoints", balance));
    }

    // 리워드 광고 하루 지급 한도 (BM ② — 1회 5하트 × 하루 5회 = 25하트/일)
    private static final int AD_REWARD_DAILY_LIMIT = 5;

    /**
     * 리워드 광고 시청 보상 — REWARD_AD(5하트) 지급, 하루 AD_REWARD_DAILY_LIMIT회 한도.
     * ⚠️ v1은 클라 신뢰 기반(광고 시청 사실은 클라가 보장). 추후 AdMob SSV(서버검증)로 강화 가능.
     *    한도가 있어 어뷰징해도 하루 25하트(=정상 사용량)로 제한되므로 손실은 한정적.
     */
    @PostMapping("/ad-reward")
    public ResponseEntity<Map<String, Object>> claimAdReward(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        int todayCount = heartPointLogRepository
                .countByUserIdAndTransactionTypeAndCreatedAtAfter(userId, "REWARD_AD", startOfDay);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("dailyLimit", AD_REWARD_DAILY_LIMIT);
        if (todayCount >= AD_REWARD_DAILY_LIMIT) {
            res.put("rewarded", false);
            res.put("reason", "daily_limit");
            res.put("amount", 0);
            res.put("todayCount", todayCount);
            res.put("remaining", 0);
            res.put("balance", heartPointService.getBalance(userId));
            return ResponseEntity.ok(res);
        }

        int amount = heartPointService.grantBonus(userId, "REWARD_AD", "리워드 광고 보상");
        int newCount = todayCount + 1;
        res.put("rewarded", true);
        res.put("amount", amount);
        res.put("todayCount", newCount);
        res.put("remaining", Math.max(0, AD_REWARD_DAILY_LIMIT - newCount));
        res.put("balance", heartPointService.getBalance(userId));
        return ResponseEntity.ok(res);
    }

    /**
     * 리워드 광고 오늘 잔여 횟수 조회 (충전 화면 진입 시 버튼 상태용)
     */
    @GetMapping("/ad-reward/status")
    public ResponseEntity<Map<String, Object>> adRewardStatus(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        int todayCount = heartPointLogRepository
                .countByUserIdAndTransactionTypeAndCreatedAtAfter(userId, "REWARD_AD", startOfDay);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("dailyLimit", AD_REWARD_DAILY_LIMIT);
        res.put("todayCount", todayCount);
        res.put("remaining", Math.max(0, AD_REWARD_DAILY_LIMIT - todayCount));
        res.put("rewardPerAd", heartPointService.getCost("REWARD_AD"));
        return ResponseEntity.ok(res);
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkSufficient(
            HttpServletRequest req,
            @RequestParam(defaultValue = "BASIC_ANALYSIS") String category) {
        Long userId = AuthUtil.requireUserId(req);
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
            @RequestParam int cost,
            @RequestHeader(value = "X-Admin-Secret", required = false) String adminHeader) {
        if (!isAdmin(adminHeader)) return ResponseEntity.status(403).body(Map.of("error", "admin only"));
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
            @RequestParam(defaultValue = "") String description,
            @RequestHeader(value = "X-Admin-Secret", required = false) String adminHeader) {
        if (!isAdmin(adminHeader)) return ResponseEntity.status(403).body(Map.of("error", "admin only"));
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
     * 하트 차감 (클라이언트 직접 호출용)
     * POST /api/hearts/deduct?userId=1&category=DAILY_FORTUNE_EXTRA
     */
    @PostMapping("/deduct")
    public ResponseEntity<Map<String, Object>> deductHearts(
            HttpServletRequest req,
            @RequestParam String category) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            heartPointService.deductPoints(userId, category, category);
            int balance = heartPointService.getBalance(userId);
            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "balance", balance,
                    "category", category
            ));
        } catch (Exception e) {
            int balance = heartPointService.getBalance(userId);
            int cost = heartPointService.getCost(category);
            return ResponseEntity.status(400).body(Map.of(
                    "status", "insufficient",
                    "balance", balance,
                    "cost", cost,
                    "message", "하트가 부족합니다"
            ));
        }
    }

    /**
     * 전체 유저 일괄 하트 지급
     * POST /api/hearts/bulk-grant?amount=1000&description=일괄지급
     */
    @PostMapping("/bulk-grant")
    @Transactional
    public ResponseEntity<Map<String, Object>> bulkGrant(
            @RequestParam int amount,
            @RequestParam(defaultValue = "관리자 일괄 지급") String description,
            @RequestHeader(value = "X-Admin-Secret", required = false) String adminHeader) {
        if (!isAdmin(adminHeader)) return ResponseEntity.status(403).body(Map.of("error", "admin only"));
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
