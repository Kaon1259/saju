package com.saju.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.saju.*;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.service.*;
import com.saju.server.util.SseEmitterUtils;
import com.saju.server.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/saju")
@RequiredArgsConstructor
@Slf4j
public class SajuController {

    private final UserService userService;
    private final SajuService sajuService;
    private final LunarCalendarService lunarCalendarService;
    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final HeartPointService heartPointService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
     * 다른 사람 사주 분석 스트리밍
     * GET /api/saju/analyze/stream?birthDate=1990-05-15&birthTime=자시&calendarType=SOLAR&gender=M
     */
    @GetMapping(value = "/analyze/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAnalyzeSaju(
            @RequestParam("birthDate") String birthDateStr,
            @RequestParam(value = "birthTime", required = false) String birthTime,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType,
            @RequestParam(value = "gender", required = false) String gender,
            @RequestParam(required = false) Long userId) {

        LocalDate birthDate = LocalDate.parse(birthDateStr);
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            birthDate = lunarCalendarService.lunarToSolar(birthDate);
        }

        // 1. DB 캐시 체크
        SajuResult cached = sajuService.getCachedResult(birthDate, birthTime, gender);
        if (cached != null && cached.getTodayFortune() != null
                && cached.getTodayFortune().getOverall() != null
                && !cached.getTodayFortune().getOverall().isBlank()) {
            SseEmitter emitter = new SseEmitter(5000L);
            final SajuResult result = cached;
            new Thread(() -> {
                try {
                    String json = objectMapper.writeValueAsString(result);
                    emitter.send(SseEmitter.event().name("cached").data(json));
                    emitter.complete();
                } catch (Exception e) {
                    log.warn("Failed to send cached saju result: {}", e.getMessage());
                }
            }).start();
            return emitter;
        }

