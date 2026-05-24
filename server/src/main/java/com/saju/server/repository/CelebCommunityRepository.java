package com.saju.server.repository;

import com.saju.server.entity.CelebCommunity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface CelebCommunityRepository extends JpaRepository<CelebCommunity, Long> {

    Optional<CelebCommunity> findByNameAndBirth(String name, String birth);

    Optional<CelebCommunity> findFirstByName(String name);

    List<CelebCommunity> findAllByOrderBySearchCountDescUpdatedAtDesc();

    List<CelebCommunity> findByCategoryOrderBySearchCountDescUpdatedAtDesc(String category);

    // 자체 트랜잭션 — 컨트롤러 메서드 @Transactional 제거 후에도 동작 + 실패 시 호출부 트랜잭션 오염 방지
    @Transactional
    @Modifying
    @Query("update CelebCommunity c set c.searchCount = c.searchCount + 1, c.updatedAt = CURRENT_TIMESTAMP where c.id = :id")
    void incrementSearchCount(@Param("id") Long id);
}
