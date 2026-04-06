package com.saju.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "heart_point_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartPointLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 30)
    private String transactionType;

    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false)
    private Integer balanceAfter;

    @Column(length = 200)
    private String description;

    @Column(length = 100)
    private String analysisType;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
