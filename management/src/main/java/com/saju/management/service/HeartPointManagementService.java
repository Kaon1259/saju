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
        String[] order = {"기본운세", "1:1연애운", "궁합", "특수분석", "운세종합", "스타운세", "기간별운세", "심화분석", "시스템"};
        for (String g : order) grouped.put(g, new java.util.ArrayList<>());
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
        String[] deepKeys = {
            "DEEP_TODAY", "DEEP_LOVE", "DEEP_REUNION", "DEEP_REMARRIAGE", "DEEP_BLIND_DATE",
            "DEEP_YEARLY", "DEEP_MONTHLY", "DEEP_WEEKLY", "DEEP_BLOODTYPE", "DEEP_MBTI",
            "DEEP_CONSTELLATION", "DEEP_TOJEONG", "DEEP_COMPATIBILITY", "DEEP_MARRIAGE_COMPAT",
            "DEEP_TAROT"
        };
        for (String k : deepKeys) m.put(k, "Sonnet 4.6");

        m.put("TAROT", "Sonnet 4.6");
        m.put("TAROT_ONE", "Sonnet 4.6");
        m.put("TAROT_THREE", "Sonnet 4.6");
        m.put("TAROT_FIVE", "Sonnet 4.6");
        m.put("SIGNUP_BONUS", "-");

        String[] haikuKeys = {
            "TODAY_FORTUNE", "SAJU_ANALYSIS", "DAILY_FORTUNE_EXTRA", "MANSERYEOK",
            "LOVE_RELATIONSHIP", "LOVE_CRUSH", "LOVE_SOME_CHECK", "LOVE_BLIND_DATE",
            "LOVE_COUPLE", "LOVE_CONFESSION", "LOVE_IDEAL_TYPE", "LOVE_REUNION",
            "LOVE_REMARRIAGE", "LOVE_MARRIAGE", "LOVE_PAST_LIFE", "LOVE_MEETING_TIMING",
            "LOVE_CONTACT",
            "COMPATIBILITY", "CELEB_COMPAT", "MBTI_COMPAT", "BLOODTYPE_COMPAT",
            "DREAM", "FACE_READING", "PSYCH_TEST",
            "BLOOD_TYPE", "MBTI", "CONSTELLATION", "BIORHYTHM",
            "CELEB_FORTUNE", "GROUP_FORTUNE", "GROUP_COMPAT", "CELEB_MATCH",
            "YEAR_FORTUNE", "MONTHLY_FORTUNE", "MONTHLY_FORTUNE_EXTRA", "WEEKLY_FORTUNE", "TOJEONG"
        };
        for (String k : haikuKeys) m.put(k, "Haiku 4.5");

        return m;
    }

    /**
     * 클라이언트 DEEP_ANALYSIS_HIDDEN=true 로 UI 차단된 심화 키 목록.
     * 활성: DEEP_COMPATIBILITY (정통궁합), DEEP_MARRIAGE_COMPAT (결혼궁합) 만.
     * DEEP_TAROT 는 서버 엔드포인트 있지만 타로 UI 에서 버튼 제거됨.
     */
    public java.util.Set<String> getBlockedConfigKeys() {
        return java.util.Set.of(
            "DEEP_TODAY", "DEEP_LOVE", "DEEP_REUNION", "DEEP_REMARRIAGE", "DEEP_BLIND_DATE",
            "DEEP_YEARLY", "DEEP_MONTHLY", "DEEP_WEEKLY", "DEEP_BLOODTYPE", "DEEP_MBTI",
            "DEEP_CONSTELLATION", "DEEP_TOJEONG", "DEEP_TAROT"
        );
    }

    /**
     * 페이지 섹션 POJO — 템플릿에서 iterate.
     */
    @lombok.AllArgsConstructor @lombok.Getter
    public static class PageSection {
        private String icon;
        private String title;
        private String path;     // 앱 라우트 (참고)
        private List<ItemView> items;
    }

    @lombok.AllArgsConstructor @lombok.Getter
    public static class ItemView {
        private HeartPointConfig config;
        private String aiModel;
        private boolean blocked; // DEEP_ANALYSIS_HIDDEN 상태
        private boolean deep;    // DEEP_* 여부 (배지용)
    }

    /**
     * 실제 앱 메뉴/페이지 단위로 하트 설정 묶음 구성.
     * 같은 페이지에 일반+심화 공존하면 일반이 위, 심화가 아래로 상하 배치됨.
     */
    public List<PageSection> getConfigsByPage() {
        Map<String, HeartPointConfig> byKey = new LinkedHashMap<>();
        for (HeartPointConfig c : heartPointConfigRepository.findAll()) {
            byKey.put(c.getAnalysisCategory(), c);
        }
        Map<String, String> aiMap = getAiModelMap();
        java.util.Set<String> blocked = getBlockedConfigKeys();

        // {icon, title, path, keys[]}
        Object[][] defs = new Object[][] {
            {"🏠", "홈 · 오늘의 운세", "/", new String[]{"TODAY_FORTUNE", "DAILY_FORTUNE_EXTRA", "DEEP_TODAY"}},
            {"☯️", "사주 분석", "/saju", new String[]{"SAJU_ANALYSIS"}},
            {"📜", "만세력", "/manseryeok", new String[]{"MANSERYEOK"}},
            {"📖", "토정비결", "/tojeong", new String[]{"TOJEONG", "DEEP_TOJEONG"}},
            {"🎍", "신년운세", "/year-fortune", new String[]{"YEAR_FORTUNE", "DEEP_YEARLY"}},
            {"🗓️", "월간운세", "/monthly-fortune", new String[]{"MONTHLY_FORTUNE", "MONTHLY_FORTUNE_EXTRA", "DEEP_MONTHLY"}},
            {"📅", "주간운세", "/weekly-fortune", new String[]{"WEEKLY_FORTUNE", "DEEP_WEEKLY"}},
            {"💕", "1:1 연애운 — 연애진단", "/love/relationship", new String[]{"LOVE_RELATIONSHIP", "DEEP_LOVE"}},
            {"💘", "1:1 연애운 — 짝사랑 / 썸", "/love", new String[]{"LOVE_CRUSH", "LOVE_SOME_CHECK"}},
            {"👀", "1:1 연애운 — 소개팅", "/love/blind_date", new String[]{"LOVE_BLIND_DATE", "DEEP_BLIND_DATE"}},
            {"👫", "1:1 연애운 — 커플 / 데이트", "/love/couple_fortune", new String[]{"LOVE_COUPLE"}},
            {"🗣️", "1:1 연애운 — 고백 / 이상형", "/love", new String[]{"LOVE_CONFESSION", "LOVE_IDEAL_TYPE"}},
            {"🔄", "1:1 연애운 — 재회 / 재혼", "/love", new String[]{"LOVE_REUNION", "DEEP_REUNION", "LOVE_REMARRIAGE", "DEEP_REMARRIAGE"}},
            {"💍", "1:1 연애운 — 결혼 / 전생인연", "/love", new String[]{"LOVE_MARRIAGE", "LOVE_PAST_LIFE"}},
            {"📞", "1:1 연애운 — 만남시기 / 연락", "/love", new String[]{"LOVE_MEETING_TIMING", "LOVE_CONTACT"}},
            {"💑", "사주 궁합 (나의 연인)", "/my-love-compat", new String[]{"COMPATIBILITY", "DEEP_COMPATIBILITY", "DEEP_MARRIAGE_COMPAT"}},
            {"⭐", "최애 스타 / 그룹 운세", "/celeb-fortune", new String[]{"CELEB_COMPAT", "CELEB_FORTUNE", "CELEB_MATCH", "GROUP_FORTUNE", "GROUP_COMPAT"}},
            {"🃏", "타로 카드", "/tarot", new String[]{"TAROT", "TAROT_ONE", "TAROT_THREE", "TAROT_FIVE", "DEEP_TAROT"}},
            {"🌙", "꿈 해몽", "/dream", new String[]{"DREAM"}},
            {"👤", "관상 분석", "/face-reading", new String[]{"FACE_READING"}},
            {"🎭", "심리 테스트", "/psych-test", new String[]{"PSYCH_TEST"}},
            {"💓", "바이오리듬", "/biorhythm", new String[]{"BIORHYTHM"}},
            {"🩸", "혈액형 운세 / 궁합", "/bloodtype", new String[]{"BLOOD_TYPE", "BLOODTYPE_COMPAT", "DEEP_BLOODTYPE"}},
            {"🧬", "MBTI 운세 / 궁합", "/mbti", new String[]{"MBTI", "MBTI_COMPAT", "DEEP_MBTI"}},
            {"✨", "별자리 운세", "/constellation", new String[]{"CONSTELLATION", "DEEP_CONSTELLATION"}},
            {"🎁", "시스템 · 회원가입 보너스", "/", new String[]{"SIGNUP_BONUS"}},
        };

        List<PageSection> sections = new java.util.ArrayList<>();
        java.util.Set<String> usedKeys = new java.util.HashSet<>();
        for (Object[] def : defs) {
            String icon = (String) def[0];
            String title = (String) def[1];
            String path = (String) def[2];
            String[] keys = (String[]) def[3];
            List<ItemView> items = new java.util.ArrayList<>();
            for (String key : keys) {
                HeartPointConfig c = byKey.get(key);
                if (c == null) continue;
                usedKeys.add(key);
                items.add(new ItemView(c, aiMap.getOrDefault(key, "미매핑"),
                    blocked.contains(key), key.startsWith("DEEP_")));
            }
            if (!items.isEmpty()) {
                sections.add(new PageSection(icon, title, path, items));
            }
        }

        // 누락된 키 (정의 추가 전 신규 config 대비 안전망)
        List<ItemView> unassigned = new java.util.ArrayList<>();
        for (HeartPointConfig c : byKey.values()) {
            if (!usedKeys.contains(c.getAnalysisCategory())) {
                unassigned.add(new ItemView(c,
                    aiMap.getOrDefault(c.getAnalysisCategory(), "미매핑"),
                    blocked.contains(c.getAnalysisCategory()),
                    c.getAnalysisCategory().startsWith("DEEP_")));
            }
        }
        if (!unassigned.isEmpty()) {
            sections.add(new PageSection("❓", "미분류 (신규 추가 대기)", "", unassigned));
        }

        return sections;
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
