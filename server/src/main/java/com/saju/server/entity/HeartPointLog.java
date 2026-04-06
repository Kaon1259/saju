package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "heart_point_log", indexes = {
    @Index(name = "idx_hpl_user_id", columnList = "userId"),
    @Index(name = "idx_hpl_created_at", columnList = "createdAt")
})
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
    private String transactionType; // SIGNUP_BONUS, BASIC_ANALYSIS, DEEP_ANALYSIS, ADMIN_GRANT, ADMIN_DEDUCT, BULK_GRANT

    @Column(nullable = false)
    private Integer amount; // positive = grant, negative = deduct

    @Column(nullable = false)
    private Integer balanceAfter;

    @Column(length = 200)
    private String description;

    @Column(length = 100)
    private String analysisType; // e.g. "fortune/today/stream", "deep/fortune/stream"

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
