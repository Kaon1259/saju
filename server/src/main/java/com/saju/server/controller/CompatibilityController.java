package com.saju.server.controller;

import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.CompatibilityService;
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

    @GetMapping("/saju/basic")
    public ResponseEntity<Map<String, Object>> analyzeSajuBasic(
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
        if ("LUNAR".equalsIgnoreCase(calendarType1)) bd1 = lunarCalendarService.lunarToSolar(bd1);
        if ("LUNAR".equalsIgnoreCase(calendarType2)) bd2 = lunarCalendarService.lunarToSolar(bd2);
        return ResponseEntity.ok(compatibilityService.analyzeSajuBasic(bd1, birthTime1, bd2, birthTime2, gender1, gender2));
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
            @RequestParam(required = false) Long userId) {
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

        String[] prompts = compatibilityService.buildStreamPrompts(bd1, birthTime1, bd2, birthTime2, gender1, gender2, score, elementRelation, branchRelation);
        final LocalDate fbd1 = bd1, fbd2 = bd2;
        final Long uid = userId;
        return claudeApiService.generateStream(prompts[0], prompts[1], 2000, (fullText) -> {
            // 스트리밍 완료 → 서버에서 직접 캐시 저장
            compatibilityService.parseAndSaveStreamResult(fbd1, birthTime1, fbd2, birthTime2, gender1, gender2,
                score, grade(score), elementRelation, branchRelation, fullText);
            if (uid != null) heartPointService.deductPoints(uid, "COMPATIBILITY", "사주궁합");
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
