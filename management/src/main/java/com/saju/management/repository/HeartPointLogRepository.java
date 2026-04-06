package com.saju.management.repository;

import com.saju.management.entity.HeartPointLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HeartPointLogRepository extends JpaRepository<HeartPointLog, Long> {

    Page<HeartPointLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<HeartPointLog> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);

    Page<HeartPointLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM HeartPointLog l WHERE l.amount > 0")
    long sumTotalGranted();

    @Query("SELECT COALESCE(SUM(ABS(l.amount)), 0) FROM HeartPointLog l WHERE l.amount < 0")
    long sumTotalDeducted();
}
