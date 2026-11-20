package com.saju.server.controller;

import com.saju.server.dto.UserResponse;
import com.saju.server.entity.User;
import com.saju.server.repository.UserRepository;
import com.saju.server.security.AuthRateLimiter;
import com.saju.server.security.AuthUtil;
import com.saju.server.security.JwtService;
import com.saju.server.security.PinHasher;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 전화번호 + PIN 로그인/가입 (카카오 로그인 대체).
 *
 *  POST /api/auth/phone/signup     사주 정보 + 전화번호 + PIN → 계정 생성 + JWT
 *  POST /api/auth/phone/login      전화번호 + PIN → JWT
 *  POST /api/auth/phone/change-pin (인증 필요) 현재 PIN + 새 PIN
 *
 * ⚠️ SMS 인증이 없으므로 "번호 소유 증명"은 되지 않는다. PIN 이 유일한 본인 확인 수단이며,
 *    잊어버리면 복구 수단이 없다(SMS 인증 도입 전까지). 전화번호는 로그인 ID 로만 쓰고 다른 사용자에게 노출하지 않는다.
 */
@RestController
@RequestMapping("/api/auth/phone")
@RequiredArgsConstructor
@Slf4j
public class PhoneAuthController {

    private final UserRepository userRepository;
    private final HeartPointService heartPointService;
    private final JwtService jwtService;
    private final AuthRateLimiter rateLimiter;

    private static final Pattern PHONE = Pattern.compile("^01[016789]\\d{7,8}$");
    private static final Pattern PIN = Pattern.compile("^\\d{4,6}$");

    private static final int MAX_PIN_FAILS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    // 가입 보너스 하트를 노린 대량 가짜 가입 / 무차별 로그인 시도 완화
    private static final int SIGNUP_PER_IP = 5;
    private static final long SIGNUP_WINDOW_MS = Duration.ofHours(1).toMillis();
    private static final int LOGIN_PER_IP = 30;
    private static final long LOGIN_WINDOW_MS = Duration.ofMinutes(10).toMillis();
    private static final String DUMMY_SALT = PinHasher.newSalt();

    /** 숫자만 남기고 +82 → 0 변환. 형식이 틀리면 null. */
    static String normalizePhone(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("[^0-9]", "");
        if (d.startsWith("82") && d.length() >= 11) d = "0" + d.substring(2);
        return PHONE.matcher(d).matches() ? d : null;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        if (!rateLimiter.tryAcquire("signup:" + clientIp(req), SIGNUP_PER_IP, SIGNUP_WINDOW_MS)) {
            return err(429, "가입 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.");
        }

        String phone = normalizePhone(str(body, "phone"));
        if (phone == null) return err(400, "전화번호 형식이 올바르지 않아요. (예: 010-1234-5678)");
        String pin = str(body, "pin");
        if (pin == null || !PIN.matcher(pin).matches()) return err(400, "PIN은 숫자 4~6자리예요.");
        if (PinHasher.isWeak(pin)) return err(400, "너무 쉬운 PIN이에요. (1234, 1111 같은 숫자는 쓸 수 없어요)");

        LocalDate birthDate;
        try {
            birthDate = LocalDate.parse(str(body, "birthDate"));
        } catch (Exception e) {
            return err(400, "생년월일을 확인해 주세요.");
        }
        if (birthDate.isAfter(LocalDate.now()) || birthDate.getYear() < 1900) return err(400, "생년월일을 확인해 주세요.");
        String gender = str(body, "gender");
        if (!"M".equals(gender) && !"F".equals(gender)) return err(400, "성별을 선택해 주세요.");

        if (userRepository.findByPhone(phone).isPresent()) {
            return err(409, "이미 가입된 번호예요. 로그인해 주세요.");
        }

        String name = str(body, "name");
        String calendarType = "LUNAR".equals(str(body, "calendarType")) ? "LUNAR" : "SOLAR";

        String salt = PinHasher.newSalt();
        User user = User.builder()
                .phone(phone)
                .pinSalt(salt)
                .pinHash(PinHasher.hash(pin, salt))
                .pinFailCount(0)
                .name(name == null || name.isBlank() ? "사용자" : cap(name.trim(), 20))
                .birthDate(birthDate)
                .calendarType(calendarType)
                .gender(gender)
                .birthTime(cap(str(body, "birthTime"), 10))
                .bloodType(cap(str(body, "bloodType"), 4))
                .mbtiType(cap(str(body, "mbtiType"), 4))
                .zodiacAnimal(zodiac(birthDate.getYear()))
                .profileBonusClaimed(true)   // 생년월일+성별을 가입 시 함께 받으므로 프로필 보너스도 이 시점에 지급
                .build();

        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            return err(409, "이미 가입된 번호예요. 로그인해 주세요.");
        }

