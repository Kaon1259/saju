package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.DecisionService;
import com.saju.server.service.FortuneHistoryService;
import com.saju.server.service.HeartPointService;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 결정 상담(Decision Counseling) — 앱 간판 유료 상품.
 * 4가지 카테고리: reunion / breakup / confess / marriage.
 *
 * 패턴: basic(캐시 체크) → 캐시 히트면 즉시 반환 / 미스면 stream → onComplete에서 캐시 저장 + 하트 차감.
 * 영속 캐시 (같은 입력 = 같은 결과). 결정 상담은 일반 운세보다 비싸야 함 — DECISION_CONSULT 80하트.
 */
@RestController
@RequestMapping("/api/decision")
@RequiredArgsConstructor
@Slf4j
public class DecisionController {

    private final DecisionService decisionService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final FortuneHistoryService fortuneHistoryService;

    /**
     * 캐시 선조회. 캐시 있으면 결과 반환 (aiAnalyzed 필드로 구분).
     */
    @GetMapping("/basic")
    public ResponseEntity<Map<String, Object>> basic(
            @RequestParam("category") String category,
            @RequestParam("birthDate") String birthDate,
            @RequestParam(value = "gender", defaultValue = "M") String gender,
            @RequestParam(value = "partnerInfo", required = false) String partnerInfo,
            @RequestParam(value = "situation", required = false) String situation,
            @RequestParam(value = "history", required = false) String history,
            HttpServletRequest req) {

        Long userId = AuthUtil.optionalUserId(req);
        Map<String, Object> cached = decisionService.getCachedDecision(category, birthDate, gender,
            partnerInfo, situation, history);
        if (cached != null) {
            // 캐시 히트 → 히스토리도 1회만 저장
            if (userId != null) {
                String title = decisionService.getCategoryKr(category);
                String summary = (String) cached.getOrDefault("headline", "");
                fortuneHistoryService.saveIfAbsent(userId, "decision", title, summary, cached);
            }
            Map<String, Object> result = new LinkedHashMap<>(cached);
            result.put("aiAnalyzed", true);
            result.put("cacheHit", true);
            return ResponseEntity.ok(result);
        }

        // 캐시 미스 — 기본 정보만 반환 (클라가 stream 호출하도록)
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("category", category);
        result.put("categoryKr", decisionService.getCategoryKr(category));
        result.put("birthDate", birthDate);
        result.put("aiAnalyzed", false);
        result.put("cacheHit", false);
        return ResponseEntity.ok(result);
    }

    /**
     * 결정 상담 스트리밍. Sonnet 4.6 사용 (간판 상품 — 품질 우선).
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam("category") String category,
            @RequestParam("birthDate") String birthDate,
            @RequestParam(value = "birthTime", required = false) String birthTime,
            @RequestParam(value = "gender", defaultValue = "M") String gender,
            @RequestParam(value = "partnerInfo", required = false) String partnerInfo,
            @RequestParam(value = "situation", required = false) String situation,
            @RequestParam(value = "history", required = false) String history,
            HttpServletRequest req) {

        Long userId = AuthUtil.optionalUserId(req);

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "DECISION_CONSULT");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        String[] prompts = decisionService.buildStreamPrompts(category, birthDate, birthTime, gender,
            partnerInfo, situation, history);

        final Long uid = userId;
        // 간판 상품이므로 Sonnet 4.6 + 4500 토큰 (12개 필드 안정 생성)
        return claudeApiService.generateStream(prompts[0], prompts[1], 4500, (fullText) -> {
            boolean parsed = decisionService.parseAndSaveStreamResult(category, birthDate, gender,
                partnerInfo, situation, history, fullText);
            if (!parsed) {
                log.warn("[NoDeduct] 결정 상담 파싱 실패 — 차감/히스토리 스킵: cat={}, uid={}", category, uid);
                return;
            }
            if (uid != null) {
                heartPointService.deductPoints(uid, "DECISION_CONSULT",
                    decisionService.getCategoryKr(category));

                // 히스토리 저장
                try {
                    Map<String, Object> result = decisionService.getCachedDecision(category, birthDate, gender,
                        partnerInfo, situation, history);
                    if (result != null) {
                        String title = decisionService.getCategoryKr(category);
                        String summary = (String) result.getOrDefault("headline", "");
                        fortuneHistoryService.saveIfAbsent(uid, "decision", title, summary, result);
                    }
                } catch (Exception ignored) {}
            }
        });
    }
}
