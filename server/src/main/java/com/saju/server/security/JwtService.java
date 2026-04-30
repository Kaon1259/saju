package com.saju.server.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * JWT 발급·검증. HS256, secret 은 application.yml `jwt.secret`.
 * - 메인 토큰: TTL = jwt.ttl-minutes (기본 30일)
 * - SSE 토큰: TTL = jwt.sse-ttl-seconds (기본 60초), claim `typ=sse`
 */
@Service
@Slf4j
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.ttl-minutes:43200}")
    private long ttlMinutes;

    @Value("${jwt.sse-ttl-seconds:60}")
    private long sseTtlSeconds;

    private SecretKey key;

    @PostConstruct
    void init() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("jwt.secret 이 32자 미만입니다. JWT_SECRET 환경변수를 설정하세요.");
        }
        if (secret.startsWith("dev-")) {
            log.warn("⚠️  jwt.secret 이 개발용 기본값입니다. 운영에서는 JWT_SECRET 환경변수로 강력한 시크릿을 설정하세요.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(Long userId, boolean isGuest) {
        Instant now = Instant.now();
        Instant exp = now.plus(ttlMinutes, ChronoUnit.MINUTES);
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("guest", isGuest)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    public String issueSseToken(Long userId) {
        Instant now = Instant.now();
        Instant exp = now.plus(sseTtlSeconds, ChronoUnit.SECONDS);
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("typ", "sse")
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    /** 유효하면 Claims 반환, 만료/위조면 null. 예외 던지지 않음. */
    public Claims parse(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            Jws<Claims> jws = Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return jws.getPayload();
        } catch (Exception e) {
            return null;
        }
    }

    public Long extractUserId(Claims claims) {
        if (claims == null) return null;
        try {
            return Long.parseLong(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isSseToken(Claims claims) {
        return claims != null && "sse".equals(claims.get("typ"));
    }
}