        // 2. 기본 사주 계산 (빠름)
        SajuResult basicResult = sajuService.buildBasicResult(birthDate, birthTime, gender);

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "SAJU_ANALYSIS");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        // 3. 통합 AI 프롬프트 (성격분석 + 오늘의 운세 한 번에)
        String sajuSummary = sajuService.getSajuSummary(basicResult, birthDate, birthTime, LocalDate.now());
        String todayContext = promptBuilder.buildTodayContext(LocalDate.now());

        String systemPrompt = """
카페에서 친한 친구한테 수다 떨듯이 자연스럽게 대화하는 사주 전문가야.
사주 정보를 바탕으로 성격 분석과 오늘의 운세를 함께 봐줘!

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. personalityReading: 핵심 성격(장점+단점), 대인관계 스타일, 연애 스타일을 6-8문장으로
3. overall~work 각 항목은 3-4문장, 구체적 시간/행동/색상 포함
4. 점수는 45-98 사이
5. 대화하듯 자연스러운 반말 구어체""";

        String userPrompt = todayContext + "\n" + sajuSummary + "\n\n" +
            "위 사주 정보와 오늘의 천기를 종합하여 성격 분석과 오늘의 운세를 함께 작성하세요.\n" +
            "반드시 아래 JSON 형식으로만 응답:\n" +
            "{\"personalityReading\":\"성격 분석 (6-8문장)\"," +
            "\"overall\":\"총운 (오전/오후/저녁 시간대별 기운 변화, 4-5문장)\"," +
            "\"love\":\"애정운 (3-4문장)\"," +
            "\"money\":\"재물운 (3-4문장)\"," +
            "\"health\":\"건강운 (3-4문장)\"," +
            "\"work\":\"직장운 (3-4문장)\"," +
            "\"score\":점수(45-98)," +
            "\"luckyNumber\":행운숫자(1-99)," +
            "\"luckyColor\":\"행운색상\"}";

        final LocalDate finalBd = birthDate;
        final Long uid = userId;
        return claudeApiService.generateStream(systemPrompt, userPrompt, 2500, (fullText) -> {
            sajuService.parseAndSaveStreamResult(finalBd, birthTime, gender, basicResult, fullText);
            if (uid != null) heartPointService.deductPoints(uid, "SAJU_ANALYSIS", "사주분석");
        });
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
     * 만세력 AI 해석 스트리밍
     * GET /api/saju/manseryeok/stream?date=2026-04-07&calendarType=SOLAR&birthDate=1990-05-15
     */
    @GetMapping(value = "/manseryeok/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamManseryeokInterpretation(
            @RequestParam("date") String dateStr,
            @RequestParam(value = "calendarType", defaultValue = "SOLAR") String calendarType,
            @RequestParam(value = "birthDate", required = false) String birthDateStr,
            @RequestParam(required = false) Long userId) {

        LocalDate date = LocalDate.parse(dateStr);
        if ("LUNAR".equalsIgnoreCase(calendarType)) {
            date = lunarCalendarService.lunarToSolar(date);
        }

        // 천간지지 계산
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar monthPillar = SajuCalculator.calculateMonthPillar(date, yearPillar.getStemIndex());
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        // 오행 분포 계산
        Map<String, Integer> elements = new java.util.LinkedHashMap<>();
        elements.put("목", 0); elements.put("화", 0); elements.put("토", 0); elements.put("금", 0); elements.put("수", 0);
        for (SajuPillar p : new SajuPillar[]{ yearPillar, monthPillar, dayPillar }) {
            String se = p.getStemElementName();
            String be = p.getBranchElementName();
            elements.merge(se, 1, Integer::sum);
            elements.merge(be, 1, Integer::sum);
        }

        // 캐시 체크
        String cacheKey = sajuService.buildManseryeokCacheKey(date.toString(), birthDateStr);
        Map<String, Object> cached = sajuService.getManseryeokCache(cacheKey);
        if (cached != null) {
            SseEmitter emitter = new SseEmitter(5000L);
            new Thread(() -> {
                try {
                    String json = objectMapper.writeValueAsString(cached);
                    emitter.send(SseEmitter.event().name("cached").data(json));
                    emitter.complete();
                } catch (Exception e) {
                    log.warn("Failed to send cached manseryeok result: {}", e.getMessage());
                }
            }).start();
            return emitter;
        }

        // 하트 잔액 확인
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, "MANSERYEOK");
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }

        // AI 프롬프트 구성
        StringBuilder pillarInfo = new StringBuilder();
        pillarInfo.append("【만세력 정보】\n");
        pillarInfo.append(String.format("날짜: %s, 띠: %s\n", date, yearPillar.getAnimal()));
        pillarInfo.append(String.format("년주: %s%s (%s/%s)\n",
            yearPillar.getStemHanja(), yearPillar.getBranchHanja(), yearPillar.getStemElementName(), yearPillar.getBranchElementName()));
        pillarInfo.append(String.format("월주: %s%s (%s/%s)\n",
            monthPillar.getStemHanja(), monthPillar.getBranchHanja(), monthPillar.getStemElementName(), monthPillar.getBranchElementName()));
        pillarInfo.append(String.format("일주: %s%s (%s/%s)\n",
            dayPillar.getStemHanja(), dayPillar.getBranchHanja(), dayPillar.getStemElementName(), dayPillar.getBranchElementName()));
        pillarInfo.append(String.format("일간(日干): %s %s (%s)\n",
            dayPillar.getStemHanja(), dayPillar.getStemName(), dayPillar.getStemElementName()));
        pillarInfo.append("【오행 분포】 ");
        elements.forEach((k, v) -> pillarInfo.append(k).append(":").append(v).append(" "));
        pillarInfo.append("\n");
        if (birthDateStr != null && !birthDateStr.isBlank()) {
            pillarInfo.append("【생년월일】 ").append(birthDateStr).append("\n");
        }

        String systemPrompt = """
카페에서 친한 친구한테 수다 떨듯이 자연스럽게 대화하는 사주 전문가야.
만세력(천간지지) 데이터를 기반으로 해석해줘!

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. 각 항목은 3-5문장, 구체적이고 알기 쉽게
3. 점수는 45-98 사이""";

        String userPrompt = pillarInfo.toString() + "\n이 천간지지의 의미를 해석해줘.\n" +
            "반드시 아래 JSON 형식으로만 응답:\n" +
            "{\"dayMasterMeaning\":\"일간(日干) 해석 - 이 날의 주인공 기운, 성향과 특성 (3-5문장)\"," +
            "\"fiveElementBalance\":\"오행 균형 분석 - 어떤 기운이 강하고 약한지, 보완 방법 (3-5문장)\"," +
            "\"pillarRelation\":\"기둥 간 관계 - 년월일주의 상생/상극, 조화 (3-5문장)\"," +
            "\"todayEnergy\":\"오늘의 기운 - 이 날의 전체적인 에너지와 분위기 (3-5문장)\"," +
            "\"advice\":\"조언 - 이 날 어떻게 보내면 좋을지, 주의할 점 (3-5문장)\"," +
            "\"score\":점수(45-98)}";

        final Long uid = userId;
        final String finalCacheKey = cacheKey;
        return claudeApiService.generateStream(systemPrompt, userPrompt, 2000, (fullText) -> {
            sajuService.parseManseryeokStreamResult(finalCacheKey, fullText);
            if (uid != null) heartPointService.deductPoints(uid, "MANSERYEOK", "만세력 AI해석");
        });
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
