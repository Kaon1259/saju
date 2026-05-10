package com.saju.server.controller;

import com.saju.server.dto.AttendanceResponse;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 일일 출석 보너스 API.
 *
 *  GET  /api/attendance/status     - 오늘 출석 여부 + 연속 일수 + 다음 마일스톤
 *  POST /api/attendance/checkin    - 오늘 출석 (멱등 — 이미 받았으면 alreadyChecked=true)
 *  GET  /api/attendance/history    - 최근 N일 출석 기록
 *
 * 모든 엔드포인트는 어떤 예외에도 200 응답 보장 (DB 마이그레이션 중 등 일시 장애에서도
 * UI 가 멈추지 않도록 — 실제 보상은 DB 정상화 후 다음 호출에서 받음).
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@Slf4j
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/status")
    public ResponseEntity<AttendanceResponse> status(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            return ResponseEntity.ok(attendanceService.getStatus(userId));
        } catch (Exception e) {
            log.warn("[Attendance] status controller fallback: {}", e.getMessage());
            return ResponseEntity.ok(emptyResponse());
        }
    }

    @PostMapping("/checkin")
    public ResponseEntity<AttendanceResponse> checkin(HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            return ResponseEntity.ok(attendanceService.checkInToday(userId));
        } catch (Exception e) {
            log.warn("[Attendance] checkin controller fallback: {}", e.getMessage());
            return ResponseEntity.ok(emptyResponse());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> history(
            @RequestParam(defaultValue = "30") int days,
            HttpServletRequest req) {
        Long userId = AuthUtil.requireUserId(req);
        try {
            return ResponseEntity.ok(attendanceService.getRecentHistory(userId, days));
        } catch (Exception e) {
            log.warn("[Attendance] history controller fallback: {}", e.getMessage());
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    private AttendanceResponse emptyResponse() {
        return AttendanceResponse.builder()
            .alreadyChecked(false)
            .rewardAmount(0)
            .baseReward(5)
            .milestoneBonus(0)
            .milestoneCategory(null)
            .consecutiveDays(0)
            .balanceAfter(0)
            .checkedToday(false)
            .daysToNextMilestone(7)
            .nextMilestoneReward(20)
            .build();
    }
}
