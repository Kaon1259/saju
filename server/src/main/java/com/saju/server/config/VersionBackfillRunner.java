package com.saju.server.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 일회성 백필 — c42604d 가 User 에 @Version 을 추가했지만 ddl-auto:update 가
 * 새 column 만 추가하고 기존 row 의 version 은 NULL 인 채로 남김. 그 결과
 * 카카오 재로그인 시 userRepository.save(user) 가 WHERE id=? AND version=NULL
 * 매칭에 실패해 OptimisticLockingFailureException → 409 → "로그인 실패" 토스트.
 *
 * 이 러너가 시작 시 1회 NULL → 0 백필. 이후 기동에서는 0 rows 업데이트라 무해.
 */
@Component
@Slf4j
public class VersionBackfillRunner implements ApplicationRunner {

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            int updated = em.createNativeQuery("UPDATE users SET version = 0 WHERE version IS NULL").executeUpdate();
            if (updated > 0) {
                log.warn("[VersionBackfill] users.version NULL → 0: {} rows", updated);
            }
        } catch (Exception e) {
            log.error("[VersionBackfill] failed (앱은 계속 기동): {}", e.getMessage(), e);
        }
    }
}
