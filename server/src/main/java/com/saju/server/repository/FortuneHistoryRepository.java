package com.saju.server.repository;

import com.saju.server.entity.FortuneHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FortuneHistoryRepository extends JpaRepository<FortuneHistory, Long> {

    List<FortuneHistory> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type, Pageable pageable);

    List<FortuneHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserId(Long userId);

    Optional<FortuneHistory> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndTypeAndTitle(Long userId, String type, String title);

    @Query("SELECT h.id FROM FortuneHistory h WHERE h.userId = :userId ORDER BY h.createdAt DESC")
    List<Long> findIdsByUserIdOrderedDesc(@Param("userId") Long userId, Pageable pageable);

    void deleteByIdAndUserId(Long id, Long userId);

    void deleteByIdIn(List<Long> ids);
}
