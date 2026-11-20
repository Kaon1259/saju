package com.saju.server.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneAuthSupportTest {

    @Test
    void pinHashRoundTripAndSaltUniqueness() {
        String s1 = PinHasher.newSalt(), s2 = PinHasher.newSalt();
        assertNotEquals(s1, s2);
        String h = PinHasher.hash("482915", s1);
        assertTrue(PinHasher.matches("482915", s1, h));
        assertFalse(PinHasher.matches("482916", s1, h));
        assertNotEquals(h, PinHasher.hash("482915", s2), "같은 PIN 이라도 salt 가 다르면 해시가 달라야 한다");
        assertTrue(h.length() <= 64 && s1.length() <= 32, "컬럼 길이 안에 들어가야 한다");
    }

    @Test
    void weakPinsAreRejected() {
        for (String p : new String[]{"1111", "0000", "1234", "4321", "123456", "654321", "999999"}) {
            assertTrue(PinHasher.isWeak(p), p);
        }
        for (String p : new String[]{"4829", "135790", "2580", "7413"}) {
            assertFalse(PinHasher.isWeak(p), p);
        }
    }

    @Test
    void rateLimiterBlocksAfterMaxAndIsKeyed() {
        AuthRateLimiter rl = new AuthRateLimiter();
        for (int i = 0; i < 3; i++) assertTrue(rl.tryAcquire("a", 3, 60_000));
        assertFalse(rl.tryAcquire("a", 3, 60_000));
        assertTrue(rl.tryAcquire("b", 3, 60_000), "다른 키는 영향이 없어야 한다");
    }

    @Test
    void rateLimiterWindowExpires() throws Exception {
        AuthRateLimiter rl = new AuthRateLimiter();
        assertTrue(rl.tryAcquire("k", 1, 50));
        assertFalse(rl.tryAcquire("k", 1, 50));
        Thread.sleep(80);
        assertTrue(rl.tryAcquire("k", 1, 50));
    }
}
