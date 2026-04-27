package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "zodiac_fortune",
       uniqueConstraints = @UniqueConstraint(columnNames = {"animal", "fortuneDate"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ZodiacFortune {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String animal;

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
    @Column(columnDefinition = "TEXT")
    private String advice;
    @Column(columnDefinition = "TEXT")
    private String summary;
    @Column(name = "element_influence", columnDefinition = "TEXT")
    private String elementInfluence;
    @Column(name = "emotional_tip", columnDefinition = "TEXT")
    private String emotionalTip;
    @Column(name = "time_advice", columnDefinition = "TEXT")
    private String timeAdvice;

    private Integer luckyNumber;
    private String luckyColor;
    private Integer score;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
