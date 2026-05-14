package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String phone;

    @Column(unique = true)
    private String kakaoId;

    @Column(nullable = false)
    private String name;

    private LocalDate birthDate;

    @Column(length = 10)
    private String calendarType; // SOLAR or LUNAR

    private String birthTime;

    @Column(length = 1)
    private String gender;

    private String zodiacAnimal;

    @Column(length = 4)
    private String bloodType;

    @Column(length = 4)
    private String mbtiType;

    @Column(length = 500)
    private String profileImage;

    @Column(length = 20)
    private String relationshipStatus; // IN_RELATIONSHIP, SOME, SINGLE

    @Builder.Default
    private Integer heartPoints = 0;

    /** 친구 초대 — 가입 시 자동 생성되는 8자 코드 (대소문자 + 숫자). 다른 유저에게 공유. */
    @Column(length = 12, unique = true)
    private String referralCode;

    /** 친구 초대 — 이 유저를 가입시킨 초대자 id. apply 1회만 허용 (NULL 인 경우만 set). */
    private Long referredBy;

    /** Play Store 평점 보너스 1회 지급 여부. true 면 재청구 차단. */
    @Builder.Default
    private Boolean ratingClaimed = false;

    // 상대방 정보
    private LocalDate partnerBirthDate;
    private String partnerBirthTime;
    @Column(length = 8)
    private String partnerCalendarType; // SOLAR or LUNAR
    @Column(length = 4)
    private String partnerBloodType;
    @Column(length = 4)
    private String partnerMbtiType;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 하트 차감 동시성 보호용 낙관적 잠금. 충돌 시 OptimisticLockingFailureException.
     * @Builder.Default — c42604d 에서 추가됐으나 default 미지정 + ddl-auto:update 로
     * 기존 row 의 version 이 NULL 인 채로 남아 카카오 재로그인(save) 시 0 rows updated →
     * OptimisticLockingFailureException 발생. NULL → 0 백필은 VersionBackfillRunner 가 처리.
     */
    @Version
    @Builder.Default
    private Long version = 0L;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
