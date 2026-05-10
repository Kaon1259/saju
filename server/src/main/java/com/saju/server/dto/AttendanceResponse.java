package com.saju.server.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 출석 체크인/조회 응답.
 *
 * checkInToday 결과:
 *  - alreadyChecked=true 면 오늘 이미 받음 (rewardAmount=0, balanceAfter는 현재 잔액)
 *  - alreadyChecked=false 면 신규 지급 (rewardAmount = 5 + (마일스톤이면 보너스))
 *
 * status 결과:
 *  - checkedToday: 오늘 출석 여부
 *  - consecutiveDays: 현재 연속 일수 (오늘 미출석이고 어제도 안 했으면 0)
 *  - daysToNextMilestone: 다음 7/14/30 일까지 남은 일수
 *  - nextMilestoneReward: 다음 마일스톤 도달 시 추가 지급될 보너스
 */
@Getter
@Builder
@AllArgsConstructor
public class AttendanceResponse {
    private boolean alreadyChecked;
    private int rewardAmount;
    private int baseReward;
    private int milestoneBonus;
    private String milestoneCategory;   // ATTENDANCE_7DAY 등 — 보상 알림용
    private int consecutiveDays;
    private int balanceAfter;

    private boolean checkedToday;
    private int daysToNextMilestone;
    private int nextMilestoneReward;
}
