package com.saju.server.controller;

import com.saju.server.saju.*;
import com.saju.server.service.ClaudeApiService;
import com.saju.server.service.LunarCalendarService;
import com.saju.server.service.SajuService;
import com.saju.server.service.UserService;
import com.saju.server.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/saju")
@RequiredArgsConstructor
public class SajuController {

    private final UserService userService;
    private final SajuService sajuService;
    private final LunarCalendarService lunarCalendarService;
    private final ClaudeApiService claudeApiService;

    /**
     * Analyze saju by birth date and optional time
     * GET /api/saju/analyze?birthDate=1990-05-15&birthTime=자시&calendarType=SOLAR
     */
    @GetMapping("/analyze")
    public ResponseEntity<SajuResult> analyzeSaju(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "birthTime", required = false) String birthTime,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType,
            @RequestParam(value = "gender", required = false) String gender) {

        LocalDate birthDate = LocalDate.parse(birthDateStr);

        // 음력이면 양력으로 변환
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        SajuResult result = sajuService.analyze(birthDate, birthTime, gender);
        return ResponseEntity.ok(result);
    }

    /**
     * Get saju analysis for a registered user
     * GET /api/saju/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<SajuResult> getUserSaju(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        LocalDate birthDate = user.getBirthDate();

        // 사용자가 음력으로 등록했으면 양력 변환
        if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        SajuResult result = sajuService.analyze(birthDate, user.getBirthTime(), user.getGender());
        return ResponseEntity.ok(result);
    }

    /**
     * 만세력 조회
     * GET /api/saju/manseryeok?date=2026-03-26
     */
    @GetMapping("/manseryeok")
    public ResponseEntity<Map<String, Object>> getManseryeok(
            @RequestParam("date") String dateStr) {
        LocalDate date = LocalDate.parse(dateStr);

        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar monthPillar = SajuCalculator.calculateMonthPillar(date, yearPillar.getStemIndex());
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("date", date.toString());
        result.put("yearPillar", pillarToMap(yearPillar, "년주"));
        result.put("monthPillar", pillarToMap(monthPillar, "월주"));
        result.put("dayPillar", pillarToMap(dayPillar, "일주"));

        // 12시진 전체
        java.util.List<Map<String, Object>> hours = new java.util.ArrayList<>();
        for (int i = 0; i < 12; i++) {
            SajuPillar hourP = SajuCalculator.calculateHourPillar(SajuConstants.SIJIN_NAMES[i], dayPillar.getStemIndex());
            if (hourP != null) {
                Map<String, Object> hm = pillarToMap(hourP, "시주");
                hm.put("sijin", SajuConstants.SIJIN_NAMES[i]);
                hours.add(hm);
            }
        }
        result.put("hours", hours);

        // 띠 정보
        result.put("zodiacAnimal", yearPillar.getAnimal());

        // AI 해석
        if (claudeApiService.isAvailable()) {
            try {
                String pillarInfo = String.format(
                    "날짜: %s, 년주: %s%s(%s/%s), 월주: %s%s(%s/%s), 일주: %s%s(%s/%s), 띠: %s",
                    date, yearPillar.getStemHanja(), yearPillar.getBranchHanja(), yearPillar.getStemElement(), yearPillar.getBranchElement(),
                    monthPillar.getStemHanja(), monthPillar.getBranchHanja(), monthPillar.getStemElement(), monthPillar.getBranchElement(),
                    dayPillar.getStemHanja(), dayPillar.getBranchHanja(), dayPillar.getStemElement(), dayPillar.getBranchElement(),
                    yearPillar.getAnimal());

                String systemPrompt = "당신은 40년 경력의 사주명리학 전문가입니다. 만세력 데이터를 해석합니다. 반드시 JSON만 응답하세요.";
                String userPrompt = pillarInfo + "\n\n위 만세력 정보를 해석하세요. JSON 형식:\n" +
                    "{\"dayAnalysis\":\"일간 특성과 오늘의 기운 (3문장)\"," +
                    "\"elementBalance\":\"오행 분포와 상생/상극 관계 (3문장)\"," +
                    "\"luckyTime\":\"길한 시간대 2~3개와 이유 (3문장)\"," +
                    "\"advice\":\"이 날의 총평과 조언 (3문장)\"}";

                String resp = claudeApiService.generate(systemPrompt, userPrompt, 800);
                String json = ClaudeApiService.extractJson(resp);
                if (json != null) {
                    var aiResult = new com.fasterxml.jackson.databind.ObjectMapper().readValue(
                        json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                    result.put("interpretation", aiResult);
                }
            } catch (Exception e) {
                // AI 해석 실패해도 기본 데이터는 반환
            }
        }

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> pillarToMap(SajuPillar p, String label) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("label", label);
        m.put("stem", p.getStemName());
        m.put("branch", p.getBranchName());
        m.put("stemHanja", p.getStemHanja());
        m.put("branchHanja", p.getBranchHanja());
        m.put("fullName", p.getFullName());
        m.put("fullHanja", p.getFullHanja());
        m.put("stemElement", p.getStemElementName());
        m.put("branchElement", p.getBranchElementName());
        m.put("animal", p.getAnimal());
        return m;
    }

    /**
     * 일운 (30일간 일별 운세)
     * GET /api/saju/daily?birthDate=1990-05-15
     */
    @GetMapping("/daily")
    public ResponseEntity<List<Map<String, Object>>> getDailyFortunes(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType) {
        LocalDate birthDate = LocalDate.parse(birthDateStr);
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        // 일간(日干) index 가져오기
        SajuPillar dayP = SajuCalculator.calculateDayPillar(birthDate);
        int dayStemIdx = dayP.getStemIndex();

        List<Map<String, Object>> dailyList = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 0; i < 30; i++) {
            Map<String, Object> daily = SajuCalculator.calculateDailyFortune(dayStemIdx, today.plusDays(i));
            daily.put("isToday", i == 0);
            dailyList.add(daily);
        }
        return ResponseEntity.ok(dailyList);
    }
}
