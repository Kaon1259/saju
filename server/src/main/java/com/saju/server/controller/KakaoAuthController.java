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

        // 1) 토큰 획득
        String accessToken = kakaoAuthService.getAccessToken(code);

        // 2) 사용자 정보 조회
        Map<String, Object> kakaoUser = kakaoAuthService.getUserInfo(accessToken);
        String kakaoId = (String) kakaoUser.get("kakaoId");
        String nickname = (String) kakaoUser.getOrDefault("nickname", "");
        String gender = (String) kakaoUser.getOrDefault("gender", null);
        String birthyear = (String) kakaoUser.getOrDefault("birthyear", null);
        String birthday = (String) kakaoUser.getOrDefault("birthday", null); // MMDD

        // 3) 기존 회원 확인
        Optional<User> existingUser = userRepository.findByKakaoId(kakaoId);

        Map<String, Object> result = new HashMap<>();

        if (existingUser.isPresent()) {
            // 기존 회원 → 로그인
            User user = existingUser.get();
            result.put("status", "login");
            result.put("user", UserResponse.from(user));
        } else {
            // 신규 → 프로필 입력 필요 (kakaoId, 카카오에서 받은 정보 전달)
            result.put("status", "new");
            result.put("kakaoId", kakaoId);
            result.put("nickname", nickname);
            if (gender != null) result.put("gender", gender);
            if (birthyear != null && birthday != null && birthday.length() == 4) {
                result.put("birthDate", birthyear + "-" + birthday.substring(0, 2) + "-" + birthday.substring(2, 4));
            }
        }

        return ResponseEntity.ok(result);
    }

    /**
     * 카카오 회원가입 (프로필 정보 입력 완료 시)
     * POST /api/auth/kakao/register
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> kakaoRegister(@RequestBody Map<String, Object> body) {
        String kakaoId = (String) body.get("kakaoId");
        String name = (String) body.get("name");
        String birthDateStr = (String) body.get("birthDate");
        String calendarType = (String) body.getOrDefault("calendarType", "SOLAR");
        String gender = (String) body.getOrDefault("gender", "M");
        String birthTime = (String) body.getOrDefault("birthTime", null);
        String bloodType = (String) body.getOrDefault("bloodType", null);
        String mbtiType = (String) body.getOrDefault("mbtiType", null);

        if (kakaoId == null || name == null || birthDateStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "필수 정보가 누락되었습니다."));
        }

        // 이미 등록된 kakaoId 체크
        if (userRepository.findByKakaoId(kakaoId).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미 등록된 카카오 계정입니다."));
        }

        LocalDate birthDate = LocalDate.parse(birthDateStr);
        String zodiacAnimal = userService.calculateZodiac(birthDate.getYear());

        User user = User.builder()
                .kakaoId(kakaoId)
                .name(name)
                .birthDate(birthDate)
                .calendarType(calendarType)
                .gender(gender)
                .birthTime(birthTime)
                .zodiacAnimal(zodiacAnimal)
                .bloodType(bloodType)
                .mbtiType(mbtiType)
                .build();

        User saved = userRepository.save(user);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "registered");
        result.put("user", UserResponse.from(saved));

        return ResponseEntity.ok(result);
    }
}
