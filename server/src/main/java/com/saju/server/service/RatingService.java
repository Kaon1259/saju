package com.saju.server.service;

import com.saju.server.entity.User;
import com.saju.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Play Store 평점 보너스 — 1회 +50 하트.
 * 클라이언트가 평점 페이지 이동 후 돌아오면 명시적으로 /claim 호출.
 * 검증은 신뢰 기반 (Google Play in-app review API 통합 전까지 — 어뷰징 우려는 1회 제한으로 최소화).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RatingService {

    private final UserRepository userRepository;
    private final HeartPointService heartPointService;

    public Map<String, Object> getStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Map<String, Object> result = new HashMap<>();
        boolean claimed = Boolean.TRUE.equals(user.getRatingClaimed());
        result.put("claimed", claimed);
        result.put("reward", heartPointService.getCost("RATING_REWARD"));
        return result;
    }

    @Transactional
    public Map<String, Object> claim(Long userId) {
        Map<String, Object> result = new HashMap<>();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (Boolean.TRUE.equals(user.getRatingClaimed())) {
            result.put("ok", false);
            result.put("reason", "already_claimed");
            return result;
        }

        user.setRatingClaimed(true);
        userRepository.save(user);

        int bonus = heartPointService.grantBonus(userId, "RATING_REWARD",
                "Play Store 평점 후기 보너스");

        log.info("평점 보너스 지급: userId={}, bonus={}", userId, bonus);
        result.put("ok", true);
        result.put("reward", bonus);
        return result;
    }
}
