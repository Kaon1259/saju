package com.saju.server.controller;

import com.saju.server.dto.AttendanceResponse;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 일일 출석 보너스 API.
 *
 *  GET  /api/attendance/status     - 오늘 출석 여부 + 연속 일수 + 다음 마일스톤
 *  POST /api/attendance/checkin    - 오늘 출석 (멱등 — 이미 받았으면 alreadyChecked=true)
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/status")
    public ResponseEntity<AttendanceResponse> status(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        return ResponseEntity.ok(attendanceService.getStatus(userId));
    }

    @PostMapping("/checkin")
    public ResponseEntity<AttendanceResponse> checkin(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        return ResponseEntity.ok(attendanceService.checkInToday(userId));
    }

    /** 최근 N일 출석 기록 — 캘린더/마일스톤 화면용 */
    @GetMapping("/history")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> history(
            @RequestParam(defaultValue = "30") int days,
            HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        return ResponseEntity.ok(attendanceService.getRecentHistory(userId, days));
    }
}
