package com.saju.server.controller;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNormalizeTest {

    @Test
    void normalizesCommonFormats() {
        assertEquals("01012345678", PhoneAuthController.normalizePhone("010-1234-5678"));
        assertEquals("01012345678", PhoneAuthController.normalizePhone("010 1234 5678"));
        assertEquals("01012345678", PhoneAuthController.normalizePhone("+82 10-1234-5678"));
        assertEquals("0111234567", PhoneAuthController.normalizePhone("011-123-4567"));
    }

    @Test
    void rejectsInvalid() {
        assertNull(PhoneAuthController.normalizePhone(null));
        assertNull(PhoneAuthController.normalizePhone(""));
        assertNull(PhoneAuthController.normalizePhone("02-123-4567"));      // 유선
        assertNull(PhoneAuthController.normalizePhone("010-12-345"));       // 너무 짧음
        assertNull(PhoneAuthController.normalizePhone("abcdefghijk"));
        assertNull(PhoneAuthController.normalizePhone("0101234567890123")); // 너무 김
    }
}
