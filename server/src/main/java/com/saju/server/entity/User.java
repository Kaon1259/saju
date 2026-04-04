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

    @Column(nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false, length = 10)
    private String calendarType; // SOLAR or LUNAR

    @Column(nullable = true)
    private String birthTime;

    @Column(nullable = false, length = 1)
    private String gender;

    @Column(nullable = false)
    private String zodiacAnimal;

    @Column(length = 4)
    private String bloodType;

    @Column(length = 4)
    private String mbtiType;

    @Column(length = 20)
    private String relationshipStatus; // IN_RELATIONSHIP, SOME, SINGLE

    // 상대방 정보
    private LocalDate partnerBirthDate;
    private String partnerBirthTime;
    @Column(length = 4)
    private String partnerBloodType;
    @Column(length = 4)
    private String partnerMbtiType;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
