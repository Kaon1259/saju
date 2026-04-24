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
        // 정렬 순서 — 서버 HeartPointConfigInitializer 의 menuGroup 과 정확히 맞춤
        String[] order = {"기본운세", "1:1연애운", "궁합", "특수분석", "운세종합", "스타운세", "기간별운세", "심화분석", "시스템"};
        for (String g : order) {
            grouped.put(g, new java.util.ArrayList<>());
        }
        for (HeartPointConfig c : all) {
            String group = c.getMenuGroup() != null ? c.getMenuGroup() : "기타";
            grouped.computeIfAbsent(group, k -> new java.util.ArrayList<>()).add(c);
        }
        grouped.entrySet().removeIf(e -> e.getValue().isEmpty());
        return grouped;
    }

    /**
     * 각 analysisCategory 가 현재 어떤 AI 모델을 사용하는지 매핑.
     * 서버 코드(HAIKU_MODEL 명시 여부)와 동기화 — 바뀌면 여기도 수정 필요.
     */
    public Map<String, String> getAiModelMap() {
        Map<String, String> m = new LinkedHashMap<>();
        // 심화분석 전체 → Sonnet 4.6
        String[] deepKeys = {
            "DEEP_TODAY", "DEEP_LOVE", "DEEP_REUNION", "DEEP_REMARRIAGE", "DEEP_BLIND_DATE",
            "DEEP_YEARLY", "DEEP_MONTHLY", "DEEP_WEEKLY", "DEEP_BLOODTYPE", "DEEP_MBTI",
            "DEEP_CONSTELLATION", "DEEP_TOJEONG", "DEEP_COMPATIBILITY", "DEEP_MARRIAGE_COMPAT",
            "DEEP_TAROT"
        };
        for (String k : deepKeys) m.put(k, "Sonnet 4.6");

        // 타로 전체 → Sonnet 4.6 (서사·상징 의존도 높음)
        m.put("TAROT", "Sonnet 4.6");
        m.put("TAROT_ONE", "Sonnet 4.6");
        m.put("TAROT_THREE", "Sonnet 4.6");
        m.put("TAROT_FIVE", "Sonnet 4.6");

        // 시스템 → N/A
        m.put("SIGNUP_BONUS", "-");

        // 일반 분석 대부분 → Haiku 4.5
        String[] haikuKeys = {
            // 기본운세
            "TODAY_FORTUNE", "SAJU_ANALYSIS", "DAILY_FORTUNE_EXTRA", "MANSERYEOK",
            // 1:1연애운
            "LOVE_RELATIONSHIP", "LOVE_CRUSH", "LOVE_SOME_CHECK", "LOVE_BLIND_DATE",
            "LOVE_COUPLE", "LOVE_CONFESSION", "LOVE_IDEAL_TYPE", "LOVE_REUNION",
            "LOVE_REMARRIAGE", "LOVE_MARRIAGE", "LOVE_PAST_LIFE", "LOVE_MEETING_TIMING",
            "LOVE_CONTACT",
            // 궁합
            "COMPATIBILITY", "CELEB_COMPAT", "MBTI_COMPAT", "BLOODTYPE_COMPAT",
            // 특수분석 (타로 제외)
            "DREAM", "FACE_READING", "PSYCH_TEST",
            // 운세종합
            "BLOOD_TYPE", "MBTI", "CONSTELLATION", "BIORHYTHM",
            // 스타운세
            "CELEB_FORTUNE", "GROUP_FORTUNE", "GROUP_COMPAT", "CELEB_MATCH",
            // 기간별운세
            "YEAR_FORTUNE", "MONTHLY_FORTUNE", "MONTHLY_FORTUNE_EXTRA", "WEEKLY_FORTUNE", "TOJEONG"
        };
        for (String k : haikuKeys) m.put(k, "Haiku 4.5");

        return m;
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
