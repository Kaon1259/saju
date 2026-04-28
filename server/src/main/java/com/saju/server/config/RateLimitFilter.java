package com.saju.server.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * IP·사용자별 rate limiting.
 * - AI 스트리밍 엔드포인트: 사용자당 분당 20회 (Sonnet 비용 폭탄 차단)
 * - 일반 엔드포인트: IP당 분당 120회 (기본 보호)
 *
 * 임시 구현: in-memory ConcurrentHashMap. 멀티 인스턴스로 확장 시 Redis 기반(bucket4j-redis)으로 교체.
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentMap<String, Bucket> aiBuckets = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    private Bucket newAiBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(20).refillGreedy(20, Duration.ofMinutes(1)).build())
                .build();
    }

    private Bucket newGeneralBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(120).refillGreedy(120, Duration.ofMinutes(1)).build())
                .build();
    }

    private boolean isAiEndpoint(String path) {
        if (path == null) return false;
        // SSE 스트리밍 + 심화분석 + 외부 AI 호출 경로
        return path.contains("/stream")
                || path.startsWith("/api/deep/")
                || path.startsWith("/api/saju/analyze")
                || path.startsWith("/api/tarot/reading")
                || path.startsWith("/api/dream/interpret")
                || path.startsWith("/api/face-reading/analyze")
                || path.startsWith("/api/psych-test/analyze")
                || path.startsWith("/api/love/")
                || path.startsWith("/api/compatibility/")
                || path.startsWith("/api/year-fortune")
                || path.startsWith("/api/monthly-fortune")
                || path.startsWith("/api/weekly-fortune");
    }

    private String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return comma > 0 ? xff.substring(0, comma).trim() : xff.trim();
        }
        return req.getRemoteAddr();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        // /api 외엔 통과 (정적 자원·CORS preflight 등)
        if (path == null || !path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }
        // OPTIONS preflight 는 통과
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        Bucket bucket;
        String key;
        if (isAiEndpoint(path)) {
            String userId = request.getParameter("userId");
            // userId 없으면 IP 기반 (게스트·헬스체크 케이스)
            key = "ai:" + (userId != null && !userId.isBlank() ? "u" + userId : "ip" + clientIp(request));
            bucket = aiBuckets.computeIfAbsent(key, k -> newAiBucket());
        } else {
            key = "gen:ip:" + clientIp(request);
            bucket = generalBuckets.computeIfAbsent(key, k -> newGeneralBucket());
        }

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(request, response);
        } else {
            long retryAfterSec = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            log.warn("Rate limit exceeded: key={}, path={}, retryAfter={}s", key, path, retryAfterSec);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfterSec));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"rate_limit_exceeded\",\"retryAfterSec\":" + retryAfterSec + "}");
        }
    }
}
