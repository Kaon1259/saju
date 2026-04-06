package com.saju.server.controller;

import com.saju.server.dto.UserRequest;
import com.saju.server.dto.UserResponse;
import com.saju.server.entity.User;
import com.saju.server.repository.UserRepository;
import com.saju.server.service.KakaoAuthService;
import com.saju.server.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth/kakao")
@RequiredArgsConstructor
@Slf4j
public class KakaoAuthController {

    private final KakaoAuthService kakaoAuthService;
    private final UserRepository userRepository;
    private final UserService userService;
    private final com.saju.server.service.HeartPointService heartPointService;

    /**
     * 카카오 로그인/회원가입
     * POST /api/auth/kakao/login
     * Body: { "code": "인가코드" }
     *
     * 1) 인가 코드 → 액세스 토큰
     * 2) 액세스 토큰 → 카카오 사용자 정보
     * 3) kakaoId로 기존 회원 조회 → 있으면 로그인 / 없으면 신규 생성 필요
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> kakaoLogin(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "인가 코드가 필요합니다."));
        }

        String redirectUri = body.get("redirectUri");

        String accessToken;
        Map<String, Object> kakaoUser;
        try {
            // 1) 토큰 획득
            accessToken = kakaoAuthService.getAccessToken(code, redirectUri);
        } catch (Exception e) {
            log.error("카카오 토큰 획득 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "카카오 토큰 획득 실패: " + e.getMessage()));
        }

        try {
            // 2) 사용자 정보 조회
            kakaoUser = kakaoAuthService.getUserInfo(accessToken);
        } catch (Exception e) {
            log.error("카카오 사용자 정보 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "카카오 사용자 정보 조회 실패: " + e.getMessage()));
        }
        String kakaoId = (String) kakaoUser.get("kakaoId");
        String nickname = (String) kakaoUser.getOrDefault("nickname", "");
        String profileImage = (String) kakaoUser.getOrDefault("profileImage", null);
        String gender = (String) kakaoUser.getOrDefault("gender", null);
        String birthyear = (String) kakaoUser.getOrDefault("birthyear", null);
        String birthday = (String) kakaoUser.getOrDefault("birthday", null); // MMDD

        // 3) 기존 회원 확인
        Optional<User> existingUser = userRepository.findByKakaoId(kakaoId);

        Map<String, Object> result = new HashMap<>();

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            // 프로필 이미지 업데이트
            if (profileImage != null) {
                user.setProfileImage(profileImage);
                userRepository.save(user);
            }
        } else {
            // 신규 → 최소 정보로 회원 자동 생성
            user = User.builder()
                    .kakaoId(kakaoId)
                    .name(nickname.isBlank() ? "사용자" : nickname)
                    .profileImage(profileImage)
                    .build();
            user = userRepository.save(user);
            // 회원가입 보너스 하트 지급
            heartPointService.grantSignupBonus(user.getId());
            user = userRepository.findById(user.getId()).orElse(user);
        }

        boolean profileComplete = user.getBirthDate() != null && user.getGender() != null;
        result.put("status", profileComplete ? "login" : "needProfile");
        result.put("user", UserResponse.from(user));
        result.put("profileComplete", profileComplete);

        return ResponseEntity.ok(result);
    }

    /**
     * 프로필 완성 (카카오 로그인 후 추가 정보 입력)
     * POST /api/auth/kakao/register
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> kakaoRegister(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String name = (String) body.get("name");
        String birthDateStr = (String) body.get("birthDate");
        String calendarType = (String) body.getOrDefault("calendarType", "SOLAR");
        String gender = (String) body.getOrDefault("gender", "M");
        String birthTime = (String) body.getOrDefault("birthTime", null);
        String bloodType = (String) body.getOrDefault("bloodType", null);
        String mbtiType = (String) body.getOrDefault("mbtiType", null);

        if (name == null || birthDateStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "필수 정보가 누락되었습니다."));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        LocalDate birthDate = LocalDate.parse(birthDateStr);

        user.setName(name);
        user.setBirthDate(birthDate);
        user.setCalendarType(calendarType);
        user.setGender(gender);
        user.setBirthTime(birthTime);
        user.setZodiacAnimal(userService.calculateZodiac(birthDate.getYear()));
        user.setBloodType(bloodType);
        user.setMbtiType(mbtiType);

        User saved = userRepository.save(user);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "registered");
        result.put("user", UserResponse.from(saved));

        return ResponseEntity.ok(result);
    }

    /**
     * 모바일 앱용 카카오 콜백
     * GET /api/auth/kakao/app-callback?code=인가코드
     * 카카오에서 리다이렉트 → 커스텀 스킴으로 앱에 코드 전달
     */
    @GetMapping("/app-callback")
    public void appCallback(@RequestParam String code, HttpServletResponse response) throws IOException {
        String redirectUrl = "com.love.onetoone://auth/kakao/callback?code="
                + URLEncoder.encode(code, StandardCharsets.UTF_8);
        response.sendRedirect(redirectUrl);
    }
}
