package com.saju.server.service;

import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuConstants;
import com.saju.server.saju.SajuPillar;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpecialFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final com.saju.server.repository.UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String[] LOVE_TYPES = {
        "relationship", "reunion", "remarriage", "blind_date",
        "crush", "marriage", "confession_timing", "ideal_type",
        "past_life", "couple_fortune", "meeting_timing",
        "some_check", "contact_fortune"
    };
    private static final Map<String, String> LOVE_TYPE_KR = new LinkedHashMap<>() {{
        put("relationship", "연애운");
        put("reunion", "재회운");
        put("remarriage", "재혼운");
        put("blind_date", "소개팅운");
        put("crush", "짝사랑운");
        put("marriage", "결혼운");
        put("confession_timing", "고백 타이밍");
        put("ideal_type", "이상형 분석");
        put("past_life", "전생 인연");
        put("couple_fortune", "커플 운세");
        put("meeting_timing", "만남의 시기");
        put("some_check", "썸 진단");
        put("contact_fortune", "연락 운");
    }};

    private static final String[][] SIJIN = {
        {"자시", "23:00~01:00", "쥐"},
        {"축시", "01:00~03:00", "소"},
        {"인시", "03:00~05:00", "호랑이"},
        {"묘시", "05:00~07:00", "토끼"},
        {"진시", "07:00~09:00", "용"},
        {"사시", "09:00~11:00", "뱀"},
        {"오시", "11:00~13:00", "말"},
        {"미시", "13:00~15:00", "양"},
        {"신시", "15:00~17:00", "원숭이"},
        {"유시", "17:00~19:00", "닭"},
        {"술시", "19:00~21:00", "개"},
        {"해시", "21:00~23:00", "돼지"}
    };

    /**
     * 오늘의 연애 날씨 (비로그인용 - 실제 날씨 기반)
     */
    public Map<String, Object> getLoveTemperature() {
        LocalDate today = LocalDate.now();

        // 캐시 체크
        String cacheKey = buildCacheKey("love-temp", today.toString());
        Map<String, Object> cached = getFromCache("love-temp", cacheKey);
        if (cached != null) return cached;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", today.toString());
        result.put("personalized", false);

        try {
            // Open-Meteo API (서울 기준, 키 불필요)
            String url = "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=Asia/Seoul";
            var restTemplate = new org.springframework.web.client.RestTemplate();
            String body = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(body);
            JsonNode current = root.path("current");

            double realTemp = current.path("temperature_2m").asDouble(18);
            int weatherCode = current.path("weather_code").asInt(0);
            double humidity = current.path("relative_humidity_2m").asDouble(50);
            double wind = current.path("wind_speed_10m").asDouble(5);

            // 날씨 코드 → 연애 점수 & 메시지
            int loveScore = 55;
            String weatherDesc;
            String loveMsg;
            String weatherEmoji;

            if (weatherCode == 0 || weatherCode == 1) {
                // 맑음
                weatherDesc = "맑음";
                weatherEmoji = "☀️";
                loveScore += 15;
                loveMsg = "화창한 날씨에 마음도 활짝! 데이트하기 완벽한 날이에요.";
            } else if (weatherCode == 2) {
                weatherDesc = "구름 조금";
                weatherEmoji = "⛅";
                loveScore += 10;
                loveMsg = "살짝 구름 낀 하늘이 오히려 로맨틱해요. 산책 데이트 추천!";
            } else if (weatherCode == 3) {
                weatherDesc = "흐림";
                weatherEmoji = "☁️";
                loveScore += 3;
                loveMsg = "흐린 날은 감성이 깊어지는 날. 진솔한 대화를 나눠보세요.";
            } else if (weatherCode >= 51 && weatherCode <= 57) {
                // 이슬비
                weatherDesc = "이슬비";
                weatherEmoji = "🌦️";
                loveScore += 12;
                loveMsg = "보슬보슬 내리는 비에 우산 하나 나눠 쓰기 딱 좋은 날!";
            } else if (weatherCode >= 61 && weatherCode <= 67) {
                // 비
                weatherDesc = "비";
                weatherEmoji = "🌧️";
                loveScore += 8;
                loveMsg = "비 오는 날 카페에서 따뜻한 음료 한 잔, 은밀한 분위기가 좋아요.";
            } else if (weatherCode >= 71 && weatherCode <= 77) {
                // 눈
                weatherDesc = "눈";
                weatherEmoji = "❄️";
                loveScore += 18;
                loveMsg = "첫눈 오는 날 함께라면... 로맨스 영화 주인공이 될 수 있어요!";
            } else if (weatherCode >= 80 && weatherCode <= 82) {
                // 소나기
                weatherDesc = "소나기";
                weatherEmoji = "🌧️";
                loveScore += 5;
                loveMsg = "갑작스런 소나기처럼 예상 못한 설렘이 찾아올지도?";
            } else if (weatherCode >= 95) {
                // 뇌우
                weatherDesc = "뇌우";
                weatherEmoji = "⛈️";
                loveScore -= 5;
                loveMsg = "폭풍 같은 날씨엔 집에서 영화 보며 쉬는 게 최고예요.";
            } else {
                weatherDesc = "변덕스러운 날씨";
                weatherEmoji = "🌤️";
                loveScore += 5;
                loveMsg = "날씨처럼 마음도 변덕스러운 날, 새로운 만남에 열린 마음을!";
            }

            // 기온 보정
            if (realTemp >= 20 && realTemp <= 25) loveScore += 8; // 완벽한 날씨
            else if (realTemp >= 15 && realTemp < 20) loveScore += 5; // 선선
            else if (realTemp >= 25 && realTemp <= 30) loveScore += 3; // 따뜻
            else if (realTemp > 30) loveScore -= 5; // 너무 더움
            else if (realTemp < 5) loveScore += 4; // 추우면 오히려 밀착

            // 바람 보정
            if (wind > 20) loveScore -= 5; // 강풍

            int temperature = Math.max(20, Math.min(99, loveScore));
            String mood;
            if (temperature >= 85) mood = "hot";
            else if (temperature >= 70) mood = "warm";
            else if (temperature >= 55) mood = "mild";
            else if (temperature >= 40) mood = "cool";
            else mood = "cold";

            result.put("temperature", temperature);
            result.put("message", loveMsg);
            result.put("mood", mood);
            result.put("weatherDesc", weatherDesc);
            result.put("weatherEmoji", weatherEmoji);
            result.put("realTemp", Math.round(realTemp));
            result.put("weatherBased", true);

        } catch (Exception e) {
            log.warn("날씨 API 호출 실패, 기본값 사용: {}", e.getMessage());
            // 폴백: 기본 연애 온도
            long seed = today.toEpochDay();
            Random r = new Random(seed);
            int temperature = 50 + r.nextInt(20);
            result.put("temperature", temperature);
            result.put("message", "오늘 하루도 사랑의 기운을 느껴보세요.");
            result.put("mood", temperature >= 60 ? "warm" : "mild");
            result.put("weatherBased", false);
        }

        saveToCache("love-temp", cacheKey, result);
        return result;
    }

    /**
     * 사용자 사주 기반 연애 온도 (로그인 사용자용)
     */
    public Map<String, Object> getUserLoveTemperature(Long userId) {
        LocalDate today = LocalDate.now();
        String cacheKey = buildCacheKey("love-temp-user", userId + "-" + today);
        Map<String, Object> cached = getFromCache("love-temp-user", cacheKey);
        if (cached != null) return cached;

        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return getLoveTemperature(); // 폴백

        var user = userOpt.get();
        LocalDate birthDate = user.getBirthDate();
        if (birthDate == null) return getLoveTemperature(); // 프로필 미완성 폴백

        // 사용자 사주 기둥 계산
        int sajuYear = SajuCalculator.getSajuYear(birthDate);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(birthDate);
        SajuPillar todayPillar = SajuCalculator.calculateDayPillar(today);

        int dayStemEl = SajuConstants.CHEONGAN_OHENG[todayPillar.getStemIndex()];
        int dayBranchEl = SajuConstants.JIJI_OHENG[todayPillar.getBranchIndex()];
        int birthStemEl = SajuConstants.CHEONGAN_OHENG[dayPillar.getStemIndex()];
        int birthBranchEl = SajuConstants.JIJI_OHENG[dayPillar.getBranchIndex()];

        // 기본 점수
        int baseScore = 55;

        // 오늘 일진의 오행 영향
        if (dayStemEl == 1 || dayBranchEl == 1) baseScore += 12; // 화 → 열정
        if (dayStemEl == 4 || dayBranchEl == 4) baseScore += 8;  // 수 → 감성
        if (dayStemEl == 0 || dayBranchEl == 0) baseScore += 6;  // 목 → 성장
        if (dayStemEl == 2) baseScore -= 3; // 토 → 안정
        if (dayStemEl == 3) baseScore -= 5; // 금 → 냉정

        // 본인 사주와 오늘의 상생/상극 관계
        // 상생: 목→화→토→금→수→목
        if ((birthStemEl + 1) % 5 == dayStemEl) baseScore += 10;  // 내 일간이 오늘을 생해줌 (시생)
        if ((dayStemEl + 1) % 5 == birthStemEl) baseScore += 8;   // 오늘이 나를 생해줌 (인수)
        // 상극: 목→토, 토→수, 수→화, 화→금, 금→목
        if ((birthStemEl + 2) % 5 == dayStemEl) baseScore -= 6;   // 내가 오늘을 극함
        if ((dayStemEl + 2) % 5 == birthStemEl) baseScore -= 8;   // 오늘이 나를 극함

        // 일지 합 관계 (자축합, 인해합 등) → 보너스
        int[] liuhe = {1,0,11,2,3,10,9,4,5,8,7,6};
        if (liuhe[dayPillar.getBranchIndex()] == todayPillar.getBranchIndex()) baseScore += 12;

        // 연애 상태 보너스
        if ("IN_RELATIONSHIP".equals(user.getRelationshipStatus())) baseScore += 5;
        if ("SOME".equals(user.getRelationshipStatus())) baseScore += 8;

        // 날짜 변동
        long seed = today.toEpochDay() * 31 + userId;
        Random r = new Random(seed);
        baseScore += r.nextInt(9) - 4;
        int temperature = Math.max(20, Math.min(99, baseScore));

        String message;
        String mood;
        if (temperature >= 85) { message = "사랑의 기운이 폭발하는 날! 고백하기 딱 좋은 날이에요."; mood = "hot"; }
        else if (temperature >= 70) { message = "따뜻한 사랑의 기운이 감도는 하루입니다."; mood = "warm"; }
        else if (temperature >= 55) { message = "잔잔한 설렘이 있는 평화로운 하루예요."; mood = "mild"; }
        else if (temperature >= 40) { message = "차분하게 마음을 다스리며 내면을 돌아보는 날."; mood = "cool"; }
        else { message = "혼자만의 시간이 소중한 날. 자기 사랑에 집중하세요."; mood = "cold"; }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("temperature", temperature);
        result.put("message", message);
        result.put("mood", mood);
        result.put("date", today.toString());
        result.put("todayPillar", todayPillar.getFullName());
        result.put("personalized", true);

        saveToCache("love-temp-user", cacheKey, result);
        return result;
    }

    /**
     * 캐시 체크 + 사주 기본 정보만 (AI 제외)
     */
    public Map<String, Object> getLoveFortuneBasic(String type, String birthDate,
                                               String birthTime, String gender, String calendarType,
                                               String partnerDate, String partnerGender,
                                               String breakupDate, String meetDate,
                                               String relationshipStatus) {
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();
        String typeKr = LOVE_TYPE_KR.getOrDefault(type, "연애운");

        String cacheKey = buildCacheKey(type, birthDate, gender, partnerDate, partnerGender, breakupDate, meetDate);
        Map<String, Object> cached = getFromCache(type, cacheKey);
        if (cached != null) return cached;

        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", type);
        result.put("typeKr", typeKr);
        result.put("birthDate", birthDate);
        result.put("date", today.toString());
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());
        return result;
    }

    /**
     * 스트리밍 완료 후 캐시 저장용
     */
    public void saveLoveFortuneCache(String type, String birthDate, String gender,
                                      String partnerDate, String partnerGender,
                                      String breakupDate, String meetDate,
                                      Map<String, Object> result) {
        String cacheKey = buildCacheKey(type, birthDate, gender, partnerDate, partnerGender, breakupDate, meetDate);
        saveToCache(type, cacheKey, result);
    }

    /**
     * 스트리밍 완료 후 결과 파싱 + 캐시 저장 (서버에서 직접)
     */
    public void parseAndSaveLoveStreamResult(String type, String birthDate, String gender,
                                              String partnerDate, String partnerGender,
                                              String breakupDate, String meetDate, String fullText) {
        try {
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) return;

            JsonNode node = objectMapper.readTree(json);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("type", type);
            result.put("birthDate", birthDate);
            result.put("score", node.path("score").asInt(65));
            result.put("grade", node.path("grade").asText("보통"));
            result.put("overall", node.path("overall").asText(""));
            result.put("timing", node.path("timing").asText(""));
            result.put("advice", node.path("advice").asText(""));
            result.put("caution", node.path("caution").asText(""));
            result.put("luckyDay", node.path("luckyDay").asText(""));
            result.put("luckyPlace", node.path("luckyPlace").asText(""));
            result.put("luckyColor", node.path("luckyColor").asText(""));

            String cacheKey = buildCacheKey(type, birthDate, gender, partnerDate, partnerGender, breakupDate, meetDate);
            saveToCache(type, cacheKey, result);
            log.info("연애운 스트리밍 캐시 저장 완료: type={}, key={}", type, cacheKey);
        } catch (Exception e) {
            log.warn("연애운 스트리밍 캐시 저장 실패: {}", e.getMessage());
        }
    }

    public Map<String, Object> getLoveFortune(String type, String birthDate,
                                               String birthTime, String gender, String calendarType,
                                               String partnerDate, String partnerGender,
                                               String breakupDate, String meetDate,
                                               String relationshipStatus) {
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();
        String typeKr = LOVE_TYPE_KR.getOrDefault(type, "연애운");

        // 캐시 체크
        String cacheKey = buildCacheKey(type, birthDate, gender, partnerDate, partnerGender, breakupDate, meetDate);
        Map<String, Object> cached = getFromCache(type, cacheKey);
        if (cached != null) return cached;

        String todayCtx = promptBuilder.buildTodayContext(today);

        // 사주 기본 정보
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", type);
        result.put("typeKr", typeKr);
        result.put("birthDate", birthDate);
        result.put("date", today.toString());
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());

        // AI 생성
        if (claudeApiService.isAvailable()) {
            try {
                String system = buildLoveSystemPrompt(type, gender);
                // 추가 정보 구성
                StringBuilder extra = new StringBuilder();
                if (partnerDate != null && !partnerDate.isBlank()) {
                    try {
                        LocalDate pd = LocalDate.parse(partnerDate);
                        int pYear = SajuCalculator.getSajuYear(pd);
                        SajuPillar pYearP = SajuCalculator.calculateYearPillar(pYear);
                        SajuPillar pDayP = SajuCalculator.calculateDayPillar(pd);
                        extra.append("\n【상대방】").append(pYearP.getAnimal()).append("띠 / 일간: ").append(pDayP.getFullName());
                        if (partnerGender != null) extra.append(" / 성별: ").append("M".equals(partnerGender) ? "남" : "여");
                        extra.append(" — 두 사람의 사주 궁합도 함께 분석하세요.");
                    } catch (Exception ignored) {}
                }
                if (breakupDate != null && !breakupDate.isBlank()) {
                    extra.append("\n【헤어진 시기】").append(breakupDate).append(" — 이별 시기의 천기도 참고하여 재회 가능성을 분석하세요.");
                }
                if (meetDate != null && !meetDate.isBlank()) {
                    try {
                        LocalDate md = LocalDate.parse(meetDate);
                        SajuPillar meetPillar = SajuCalculator.calculateDayPillar(md);
                        extra.append("\n【소개팅 날짜】").append(meetDate).append(" (").append(meetPillar.getFullName()).append("일) — 이 날의 기운이 소개팅에 미치는 영향도 분석하세요.");
                    } catch (Exception ignored) {}
                }

                // 연애 상태 매핑
                String statusKr = "";
                if (relationshipStatus != null) {
                    switch (relationshipStatus) {
                        case "SINGLE": statusKr = "솔로(짝 없음)"; break;
                        case "SOME": statusKr = "썸 타는 중"; break;
                        case "IN_RELATIONSHIP": statusKr = "연애 중"; break;
                        case "COMPLICATED": statusKr = "복잡한 관계"; break;
                        default: statusKr = ""; break;
                    }
                }

                String user = todayCtx + "\n" +
                    "【친구】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
                    (gender != null ? " / 성별: " + ("M".equals(gender) ? "남" : "여") : "") +
                    (!statusKr.isEmpty() ? " / 연애상태: " + statusKr : "") +
                    extra + "\n\n" +
                    "'" + typeKr + "' 분석." +
                    (!statusKr.isEmpty() ? " 연애상태: " + statusKr : "") + "\n" +
                    "JSON만 응답:\n" +
                    "{\"score\":0-100,\"grade\":\"대길/길/보통/흉\",\"overall\":\"종합 3-4문장\"," +
                    "\"timing\":\"최적시기 2문장\",\"advice\":\"행동조언 3문장\"," +
                    "\"caution\":\"주의 2문장\",\"luckyDay\":\"\",\"luckyPlace\":\"\",\"luckyColor\":\"\"}";

                String response = claudeApiService.generate(system, user, 1200);
                String json = ClaudeApiService.extractJson(response);
                if (json != null) {
                    JsonNode node = objectMapper.readTree(json);
                    result.put("score", node.path("score").asInt(65));
                    result.put("grade", node.path("grade").asText("보통"));
                    result.put("overall", node.path("overall").asText(""));
                    result.put("timing", node.path("timing").asText(""));
                    result.put("advice", node.path("advice").asText(""));
                    result.put("caution", node.path("caution").asText(""));
                    result.put("luckyDay", node.path("luckyDay").asText(""));
                    result.put("luckyPlace", node.path("luckyPlace").asText(""));
                    result.put("luckyColor", node.path("luckyColor").asText(""));
                    saveToCache(type, cacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.warn("AI {} 생성 실패: {}", typeKr, e.getMessage());
            }
        }

        // 폴백
        result.putAll(generateLoveFallback(type, dayPillar, today));
        saveToCache(type, cacheKey, result);
        return result;
    }

    /**
     * 아침/점심/저녁 운세 (3블록)
     */
    public Map<String, Object> getTimeblockFortune(String birthDate, String birthTime,
                                                     String gender, String calendarType) {
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();

        String tbCacheKey = buildCacheKey("timeblock", birthDate, gender);
        Map<String, Object> tbCached = getFromCache("timeblock", tbCacheKey);
        if (tbCached != null) return tbCached;

        String todayCtx = promptBuilder.buildTodayContext(today);

        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("birthDate", birthDate);
        result.put("date", today.toString());
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());

        if (claudeApiService.isAvailable()) {
            try {
                String system = FortunePromptBuilder.COMMON_TONE_RULES + "\n" + """
카페에서 친한 친구한테 수다 떨듯이 오늘 시간대별 기운을 알려주는 사주 전문가야.
하루를 아침/점심/저녁으로 나눠 기운이 어떻게 흐르는지 편하게 얘기해줘.

【분석 원리】
- 너의 일간 오행이 시간대별 오행 에너지와 어떻게 맞물리는지 분석
- 태어난 시간이 있으면 시주도 함께 교차 분석
- 아침(목) / 정오(화) / 오후(금) / 밤(수) 의 리듬을 반영

【작성 규칙】
1. 반드시 JSON만 응답
2. 각 시간대 fortune은 3문장, 구체적 행동/장소 포함
3. 점수는 40-95 사이
4. 사자성어나 한자 병기 금지, 쉬운 일상어로만""";
                String birthTimeInfo = (birthTime != null && !birthTime.isBlank()) ?
                    " / 태어난 시간: " + birthTime + " (시주 오행도 참고하여 시간대별 친화력을 분석하세요)" : "";
                String user = todayCtx + "\n【너】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
                    (gender != null ? " / " + ("M".equals(gender) ? "남" : "여") : "") + birthTimeInfo + "\n\n" +
                    "오늘 하루를 아침(05:00~11:00), 점심(11:00~17:00), 저녁(17:00~05:00) 3구간으로 나눠 분석하세요.\n" +
                    "반드시 아래 JSON 형식으로만 응답:\n" +
                    "{\"blocks\":[" +
                    "{\"name\":\"아침\",\"timeRange\":\"05:00~11:00\",\"score\":점수,\"fortune\":\"운세(3문장)\",\"advice\":\"조언(1문장)\",\"luckyAction\":\"추천행동\"}," +
                    "{\"name\":\"점심\",\"timeRange\":\"11:00~17:00\",\"score\":점수,\"fortune\":\"운세(3문장)\",\"advice\":\"조언(1문장)\",\"luckyAction\":\"추천행동\"}," +
                    "{\"name\":\"저녁\",\"timeRange\":\"17:00~05:00\",\"score\":점수,\"fortune\":\"운세(3문장)\",\"advice\":\"조언(1문장)\",\"luckyAction\":\"추천행동\"}" +
                    "],\"bestBlock\":\"가장 좋은 시간대\",\"summary\":\"하루 시간 활용 조언(2문장)\"}";

                String response = claudeApiService.generate(system, user, 700);
                String json = ClaudeApiService.extractJson(response);
                if (json != null) {
                    var node = objectMapper.readTree(json);
                    List<Map<String, Object>> blocks = new ArrayList<>();
                    var blocksNode = node.path("blocks");
                    if (blocksNode.isArray()) {
                        String[] icons = {"🌅", "☀️", "🌙"};
                        int i = 0;
                        for (var b : blocksNode) {
                            Map<String, Object> block = new LinkedHashMap<>();
                            block.put("name", b.path("name").asText());
                            block.put("timeRange", b.path("timeRange").asText());
                            block.put("score", b.path("score").asInt(60));
                            block.put("fortune", b.path("fortune").asText());
                            block.put("advice", b.path("advice").asText());
                            block.put("luckyAction", b.path("luckyAction").asText());
                            block.put("icon", i < icons.length ? icons[i] : "⏰");
                            blocks.add(block);
                            i++;
                        }
                    }
                    result.put("blocks", blocks);
                    result.put("bestBlock", node.path("bestBlock").asText(""));
                    result.put("summary", node.path("summary").asText(""));
                    saveToCache("timeblock", tbCacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.warn("AI 시간블록 운세 실패: {}", e.getMessage());
            }
        }

        // 폴백
        long seed = (dayPillar.getFullName() + today).hashCode();
        Random r = new Random(seed);
        String[][] tb = {{"아침","05:00~11:00","🌅"},{"점심","11:00~17:00","☀️"},{"저녁","17:00~05:00","🌙"}};
        int bestIdx = r.nextInt(3);
        List<Map<String, Object>> blocks = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("name", tb[i][0]); b.put("timeRange", tb[i][1]); b.put("icon", tb[i][2]);
            b.put("score", i == bestIdx ? r.nextInt(15) + 80 : r.nextInt(30) + 50);
            b.put("fortune", i == bestIdx ? "에너지가 높고 좋은 기운이 감도는 시간입니다. 중요한 일을 이 시간에 집중하세요." : "무난한 시간대입니다. 평소대로 진행하세요.");
            b.put("advice", "차분하게 하루를 보내세요."); b.put("luckyAction", new String[]{"명상","산책","독서"}[i]);
            blocks.add(b);
        }
        result.put("blocks", blocks);
        result.put("bestBlock", tb[bestIdx][0]);
        result.put("summary", tb[bestIdx][0] + " 시간대에 가장 좋은 기운이 흐릅니다.");
        saveToCache("timeblock", tbCacheKey, result);
        return result;
    }

    /**
     * 시간대별 운세 (12시진)
     */
    public Map<String, Object> getHourlyFortune(String birthDate, String birthTime,
                                                  String gender, String calendarType) {
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();

        String hCacheKey = buildCacheKey("hourly", birthDate, gender);
        Map<String, Object> hCached = getFromCache("hourly", hCacheKey);
        if (hCached != null) return hCached;

        String todayCtx = promptBuilder.buildTodayContext(today);

        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);
        SajuPillar todayPillar = SajuCalculator.calculateDayPillar(today);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("birthDate", birthDate);
        result.put("date", today.toString());
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());
        result.put("todayPillar", todayPillar.getFullName());

        // AI 생성
        if (claudeApiService.isAvailable()) {
            try {
                String system = FortunePromptBuilder.COMMON_TONE_RULES + "\n" + """
카페에서 친한 친구한테 12시간대별 기운을 알려주는 사주 전문가야.
12시진(2시간 단위 12구간)의 기운이 너의 일간과 어떻게 맞물리는지 편하게 풀어줘.

【시간대 오행 매핑 (내부 참고 — 한자 출력 금지)】
자시=수, 축시=토, 인시=목, 묘시=목, 진시=토, 사시=화
오시=화, 미시=토, 신시=금, 유시=금, 술시=토, 해시=수

【분석 원리】
- 너의 일간 오행이 시진 오행과 잘 맞으면 고점 (75+)
- 어긋나면 주의 시간 (40-55)
- 같은 오행이면 에너지 증폭 (70+)
- 태어난 시간이 있으면 시주와 교차 분석

반드시 JSON만 응답하세요.""";
                String birthTimeInfo = (birthTime != null && !birthTime.isBlank()) ?
                    " / 태어난 시간: " + birthTime + " (시주 오행과 각 시진의 관계도 분석)" : "";
                String user = todayCtx + "\n" +
                    "【친구】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
                    (gender != null ? " / 성별: " + ("M".equals(gender) ? "남" : "여") : "") + birthTimeInfo + "\n\n" +
                    "오늘 12시진별 운세를 분석하세요. 반드시 아래 JSON 형식으로만 응답:\n" +
                    "{\"hours\":[" +
                    "{\"name\":\"자시\",\"time\":\"23:00~01:00\",\"score\":점수,\"fortune\":\"운세(2문장)\",\"action\":\"추천행동(1문장)\"}," +
                    "... (12개 시진 모두)" +
                    "],\"bestHour\":\"가장 좋은 시간대 이름\",\"worstHour\":\"가장 주의할 시간대 이름\"," +
                    "\"summary\":\"오늘 시간 활용 조언 (2문장)\"}";

                String response = claudeApiService.generate(system, user, 1500);
                String json = ClaudeApiService.extractJson(response);
                if (json != null) {
                    JsonNode node = objectMapper.readTree(json);
                    List<Map<String, Object>> hours = new ArrayList<>();
                    JsonNode hoursNode = node.path("hours");
                    if (hoursNode.isArray()) {
                        for (JsonNode h : hoursNode) {
                            Map<String, Object> hour = new LinkedHashMap<>();
                            hour.put("name", h.path("name").asText());
                            hour.put("time", h.path("time").asText());
                            hour.put("score", h.path("score").asInt(60));
                            hour.put("fortune", h.path("fortune").asText());
                            hour.put("action", h.path("action").asText());
                            hours.add(hour);
                        }
                    }
                    result.put("hours", hours);
                    result.put("bestHour", node.path("bestHour").asText(""));
                    result.put("worstHour", node.path("worstHour").asText(""));
                    result.put("summary", node.path("summary").asText(""));
                    saveToCache("hourly", hCacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.warn("AI 시간대별 운세 실패: {}", e.getMessage());
            }
        }

        // 폴백
        result.putAll(generateHourlyFallback(dayPillar, todayPillar, today));
        saveToCache("hourly", hCacheKey, result);
        return result;
    }

    private String buildLoveSystemPrompt(String type, String gender) {
        String typeSpecific = switch (type) {
            case "relationship" -> """
【연애운 전문 분석 프레임워크】
- 일간(日干) 오행으로 너의 연애 스타일 파악 (목=로맨틱, 화=열정적, 토=안정지향, 금=신중, 수=감성적)
- 오늘 일진과 너 일간의 상생/상극이 연인 관계에 미치는 영향
- 오전/오후 시간대별 연애 에너지 변화
- 데이트 장소·활동·대화 주제까지 구체적 조언
- 갈등 요소 사전 경고 및 회피 전략
- 상대방 사주가 있으면: 두 사람의 일간 오행 관계(상생=궁합 좋음, 상극=갈등 가능), 일지 합충 관계 분석""";

            case "reunion" -> """
【재회운 전문 분석 프레임워크】
- 너 일간의 오행으로 이별 원인 유형 추론 (목=소통부족, 화=감정폭발, 토=권태, 금=고집, 수=불안)
- 오늘 일진이 재회 에너지를 지지하는지 분석 (일간과 일진의 합·충 관계)
- 재회 가능 시기: 너 일간에 유리한 월(月)과 일(日) 구체적 제시
- 재회를 위한 단계별 행동 로드맵 (1주·1개월·3개월)
- 헤어진 시기가 있으면: 그 날의 천기와 현재 천기 비교 → 에너지 변화 흐름 분석
- 상대방 사주가 있으면: 상대의 일간 기질로 재회 접근법 맞춤 제시
- 재회하면 안 되는 경우도 솔직히 조언""";

            case "remarriage" -> """
【재혼운 전문 분석 프레임워크】
- 너 일간의 오행으로 결혼 기질 분석 (관성·편관·정재·편재 등 십성 개념 활용)
- 오늘 일진과의 관계에서 새로운 인연의 기운 감지
- 새로운 배우자의 오행 기질 예측 (상생하는 일간 유형)
- 재혼 최적 시기: 대운/월운 흐름에서 인연이 강한 시기 제시
- 재혼 시 주의할 점: 전 배우자와의 미해결 에너지, 자녀 관계
- 이상적인 만남 장소/방법 구체적 제시
- 상대방 사주가 있으면: 두 사람의 결혼 궁합 심층 분석""";

            case "blind_date" -> """
【소개팅운 전문 분석 프레임워크】
- 너 일간의 오행으로 첫인상 전략 수립 (목=지적매력, 화=유머, 토=편안함, 금=세련됨, 수=신비로움)
- 오늘/소개팅 당일 일진의 기운이 첫만남에 미치는 영향
- 최적 시간대·장소·복장 색상·대화 주제 구체적 조언
- 피해야 할 행동/주제 경고
- 소개팅 날짜가 있으면: 그 날 일진의 오행 분석 → 맞춤 전략
- 상대방 사주가 있으면: 상대 기질 예측 → 호감 공략법
- 인연 발전 가능성 (소개팅→연인) 단계별 타임라인""";

            case "crush" -> """
【짝사랑운 전문 분석 프레임워크】
- 일간(日干) 오행으로 짝사랑 감정의 심도와 패턴 분석 (목=은은한 동경, 화=불타는 열정, 토=묵묵한 헌신, 금=쿨한 관심, 수=깊은 그리움)
- 오늘 일진이 짝사랑 에너지에 미치는 영향 (고백 기운 vs 관망 기운)
- 상대방에게 호감을 전달하는 최적 방법과 타이밍
- 짝사랑이 이루어질 가능성을 사주 오행 상생/상극으로 분석
- 상대가 나를 어떻게 인식하고 있는지 기운 흐름 분석
- 짝사랑에서 벗어나야 할 때의 신호도 솔직히 조언
- 감정을 키워나가는 단계별 전략 (1주/2주/1개월)""";

            case "marriage" -> """
【결혼운 전문 분석 프레임워크】
- 일간(日干)과 일지(日支)로 결혼 적합도와 결혼 기질 분석
- 정재(正財)/정관(正官)/편관(偏官) 등 십성 관점의 배우자 인연 분석
- 결혼 최적 시기: 대운/세운/월운 흐름에서 인연이 강한 연도와 월 구체적 제시
- 이상적인 배우자의 오행 기질과 성격 특성 예측
- 결혼 전 점검할 사항: 재정운, 가족관계운 연계 분석
- 결혼 생활에서 주의해야 할 갈등 요소와 극복 방법
- 올해/내년 결혼 기운의 강도 0-100 평가""";

            case "confession_timing" -> """
【고백 타이밍 전문 분석 프레임워크】
- 일간(日干) 오행으로 고백 스타일 분석 (목=편지/진심고백, 화=즉흥/분위기, 토=안정적/계획적, 금=세련된/특별한, 수=감성적/로맨틱)
- 이번 주/이번 달 일진 중 고백하기 가장 좋은 날짜와 시간대 구체 제시
- 고백 장소·분위기·방법 맞춤 추천
- 피해야 할 날짜와 그 이유 (충·형이 있는 날)
- 고백 성공 확률을 높이는 사전 준비 행동
- 고백 후 관계 발전 시나리오 (성공/보류/거절 각각)
- D-day 카운트다운: 최적의 고백일까지 남은 일수""";

            case "ideal_type" -> """
【이상형 분석 전문 프레임워크】
- 일간(日干) 오행으로 무의식적으로 끌리는 이상형 유형 분석
- 정재/편재(남성), 정관/편관(여성) 십성으로 배우자 기질 구체 분석
- 이상형의 외모 특징 (체형, 분위기, 패션 스타일)
- 이상형의 성격 특성 (MBTI 성향, 가치관, 라이프스타일)
- 나와 상성이 좋은 오행 (상생 관계) → 잘 맞는 띠 TOP3 + 이유
- 잘 맞는 MBTI 유형 2-3개 + 이유
- 잘 맞는 혈액형 + 이유
- 나와 상성이 어려운 오행 (상극 관계) → 주의할 유형
- 이상형을 만날 수 있는 장소·활동·모임 구체 추천 3가지
- 연애운이 강한 시기·나이대 + 만남 확률 높은 계절/월

【추가 JSON 필드 - overall 외에 반드시 포함】
- bestZodiac: "잘 맞는 띠 TOP3과 이유 (2-3문장)"
- bestMbti: "잘 맞는 MBTI 2-3개와 이유 (2-3문장)"
- lookType: "이상형 외모/분위기 키워드 (2-3문장)"
- personalityType: "이상형 성격/가치관 (2-3문장)"
- meetingPlace: "만남 장소·활동 추천 3가지 (2-3문장)"
- meetingTiming: "인연 만날 시기·계절 (2문장)"
- celebMatch: "나와 사주 궁합이 잘 맞을 실제 한국 연예인 3명 추천 + 각각 이유 한줄 (예: 'BTS 뷔 - 토 기운이 너의 수를 안정시켜줘')\"""";

            case "past_life" -> """
【전생 인연 분석 프레임워크】
- 일간(日干)과 일지(日支)의 조합으로 전생의 인연 유형 분석
- 전생에서 너의 신분/역할 상상적 해석 (오행 기반 스토리텔링)
- 현생에서 반복되는 연애 패턴과 전생 카르마의 연결
- 전생의 인연이 현생에 미치는 영향: 끌림/거부감/데자뷰 설명
- 인연의 빚(전생에서 못 다한 사랑)이 있는 상대의 특징
- 전생 카르마를 해소하고 더 나은 인연을 만드는 방법
- 창의적이고 흥미로운 스토리텔링으로 감성적으로 작성
- overall은 전생 이야기를 서술형으로 6-8문장""";

            case "mind_reading" -> """
【속마음 분석 프레임워크】
- 너의 일간(日干) 오행으로 감정 수신 능력 분석
- 오늘의 일진 기운으로 상대방의 감정 에너지 흐름 해석
- 상대방이 나를 어떻게 생각하는지 5가지 관점 분석 (호감도/관심도/신뢰도/설렘/미래전망)
- 상대방의 숨겨진 감정 신호 (행동/말투/태도에서 읽는 법)
- 상대방이 마음을 열 수 있는 키포인트 제시
- 지금 상대방이 원하는 것 vs 두려워하는 것 분석
- 상대방 사주가 있으면: 일간 오행으로 상대 성격과 연애관 구체 분석
- overall은 '상대방의 마음을 읽어드릴게요'라는 톤으로 5-6문장""";

            case "couple_fortune" -> """
【커플 운세 전문 분석 프레임워크】
- 너 일간의 오행으로 오늘 연인과의 관계 에너지 분석
- 오늘 일진이 커플 관계에 미치는 영향 (화합/갈등/설렘/안정)
- 오늘 커플이 함께 하면 좋은 활동 3가지 구체 추천
- 오늘 피해야 할 대화 주제/행동 경고
- 연인에게 전하면 좋은 말/메시지 추천
- 상대방 사주가 있으면: 두 사람의 오늘 에너지 조합 분석
- 이번 주 커플 럭키데이 제시
- 권태기 예방/극복 팁 (사주 기반)""";

            case "some_check" -> """
【썸 진단 전문 분석 프레임워크】
- 너 일간(日干) 오행으로 현재 썸의 성격과 패턴 분석
- 오늘 일진이 썸 관계에 미치는 에너지 분석 (진전/정체/후퇴)
- 썸 → 연애 발전 가능성을 사주 오행 상생/상극으로 퍼센트 제시
- 상대가 나에게 보내는 신호 해석 (관심/호감/우정/경계)
- 썸에서 연애로 넘어가기 위한 결정적 행동 3가지
- 이 썸의 유통기한 분석 (지금 행동해야 할지, 기다려야 할지)
- 상대방 사주가 있으면: 상대의 연애관과 썸 스타일 분석
- 이번 주/이번 달 썸이 발전할 최적 타이밍 제시""";

            case "contact_fortune" -> """
【연락 운 전문 분석 프레임워크】
- 너 일간(日干) 오행으로 커뮤니케이션 스타일 분석
- 오늘 일진의 기운이 연락/대화에 미치는 영향
- 먼저 연락해도 되는 시간대 vs 기다려야 하는 시간대 구체 제시
- 연락할 때 효과적인 대화 주제/톤/이모지 추천
- 피해야 할 연락 타이밍과 대화 주제 경고
- 상대방이 연락을 기다리고 있는지 기운 분석
- 읽씹/안읽씹 당했을 때 대처법 (사주 기반)
- 상대방 사주가 있으면: 상대의 연락 스타일과 선호 패턴 분석""";

            case "meeting_timing" -> """
【만남의 시기 전문 분석 프레임워크】
- 일간(日干)과 사주 전체 구조로 인연의 시기 분석
- 정재/편재(남), 정관/편관(여) 십성이 들어오는 대운/세운 시기 분석
- 올해 남은 기간 중 인연이 강한 월(月) 구체 제시
- 내년/향후 2-3년 인연 기운 타임라인
- 인연을 만날 가능성이 높은 장소/상황/활동 유형
- 인연을 앞당기기 위해 지금 해야 할 행동 3가지
- 이 시기에 만날 인연의 특징 (오행 기질, 직업군, 성격)
- 급하게 인연을 찾기보다 준비할 것들 조언""";

            default -> "연애 운세를 분석합니다.";
        };

        // 성별에 따라 톤 변경: 남자 → 여자친구 톤, 여자 → 남자친구 톤
        boolean isMale = "M".equals(gender);
        String persona = isMale
            ? """
카페에서 친한 여사친이 다정하게 연애 상담해주는 사주 전문가야.
남자에게 여자친구가 옆에서 편하게 대화하듯 따뜻하게 말해줘.

【말투 스타일】
- 자연스러운 대화체 반말 (보고서 톤 절대 금지)
- 공감하고 응원하는 따뜻한 느낌
- 이모지 사용 OK
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지"""
            : """
카페에서 친한 남사친이 든든하게 연애 상담해주는 사주 전문가야.
여자에게 남자친구가 옆에서 편하게 대화하듯 든든하게 말해줘.

【말투 스타일】
- 자연스러운 대화체 반말 (보고서 톤 절대 금지)
- 공감하면서도 자신감 있는 따뜻한 느낌
- 이모지 사용 OK
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지""";

        return FortunePromptBuilder.COMMON_TONE_RULES + "\n" + persona + "\n\n사주 용어는 최대한 쉽게 풀어서 설명하고, 딱딱하거나 고전적인 표현은 절대 쓰지 않아.\n\n"
            + typeSpecific + """

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. overall: 4-5문장, 친구한테 얘기하듯 편하게
3. timing: 구체적 날짜/요일/시간대 포함
4. advice: 바로 해볼 수 있는 행동 3가지 (친구 조언처럼)
5. caution: 피해야 할 상황 2가지 (걱정해주는 톤으로)
6. 자연스러운 대화체 반말 사용
7. 점수는 사주 궁합도와 일진 기운을 종합하여 0-100 책정""";
    }

    /**
     * 연애운 스트리밍용 프롬프트 빌드
     */
    public String[] buildLoveStreamPrompts(String type, String birthDate, String birthTime, String gender,
                                            String calendarType, String partnerDate, String partnerGender,
                                            String breakupDate, String meetDate, String relationshipStatus) {
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();
        String typeKr = LOVE_TYPE_KR.getOrDefault(type, "연애운");

        String todayCtx = promptBuilder.buildTodayContext(today);
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        String system = buildLoveSystemPrompt(type, gender);

        StringBuilder extra = new StringBuilder();
        if (partnerDate != null && !partnerDate.isBlank()) {
            try {
                LocalDate pd = LocalDate.parse(partnerDate);
                SajuPillar pYearP = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(pd));
                SajuPillar pDayP = SajuCalculator.calculateDayPillar(pd);
                extra.append("\n【상대방】").append(pYearP.getAnimal()).append("띠 / 일간: ").append(pDayP.getFullName());
                if (partnerGender != null) extra.append(" / 성별: ").append("M".equals(partnerGender) ? "남" : "여");
            } catch (Exception ignored) {}
        }
        if (breakupDate != null && !breakupDate.isBlank()) extra.append("\n【헤어진 시기】").append(breakupDate);
        if (meetDate != null && !meetDate.isBlank()) {
            try {
                LocalDate md = LocalDate.parse(meetDate);
                extra.append("\n【소개팅 날짜】").append(meetDate).append(" (").append(SajuCalculator.calculateDayPillar(md).getFullName()).append("일)");
            } catch (Exception ignored) {}
        }

        String statusKr = "";
        if (relationshipStatus != null) {
            switch (relationshipStatus) {
                case "SINGLE": statusKr = "솔로(짝 없음)"; break;
                case "SOME": statusKr = "썸 타는 중"; break;
                case "IN_RELATIONSHIP": statusKr = "연애 중"; break;
                case "COMPLICATED": statusKr = "복잡한 관계"; break;
            }
        }

        String user = todayCtx + "\n" +
            "【친구】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
            (gender != null ? " / 성별: " + ("M".equals(gender) ? "남" : "여") : "") +
            (!statusKr.isEmpty() ? " / 연애상태: " + statusKr : "") +
            extra + "\n\n" +
            "'" + typeKr + "' 분석." +
            (!statusKr.isEmpty() ? " 연애상태: " + statusKr : "") + "\n" +
            "JSON만 응답:\n" +
            ("ideal_type".equals(type)
                ? "{\"overall\":\"사주로 본 나의 이상형 종합 분석 4-5문장\"," +
                  "\"lookType\":\"이상형 외모/분위기 키워드 2-3문장\"," +
                  "\"personalityType\":\"이상형 성격/가치관 2-3문장\"," +
                  "\"bestZodiac\":\"잘 맞는 띠 TOP3과 이유 2-3문장\"," +
                  "\"bestMbti\":\"잘 맞는 MBTI 2-3개와 이유 2-3문장\"," +
                  "\"celebMatch\":\"나와 궁합 좋은 실제 한국 연예인 3명 + 각각 이유 한줄\"," +
                  "\"meetingPlace\":\"만남 장소·활동 추천 3가지 2-3문장\"," +
                  "\"meetingTiming\":\"인연 만날 시기·계절 2문장\"," +
                  "\"caution\":\"주의할 유형 2문장\"}"
                : "{\"score\":0-100,\"grade\":\"대길/길/보통/흉\",\"overall\":\"종합 3-4문장\"," +
                  "\"timing\":\"최적시기 2문장\",\"advice\":\"행동조언 3문장\"," +
                  "\"caution\":\"주의 2문장\",\"luckyDay\":\"\",\"luckyPlace\":\"\",\"luckyColor\":\"\"}");

        return new String[]{system, user};
    }

    private Map<String, Object> generateLoveFallback(String type, SajuPillar dayPillar, LocalDate today) {
        long seed = (type + dayPillar.getFullName() + today).hashCode();
        Random r = new Random(seed);
        Map<String, Object> m = new LinkedHashMap<>();
        int score = r.nextInt(40) + 45;
        String grade = score >= 80 ? "대길" : score >= 65 ? "길" : score >= 50 ? "보통" : "흉";
        m.put("score", score);
        m.put("grade", grade);

        String typeKr = LOVE_TYPE_KR.getOrDefault(type, "연애운");
        m.put("overall", "오늘 " + typeKr + " 점수는 " + score + "점이야! " +
            dayPillar.getFullName() + " 기운이 " + typeKr + "에 영향을 주고 있거든! " +
            "마음 정리 좀 하고 네 감정에 솔직해져봐 💕");
        m.put("timing", "이번 달 중순 이후부터 좋은 기운이 들어오기 시작해! 기대해도 돼 ✨");
        m.put("advice", "너 자신을 먼저 사랑해! 진심은 반드시 전달되거든 💗");
        m.put("caution", "조급하면 안 돼! 자연스러운 흐름을 따라가봐 🍀");
        m.put("luckyDay", today.plusDays(r.nextInt(14) + 3).format(DateTimeFormatter.ofPattern("M월 d일")));
        m.put("luckyPlace", new String[]{"카페", "공원", "서점", "미술관", "영화관"}[r.nextInt(5)]);
        m.put("luckyColor", new String[]{"핑크", "하늘색", "화이트", "라벤더", "코랄"}[r.nextInt(5)]);
        return m;
    }

    private Map<String, Object> generateHourlyFallback(SajuPillar dayPillar, SajuPillar todayPillar, LocalDate today) {
        long seed = (dayPillar.getFullName() + todayPillar.getFullName() + today).hashCode();
        Random r = new Random(seed);
        List<Map<String, Object>> hours = new ArrayList<>();
        String[] actions = {"명상하기", "중요한 연락하기", "산책하기", "학습에 집중", "재정 점검", "인맥 관리",
            "창의적 활동", "휴식 취하기", "운동하기", "독서하기", "계획 세우기", "감사 일기 쓰기"};

        int bestIdx = r.nextInt(12), worstIdx;
        do { worstIdx = r.nextInt(12); } while (worstIdx == bestIdx);

        for (int i = 0; i < 12; i++) {
            Map<String, Object> hour = new LinkedHashMap<>();
            hour.put("name", SIJIN[i][0]);
            hour.put("time", SIJIN[i][1]);
            int score = i == bestIdx ? r.nextInt(15) + 85 : i == worstIdx ? r.nextInt(15) + 35 : r.nextInt(35) + 50;
            hour.put("score", score);
            hour.put("fortune", score >= 75 ? "에너지가 높고 좋은 기운이 감도는 시간입니다." :
                      score >= 55 ? "무난한 시간대입니다. 평소대로 진행하세요." :
                      "주의가 필요한 시간입니다. 중요한 결정은 피하세요.");
            hour.put("action", actions[i]);
            hours.add(hour);
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("hours", hours);
        m.put("bestHour", SIJIN[bestIdx][0]);
        m.put("worstHour", SIJIN[worstIdx][0]);
        m.put("summary", SIJIN[bestIdx][0] + "(" + SIJIN[bestIdx][1] + ")에 가장 좋은 기운이 흐릅니다. " +
            SIJIN[worstIdx][0] + "에는 중요한 일을 피하세요.");
        return m;
    }

    // ═══ 캐시 헬퍼 ═══

    private String buildCacheKey(String... parts) {
        String raw = String.join("|", Arrays.stream(parts).map(p -> p != null ? p : "").toArray(String[]::new));
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++) sb.append(String.format("%02x", digest[i]));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(raw.hashCode());
        }
    }

    /**
     * 1:1연애/재회/재혼/소개팅 등 스페셜 운세는 생년월일+상태 기반 영속.
     * fortuneDate는 고정 anchor로 저장 (날짜 바뀌어도 캐시 히트).
     * createdAt 기준 1시간 TTL은 세션 내 반복 호출 방지용.
     */
    private static final LocalDate CACHE_ANCHOR = LocalDate.of(2000, 1, 1);

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String type, String cacheKey) {
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, CACHE_ANCHOR);
            if (cached.isPresent()) {
                // 1시간 지나면 캐시 만료 → 재질의
                LocalDateTime createdAt = cached.get().getCreatedAt();
                if (createdAt != null && createdAt.plusHours(1).isBefore(LocalDateTime.now())) {
                    log.info("캐시 만료(1시간 경과): {} / {}", type, cacheKey);
                    specialFortuneRepository.delete(cached.get());
                    return null;
                }
                log.debug("캐시 히트: {} / {}", type, cacheKey);
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            log.warn("캐시 읽기 실패: {}", e.getMessage());
        }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result) {
        try {
            // 중복 키 방지: 이미 존재하면 저장 안 함
            var existing = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, CACHE_ANCHOR);
            if (existing.isPresent()) {
                log.info("캐시 이미 존재: {} / {}", type, cacheKey);
                return;
            }
            String json = objectMapper.writeValueAsString(result);
            SpecialFortune entity = SpecialFortune.builder()
                .fortuneType(type)
                .cacheKey(cacheKey)
                .fortuneDate(CACHE_ANCHOR)
                .resultJson(json)
                .build();
            specialFortuneRepository.save(entity);
            log.info("캐시 저장: {} / {}", type, cacheKey);
        } catch (Exception e) {
            log.warn("캐시 저장 실패: {}", e.getMessage());
        }
    }
}
