package com.saju.server.controller;

import com.saju.server.dto.UserRequest;
import com.saju.server.dto.UserResponse;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** path id 가 본인이 아니면 403 (다른 사용자 프로필 IDOR 방지). */
    private static void requireSelf(HttpServletRequest req, Long pathId) {
        Long uid = AuthUtil.requireUserId(req);
        if (!uid.equals(pathId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 정보만 조회/수정 가능합니다.");
        }
    }

    @PostMapping
    public ResponseEntity<UserResponse> register(@Valid @RequestBody UserRequest request) {
        UserResponse response = userService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@RequestBody java.util.Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        UserResponse response = userService.login(phone);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody UserRequest request, HttpServletRequest req) {
        requireSelf(req, id);
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id, HttpServletRequest req) {
        requireSelf(req, id);
        UserResponse response = userService.getUser(id);
        return ResponseEntity.ok(response);
    }

    /**
     * 회원 탈퇴 — Play Store 정책상 필수. 본인만 가능.
     * DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> deleteUser(@PathVariable Long id, HttpServletRequest req) {
        requireSelf(req, id);
        userService.deleteUser(id);
        return ResponseEntity.ok(java.util.Map.of("status", "deleted", "userId", id));
    }
}
