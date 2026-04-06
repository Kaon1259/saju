package com.saju.management.entity;

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
    private String menuGroup;

    @Column(length = 100)
    private String description;

    private LocalDateTime updatedAt;
}
