package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 사용자별 운세/타로 조회 기록.
 * type으로 필터링해서 각 페이지에서 "최근 본 결과" 목록 노출.
 * payloadJson에 재현에 필요한 모든 데이터(입력값 + AI 결과) 저장.
 */
@Entity
@Table(name = "fortune_history",
       indexes = {
           @Index(name = "idx_user_type_created", columnList = "userId,type,createdAt"),
           @Index(name = "idx_user_created", columnList = "userId,createdAt")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FortuneHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    /** tarot, today_fortune, partner_fortune, other_fortune, love_11, compatibility, my_love_compat */
    @Column(nullable = false, length = 32)
    private String type;

    /** 목록에 노출되는 제목 (예: "2026-04-18 데일리 타로 (연애)") */
    @Column(nullable = false, length = 120)
    private String title;

    /** 한줄 요약 (점수, 질문, 키워드 등) */
    @Column(length = 255)
    private String summary;

    /** 재현에 필요한 전체 JSON (입력값 + 결과) */
    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String payloadJson;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
