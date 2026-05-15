package com.saju.server.repository;

import com.saju.server.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    java.util.Optional<User> findByPhone(String phone);
    java.util.Optional<User> findByKakaoId(String kakaoId);
    java.util.Optional<User> findByReferralCode(String referralCode);
    long countByReferredBy(Long referredBy);

    /** TTL 경과한 게스트(guest_*) 계정 — 정리 스케줄러용 */
    @Query("SELECT u FROM User u WHERE u.kakaoId LIKE 'guest_%' AND u.createdAt < :cutoff")
    List<User> findStaleGuests(LocalDateTime cutoff);
}
