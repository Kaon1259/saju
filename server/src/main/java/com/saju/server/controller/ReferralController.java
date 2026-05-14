package com.saju.server.controller;

import com.saju.server.security.AuthUtil;
import com.saju.server.service.ReferralService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 친구 초대 API.
 *
 *  GET  /api/referral/code     - 내 코드 조회/자동 생성
 *  GET  /api/referral/stats    - 내 코드 + 초대 인원 + 누적 보너스
 *  POST /api/referral/apply    - 신규 가입자가 코드 적용 (1회)
 *
 * 모든 엔드포인트는 어떤 예외에도 200 응답 (UI 가 멈추지 않도록 — 출석 패턴과 동일).
 */
@RestController
@RequestMapping("/api/referral")
@RequiredArgsConstructor
@Slf4j
public class ReferralController {

    private final ReferralService referralService;

    @GetMapping("/code")
    public ResponseEntity<Map<String, Object>> code(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        Map<String, Object> body = new HashMap<>();
        try {
            body.put("code", referralService.getOrCreateMyCode(userId));
        } catch (Exception e) {
            log.warn("[Referral] code fallback: {}", e.getMessage());
            body.put("code", null);
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            return ResponseEntity.ok(referralService.getStats(userId));
        } catch (Exception e) {
            log.warn("[Referral] stats fallback: {}", e.getMessage());
            Map<String, Object> empty = new HashMap<>();
            empty.put("code", null);
            empty.put("invitedCount", 0);
            empty.put("totalEarned", 0);
            empty.put("rewardPerInvite", 30);
            empty.put("inviteeBonus", 30);
            return ResponseEntity.ok(empty);
        }
    }

    @PostMapping("/apply")
    public ResponseEntity<Map<String, Object>> apply(
            @RequestBody Map<String, String> body,
            HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        String code = body != null ? body.get("code") : null;
        try {
            return ResponseEntity.ok(referralService.applyCode(userId, code));
        } catch (Exception e) {
            log.warn("[Referral] apply fallback: userId={}, code={}, err={}", userId, code, e.getMessage());
            Map<String, Object> result = new HashMap<>();
            result.put("ok", false);
            result.put("reason", "server_error");
            return ResponseEntity.ok(result);
        }
    }
}
