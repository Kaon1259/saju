package com.saju.server.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.entity.FortuneHistory;
import com.saju.server.repository.FortuneHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 운세 히스토리 조회/삭제 API.
 * 저장은 각 운세 서비스의 AI 완료 콜백에서 FortuneHistoryService.save(...)로 자동 처리.
 */
@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class FortuneHistoryController {

    private final FortuneHistoryRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 내 히스토리 목록.
     * GET /api/history?userId=1&type=tarot&limit=20
     * type 생략 시 전체 타입.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam("userId") Long userId,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        List<FortuneHistory> rows = (type != null && !type.isBlank())
            ? repository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type, PageRequest.of(0, limit))
            : repository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit));

        List<Map<String, Object>> result = rows.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("type", r.getType());
            m.put("title", r.getTitle());
            m.put("summary", r.getSummary());
            m.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 단건 조회 (payload 포함).
     * GET /api/history/{id}?userId=1
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(
            @PathVariable Long id,
            @RequestParam("userId") Long userId) {
        return repository.findByIdAndUserId(id, userId)
            .map(r -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", r.getId());
                m.put("type", r.getType());
                m.put("title", r.getTitle());
                m.put("summary", r.getSummary());
                m.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
                try {
                    m.put("payload", objectMapper.readValue(r.getPayloadJson(), new TypeReference<Map<String, Object>>() {}));
                } catch (Exception e) {
                    m.put("payload", null);
                }
                return ResponseEntity.ok(m);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 삭제.
     * DELETE /api/history/{id}?userId=1
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam("userId") Long userId) {
        repository.deleteByIdAndUserId(id, userId);
        return ResponseEntity.noContent().build();
    }
}
