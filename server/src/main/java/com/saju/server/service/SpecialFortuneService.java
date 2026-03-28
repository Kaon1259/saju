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

    private static final String[] LOVE_TYPES = {"relationship", "reunion", "remarriage", "blind_date"};
    private static final Map<String, String> LOVE_TYPE_KR = Map.of(
        "relationship", "연애운",
        "reunion", "재회운",
        "remarriage", "재혼운",
        "blind_date", "소개팅운"
    );

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
     * 특수 연애 운세 (재회/재혼/소개팅)
     */
    /**
     * 오늘의 연애 온도 (만20세 기준 일진 분석)
     */
    public Map<String, Object> getLoveTemperature() {
        LocalDate today = LocalDate.now();

        // 캐시 체크
        String cacheKey = buildCacheKey("love-temp", today.toString());
        Map<String, Object> cached = getFromCache("love-temp", cacheKey);
        if (cached != null) return cached;

        // 만20세 기준 생년월일
        LocalDate birth20 = today.minusYears(20);
        int sajuYear = SajuCalculator.getSajuYear(birth20);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(birth20);
        SajuPillar todayPillar = SajuCalculator.calculateDayPillar(today);

        // 오행 상호작용으로 연애 온도 계산
        int dayStemEl = com.saju.server.saju.SajuConstants.CHEONGAN_OHENG[todayPillar.getStemIndex()];
        int dayBranchEl = com.saju.server.saju.SajuConstants.JIJI_OHENG[todayPillar.getBranchIndex()];
        // 화(火)=열정, 수(水)=감성, 목(木)=성장 → 연애에 유리
        int baseScore = 55;
        if (dayStemEl == 1 || dayBranchEl == 1) baseScore += 15; // 화
        if (dayStemEl == 4 || dayBranchEl == 4) baseScore += 10; // 수
        if (dayStemEl == 0 || dayBranchEl == 0) baseScore += 8;  // 목
        if (dayStemEl == 2) baseScore -= 5; // 토 (안정, 연애보다 현실)
        if (dayStemEl == 3) baseScore -= 8; // 금 (냉정)
        // 날짜 변동 추가
        long seed = today.toEpochDay();
        Random r = new Random(seed);
        baseScore += r.nextInt(11) - 5;
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

    @Transactional
    public Map<String, Object> getLoveFortune(String type, String birthDate,
                                               String birthTime, String gender, String calendarType,
                                               String partnerDate, String partnerGender,
                                               String breakupDate, String meetDate) {
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
                String system = buildLoveSystemPrompt(type);
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

                String user = todayCtx + "\n" +
                    "【의뢰인】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
                    (gender != null ? " / 성별: " + ("M".equals(gender) ? "남" : "여") : "") +
                    extra + "\n\n" +
                    "위 정보를 바탕으로 '" + typeKr + "'을 분석하세요.\n" +
                    "반드시 아래 JSON 형식으로만 응답:\n" +
                    "{\"score\":점수(0-100),\"grade\":\"등급(대길/길/보통/흉)\",\"overall\":\"종합 분석 (4-5문장)\"," +
                    "\"timing\":\"최적 시기 (2문장)\",\"advice\":\"구체적 행동 조언 (3문장)\"," +
                    "\"caution\":\"주의사항 (2문장)\",\"luckyDay\":\"이번 달 행운의 날짜\"," +
                    "\"luckyPlace\":\"행운의 장소\",\"luckyColor\":\"행운의 색\"}";

                String response = claudeApiService.generate(system, user, 800);
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
    @Transactional
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
                String system = """
당신은 40년 경력의 시간 역학(時間易學) 전문가 '시명(時命) 선생'입니다.
12시진(十二時辰)과 오행의 시간대별 에너지 흐름을 정확히 읽어 맞춤 조언을 제공합니다.

【분석 원리】
- 의뢰인의 일간(日干) 오행이 시간대별 오행 에너지와 상생/상극하는 관계를 분석
- 태어난 시간(시주)이 있으면: 시주 오행과 시간대 오행의 교차 분석으로 정밀도 향상
- 목(木) 시간대(인묘): 새벽~아침, 화(火) 시간대(사오): 오전~정오, 토(土) 시간대(진술축미): 전환기
- 금(金) 시간대(신유): 오후, 수(水) 시간대(해자): 밤
- 의뢰인 일간이 시간대 오행과 상생하면 고점, 상극하면 주의

【작성 규칙】
1. 반드시 JSON만 응답
2. 각 시간대 fortune은 3문장, 구체적 행동/장소 포함
3. 점수는 오행 상호작용에 따라 40-95 사이
4. 단정적 표현 사용""";
                String birthTimeInfo = (birthTime != null && !birthTime.isBlank()) ?
                    " / 태어난 시간: " + birthTime + " (시주 오행도 참고하여 시간대별 친화력을 분석하세요)" : "";
                String user = todayCtx + "\n【의뢰인】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
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
    @Transactional
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
                String system = """
당신은 40년 경력의 시간 역학(時間易學) 전문가 '시명(時命) 선생'입니다.
12시진(十二時辰)의 천간지지와 오행 에너지가 의뢰인의 일간과 어떻게 상호작용하는지 정밀 분석합니다.

【12시진 오행 매핑】
자시(子)=수, 축시(丑)=토, 인시(寅)=목, 묘시(卯)=목, 진시(辰)=토, 사시(巳)=화
오시(午)=화, 미시(未)=토, 신시(申)=금, 유시(酉)=금, 술시(戌)=토, 해시(亥)=수

【분석 원리】
- 의뢰인 일간 오행이 시진 오행과 상생하면 고점 (75+)
- 상극하면 주의 시간 (40-55)
- 비화(같은 오행)면 에너지 증폭 (70+)
- 태어난 시간이 있으면 시주와의 교차 분석으로 정밀도 향상

반드시 JSON만 응답하세요.""";
                String birthTimeInfo = (birthTime != null && !birthTime.isBlank()) ?
                    " / 태어난 시간: " + birthTime + " (시주 오행과 각 시진의 관계도 분석)" : "";
                String user = todayCtx + "\n" +
                    "【의뢰인】" + yearPillar.getAnimal() + "띠 / 일간: " + dayPillar.getFullName() +
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

    private String buildLoveSystemPrompt(String type) {
        String typeSpecific = switch (type) {
            case "relationship" -> """
【연애운 전문 분석 프레임워크】
- 일간(日干) 오행으로 의뢰인의 연애 스타일 파악 (목=로맨틱, 화=열정적, 토=안정지향, 금=신중, 수=감성적)
- 오늘 일진과 의뢰인 일간의 상생/상극이 연인 관계에 미치는 영향
- 오전/오후 시간대별 연애 에너지 변화
- 데이트 장소·활동·대화 주제까지 구체적 조언
- 갈등 요소 사전 경고 및 회피 전략
- 상대방 사주가 있으면: 두 사람의 일간 오행 관계(상생=궁합 좋음, 상극=갈등 가능), 일지 합충 관계 분석""";

            case "reunion" -> """
【재회운 전문 분석 프레임워크】
- 의뢰인 일간의 오행으로 이별 원인 유형 추론 (목=소통부족, 화=감정폭발, 토=권태, 금=고집, 수=불안)
- 오늘 일진이 재회 에너지를 지지하는지 분석 (일간과 일진의 합·충 관계)
- 재회 가능 시기: 의뢰인 일간에 유리한 월(月)과 일(日) 구체적 제시
- 재회를 위한 단계별 행동 로드맵 (1주·1개월·3개월)
- 헤어진 시기가 있으면: 그 날의 천기와 현재 천기 비교 → 에너지 변화 흐름 분석
- 상대방 사주가 있으면: 상대의 일간 기질로 재회 접근법 맞춤 제시
- 재회하면 안 되는 경우도 솔직히 조언""";

            case "remarriage" -> """
【재혼운 전문 분석 프레임워크】
- 의뢰인 일간의 오행으로 결혼 기질 분석 (관성·편관·정재·편재 등 십성 개념 활용)
- 오늘 일진과의 관계에서 새로운 인연의 기운 감지
- 새로운 배우자의 오행 기질 예측 (상생하는 일간 유형)
- 재혼 최적 시기: 대운/월운 흐름에서 인연이 강한 시기 제시
- 재혼 시 주의할 점: 전 배우자와의 미해결 에너지, 자녀 관계
- 이상적인 만남 장소/방법 구체적 제시
- 상대방 사주가 있으면: 두 사람의 결혼 궁합 심층 분석""";

            case "blind_date" -> """
【소개팅운 전문 분석 프레임워크】
- 의뢰인 일간의 오행으로 첫인상 전략 수립 (목=지적매력, 화=유머, 토=편안함, 금=세련됨, 수=신비로움)
- 오늘/소개팅 당일 일진의 기운이 첫만남에 미치는 영향
- 최적 시간대·장소·복장 색상·대화 주제 구체적 조언
- 피해야 할 행동/주제 경고
- 소개팅 날짜가 있으면: 그 날 일진의 오행 분석 → 맞춤 전략
- 상대방 사주가 있으면: 상대 기질 예측 → 호감 공략법
- 인연 발전 가능성 (소개팅→연인) 단계별 타임라인""";

            default -> "연애 운세를 분석합니다.";
        };

        return """
당신은 40년 경력의 사주명리학 대가이며 연애·궁합 전문 역술인 '연화(緣華) 선생'입니다.
수천 쌍의 커플을 상담한 경험으로, 사주팔자와 일진의 기운으로 인연의 흐름을 정확히 읽습니다.

【핵심 역량】
- 일간(日干) 오행의 연애 기질 분석
- 두 사람의 일간 오행 상생/상극 궁합
- 일지(日支)의 육합·삼합·충·형 관계로 인연의 깊이 판단
- 오늘의 천기가 연애 에너지에 미치는 영향 분석
- 사주에 없는 오행을 보충하는 인연 매칭

""" + typeSpecific + """

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. overall: 4-5문장, 사주 용어를 알기 쉽게 풀어서 설명
3. timing: 구체적 날짜/요일/시간대 포함
4. advice: 바로 실천 가능한 행동 3가지
5. caution: 피해야 할 구체적 상황 2가지
6. "~할 수 있습니다" 대신 "~하세요", "~입니다" 단정적 표현
7. 점수는 사주 궁합도와 일진 기운을 종합하여 0-100 책정""";
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
        m.put("overall", "오늘 " + typeKr + " 점수는 " + score + "점입니다. " +
            "일간 " + dayPillar.getFullName() + "의 기운이 " + typeKr + "에 영향을 미치고 있습니다. " +
            "차분하게 마음을 정리하고 자신의 감정에 솔직해지세요.");
        m.put("timing", "이번 달 중순 이후가 좋은 기운이 들어오는 시기입니다.");
        m.put("advice", "자신을 먼저 사랑하세요. 진심 어린 마음은 반드시 전달됩니다.");
        m.put("caution", "조급함은 금물입니다. 자연스러운 흐름을 따르세요.");
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

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String type, String cacheKey) {
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, LocalDate.now());
            if (cached.isPresent()) {
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
            String json = objectMapper.writeValueAsString(result);
            SpecialFortune entity = SpecialFortune.builder()
                .fortuneType(type)
                .cacheKey(cacheKey)
                .fortuneDate(LocalDate.now())
                .resultJson(json)
                .build();
            specialFortuneRepository.save(entity);
            log.info("캐시 저장: {} / {}", type, cacheKey);
        } catch (Exception e) {
            log.warn("캐시 저장 실패: {}", e.getMessage());
        }
    }
}
