package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_fortune",
       uniqueConstraints = @UniqueConstraint(columnNames = {"zodiac_animal", "fortune_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyFortune {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "zodiac_animal", nullable = false)
    private String zodiacAnimal;

    @Column(name = "fortune_date", nullable = false)
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

    @Column(name = "hourly_fortune_json", columnDefinition = "TEXT")
    private String hourlyFortuneJson;

    private Integer luckyNumber;

    private String luckyColor;

    @Column(name = "lucky_direction")
    private String luckyDirection;

    @Column(name = "lucky_food", columnDefinition = "TEXT")
    private String luckyFood;

    @Column(name = "lucky_fashion", columnDefinition = "TEXT")
    private String luckyFashion;

    @Column(name = "lucky_item", columnDefinition = "TEXT")
    private String luckyItem;

    private Integer score;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
