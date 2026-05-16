package com.saju.server.service;

import com.saju.server.dto.AttendanceResponse;
import com.saju.server.entity.DailyAttendance;
import com.saju.server.entity.User;
import com.saju.server.repository.DailyAttendanceRepository;
import com.saju.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 일일 출석 보너스 서비스.
 *
 * 정책 (2026-05-16 적립 과다 조정 — 무한 적립 억제):
 *  - 매일 첫 출석:    +3하트 (DAILY_ATTENDANCE)
 *  - 7일 연속:        +15하트 추가 (ATTENDANCE_7DAY)
 *  - 14일 연속:       +30하트 추가 (ATTENDANCE_14DAY)
 *  - 30일 연속:       +60하트 추가 (ATTENDANCE_30DAY)
 *  - 연속 깨지면 1일부터 다시 시작
 *
 * 마일스톤은 7/14/30 의 정확한 day 도달 시 1회 지급 (예: 8일째에는 안 줌, 14일째에 +50, 그 이후 21일째엔 +20 다시).
 *  → 7일 주기 반복 보상 + 14/30은 별도 1회.
 *
 * 차감/지급 모두 HeartPointService.adminAdjust 통해 진행 → HeartPointLog 기록 통일.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final DailyAttendanceRepository attendanceRepository;
    private final HeartPointService heartPointService;
    private final UserRepository userRepository;

    private static final int BASE_REWARD = 3;
    private static final int BONUS_7DAY = 15;
    private static final int BONUS_14DAY = 30;
    private static final int BONUS_30DAY = 60;

    /**
     * 오늘 출석 체크인. 이미 받았으면 alreadyChecked=true 반환.
     */
    @Transactional
    public AttendanceResponse checkInToday(Long userId) {
        try {
            return doCheckInToday(userId);
        } catch (Exception e) {
            log.warn("[Attendance] checkInToday 실패 — 빈 상태 반환: userId={}, err={}", userId, e.getMessage());
            return emptyStatus(userId);
        }
    }

    private AttendanceResponse doCheckInToday(Long userId) {
        LocalDate today = LocalDate.now();

        // 이미 오늘 출석 받았는지 확인
        Optional<DailyAttendance> existing = attendanceRepository.findByUserIdAndAttendDate(userId, today);
        if (existing.isPresent()) {
            int balance = currentBalance(userId);
            return buildAlreadyChecked(existing.get(), balance);
        }

        // 어제 출석 여부로 consecutive 계산
        int consecutive = computeConsecutiveDays(userId, today);

        // 마일스톤 보너스 계산
        int milestoneBonus = 0;
        String milestoneCategory = null;
        if (consecutive > 0 && consecutive % 30 == 0) {
            milestoneBonus = BONUS_30DAY;
            milestoneCategory = "ATTENDANCE_30DAY";
        } else if (consecutive > 0 && consecutive % 14 == 0) {
            milestoneBonus = BONUS_14DAY;
            milestoneCategory = "ATTENDANCE_14DAY";
        } else if (consecutive > 0 && consecutive % 7 == 0) {
            milestoneBonus = BONUS_7DAY;
            milestoneCategory = "ATTENDANCE_7DAY";
        }

        int totalReward = BASE_REWARD + milestoneBonus;

        // 하트 지급 (기본)
        heartPointService.adminAdjust(userId, BASE_REWARD,
            "일일 출석 (" + consecutive + "일 연속)");

        // 마일스톤 보너스 별도 지급 (로그 분리 — 회계 추적 용이)
        if (milestoneBonus > 0) {
            heartPointService.adminAdjust(userId, milestoneBonus,
                consecutive + "일 연속 출석 보너스");
        }

        // 출석 기록 저장
        DailyAttendance saved = attendanceRepository.save(DailyAttendance.builder()
            .userId(userId)
            .attendDate(today)
            .consecutiveDays(consecutive)
            .rewardAmount(totalReward)
            .milestoneCategory(milestoneCategory)
            .createdAt(LocalDateTime.now())
            .build());

        int balance = currentBalance(userId);
        log.info("출석 체크인: userId={}, consecutive={}, reward={}, balance={}",
            userId, consecutive, totalReward, balance);

        return AttendanceResponse.builder()
            .alreadyChecked(false)
            .rewardAmount(totalReward)
            .baseReward(BASE_REWARD)
            .milestoneBonus(milestoneBonus)
            .milestoneCategory(milestoneCategory)
            .consecutiveDays(saved.getConsecutiveDays())
            .balanceAfter(balance)
            .checkedToday(true)
            .daysToNextMilestone(daysToNextMilestone(consecutive))
            .nextMilestoneReward(nextMilestoneReward(consecutive))
            .build();
    }

    /**
     * 출석 상태 조회 (체크인 없음).
     * 테이블 미생성/스키마 불일치 등 DB 예외 시에도 graceful — 빈 상태 반환.
     */
    @Transactional(readOnly = true)
    public AttendanceResponse getStatus(Long userId) {
        try {
            LocalDate today = LocalDate.now();
            Optional<DailyAttendance> todayRow = attendanceRepository.findByUserIdAndAttendDate(userId, today);
            boolean checkedToday = todayRow.isPresent();

            int consecutive;
            if (checkedToday) {
                consecutive = todayRow.get().getConsecutiveDays();
            } else {
                Optional<DailyAttendance> last = attendanceRepository.findTopByUserIdOrderByAttendDateDesc(userId);
                if (last.isPresent() && last.get().getAttendDate().equals(today.minusDays(1))) {
                    consecutive = last.get().getConsecutiveDays();
                } else {
                    consecutive = 0;
                }
            }

            return AttendanceResponse.builder()
                .alreadyChecked(checkedToday)
                .rewardAmount(checkedToday ? todayRow.get().getRewardAmount() : 0)
                .baseReward(BASE_REWARD)
                .milestoneBonus(checkedToday && todayRow.get().getMilestoneCategory() != null
                    ? todayRow.get().getRewardAmount() - BASE_REWARD : 0)
                .milestoneCategory(checkedToday ? todayRow.get().getMilestoneCategory() : null)
                .consecutiveDays(consecutive)
                .balanceAfter(currentBalance(userId))
                .checkedToday(checkedToday)
                .daysToNextMilestone(daysToNextMilestone(checkedToday ? consecutive : consecutive + 1))
                .nextMilestoneReward(nextMilestoneReward(checkedToday ? consecutive : consecutive + 1))
                .build();
        } catch (Exception e) {
            log.warn("[Attendance] getStatus 실패 — 빈 상태 반환: userId={}, err={}", userId, e.getMessage());
            return emptyStatus(userId);
        }
    }

    private AttendanceResponse emptyStatus(Long userId) {
        return AttendanceResponse.builder()
            .alreadyChecked(false)
            .rewardAmount(0)
            .baseReward(BASE_REWARD)
            .milestoneBonus(0)
            .milestoneCategory(null)
            .consecutiveDays(0)
            .balanceAfter(currentBalanceSafe(userId))
            .checkedToday(false)
            .daysToNextMilestone(7)
            .nextMilestoneReward(BONUS_7DAY)
            .build();
    }

    private int currentBalanceSafe(Long userId) {
        try { return currentBalance(userId); } catch (Exception e) { return 0; }
    }

    /**
     * 어제 출석 여부 기준 consecutive 계산.
     * 어제 출석했으면 consecutiveDays + 1, 아니면 1 (재시작).
     */
    private int computeConsecutiveDays(Long userId, LocalDate today) {
        Optional<DailyAttendance> last = attendanceRepository.findTopByUserIdOrderByAttendDateDesc(userId);
        if (last.isEmpty()) return 1;  // 첫 출석
        LocalDate lastDate = last.get().getAttendDate();
        if (lastDate.equals(today.minusDays(1))) {
            return last.get().getConsecutiveDays() + 1;
        }
        return 1;  // 끊김 → 재시작
    }

    /** 다음 7/14/30 마일스톤까지 남은 일수 (현재 + 다음을 비교) */
    private int daysToNextMilestone(int currentOrNext) {
        // 7, 14, 30 중 currentOrNext 보다 큰 가장 가까운 값
        int[] milestones = {7, 14, 30};
        for (int m : milestones) {
            if (currentOrNext < m) return m - currentOrNext;
        }
        // 30 이상이면 다음 7일 주기 (37, 44, ...) 까지
        int next7 = ((currentOrNext / 7) + 1) * 7;
        return next7 - currentOrNext;
    }

    /** 다음 마일스톤 도달 시 추가 보너스 */
    private int nextMilestoneReward(int currentOrNext) {
        if (currentOrNext < 7) return BONUS_7DAY;
        if (currentOrNext < 14) return BONUS_14DAY;
        if (currentOrNext < 30) return BONUS_30DAY;
        return BONUS_7DAY;  // 30일 이후엔 7일 주기 반복
    }

    private int currentBalance(Long userId) {
        return userRepository.findById(userId)
            .map(User::getHeartPoints)
            .orElse(0);
    }

    /**
     * 최근 N일 출석 기록 — 캘린더/마일스톤 화면용.
     * 반환 배열 각 항목: { date, consecutiveDays, rewardAmount, milestoneCategory }
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> getRecentHistory(Long userId, int days) {
        try {
            LocalDate today = LocalDate.now();
            LocalDate from = today.minusDays(Math.max(1, days) - 1);
            return attendanceRepository
                .findByUserIdAndAttendDateBetweenOrderByAttendDateAsc(userId, from, today)
                .stream()
                .map(a -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("date", a.getAttendDate().toString());
                    m.put("consecutiveDays", a.getConsecutiveDays());
                    m.put("rewardAmount", a.getRewardAmount());
                    m.put("milestoneCategory", a.getMilestoneCategory());
                    return m;
                })
                .toList();
        } catch (Exception e) {
            log.warn("[Attendance] getRecentHistory 실패 — 빈 배열 반환: userId={}, err={}", userId, e.getMessage());
            return java.util.Collections.emptyList();
        }
    }

    private AttendanceResponse buildAlreadyChecked(DailyAttendance row, int balance) {
        int milestoneBonus = row.getMilestoneCategory() != null ? row.getRewardAmount() - BASE_REWARD : 0;
        return AttendanceResponse.builder()
            .alreadyChecked(true)
            .rewardAmount(row.getRewardAmount())
            .baseReward(BASE_REWARD)
            .milestoneBonus(milestoneBonus)
            .milestoneCategory(row.getMilestoneCategory())
            .consecutiveDays(row.getConsecutiveDays())
            .balanceAfter(balance)
            .checkedToday(true)
            .daysToNextMilestone(daysToNextMilestone(row.getConsecutiveDays()))
            .nextMilestoneReward(nextMilestoneReward(row.getConsecutiveDays()))
            .build();
    }
}
