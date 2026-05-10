package com.saju.server.repository;

import com.saju.server.entity.DailyAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyAttendanceRepository extends JpaRepository<DailyAttendance, Long> {

    Optional<DailyAttendance> findByUserIdAndAttendDate(Long userId, LocalDate attendDate);

    boolean existsByUserIdAndAttendDate(Long userId, LocalDate attendDate);

    /** 가장 최근 출석 1행 — 어제 출석 여부 + consecutive 추적용 */
    Optional<DailyAttendance> findTopByUserIdOrderByAttendDateDesc(Long userId);

    /** 기간 내 출석 기록 (캘린더 표시용) */
    List<DailyAttendance> findByUserIdAndAttendDateBetweenOrderByAttendDateAsc(
            Long userId, LocalDate fromDate, LocalDate toDate);
}
