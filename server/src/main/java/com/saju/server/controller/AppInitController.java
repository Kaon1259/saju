package com.saju.server.controller;

import com.saju.server.entity.User;
import com.saju.server.repository.UserRepository;
import com.saju.server.service.HeartPointService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/app")
@RequiredArgsConstructor
public class AppInitController {

    private final HeartPointService heartPointService;
    private final UserRepository userRepository;

    /**
     * 앱 초기화 — 하트 잔액, 비용 맵, 사용자 프로필 한번에 반환
     * 비로그인(Guest): guestId 전달 시 Guest 유저 자동 생성
     */
    @GetMapping("/init")
    public ResponseEntity<Map<String, Object>> appInit(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String guestId) {

        Map<String, Object> result = new LinkedHashMap<>();

        // 하트 비용 맵 (모든 사용자 공통)
        result.put("heartCosts", heartPointService.getAllCosts());

        User user = null;

        // 로그인 사용자
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        // Guest 사용자
        if (user == null && guestId != null && !guestId.isBlank()) {
            user = heartPointService.createGuestUser(guestId);
        }

        if (user != null) {
            Map<String, Object> profile = new LinkedHashMap<>();
            profile.put("id", user.getId());
            profile.put("name", user.getName());
            profile.put("birthDate", user.getBirthDate() != null ? user.getBirthDate().toString() : null);
            profile.put("gender", user.getGender());
            profile.put("bloodType", user.getBloodType());
            profile.put("mbtiType", user.getMbtiType());
            profile.put("zodiacAnimal", user.getZodiacAnimal());
            profile.put("relationshipStatus", user.getRelationshipStatus());
            profile.put("profileImage", user.getProfileImage());
            profile.put("isGuest", user.getKakaoId() != null && user.getKakaoId().startsWith("guest_"));
            result.put("user", profile);
            result.put("heartPoints", user.getHeartPoints() != null ? user.getHeartPoints() : 0);
        } else {
            result.put("user", null);
            result.put("heartPoints", 0);
        }

        return ResponseEntity.ok(result);
    }
}
