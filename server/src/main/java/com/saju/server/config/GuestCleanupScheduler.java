package com.saju.server.config;

import com.saju.server.entity.User;
import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 게스트(guest_*) 계정 자동 정리.
 *
 * 게스트는 무료 운세 모달에서 guestId(UUID) 마다 실제 User row 가 생성되므로,
 * 정리하지 않으면 users 테이블이 무한 팽창하고 운영툴 통계가 오염된다.
 * createdAt 기준 TTL 경과 게스트를 매일 새벽 삭제 — 하트 로그도 함께 제거.
 *
 * (운세 캐시 등 userId 참조 row 는 키 기반 조회라 orphan 으로 남아도 무해 — 재조회되지 않음)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GuestCleanupScheduler {

    private final UserRepository userRepository;
    private final HeartPointLogRepository heartPointLogRepository;

    /** 생성 후 이 일수가 지난 게스트는 삭제 대상 */
    private static final int GUEST_TTL_DAYS = 14;

    /** 매일 새벽 4시 (서버 타임존 기준) */
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void cleanupStaleGuests() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(GUEST_TTL_DAYS);
        List<User> stale = userRepository.findStaleGuests(cutoff);
        if (stale.isEmpty()) {
            log.info("게스트 정리: 대상 없음 (cutoff={})", cutoff);
            return;
        }

        List<Long> ids = stale.stream().map(User::getId).toList();
        int logsDeleted = heartPointLogRepository.deleteByUserIdIn(ids);
        userRepository.deleteAllInBatch(stale);

        log.info("게스트 정리 완료: 계정 {}명 삭제, 하트로그 {}건 삭제 (cutoff={})",
                stale.size(), logsDeleted, cutoff);
    }
}
