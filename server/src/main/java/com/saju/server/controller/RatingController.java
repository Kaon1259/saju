package com.saju.server.controller;

import com.saju.server.security.AuthUtil;
import com.saju.server.service.RatingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Play Store 평점 보너스 API.
 *
 *  GET  /api/rating/status   - 이미 받았는지 + 보상량
 *  POST /api/rating/claim    - 1회 +50 청구
 *
 * 모든 엔드포인트는 어떤 예외에도 200 응답.
 */
@RestController
@RequestMapping("/api/rating")
@RequiredArgsConstructor
@Slf4j
public class RatingController {

    private final RatingService ratingService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            return ResponseEntity.ok(ratingService.getStatus(userId));
        } catch (Exception e) {
            log.warn("[Rating] status fallback: {}", e.getMessage());
            Map<String, Object> empty = new HashMap<>();
            empty.put("claimed", false);
            empty.put("reward", 50);
            return ResponseEntity.ok(empty);
        }
    }

    @PostMapping("/claim")
    public ResponseEntity<Map<String, Object>> claim(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            return ResponseEntity.ok(ratingService.claim(userId));
        } catch (Exception e) {
            log.warn("[Rating] claim fallback: userId={}, err={}", userId, e.getMessage());
            Map<String, Object> result = new HashMap<>();
            result.put("ok", false);
            result.put("reason", "server_error");
            return ResponseEntity.ok(result);
        }
    }
}
