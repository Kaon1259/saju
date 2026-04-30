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

    /** 하트 차감 동시성 보호용 낙관적 잠금. 충돌 시 OptimisticLockingFailureException. */
    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
