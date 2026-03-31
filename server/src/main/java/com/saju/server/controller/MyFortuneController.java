package com.saju.server.controller;

import com.saju.server.dto.UserResponse;
import com.saju.server.saju.SajuResult;
import com.saju.server.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    /**
     * 나의 통합 운세 (사주 AI + 혈액형 + MBTI)
     */
    @GetMapping("/fortune/{userId}")
    public ResponseEntity<Map<String, Object>> getMyFortune(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);

        Map<String, Object> result = new LinkedHashMap<>();
        var userMap = new java.util.LinkedHashMap<String, Object>();
        userMap.put("name", user.getName());
        userMap.put("zodiacAnimal", user.getZodiacAnimal());
        userMap.put("bloodType", user.getBloodType() != null ? user.getBloodType() : "");
        userMap.put("mbtiType", user.getMbtiType() != null ? user.getMbtiType() : "");
        userMap.put("birthDate", user.getBirthDate().toString());
        userMap.put("birthTime", user.getBirthTime() != null ? user.getBirthTime() : "");
        userMap.put("gender", user.getGender());
        userMap.put("calendarType", user.getCalendarType());
        userMap.put("relationshipStatus", user.getRelationshipStatus() != null ? user.getRelationshipStatus() : "");
        result.put("user", userMap);

        // 1. 사주 기반 AI 오늘의 운세 (생년월일+시간 기반)
        LocalDate birthDate = user.getBirthDate();
        if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }
        SajuResult sajuResult = sajuService.analyze(birthDate, user.getBirthTime(), user.getGender());

        // 사주 운세를 기존 포맷에 맞춰 변환
        Map<String, Object> sajuFortune = new LinkedHashMap<>();
        SajuResult.CategoryFortune today = sajuResult.getTodayFortune();
        if (today != null) {
            sajuFortune.put("overall", today.getOverall());
            sajuFortune.put("love", today.getLove());
            sajuFortune.put("money", today.getMoney());
            sajuFortune.put("health", today.getHealth());
            sajuFortune.put("work", today.getWork());
            sajuFortune.put("score", today.getScore());
            sajuFortune.put("luckyNumber", today.getLuckyNumber());
            sajuFortune.put("luckyColor", today.getLuckyColor());
        }
        sajuFortune.put("dayMaster", sajuResult.getDayMasterHanja() + " " + sajuResult.getDayMaster());
        sajuFortune.put("dayMasterElement", sajuResult.getDayMasterElement());
        sajuFortune.put("personalityReading", sajuResult.getPersonalityReading());
        sajuFortune.put("yearFortune", sajuResult.getYearFortune());
        sajuFortune.put("zodiacAnimal", user.getZodiacAnimal());
        sajuFortune.put("fortuneDate", LocalDate.now().toString());
        result.put("saju", sajuFortune);

        // 2. 혈액형/MBTI는 각 페이지에서 개별 호출 (홈 로딩 속도 개선)

        return ResponseEntity.ok(result);
    }
}
