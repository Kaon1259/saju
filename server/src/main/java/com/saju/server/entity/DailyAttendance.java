package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 일일 출석 기록 — 사용자별 출석 1일 1행 (uniqueConstraint 보장).
 * 어제까지의 consecutiveDays 와 함께 저장하여 재계산 비용 최소화.
 */
@Entity
@Table(name = "daily_attendance",
       uniqueConstraints = @UniqueConstraint(
           name = "uk_attendance_user_date",
           columnNames = {"user_id", "attend_date"}
       ),
       indexes = {
           // DESC 키워드는 일부 Hibernate/MySQL 조합에서 DDL 생성 실패 → 단순 ASC 인덱스로 (조회는 어차피 user_id 매칭이 prune)
           @Index(name = "idx_attendance_user_date", columnList = "user_id, attend_date")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "attend_date", nullable = false)
    private LocalDate attendDate;

    /** 연속 출석 일수 (1부터 시작 — 오늘 첫 출석이면 1, 7일 연속이면 7) */
    @Column(name = "consecutive_days", nullable = false)
    private Integer consecutiveDays;

    /** 지급된 하트 (기본 + 연속 보너스 합산) */
    @Column(name = "reward_amount", nullable = false)
    private Integer rewardAmount;

    /** 마일스톤 보너스가 함께 지급된 경우 카테고리 코드 (ATTENDANCE_7DAY 등), 아니면 null */
    @Column(name = "milestone_category", length = 50)
    private String milestoneCategory;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
    }
}
