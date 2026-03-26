package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "constellation_fortune",
       uniqueConstraints = @UniqueConstraint(columnNames = {"sign", "fortuneDate"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConstellationFortune {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String sign;

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

    private Integer luckyNumber;
    private String luckyColor;
    private Integer score;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
