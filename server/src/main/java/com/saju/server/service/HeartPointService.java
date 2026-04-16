package com.saju.server.service;

import com.saju.server.entity.HeartPointConfig;
import com.saju.server.entity.HeartPointLog;
import com.saju.server.entity.User;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.repository.HeartPointConfigRepository;
import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeartPointService {

    private final UserRepository userRepository;
    private final HeartPointLogRepository heartPointLogRepository;
    private final HeartPointConfigRepository heartPointConfigRepository;

    private static final int DEFAULT_BASIC_COST = 5;
    private static final int DEFAULT_DEEP_COST = 15;
    private static final int DEFAULT_SIGNUP_BONUS = 500;
    private static final int GUEST_BONUS = 10;

    public int getBalance(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return user.getHeartPoints() != null ? user.getHeartPoints() : 0;
    }

    public int getCost(String analysisCategory) {
        return heartPointConfigRepository.findByAnalysisCategory(analysisCategory)
                .map(HeartPointConfig::getCost)
                .orElseGet(() -> {
                    // DEEP_ 로 시작하면 심화분석 기본값
                    if (analysisCategory.startsWith("DEEP_")) return DEFAULT_DEEP_COST;
                    if ("SIGNUP_BONUS".equals(analysisCategory)) return DEFAULT_SIGNUP_BONUS;
                    return DEFAULT_BASIC_COST;
                });
    }

    public boolean hasEnoughPoints(Long userId, String analysisCategory) {
        int balance = getBalance(userId);
        int cost = getCost(analysisCategory);
        return balance >= cost;
    }

    /**
     * 하트 잔액 확인 (부족하면 예외) — 차감하지 않음
     */
    public void checkPoints(Long userId, String analysisCategory) {
        int balance = getBalance(userId);
        int cost = getCost(analysisCategory);
        if (balance < cost) {
            throw new InsufficientHeartsException(cost, balance);
        }
    }

    @Transactional
    public void deductPoints(Long userId, String analysisCategory, String endpointDesc) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        int cost = getCost(analysisCategory);
        int balance = user.getHeartPoints() != null ? user.getHeartPoints() : 0;

        if (balance < cost) {
            throw new InsufficientHeartsException(cost, balance);
        }

        user.setHeartPoints(balance - cost);
        userRepository.save(user);

        heartPointLogRepository.save(HeartPointLog.builder()
                .userId(userId)
                .transactionType(analysisCategory)
                .amount(-cost)
                .balanceAfter(user.getHeartPoints())
                .description(endpointDesc)
                .analysisType(endpointDesc)
                .build());

        log.info("하트 차감: userId={}, type={}, cost={}, remaining={}", userId, analysisCategory, cost, user.getHeartPoints());
    }

    @Transactional
    public void grantSignupBonus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        int bonus = getCost("SIGNUP_BONUS");
        int current = user.getHeartPoints() != null ? user.getHeartPoints() : 0;
        user.setHeartPoints(current + bonus);
        userRepository.save(user);

        heartPointLogRepository.save(HeartPointLog.builder()
                .userId(userId)
                .transactionType("SIGNUP_BONUS")
                .amount(bonus)
                .balanceAfter(user.getHeartPoints())
                .description("회원가입 보너스")
                .build());

        log.info("회원가입 보너스 지급: userId={}, bonus={}", userId, bonus);
    }

    @Transactional
    public void adminAdjust(Long userId, int amount, String description) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        int cur = user.getHeartPoints() != null ? user.getHeartPoints() : 0;
        user.setHeartPoints(cur + amount);
        if (user.getHeartPoints() < 0) {
            user.setHeartPoints(0);
        }
        userRepository.save(user);

        heartPointLogRepository.save(HeartPointLog.builder()
                .userId(userId)
                .transactionType(amount >= 0 ? "ADMIN_GRANT" : "ADMIN_DEDUCT")
                .amount(amount)
                .balanceAfter(user.getHeartPoints())
                .description(description)
                .build());

        log.info("관리자 하트 조정: userId={}, amount={}, balance={}", userId, amount, user.getHeartPoints());
    }

    public Map<String, Integer> getAllCosts() {
        Map<String, Integer> costs = new LinkedHashMap<>();
        heartPointConfigRepository.findAll().forEach(config ->
            costs.put(config.getAnalysisCategory(), config.getCost())
        );
        return costs;
    }

    @Transactional
    public User createGuestUser(String guestUuid) {
        // Check if guest already exists
        User existing = userRepository.findByKakaoId("guest_" + guestUuid).orElse(null);
        if (existing != null) return existing;

        User guest = new User();
        guest.setKakaoId("guest_" + guestUuid);
        guest.setName("Guest");
        guest.setBirthDate(java.time.LocalDate.of(2000, 1, 1));
        guest.setCalendarType("SOLAR");
        guest.setGender("M");
        guest.setZodiacAnimal("용띠");
        guest.setHeartPoints(GUEST_BONUS);
        userRepository.save(guest);

        heartPointLogRepository.save(HeartPointLog.builder()
                .userId(guest.getId())
                .transactionType("GUEST_BONUS")
                .amount(GUEST_BONUS)
                .balanceAfter(GUEST_BONUS)
                .description("게스트 보너스")
                .build());

        log.info("게스트 생성: guestUuid={}, userId={}, bonus={}", guestUuid, guest.getId(), GUEST_BONUS);
        return guest;
    }
}
