package com.saju.server.security;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 인증 엔드포인트용 단순 슬라이딩 윈도우 제한기 (인메모리, 서버 1대 기준).
 * 가입 보너스 하트를 노린 대량 가짜 가입과 PIN 무차별 대입을 늦추는 용도 — 완전한 방어는 아니다
 * (서버를 여러 대로 늘리거나 재시작하면 초기화된다. 그때는 Redis 등으로 옮길 것).
 */
@Component
public class AuthRateLimiter {

    private final ConcurrentHashMap<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private long lastSweep = System.currentTimeMillis();

    /** @return true 면 허용(기록됨), false 면 한도 초과. */
    public boolean tryAcquire(String key, int max, long windowMillis) {
        long now = System.currentTimeMillis();
        sweepIfNeeded(now);
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMillis) q.pollFirst();
            if (q.size() >= max) return false;
            q.addLast(now);
            return true;
        }
    }

    private static final long SWEEP_AGE_MILLIS = 2L * 60 * 60 * 1000; // 이보다 오래된 기록은 어떤 윈도우에서도 무의미

    private synchronized void sweepIfNeeded(long now) {
        if (now - lastSweep < 60_000L) return;
        lastSweep = now;
        hits.entrySet().removeIf(e -> {
            Deque<Long> q = e.getValue();
            synchronized (q) {
                while (!q.isEmpty() && now - q.peekFirst() > SWEEP_AGE_MILLIS) q.pollFirst();
                return q.isEmpty();
            }
        });
    }
}
