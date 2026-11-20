package com.saju.server.security;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PIN 해시 — PBKDF2(HmacSHA256) + 계정별 랜덤 salt. 외부 의존성 없음(JDK 표준).
 *
 * ⚠️ 4~6자리 숫자 PIN 은 엔트로피가 작아서(최대 100만 가지) 해시가 유출되면 오프라인에서 금방 뚫린다.
 *    실질적 방어는 "온라인 시도 횟수 제한(계정 잠금 + IP 제한)" 이고, 해시는 DB 유출 시의 최소 방어선이다.
 */
public final class PinHasher {

    private PinHasher() {}

    private static final int ITERATIONS = 120_000;
    private static final int KEY_BITS = 256;
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String newSalt() {
        byte[] s = new byte[16];
        RANDOM.nextBytes(s);
        return Base64.getEncoder().encodeToString(s);
    }

    public static String hash(String pin, String saltB64) {
        try {
            byte[] salt = Base64.getDecoder().decode(saltB64);
            PBEKeySpec spec = new PBEKeySpec(pin.toCharArray(), salt, ITERATIONS, KEY_BITS);
            byte[] out = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("PIN 해시 실패", e);
        }
    }

    /** 상수 시간 비교. */
    public static boolean matches(String pin, String saltB64, String expectedHashB64) {
        if (pin == null || saltB64 == null || expectedHashB64 == null) return false;
        byte[] a = hash(pin, saltB64).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] b = expectedHashB64.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }

    /** 너무 쉬운 PIN(같은 숫자 반복, 연속 증가/감소) 차단. */
    public static boolean isWeak(String pin) {
        if (pin == null || pin.length() < 4) return true;
        boolean same = true, asc = true, desc = true;
        for (int i = 1; i < pin.length(); i++) {
            int d = pin.charAt(i) - pin.charAt(i - 1);
            if (d != 0) same = false;
            if (d != 1) asc = false;
            if (d != -1) desc = false;
        }
        return same || asc || desc;
    }
}
