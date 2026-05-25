package com.saju.server.repository;

import com.saju.server.entity.HeartPointLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface HeartPointLogRepository extends JpaRepository<HeartPointLog, Long> {

    /** 특정 유저의 오늘(또는 지정 시각 이후) 특정 타입 지급 횟수 — 리워드 광고 하루 한도 체크용 */
    int countByUserIdAndTransactionTypeAndCreatedAtAfter(Long userId, String transactionType, LocalDateTime after);

    /** 게스트 정리 시 해당 유저들의 하트 로그 일괄 삭제 */
    @Modifying
    @Query("DELETE FROM HeartPointLog l WHERE l.userId IN :userIds")
    int deleteByUserIdIn(Collection<Long> userIds);

    Page<HeartPointLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<HeartPointLog> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);

    Page<HeartPointLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM HeartPointLog l WHERE l.amount > 0")
    Long sumTotalGranted();

    @Query("SELECT COALESCE(SUM(ABS(l.amount)), 0) FROM HeartPointLog l WHERE l.amount < 0")
    Long sumTotalDeducted();
}
