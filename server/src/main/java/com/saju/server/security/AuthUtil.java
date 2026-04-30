package com.saju.server.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * 컨트롤러에서 사용하는 인증 헬퍼.
 * JwtAuthFilter 가 토큰을 검증한 뒤 req attribute "authUserId"/"authIsGuest" 에 결과를 넣어둔다.
 * 듀얼모드(jwt.legacy-fallback=true) 에서는 토큰이 없으면 ?userId= 파라미터를 fallback 으로 받는다.
 */
public final class AuthUtil {
    public static final String ATTR_USER_ID = "authUserId";
    public static final String ATTR_IS_GUEST = "authIsGuest";

    private AuthUtil() {}

    /** JWT 또는 (듀얼모드 시) ?userId= 에서 userId 추출. 없으면 401. */
    public static Long requireUserId(HttpServletRequest req) {
        Long uid = optionalUserId(req);
        if (uid == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return uid;
    }

    /** 토큰/파라미터에서 추출, 없으면 null (게스트 허용 엔드포인트용). */
    public static Long optionalUserId(HttpServletRequest req) {
        Object attr = req.getAttribute(ATTR_USER_ID);
        if (attr instanceof Long l) return l;
        if (attr != null) {
            try { return Long.parseLong(attr.toString()); } catch (Exception ignored) {}
        }
        // legacy fallback (JwtAuthFilter 가 듀얼모드일 때만 attribute 안 채움)
        String legacy = req.getParameter("userId");
        if (legacy != null && !legacy.isBlank()) {
            try { return Long.parseLong(legacy); } catch (Exception ignored) {}
        }
        return null;
    }

    public static boolean isGuest(HttpServletRequest req) {
        Object attr = req.getAttribute(ATTR_IS_GUEST);
        return attr instanceof Boolean b && b;
    }
}
