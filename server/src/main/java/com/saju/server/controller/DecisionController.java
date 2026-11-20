package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.DecisionIntake;
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

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 결정 상담(Decision Counseling) — 앱 간판 유료 상품.
 * 4가지 카테고리: reunion / breakup / confess / marriage.
 *
 * v3 패턴: 구조화 입력 → 서버 규칙이 판정(AI 호출 전, 무료) → 캐시 선조회 →
 *          미스면 stream(LLM 은 설명만) → 서버가 검증/정리 후 캐시 저장 + 하트 차감.
 * 위기(폭력·자해 등) 입력은 판정 단계에서 안내로 전환하고 AI 호출·차감을 하지 않는다.
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

    /** 구조화 입력 스키마(질문·선택지) — 클라이언트가 그대로 렌더링한다. */
    @GetMapping("/schema")
    public ResponseEntity<Map<String, Object>> schema() {
        return ResponseEntity.ok(DecisionIntake.schemaForClient());
    }

    /**
     * 판정 + 캐시 선조회. 캐시 히트면 최종 결과, 미스면 무료 미리보기(판정·근거충분도·월별 타이밍).
     * 위기 입력이면 safety 필드만 반환(aiAnalyzed=false).
     */
    @GetMapping("/basic")
    public ResponseEntity<Map<String, Object>> basic(
            @RequestParam("category") String category,
            @RequestParam("birthDate") String birthDate,
            @RequestParam(value = "birthTime", required = false) String birthTime,
            @RequestParam(value = "gender", defaultValue = "M") String gender,
            @RequestParam(value = "partnerInfo", required = false) String partnerInfo,
            @RequestParam(value = "answers", required = false) String answers,
            @RequestParam(value = "situation", required = false) String situation,
            @RequestParam(value = "history", required = false) String history,
            HttpServletRequest req) {

        if (!validInput(category, birthDate)) return ResponseEntity.badRequest().build();

        Long userId = AuthUtil.optionalUserId(req);
        DecisionService.Prepared p = decisionService.prepare(category, birthDate, birthTime, gender,
            partnerInfo, answers, situation, history);

        Map<String, Object> cached = decisionService.getCached(p);
        if (cached != null) {
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

        Map<String, Object> result = new LinkedHashMap<>(decisionService.previewMap(p));
        result.put("aiAnalyzed", false);
        result.put("cacheHit", false);
        return ResponseEntity.ok(result);
    }

    /**
     * 결정 상담 스트리밍. Sonnet (간판 상품 — 품질 우선).
     * 완료 시 서버가 검증·정리한 최종 결과 JSON 을 done 이벤트로 보낸다.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam("category") String category,
            @RequestParam("birthDate") String birthDate,
            @RequestParam(value = "birthTime", required = false) String birthTime,
            @RequestParam(value = "gender", defaultValue = "M") String gender,
            @RequestParam(value = "partnerInfo", required = false) String partnerInfo,
            @RequestParam(value = "answers", required = false) String answers,
            @RequestParam(value = "situation", required = false) String situation,
            @RequestParam(value = "history", required = false) String history,
            HttpServletRequest req) {

        if (!validInput(category, birthDate)) return SseEmitterUtils.errorEmitter("invalid_input");

        Long userId = AuthUtil.optionalUserId(req);
        DecisionService.Prepared p = decisionService.prepare(category, birthDate, birthTime, gender,
            partnerInfo, answers, situation, history);

        // 위기 입력은 AI 호출·차감 없이 종료 (클라는 basic 단계에서 이미 안내 화면으로 전환)
        if (p.ruling().isSafety()) return SseEmitterUtils.errorEmitter("safety");

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "DECISION_CONSULT");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        final Long uid = userId;
        return claudeApiService.generateStreamWithDoneData(p.system(), p.user(), 4500, (fullText) -> {
            Map<String, Object> result = decisionService.finalizeAndSave(p, fullText);
            if (result == null) {
                log.warn("[NoDeduct] 결정 상담 검증/파싱 실패 — 차감/히스토리 스킵: cat={}, uid={}", category, uid);
                return null; // done payload = 원문 (클라이언트가 verdict 부재로 실패 처리)
            }
            if (uid != null) {
                heartPointService.deductPoints(uid, "DECISION_CONSULT", decisionService.getCategoryKr(category));
                try {
                    String title = decisionService.getCategoryKr(category);
                    String summary = (String) result.getOrDefault("headline", "");
                    fortuneHistoryService.saveIfAbsent(uid, "decision", title, summary, result);
                } catch (Exception ignored) {}
            }
            return decisionService.toJson(result);
        });
    }

    private boolean validInput(String category, String birthDate) {
        if (!decisionService.isValidCategory(category)) return false;
        try { LocalDate.parse(birthDate); return true; } catch (Exception e) { return false; }
    }
}
