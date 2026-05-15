package com.saju.management.repository;

import com.saju.management.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPhone(String phone);

    Page<User> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since")
    long countNewUsersSince(LocalDateTime since);

    @Query("SELECT COALESCE(SUM(u.heartPoints), 0) FROM User u")
    long sumAllHeartPoints();

    // ── 게스트(guest_*) 제외 — 운영툴 목록/통계용 ──
    @Query("SELECT u FROM User u WHERE u.kakaoId IS NULL OR u.kakaoId NOT LIKE 'guest_%'")
    Page<User> findAllNonGuest(Pageable pageable);

    @Query("SELECT u FROM User u WHERE (u.kakaoId IS NULL OR u.kakaoId NOT LIKE 'guest_%') "
            + "AND LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> searchNonGuest(String search, Pageable pageable);

    @Query("SELECT COUNT(u) FROM User u WHERE u.kakaoId IS NULL OR u.kakaoId NOT LIKE 'guest_%'")
    long countNonGuest();

    @Query("SELECT COUNT(u) FROM User u WHERE u.kakaoId LIKE 'guest_%'")
    long countGuests();

    @Query("SELECT COUNT(u) FROM User u WHERE (u.kakaoId IS NULL OR u.kakaoId NOT LIKE 'guest_%') "
            + "AND u.createdAt >= :since")
    long countNonGuestNewUsersSince(LocalDateTime since);
}
