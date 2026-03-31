package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mbti_fortune",
       uniqueConstraints = @UniqueConstraint(columnNames = {"mbtiType", "zodiacAnimal", "fortuneDate"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MbtiFortune {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 4)
    private String mbtiType;

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
    @Column(columnDefinition = "TEXT")
    private String tip;

    private Integer luckyNumber;
    private String luckyColor;
    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String personality;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