        heartPointService.grantSignupBonus(user.getId());
        heartPointService.grantBonus(user.getId(), "PROFILE_COMPLETE", "프로필 완성 보너스");
        user = userRepository.findById(user.getId()).orElse(user);

        log.info("[PhoneAuth] 신규 가입: userId={}", user.getId());
        return ok("registered", user);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        if (!rateLimiter.tryAcquire("login:" + clientIp(req), LOGIN_PER_IP, LOGIN_WINDOW_MS)) {
            return err(429, "로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.");
        }

        String phone = normalizePhone(str(body, "phone"));
        String pin = str(body, "pin");
        final String generic = "번호 또는 PIN이 올바르지 않아요.";
        if (phone == null || pin == null || !PIN.matcher(pin).matches()) return err(401, generic);

        User user = userRepository.findByPhone(phone).orElse(null);
        if (user == null || user.getPinHash() == null) {
            PinHasher.hash(pin, DUMMY_SALT); // 존재 여부가 응답 시간으로 드러나지 않도록 동일 비용 소모
            return err(401, generic);
        }

        LocalDateTime now = LocalDateTime.now();
        if (user.getPinLockedUntil() != null && user.getPinLockedUntil().isAfter(now)) {
            long secs = Duration.between(now, user.getPinLockedUntil()).getSeconds();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("error", "PIN을 여러 번 틀려서 잠시 잠겼어요. " + ((secs + 59) / 60) + "분 뒤에 다시 시도해 주세요.");
            m.put("retryAfterSeconds", secs);
            return ResponseEntity.status(429).body(m);
        }

        if (!PinHasher.matches(pin, user.getPinSalt(), user.getPinHash())) {
            int fails = (user.getPinFailCount() == null ? 0 : user.getPinFailCount()) + 1;
            if (fails >= MAX_PIN_FAILS) {
                user.setPinFailCount(0);
                user.setPinLockedUntil(now.plus(LOCK_DURATION));
                log.warn("[PhoneAuth] PIN 연속 실패 잠금: userId={}", user.getId());
            } else {
                user.setPinFailCount(fails);
            }
            userRepository.save(user);
            return err(401, generic);
        }

        if ((user.getPinFailCount() != null && user.getPinFailCount() > 0) || user.getPinLockedUntil() != null) {
            user.setPinFailCount(0);
            user.setPinLockedUntil(null);
            user = userRepository.save(user);
        }
        return ok("login", user);
    }

    @PostMapping("/change-pin")
    public ResponseEntity<Map<String, Object>> changePin(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        Long uid = AuthUtil.requireUserId(req);
        User user = userRepository.findById(uid).orElse(null);
        if (user == null || user.getPinHash() == null) return err(400, "PIN을 사용하는 계정이 아니에요.");

        String cur = str(body, "currentPin");
        String next = str(body, "newPin");
        if (next == null || !PIN.matcher(next).matches()) return err(400, "새 PIN은 숫자 4~6자리예요.");
        if (PinHasher.isWeak(next)) return err(400, "너무 쉬운 PIN이에요.");
        if (!rateLimiter.tryAcquire("changepin:" + uid, 5, LOGIN_WINDOW_MS)) return err(429, "시도가 너무 많아요. 잠시 후 다시 해주세요.");
        if (cur == null || !PinHasher.matches(cur, user.getPinSalt(), user.getPinHash())) return err(401, "현재 PIN이 올바르지 않아요.");

        String salt = PinHasher.newSalt();
        user.setPinSalt(salt);
        user.setPinHash(PinHasher.hash(next, salt));
        user.setPinFailCount(0);
        user.setPinLockedUntil(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "changed"));
    }

    // ─── 헬퍼 ───

    private ResponseEntity<Map<String, Object>> ok(String status, User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status);
        m.put("user", UserResponse.from(user));
        m.put("profileComplete", user.getBirthDate() != null && user.getGender() != null);
        m.put("token", jwtService.issue(user.getId(), false));
        return ResponseEntity.ok(m);
    }

    private static ResponseEntity<Map<String, Object>> err(int status, String msg) {
        return ResponseEntity.status(status).body(Map.of("error", msg));
    }

    private static String str(Map<String, Object> b, String k) {
        Object v = b.get(k);
        return v == null ? null : v.toString();
    }

    private static String cap(String s, int max) {
        if (s == null || s.isBlank()) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static String clientIp(HttpServletRequest req) {
        // X-Forwarded-For 의 맨 앞 값은 클라이언트가 위조할 수 있다. 가장 가까운 프록시(Railway)가 덧붙인
        // 맨 뒤 값을 쓴다. (프록시 단수가 바뀌면 이 가정을 다시 확인할 것)
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] parts = xff.split(",");
            return parts[parts.length - 1].trim();
        }
        return req.getRemoteAddr();
    }

    private static final String[] ZODIAC = {"원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"};
    private static String zodiac(int year) { return ZODIAC[year % 12]; }
}
