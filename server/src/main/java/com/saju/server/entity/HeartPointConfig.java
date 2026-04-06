package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "heart_point_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartPointConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String analysisCategory;

    @Column(nullable = false)
    private Integer cost;

    @Column(length = 30)
    private String menuGroup; // 기본운세, 연애/궁합, 특수분석, 운세종합, 기간별운세, 심화, 시스템

    @Column(length = 100)
    private String description;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
