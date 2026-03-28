package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "special_fortune",
       uniqueConstraints = @UniqueConstraint(columnNames = {"fortuneType", "cacheKey", "fortuneDate"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SpecialFortune {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String fortuneType; // reunion, remarriage, blind_date, timeblock, hourly

    @Column(nullable = false, length = 64)
    private String cacheKey; // birthDate + gender + partnerDate 등의 해시

    @Column(nullable = false)
    private LocalDate fortuneDate;

    @Column(columnDefinition = "TEXT")
    private String resultJson; // 전체 결과 JSON

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
