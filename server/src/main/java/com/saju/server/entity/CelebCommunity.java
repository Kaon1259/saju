package com.saju.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 사용자가 검색해서 발견한 연예인을 모두에게 공유하는 커뮤니티 DB.
 * Claude API로 한 번 검색되면 자동 저장 → 다음 사용자는 즉시 hit.
 * 내장 CELEBRITIES(498명) 외에 동적으로 늘어가는 풀.
 *
 * 카테고리: idol / actor / singer / entertainer / custom
 * 분류 자동 — Claude가 응답한 category 필드 그대로 저장.
 */
@Entity
@Table(name = "celeb_community",
       uniqueConstraints = @UniqueConstraint(columnNames = {"name", "birth"}),
       indexes = {
           @Index(name = "idx_celeb_category", columnList = "category"),
           @Index(name = "idx_celeb_search_count", columnList = "searchCount")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CelebCommunity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 80)
    private String realName;

    @Column(nullable = false, length = 10)
    private String birth; // YYYY-MM-DD

    @Column(nullable = false, length = 2)
    private String gender; // M/F

    @Column(length = 20)
    private String category; // idol/actor/singer/entertainer/custom

    @Column(length = 80)
    private String groupName; // 소속그룹 (있는 경우)

    @Column(columnDefinition = "TEXT")
    private String info; // 한 줄 소개

    @Column(nullable = false)
    private Integer searchCount; // 검색된 횟수 (정렬 가중치)

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (searchCount == null) searchCount = 1;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
