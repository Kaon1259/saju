package com.saju.server.service;

import com.saju.server.entity.User;
import com.saju.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

/**
 * 친구 초대 — 양방향 보너스.
 *
 *  - 가입 시 또는 최초 조회 시 8자 referralCode 자동 부여 (영문대문자 + 숫자, 비속어 회피용 단순 set).
 *  - 피초대자(신규 가입자)가 코드 입력 → 1회만 apply 가능.
 *    · 초대자/피초대자 모두 INVITE_INVITER / INVITE_INVITEE 카테고리로 +30 하트 지급.
 *    · self-referral, 이미 referredBy 가 set 된 유저, 존재하지 않는 코드, 자기 코드 모두 차단.
 *  - stats 는 내가 초대한 친구 수 + 누적 보너스 (count × 30) 반환.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReferralService {

    private final UserRepository userRepository;
    private final HeartPointService heartPointService;

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 제외
    private static final int CODE_LENGTH = 8;
    private static final int MAX_GEN_ATTEMPTS = 8;
    private static final SecureRandom RNG = new SecureRandom();

    /** 초대자가 보너스를 받을 수 있는 최대 인원 — 부계정 어뷰징 방어. 초과분은 피초대자만 지급. */
    private static final int MAX_INVITER_REWARDS = 20;

    /** 내 referralCode 조회. 없으면 생성 후 저장. */
    @Transactional
    public String getOrCreateMyCode(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        if (user.getReferralCode() != null && !user.getReferralCode().isBlank()) {
            return user.getReferralCode();
        }
        String code = generateUniqueCode();
        user.setReferralCode(code);
        userRepository.save(user);
        log.info("초대 코드 생성: userId={}, code={}", userId, code);
        return code;
    }

    /** 코드 적용 — 신규 가입자가 1회만 호출. 양쪽에 +30 하트 지급. */
    @Transactional
    public Map<String, Object> applyCode(Long userId, String rawCode) {
        Map<String, Object> result = new HashMap<>();
        result.put("ok", false);

        if (rawCode == null || rawCode.isBlank()) {
            result.put("reason", "empty");
            return result;
        }
        String code = rawCode.trim().toUpperCase();

        User invitee = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (invitee.getReferredBy() != null) {
            result.put("reason", "already_applied");
            return result;
        }
        if (code.equalsIgnoreCase(invitee.getReferralCode())) {
            result.put("reason", "self_referral");
            return result;
        }

        User inviter = userRepository.findByReferralCode(code).orElse(null);
        if (inviter == null) {
            result.put("reason", "not_found");
            return result;
        }
        if (inviter.getId().equals(invitee.getId())) {
            result.put("reason", "self_referral");
            return result;
        }

        // 적용
        invitee.setReferredBy(inviter.getId());
        userRepository.save(invitee);

        int inviteeBonus = heartPointService.grantBonus(invitee.getId(), "INVITE_INVITEE",
                "친구 초대 보너스 (코드 사용)");

        // 초대자 보너스 — 상한(MAX_INVITER_REWARDS) 초과 시 미지급 (부계정 어뷰징 방어).
        // referredBy 저장 후 count 라 방금 적용분이 포함됨 → 21번째부터 capped.
        long inviterInviteCount = userRepository.countByReferredBy(inviter.getId());
        boolean inviterCapped = inviterInviteCount > MAX_INVITER_REWARDS;
        int inviterBonus = 0;
        if (inviterCapped) {
            log.info("초대 상한 초과 — 초대자 보너스 미지급: inviter={}, count={}",
                    inviter.getId(), inviterInviteCount);
        } else {
            inviterBonus = heartPointService.grantBonus(inviter.getId(), "INVITE_INVITER",
                    "친구 초대 보너스 (초대 완료) - userId=" + invitee.getId());
        }

        log.info("초대 코드 적용: invitee={}, inviter={}, inviteeBonus={}, inviterBonus={}, capped={}",
                invitee.getId(), inviter.getId(), inviteeBonus, inviterBonus, inviterCapped);

        result.put("ok", true);
        result.put("inviterName", inviter.getName());
        result.put("inviteeBonus", inviteeBonus);
        result.put("inviterBonus", inviterBonus);
        result.put("inviterCapped", inviterCapped);
        return result;
    }

    /** 내가 초대한 친구 수 + 누적 보너스 + 내 코드. */
    @Transactional
    public Map<String, Object> getStats(Long userId) {
        String code = getOrCreateMyCode(userId);
        long invitedCount = userRepository.countByReferredBy(userId);
        int perInviter = heartPointService.getCost("INVITE_INVITER");

        Map<String, Object> result = new HashMap<>();
        result.put("code", code);
        result.put("invitedCount", invitedCount);
        result.put("totalEarned", invitedCount * perInviter);
        result.put("rewardPerInvite", perInviter);
        result.put("inviteeBonus", heartPointService.getCost("INVITE_INVITEE"));
        return result;
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_ALPHABET.charAt(RNG.nextInt(CODE_ALPHABET.length())));
            }
            String code = sb.toString();
            if (userRepository.findByReferralCode(code).isEmpty()) {
                return code;
            }
        }
        // 매우 드문 충돌 — 마지막 시도는 timestamp suffix 로 보장
        return "U" + System.currentTimeMillis();
    }
}
