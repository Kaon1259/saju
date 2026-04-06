package com.saju.server.controller;

import com.saju.server.entity.HeartPointLog;
import com.saju.server.entity.User;
import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.repository.UserRepository;
import com.saju.server.service.HeartPointService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hearts")
@RequiredArgsConstructor
public class HeartPointController {

    private final HeartPointService heartPointService;
    private final HeartPointLogRepository heartPointLogRepository;
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
            user.setHeartPoints(user.getHeartPoints() + amount);
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
