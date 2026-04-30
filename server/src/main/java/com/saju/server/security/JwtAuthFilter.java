package com.saju.server.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Bearer JWT 또는 SSE ?sseToken= 검증.
 * - 통과 시 req attribute "authUserId" / "authIsGuest" 셋팅
 * - 토큰 없거나 무효 + jwt.legacy-fallback=true → 그대로 통과 (컨트롤러가 ?userId= 받음, AuthUtil fallback)
 * - 토큰 없거나 무효 + legacy-fallback=false → 401
 *
 * 인증 면제 경로:
 *  - OPTIONS preflight
 *  - /api/auth/kakao/** (로그인 자체)
 *  - /api/app/init (게스트/기존세션 마이그레이션 — 토큰 발급)
 *  - /api/admin/** (X-Admin-Secret 별도 인증)
 *  - /api/hearts/grant-bulk (X-Admin-Secret)
 *  - /api/health, /api/ping (헬스체크)
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Value("${jwt.legacy-fallback:true}")
    private boolean legacyFallback;

    private static boolean isPublic(String path) {
        if (path == null) return true;
        return !path.startsWith("/api/")
                || path.startsWith("/api/auth/kakao/")
                || path.equals("/api/app/init")
                || path.startsWith("/api/admin/")
                || path.equals("/api/hearts/grant-bulk")
                || path.equals("/api/health")
                || path.equals("/api/ping");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || isPublic(path)) {
            chain.doFilter(request, response);
            return;
        }

        // 1) Authorization Bearer
        String bearer = request.getHeader("Authorization");
        Claims claims = null;
        if (bearer != null && bearer.startsWith("Bearer ")) {
            claims = jwtService.parse(bearer.substring(7));
        }

        // 2) SSE 경로면 ?sseToken= 도 시도
        if (claims == null && path.contains("/stream")) {
            String sseToken = request.getParameter("sseToken");
            if (sseToken != null && !sseToken.isBlank()) {
                Claims sseClaims = jwtService.parse(sseToken);
                if (jwtService.isSseToken(sseClaims)) {
                    claims = sseClaims;
                }
            }
        }

        if (claims != null) {
            Long uid = jwtService.extractUserId(claims);
            if (uid != null) {
                request.setAttribute(AuthUtil.ATTR_USER_ID, uid);
                Object guest = claims.get("guest");
                request.setAttribute(AuthUtil.ATTR_IS_GUEST, guest instanceof Boolean ? guest : false);
            }
            chain.doFilter(request, response);
            return;
        }

        // 토큰 없음/무효
        if (legacyFallback) {
            // 듀얼모드: 그대로 통과. 컨트롤러가 ?userId= 로 받거나 AuthUtil fallback.
            chain.doFilter(request, response);
            return;
        }

        // Phase 4 컷오버: 토큰 필수
        log.warn("Unauthorized request: path={}", path);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\":\"unauthorized\"}");
    }
}
