package com.saju.server.controller;

import com.saju.server.security.AuthUtil;
import com.saju.server.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * SSE EventSource 는 Authorization 헤더를 못 붙이므로,
 * 인증된 클라이언트가 단명(60초) SSE 토큰을 받아 ?sseToken= 으로 전달한다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtService jwtService;

    @PostMapping("/sse-token")
    public ResponseEntity<Map<String, String>> sseToken(HttpServletRequest req) {
        Long uid = AuthUtil.requireUserId(req);
        return ResponseEntity.ok(Map.of("sseToken", jwtService.issueSseToken(uid)));
    }
}
