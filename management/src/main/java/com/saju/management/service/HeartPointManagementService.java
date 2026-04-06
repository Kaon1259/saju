package com.saju.management.service;

import com.saju.management.entity.HeartPointConfig;
import com.saju.management.entity.HeartPointLog;
import com.saju.management.entity.User;
import com.saju.management.repository.HeartPointConfigRepository;
import com.saju.management.repository.HeartPointLogRepository;
import com.saju.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeartPointManagementService {

    private final UserRepository userRepository;
    private final HeartPointLogRepository heartPointLogRepository;
    private final HeartPointConfigRepository heartPointConfigRepository;

    public Page<User> getUsers(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return userRepository.findByNameContainingIgnoreCase(search.trim(), pageable);
        }
        return userRepository.findAll(pageable);
    }

    public User getUserDetail(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    }

    public List<HeartPointLog> getRecentLogs(Long userId) {
        return heartPointLogRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void adjustHeartPoints(Long userId, int amount, String description) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        user.setHeartPoints(Math.max(0, user.getHeartPoints() + amount));
        userRepository.save(user);

        heartPointLogRepository.save(HeartPointLog.builder()
                .userId(userId)
                .transactionType(amount >= 0 ? "ADMIN_GRANT" : "ADMIN_DEDUCT")
                .amount(amount)
                .balanceAfter(user.getHeartPoints())
                .description(description)
                .createdAt(LocalDateTime.now())
                .build());

        log.info("관리자 하트 조정: userId={}, amount={}, balance={}", userId, amount, user.getHeartPoints());
    }

    @Transactional
    public int bulkGrantHearts(int amount, String description) {
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            user.setHeartPoints(user.getHeartPoints() + amount);
            userRepository.save(user);

            heartPointLogRepository.save(HeartPointLog.builder()
                    .userId(user.getId())
                    .transactionType("BULK_GRANT")
                    .amount(amount)
                    .balanceAfter(user.getHeartPoints())
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
        log.info("전체 유저 하트 일괄 ���급: amount={}, userCount={}", amount, allUsers.size());
        return allUsers.size();
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalHeartPoints", userRepository.sumAllHeartPoints());
        stats.put("totalGranted", heartPointLogRepository.sumTotalGranted());
        stats.put("totalDeducted", heartPointLogRepository.sumTotalDeducted());

        LocalDateTime todayStart = LocalDateTime.now().with(LocalTime.MIN);
        stats.put("newUsersToday", userRepository.countNewUsersSince(todayStart));

        LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
        stats.put("newUsersWeek", userRepository.countNewUsersSince(weekStart));

        return stats;
    }

    public List<HeartPointConfig> getAllConfigs() {
        return heartPointConfigRepository.findAll();
    }

    public Map<String, List<HeartPointConfig>> getConfigsByGroup() {
        List<HeartPointConfig> all = heartPointConfigRepository.findAll();
        Map<String, List<HeartPointConfig>> grouped = new LinkedHashMap<>();
        // 정렬 순서 정의
        String[] order = {"기본운세", "연애/궁합", "특수분석", "운세종합", "기간별운세", "심화분석", "시스템"};
        for (String g : order) {
            grouped.put(g, new java.util.ArrayList<>());
        }
        for (HeartPointConfig c : all) {
            String group = c.getMenuGroup() != null ? c.getMenuGroup() : "기타";
            grouped.computeIfAbsent(group, k -> new java.util.ArrayList<>()).add(c);
        }
        // 빈 그룹 제거
        grouped.entrySet().removeIf(e -> e.getValue().isEmpty());
        return grouped;
    }

    @Transactional
    public void updateConfig(Long id, int newCost, String description) {
        HeartPointConfig config = heartPointConfigRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("설정을 찾을 수 없습니다."));
        config.setCost(newCost);
        if (description != null && !description.isBlank()) {
            config.setDescription(description);
        }
        config.setUpdatedAt(LocalDateTime.now());
        heartPointConfigRepository.save(config);
    }

    public Page<HeartPointLog> getAllLogs(Pageable pageable) {
        return heartPointLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<HeartPointLog> getUserLogs(Long userId, Pageable pageable) {
        return heartPointLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}
