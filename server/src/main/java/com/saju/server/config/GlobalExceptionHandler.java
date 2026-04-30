package com.saju.server.config;

import com.saju.server.exception.InsufficientHeartsException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 통합 에러 응답 — 클라이언트에 stack trace 노출 차단.
 * 운영 안전성 + Play Store 보안 검토 통과.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> responseStatus(ResponseStatusException e, HttpServletRequest req) {
        return body(e.getStatusCode().value(), e.getReason() != null ? e.getReason() : "요청을 처리할 수 없습니다.", req);
    }

    @ExceptionHandler(InsufficientHeartsException.class)
    public ResponseEntity<Map<String, Object>> insufficientHearts(InsufficientHeartsException e, HttpServletRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "insufficient_hearts");
        body.put("required", e.getRequired());
        body.put("available", e.getAvailable());
        body.put("path", req.getRequestURI());
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(body);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> optimisticLock(OptimisticLockingFailureException e, HttpServletRequest req) {
        log.warn("[OptimisticLock] {} {}", req.getRequestURI(), e.getMessage());
        return body(409, "동시 요청이 충돌했습니다. 잠시 후 다시 시도해주세요.", req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException e, HttpServletRequest req) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .orElse("입력값이 올바르지 않습니다.");
        return body(400, msg, req);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> illegalArg(IllegalArgumentException e, HttpServletRequest req) {
        return body(400, e.getMessage() != null ? e.getMessage() : "잘못된 요청입니다.", req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> generic(Exception e, HttpServletRequest req) {
        // 운영에선 stack trace 클라이언트 노출 X. 서버 로그에만 기록.
        log.error("[UnhandledException] {} {}: {}", req.getMethod(), req.getRequestURI(), e.getMessage(), e);
        return body(500, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", req);
    }

    private ResponseEntity<Map<String, Object>> body(int status, String message, HttpServletRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("error", message);
        body.put("path", req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
