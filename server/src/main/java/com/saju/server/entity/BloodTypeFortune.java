package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bloodtype_fortune",
       uniqueConstraints = @UniqueConstraint(columnNames = {"bloodType", "zodiacAnimal", "fortuneDate"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BloodTypeFortune {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 4)
    private String bloodType;

    @Column(nullable = false, length = 10)
    private String zodiacAnimal;

    @Column(nullable = false)
    private LocalDate fortuneDate;

    @Column(columnDefinition = "TEXT")
    private String overall;
    @Column(columnDefinition = "TEXT")
    private String love;
    @Column(columnDefinition = "TEXT")
    private String money;
    @Column(columnDefinition = "TEXT")
    private String health;
    @Column(columnDefinition = "TEXT")
    private String work;

    private Integer luckyNumber;
    private String luckyColor;
    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String personality;

    @Column(columnDefinition = "TEXT")
    private String dayAnalysis;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
