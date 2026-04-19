package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.CompatibilityService;
import com.saju.server.service.FortuneHistoryService;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.LunarCalendarService;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/compatibility")
@RequiredArgsConstructor
public class CompatibilityController {

    private final CompatibilityService compatibilityService;
    private final LunarCalendarService lunarCalendarService;
    private final ClaudeApiService claudeApiService;
    private final HeartPointService heartPointService;
    private final FortuneHistoryService fortuneHistoryService;

    @GetMapping("/saju/basic")
    public ResponseEntity<Map<String, Object>> analyzeSajuBasic(
            @RequestParam("birthDate1") String birthDate1Str,
            @RequestParam("birthDate2") String birthDate2Str,
            @RequestParam(value = "birthTime1", required = false) String birthTime1,
            @RequestParam(value = "birthTime2", required = false) String birthTime2,
            @RequestParam(value = "calendarType1", defaultValue = "SOLAR") String calendarType1,
            @RequestParam(value = "calendarType2", defaultValue = "SOLAR") String calendarType2,
            @RequestParam(value = "gender1", defaultValue = "M") String gender1,
            @RequestParam(value = "gender2", defaultValue = "F") String gender2,
            @RequestParam(required = false) Long userId,
            @RequestParam(value = "historyType", required = false) String historyType,
            @RequestParam(value = "celebName", required = false) String celebName,
            @RequestParam(value = "mode", defaultValue = "general") String mode) {
        LocalDate bd1 = LocalDate.parse(birthDate1Str);
        LocalDate bd2 = LocalDate.parse(birthDate2Str);
        if ("LUNAR".equalsIgnoreCase(calendarType1)) bd1 = lunarCalendarService.lunarToSolar(bd1);
        if ("LUNAR".equalsIgnoreCase(calendarType2)) bd2 = lunarCalendarService.lunarToSolar(bd2);
        boolean isMarriage = "marriage".equalsIgnoreCase(mode);
        Map<String, Object> result = isMarriage
            ? compatibilityService.analyzeMarriageBasic(bd1, birthTime1, bd2, birthTime2, gender1, gender2)
            : compatibilityService.analyzeSajuBasic(bd1, birthTime1, bd2, birthTime2, gender1, gender2);

        // 캐시 히트(aiAnalysis/aiSummary 존재)인 경우에도 히스토리 저장 (saveIfAbsent로 dedupe)
        if (userId != null && (result.get("aiAnalysis") != null || result.get("aiSummary") != null)) {
            saveCompatibilityHistory(userId, bd1, birthTime1, gender1, calendarType1,
                bd2, birthTime2, gender2, calendarType2,
                result, historyType, celebName);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * 3가지 궁합 페이지 공용 히스토리 저장 헬퍼.
     * historyType: "compatibility" (사주) / "celeb_compatibility" (스타) / "my_love_compat" (연인)
     * celebName: celeb_compatibility일 때 연예인 이름 (title/payload에 포함)
     */
    private void saveCompatibilityHistory(Long uid, LocalDate bd1, String bt1, String g1, String cal1,
            LocalDate bd2, String bt2, String g2, String cal2,
            Map<String, Object> result, String historyType, String celebName) {
        try {
            String type = (historyType == null || historyType.isBlank()) ? "compatibility" : historyType;
            Map<String, Object> payload = new LinkedHashMap<>(result);
            payload.put("birthDate1", bd1.toString());
            payload.put("birthTime1", bt1);
            payload.put("gender1", g1);
            payload.put("calendarType1", cal1);
            payload.put("birthDate2", bd2.toString());
            payload.put("birthTime2", bt2);
            payload.put("gender2", g2);
            payload.put("calendarType2", cal2);
            if (celebName != null && !celebName.isBlank()) payload.put("celebName", celebName);

            int sc = result.get("score") instanceof Number ? ((Number) result.get("score")).intValue() : 0;
            String title;
            switch (type) {
                case "celeb_compatibility":
                    title = "스타궁합 · " + (celebName != null ? celebName : "-") + " (" + bd1 + " × " + bd2 + ")";
                    break;
                case "my_love_compat":
                    title = "내 연인 궁합 (" + bd1 + " × " + bd2 + ")";
                    break;
                case "marriage_compat":
                    title = "결혼 궁합 (" + bd1 + " × " + bd2 + ")";
                    break;
                default:
                    title = "사주 궁합 (" + bd1 + " × " + bd2 + ")";
            }
            String summary = (sc > 0 ? sc + "점 · " + grade(sc) : grade(sc));
            fortuneHistoryService.saveIfAbsent(uid, type, title, summary, payload);
        } catch (Exception ignored) {}
    }

    @GetMapping("/saju")
    public ResponseEntity<Map<String, Object>> analyzeSajuCompatibility(
            @RequestParam("birthDate1") String birthDate1Str,
            @RequestParam("birthDate2") String birthDate2Str,
            @RequestParam(value = "birthTime1", required = false) String birthTime1,
            @RequestParam(value = "birthTime2", required = false) String birthTime2,
            @RequestParam(value = "calendarType1", defaultValue = "SOLAR") String calendarType1,
            @RequestParam(value = "calendarType2", defaultValue = "SOLAR") String calendarType2,
            @RequestParam(value = "gender1", defaultValue = "M") String gender1,
            @RequestParam(value = "gender2", defaultValue = "F") String gender2) {
        LocalDate bd1 = LocalDate.parse(birthDate1Str);
        LocalDate bd2 = LocalDate.parse(birthDate2Str);
        if ("LUNAR".equalsIgnoreCase(calendarType1)) {
            bd1 = lunarCalendarService.lunarToSolar(bd1);
        }
        if ("LUNAR".equalsIgnoreCase(calendarType2)) {
            bd2 = lunarCalendarService.lunarToSolar(bd2);
        }
        return ResponseEntity.ok(compatibilityService.analyzeSaju(bd1, birthTime1, bd2, birthTime2, gender1, gender2));
    }

    @PostMapping("/saju/cache")
    public ResponseEntity<String> saveCompatCache(@RequestBody Map<String, Object> body) {
        String bd1 = (String) body.get("birthDate1");
        String bt1 = (String) body.get("birthTime1");
        String bd2 = (String) body.get("birthDate2");
        String bt2 = (String) body.get("birthTime2");
        String g1 = (String) body.getOrDefault("gender1", "M");
        String g2 = (String) body.getOrDefault("gender2", "F");
        compatibilityService.saveCompatCache(bd1, bt1, bd2, bt2, g1, g2, body);
        return ResponseEntity.ok("saved");
    }

    @GetMapping(value = "/saju/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSajuCompatibility(
            @RequestParam("birthDate1") String birthDate1Str,
            @RequestParam("birthDate2") String birthDate2Str,
            @RequestParam(value = "birthTime1", required = false) String birthTime1,
            @RequestParam(value = "birthTime2", required = false) String birthTime2,
            @RequestParam(value = "calendarType1", defaultValue = "SOLAR") String calendarType1,
            @RequestParam(value = "calendarType2", defaultValue = "SOLAR") String calendarType2,
            @RequestParam(value = "gender1", defaultValue = "M") String gender1,
            @RequestParam(value = "gender2", defaultValue = "F") String gender2,
            @RequestParam(value = "score", defaultValue = "60") int score,
            @RequestParam(value = "elementRelation", defaultValue = "") String elementRelation,
            @RequestParam(value = "branchRelation", defaultValue = "") String branchRelation,
            @RequestParam(required = false) Long userId,
            @RequestParam(value = "historyType", required = false) String historyType,
            @RequestParam(value = "celebName", required = false) String celebName,
            @RequestParam(value = "mode", defaultValue = "general") String mode) {
        LocalDate bd1 = LocalDate.parse(birthDate1Str);
        LocalDate bd2 = LocalDate.parse(birthDate2Str);
        if ("LUNAR".equalsIgnoreCase(calendarType1)) bd1 = lunarCalendarService.lunarToSolar(bd1);
        if ("LUNAR".equalsIgnoreCase(calendarType2)) bd2 = lunarCalendarService.lunarToSolar(bd2);

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "COMPATIBILITY");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        String[] prompts = compatibilityService.buildStreamPrompts(bd1, birthTime1, bd2, birthTime2, gender1, gender2, score, elementRelation, branchRelation, mode);
        final LocalDate fbd1 = bd1, fbd2 = bd2;
        final Long uid = userId;
        final boolean isMarriage = "marriage".equalsIgnoreCase(mode);
        return claudeApiService.generateStream(prompts[0], prompts[1], 2500, (fullText) -> {
            // mode별 전용 캐시 저장
            if (isMarriage) {
                compatibilityService.parseAndSaveMarriageStreamResult(fbd1, birthTime1, fbd2, birthTime2, gender1, gender2,
                    score, elementRelation, branchRelation, fullText);
            } else {
                compatibilityService.parseAndSaveStreamResult(fbd1, birthTime1, fbd2, birthTime2, gender1, gender2,
                    score, grade(score), elementRelation, branchRelation, fullText);
            }
            if (uid != null) heartPointService.deductPoints(uid, "COMPATIBILITY",
                isMarriage ? "결혼궁합" : "사주궁합");

            // 히스토리 저장
            if (uid != null) {
                Map<String, Object> result = compatibilityService.analyzeSajuBasic(fbd1, birthTime1, fbd2, birthTime2, gender1, gender2);
                if (isMarriage) {
                    // 결혼궁합: AI 응답을 파싱해서 result에 직접 덮어쓰기 (공용 캐시 미사용)
                    try {
                        String json = com.saju.server.service.ClaudeApiService.extractJson(fullText);
                        if (json != null) {
                            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
                            if (node.has("summary")) result.put("aiSummary", node.get("summary").asText());
                            if (node.has("overall")) result.put("aiAnalysis", node.get("overall").asText());
                            if (node.has("marriageTiming")) result.put("aiMarriageTiming", node.get("marriageTiming").asText());
                            if (node.has("familyHarmony")) result.put("aiFamilyHarmony", node.get("familyHarmony").asText());
                            if (node.has("childLuck")) result.put("aiChildLuck", node.get("childLuck").asText());
                            if (node.has("spouseTrait")) result.put("aiSpouseTrait", node.get("spouseTrait").asText());
                            if (node.has("inLawRelation")) result.put("aiInLawRelation", node.get("inLawRelation").asText());
                            if (node.has("financeTogether")) result.put("aiFinanceTogether", node.get("financeTogether").asText());
                            if (node.has("advice")) result.put("aiAdvice", node.get("advice").asText());
                            if (node.has("score")) result.put("score", node.get("score").asInt());
                            if (node.has("grade")) result.put("grade", node.get("grade").asText());
                        }
                    } catch (Exception ignored) {}
                }
                saveCompatibilityHistory(uid, fbd1, birthTime1, gender1, calendarType1,
                    fbd2, birthTime2, gender2, calendarType2,
                    result, historyType, celebName);
            }
        });
    }

    private String grade(int score) {
        if (score >= 85) return "천생연분";
        if (score >= 70) return "좋은 인연";
        if (score >= 55) return "보통 인연";
        if (score >= 40) return "노력 필요";
        return "어려운 인연";
    }

    @PostMapping("/celeb-match")
    public ResponseEntity<List<Map<String, Object>>> celebMatch(@RequestBody Map<String, Object> body) {
        String birthDateStr = (String) body.get("birthDate");
        String birthTime = (String) body.get("birthTime");
        String calendarType = (String) body.getOrDefault("calendarType", "SOLAR");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> celebs = (List<Map<String, String>>) body.get("celebrities");

        LocalDate bd = LocalDate.parse(birthDateStr);
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            bd = lunarCalendarService.lunarToSolar(bd);
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (Map<String, String> celeb : celebs) {
            LocalDate celebBd = LocalDate.parse(celeb.get("birth"));
            Map<String, Object> scoreResult = compatibilityService.quickScore(bd, birthTime, celebBd);
            scoreResult.put("name", celeb.get("name"));
            scoreResult.put("birth", celeb.get("birth"));
            scoreResult.put("gender", celeb.get("gender"));
            scoreResult.put("group", celeb.getOrDefault("group", null));
            results.add(scoreResult);
        }

        results.sort((a, b) -> (int) b.get("score") - (int) a.get("score"));
        return ResponseEntity.ok(results.size() > 5 ? results.subList(0, 5) : results);
    }
}
