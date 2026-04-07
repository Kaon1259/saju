package com.saju.server.controller;

import com.saju.server.dto.UserResponse;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.saju.SajuResult;
import com.saju.server.service.*;
import com.saju.server.util.SseEmitterUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/my")
@RequiredArgsConstructor
public class MyFortuneController {

    private final UserService userService;
    private final SajuService sajuService;
    private final LunarCalendarService lunarCalendarService;
    private final BloodTypeFortuneService bloodTypeFortuneService;
    private final MbtiFortuneService mbtiFortuneService;
    private final FortuneService fortuneService;
    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final HeartPointService heartPointService;

    /**
     * 나의 통합 운세 (사주 AI + 혈액형 + MBTI)
     */
    @GetMapping("/fortune/{userId}")
    public ResponseEntity<Map<String, Object>> getMyFortune(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);

        if (user.getBirthDate() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "프로필을 먼저 완성해주세요."));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        var userMap = new java.util.LinkedHashMap<String, Object>();
        userMap.put("name", user.getName());
        userMap.put("zodiacAnimal", user.getZodiacAnimal() != null ? user.getZodiacAnimal() : "");
        userMap.put("bloodType", user.getBloodType() != null ? user.getBloodType() : "");
        userMap.put("mbtiType", user.getMbtiType() != null ? user.getMbtiType() : "");
        userMap.put("birthDate", user.getBirthDate().toString());
        userMap.put("birthTime", user.getBirthTime() != null ? user.getBirthTime() : "");
        userMap.put("gender", user.getGender() != null ? user.getGender() : "");
        userMap.put("calendarType", user.getCalendarType() != null ? user.getCalendarType() : "SOLAR");
        userMap.put("relationshipStatus", user.getRelationshipStatus() != null ? user.getRelationshipStatus() : "");
        result.put("user", userMap);

        // 1. 스트리밍 캐시 먼저 확인 (운세 페이지와 동일한 점수 보장)
        LocalDate today = LocalDate.now();
        var cachedFortune = (user.getZodiacAnimal() != null)
            ? fortuneService.getCachedFortune(user.getZodiacAnimal(), today) : null;

        Map<String, Object> sajuFortune = new LinkedHashMap<>();
        if (cachedFortune != null && cachedFortune.getOverall() != null && !cachedFortune.getOverall().isBlank()) {
            // 스트리밍 캐시 히트 → 운세 페이지와 동일한 데이터
            sajuFortune.put("overall", cachedFortune.getOverall());
            sajuFortune.put("love", cachedFortune.getLove());
            sajuFortune.put("money", cachedFortune.getMoney());
            sajuFortune.put("health", cachedFortune.getHealth());
            sajuFortune.put("work", cachedFortune.getWork());
            sajuFortune.put("score", cachedFortune.getScore());
            sajuFortune.put("luckyNumber", cachedFortune.getLuckyNumber());
            sajuFortune.put("luckyColor", cachedFortune.getLuckyColor());
        } else {
            // 캐시 없음 → 사주 기반 AI 분석 (첫 방문)
            LocalDate birthDate = user.getBirthDate();
            if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
                birthDate = lunarCalendarService.lunarToSolar(birthDate);
            }
            SajuResult sajuResult = sajuService.analyze(birthDate, user.getBirthTime(), user.getGender());
            SajuResult.CategoryFortune todayFortune = sajuResult.getTodayFortune();
            if (todayFortune != null) {
                sajuFortune.put("overall", todayFortune.getOverall());
                sajuFortune.put("love", todayFortune.getLove());
                sajuFortune.put("money", todayFortune.getMoney());
                sajuFortune.put("health", todayFortune.getHealth());
                sajuFortune.put("work", todayFortune.getWork());
                sajuFortune.put("score", todayFortune.getScore());
                sajuFortune.put("luckyNumber", todayFortune.getLuckyNumber());
                sajuFortune.put("luckyColor", todayFortune.getLuckyColor());
            }
            sajuFortune.put("dayMaster", sajuResult.getDayMasterHanja() + " " + sajuResult.getDayMaster());
            sajuFortune.put("dayMasterElement", sajuResult.getDayMasterElement());
            sajuFortune.put("personalityReading", sajuResult.getPersonalityReading());
            sajuFortune.put("yearFortune", sajuResult.getYearFortune());
        }
        sajuFortune.put("zodiacAnimal", user.getZodiacAnimal());
        sajuFortune.put("fortuneDate", today.toString());
        result.put("saju", sajuFortune);

        // 2. 혈액형/MBTI는 각 페이지에서 개별 호출 (홈 로딩 속도 개선)

        return ResponseEntity.ok(result);
    }

    /**
     * 나의 운세 스트리밍 (사주 AI 부분)
     */
    @GetMapping(value = "/fortune/{userId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMyFortune(@PathVariable Long userId,
            @RequestParam(value = "date", required = false) String dateStr) {
        UserResponse user = userService.getUser(userId);
        if (user.getBirthDate() == null || user.getZodiacAnimal() == null) {
            SseEmitter emitter = new SseEmitter(5000L);
            new Thread(() -> {
                try { emitter.send(SseEmitter.event().name("error").data("프로필을 먼저 완성해주세요.")); emitter.complete(); }
                catch (Exception ignored) {}
            }).start();
            return emitter;
        }

        LocalDate targetDate = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();

        // 캐시 체크
        var cached = fortuneService.getCachedFortune(user.getZodiacAnimal(), targetDate);
        if (cached != null && cached.getOverall() != null && !cached.getOverall().isBlank()) {
            // 빠른 사주 기본 계산 (AI 호출 없음)
            LocalDate bd = user.getBirthDate();
            if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
                bd = lunarCalendarService.lunarToSolar(bd);
            }
            SajuResult sajuResult = sajuService.buildBasicResult(bd, user.getBirthTime(), user.getGender());

            SseEmitter emitter = new SseEmitter(5000L);
            final Map<String, Object> data = buildMyFortuneData(user, cached);
            @SuppressWarnings("unchecked")
            Map<String, Object> sajuMap = (Map<String, Object>) data.get("saju");
            if (sajuResult != null) {
                sajuMap.put("dayMaster", sajuResult.getDayMasterHanja() + " " + sajuResult.getDayMaster());
                sajuMap.put("personalityReading", sajuResult.getPersonalityReading());
            }
            new Thread(() -> {
                try {
                    emitter.send(SseEmitter.event().name("cached").data(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(data)));
                    emitter.complete();
                } catch (Exception ignored) {}
            }).start();
            return emitter;
        }

        // 하트 잔액 확인 (차감은 AI 완료 후)
        try {
            heartPointService.checkPoints(userId, "TODAY_FORTUNE");
        } catch (InsufficientHeartsException e) {
            return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
        }

        // AI 스트리밍 (연애상태 + 날짜 반영)
        String systemPrompt = promptBuilder.fortuneStreamSystemPrompt();
        String userPrompt = promptBuilder.fortuneStreamUserPrompt(user.getZodiacAnimal(), targetDate, user.getRelationshipStatus());
        final LocalDate finalDate = targetDate;
        final Long uid = userId;
        return claudeApiService.generateStream(systemPrompt, userPrompt, 1500, (fullText) -> {
            fortuneService.parseAndSaveStreamResult(user.getZodiacAnimal(), fullText, finalDate);
            if (uid != null) heartPointService.deductPoints(uid, "TODAY_FORTUNE", "오늘의 운세");
        });
    }

    private Map<String, Object> buildMyFortuneData(UserResponse user, com.saju.server.dto.FortuneResponse fortune) {
        Map<String, Object> result = new LinkedHashMap<>();
        var userMap = new LinkedHashMap<String, Object>();
        userMap.put("name", user.getName());
        userMap.put("zodiacAnimal", user.getZodiacAnimal() != null ? user.getZodiacAnimal() : "");
        userMap.put("bloodType", user.getBloodType() != null ? user.getBloodType() : "");
        userMap.put("mbtiType", user.getMbtiType() != null ? user.getMbtiType() : "");
        userMap.put("birthDate", user.getBirthDate().toString());
        userMap.put("birthTime", user.getBirthTime() != null ? user.getBirthTime() : "");
        userMap.put("gender", user.getGender() != null ? user.getGender() : "");
        userMap.put("calendarType", user.getCalendarType() != null ? user.getCalendarType() : "SOLAR");
        result.put("user", userMap);

        Map<String, Object> saju = new LinkedHashMap<>();
        saju.put("overall", fortune.getOverall());
        saju.put("love", fortune.getLove());
        saju.put("money", fortune.getMoney());
        saju.put("health", fortune.getHealth());
        saju.put("work", fortune.getWork());
        saju.put("score", fortune.getScore());
        saju.put("luckyNumber", fortune.getLuckyNumber());
        saju.put("luckyColor", fortune.getLuckyColor());
        saju.put("zodiacAnimal", user.getZodiacAnimal());
        result.put("saju", saju);
        return result;
    }
}
