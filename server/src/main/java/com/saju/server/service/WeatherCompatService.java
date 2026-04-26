package com.saju.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 날씨 궁합 — 오늘 날씨(오행) × 사용자 일간(日干) 상생/상극 분석.
 * 캐시: userId + 오늘 날짜 + condition (날씨 컨디션이 바뀌면 재생성).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherCompatService {

    private final ClaudeApiService claudeApiService;
    private final LunarCalendarService lunarCalendarService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, Map<String, Object>> cache = new ConcurrentHashMap<>();
    private volatile LocalDate cacheDate = LocalDate.now();

    // OpenWeather condition → 한글 + 오행
    private static final Map<String, String[]> WEATHER_INFO = Map.ofEntries(
        Map.entry("Clear",        new String[]{"맑음",       "火 (양·열기)"}),
        Map.entry("Clouds",       new String[]{"구름",       "土 (균형·정체)"}),
        Map.entry("Rain",         new String[]{"비",         "水 (정화·감성)"}),
        Map.entry("Drizzle",      new String[]{"이슬비",     "水 (부드러운 음)"}),
        Map.entry("Snow",         new String[]{"눈",         "水 (寒·정적)"}),
        Map.entry("Thunderstorm", new String[]{"뇌우",       "火와 水의 격렬한 충돌"}),
        Map.entry("Mist",         new String[]{"안개",       "土 (모호함)"}),
        Map.entry("Fog",          new String[]{"짙은 안개", "土 (시야 차단)"}),
        Map.entry("Haze",         new String[]{"연무",       "土 (탁한 기운)"}),
        Map.entry("Smoke",        new String[]{"연기",       "土+火 (탁함)"}),
        Map.entry("Dust",         new String[]{"먼지",       "土 (건조)"}),
        Map.entry("Sand",         new String[]{"황사",       "土 (탁한 흙기운)"})
    );

    private static final Map<String, String> TIME_BAND_KO = Map.of(
        "dawn",     "새벽 (4~7시)",
        "morning",  "아침 (7~11시)",
        "noon",     "낮 (11~16시)",
        "evening",  "저녁 (16~19시)",
        "night",    "밤 (19~23시)",
        "midnight", "심야 (23~4시)"
    );

    private void rolloverIfNewDay() {
        LocalDate today = LocalDate.now();
        if (!today.equals(cacheDate)) {
            cache.clear();
            cacheDate = today;
        }
    }

    private String key(Long userId, String condition) {
        rolloverIfNewDay();
        return userId + "_" + LocalDate.now() + "_" + (condition == null ? "" : condition);
    }

    public Map<String, Object> getCached(Long userId, String condition) {
        rolloverIfNewDay();
        return cache.get(key(userId, condition));
    }

    /** birthDate(yyyy-MM-dd) + calendarType(SOLAR/LUNAR) + birthTime → 한글 일간(예: "갑") */
    public String resolveDayMaster(String birthDate, String calendarType, String birthTime) {
        if (birthDate == null || birthDate.isBlank()) return "";
        try {
            LocalDate date = LocalDate.parse(birthDate);
            if ("LUNAR".equalsIgnoreCase(calendarType)) {
                date = lunarCalendarService.lunarToSolar(date);
            }
            SajuResult result = SajuCalculator.calculate(date, birthTime);
            String dm = result.getDayMaster();   // 예: "갑"
            String hanja = result.getDayMasterHanja(); // 예: "甲"
            if (hanja != null && !hanja.isBlank()) return hanja + " " + dm;
            return dm == null ? "" : dm;
        } catch (Exception e) {
            log.warn("dayMaster 계산 실패: {} {} ({})", birthDate, calendarType, e.getMessage());
            return "";
        }
    }

    public SseEmitter streamFortune(Long userId, String dayMaster, String condition,
                                    String timeBand, Double temp, Runnable onSuccess) {
        String[] info = WEATHER_INFO.getOrDefault(condition, new String[]{"오늘 날씨", ""});
        String conditionKo = info[0];
        String element = info[1];
        String timeBandKo = TIME_BAND_KO.getOrDefault(timeBand, "낮");
        String tempStr = temp != null ? Math.round(temp) + "°C" : "";
        String dm = (dayMaster == null || dayMaster.isBlank()) ? "(미상)" : dayMaster.trim();

        String system = "카페에서 친한 친구한테 수다 떨듯이 자연스러운 대화체 반말로 '오늘 날씨와 내 사주의 궁합'을 분석하는 운세 전문가야. " +
            "오늘 날씨가 가진 오행과 사용자 일간(日干)의 오행을 비교해, 상생(서로 살림)/상극(부딪힘)/비화(같은 기운) 관계를 자연스럽게 풀어줘. " +
            "딱딱한 보고서 톤이나 한자 나열 금지. 친근한 20대 친구 말투. 각 필드를 충분히 풍부하게 채워서 답변해. " +
            "반드시 아래 형식의 JSON만 출력 (마크다운 코드블록 금지, 추가 설명 금지). 모든 필드를 빠짐없이 채워: \n" +
            "{\n" +
            "  \"score\": 80,\n" +
            "  \"grade\": \"길\",\n" +
            "  \"summary\": \"한 줄 요약 (30~40자)\",\n" +
            "  \"overall\": \"종합 분석 (5~6문장 250~350자, 일간 오행과 날씨 오행 관계를 구체적으로 풀어줘)\",\n" +
            "  \"advice\": \"오늘 행동 조언 (3~4문장 150~200자, 구체적이고 실용적으로)\",\n" +
            "  \"caution\": \"오늘 주의할 점 (2~3문장 100~150자)\",\n" +
            "  \"luckyActivity\": \"행운의 활동 한 줄 (예: 카페에서 책 읽기)\",\n" +
            "  \"luckyPlace\": \"행운의 장소 한 줄 (예: 강가 산책로)\",\n" +
            "  \"luckyColor\": \"행운의 색 한 단어 (예: 하늘색)\"\n" +
            "}\n" +
            "score는 50~95 정수, grade는 대길/길/보통/흉 중 하나.";

        String user = "오늘 날짜: " + LocalDate.now() + "\n" +
            "오늘 날씨: " + conditionKo + (tempStr.isEmpty() ? "" : " (" + tempStr + ")") + " — 오행: " + element + "\n" +
            "지금 시간대: " + timeBandKo + "\n" +
            "사용자 사주 일간(日干): " + dm + "\n\n" +
            "위 정보로 오늘 하루 '날씨 × 내 사주'의 궁합 운세를 알려줘. " +
            "특히 일간 오행과 날씨 오행의 상생/상극 관계가 핵심 포인트야. " +
            "오늘 같은 날씨가 너의 일간에 어떤 영향을 주는지, 컨디션·기분·주의점은 어떨지 구체적으로 설명해. " +
            "행운의 활동·장소·색상은 오늘 날씨와 어울리는 현실적인 추천으로. " +
            "각 필드를 빠짐없이, 풍부하게 채워줘. JSON 외 다른 텍스트는 절대 쓰지 마.";

        final Long uid = userId;
        final String condFinal = condition;
        final String dmFinal = dm;
        final String condKoFinal = conditionKo;
        return claudeApiService.generateStream(system, user, 2400, ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json == null) return;
                var node = objectMapper.readTree(json);
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("score", node.path("score").asInt(70));
                result.put("grade", node.path("grade").asText("보통"));
                result.put("summary", node.path("summary").asText(""));
                result.put("overall", node.path("overall").asText(""));
                result.put("advice", node.path("advice").asText(""));
                result.put("caution", node.path("caution").asText(""));
                result.put("luckyActivity", node.path("luckyActivity").asText(""));
                result.put("luckyPlace", node.path("luckyPlace").asText(""));
                result.put("luckyColor", node.path("luckyColor").asText(""));
                result.put("condition", condFinal);
                result.put("conditionKo", condKoFinal);
                result.put("dayMaster", dmFinal);
                result.put("date", LocalDate.now().toString());
                cache.put(key(uid, condFinal), result);
            } catch (Exception e) {
                log.warn("weather compat cache save failed: {}", e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
    }
}
