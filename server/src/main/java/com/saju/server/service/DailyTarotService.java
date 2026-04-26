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
 * 오늘의 타로 한 장 — AI 풍부 해석.
 * 캐시: userId + 오늘 날짜 + cardId (자정 롤오버).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DailyTarotService {

    private final ClaudeApiService claudeApiService;
    private final LunarCalendarService lunarCalendarService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, Map<String, Object>> cache = new ConcurrentHashMap<>();
    private volatile LocalDate cacheDate = LocalDate.now();

    private void rolloverIfNewDay() {
        LocalDate today = LocalDate.now();
        if (!today.equals(cacheDate)) {
            cache.clear();
            cacheDate = today;
        }
    }

    private String key(Long userId, int cardId) {
        rolloverIfNewDay();
        return userId + "_" + LocalDate.now() + "_" + cardId;
    }

    public Map<String, Object> getCached(Long userId, int cardId) {
        rolloverIfNewDay();
        return cache.get(key(userId, cardId));
    }

    /** birthDate(yyyy-MM-dd) + calendarType + birthTime → 한자+한글 일간 (예: "甲 갑") */
    public String resolveDayMaster(String birthDate, String calendarType, String birthTime) {
        if (birthDate == null || birthDate.isBlank()) return "";
        try {
            LocalDate date = LocalDate.parse(birthDate);
            if ("LUNAR".equalsIgnoreCase(calendarType)) {
                date = lunarCalendarService.lunarToSolar(date);
            }
            SajuResult result = SajuCalculator.calculate(date, birthTime);
            String dm = result.getDayMaster();
            String hanja = result.getDayMasterHanja();
            if (hanja != null && !hanja.isBlank()) return hanja + " " + dm;
            return dm == null ? "" : dm;
        } catch (Exception e) {
            log.warn("dayMaster 계산 실패: {} {} ({})", birthDate, calendarType, e.getMessage());
            return "";
        }
    }

    public SseEmitter streamAnalysis(Long userId, int cardId, String cardNameKr, String cardNameEn,
                                     String dayMaster, Runnable onSuccess) {
        String dm = (dayMaster == null || dayMaster.isBlank()) ? "(미상)" : dayMaster.trim();

        String system = "카페에서 친한 친구한테 수다 떨듯이 자연스러운 대화체 반말로 '오늘의 타로 한 장'을 풀어주는 타로 전문가야. " +
            "사용자 사주 일간(日干)이 있으면 카드 의미와 일간 오행을 자연스럽게 연결해서 더 맞춤형으로 풀어줘. " +
            "딱딱한 보고서 톤·고전적 한자 나열 금지. 친근한 20대 친구 말투. 각 필드를 풍부하게 채워. " +
            "반드시 아래 형식의 JSON 만 출력 (마크다운 코드블록 금지, 추가 설명 금지). 모든 필드 빠짐없이 채워줘:\n" +
            "{\n" +
            "  \"overall\": \"오늘의 종합 의미 (5~6문장 250~330자)\",\n" +
            "  \"love\": \"연애운 (3~4문장 130~180자)\",\n" +
            "  \"career\": \"일·재물운 (3~4문장 130~180자)\",\n" +
            "  \"advice\": \"행동 조언 (2~3문장 90~140자)\",\n" +
            "  \"lucky\": \"오늘의 행운 키워드 한 줄 (예: 색·숫자·시간·장소)\"\n" +
            "}";

        String user = "오늘 날짜: " + LocalDate.now() + "\n" +
            "오늘 뽑힌 카드: " + cardNameKr + " (" + cardNameEn + ")\n" +
            "사용자 사주 일간(日干): " + dm + "\n\n" +
            "위 카드를 오늘의 운세로 풀어줘. 일간이 있으면 카드 의미와 일간 오행을 자연스럽게 연결해 맞춤 해석을 해줘. " +
            "각 필드를 빠짐없이 풍부하게 채우고, JSON 외 다른 텍스트는 절대 쓰지 마.";

        final Long uid = userId;
        final int cidFinal = cardId;
        final String nameKrFinal = cardNameKr;
        final String nameEnFinal = cardNameEn;
        final String dmFinal = dm;
        return claudeApiService.generateStream(system, user, 2200, ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json == null) return;
                var node = objectMapper.readTree(json);
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("cardId", cidFinal);
                result.put("nameKr", nameKrFinal);
                result.put("nameEn", nameEnFinal);
                result.put("dayMaster", dmFinal);
                result.put("date", LocalDate.now().toString());
                result.put("overall", node.path("overall").asText(""));
                result.put("love", node.path("love").asText(""));
                result.put("career", node.path("career").asText(""));
                result.put("advice", node.path("advice").asText(""));
                result.put("lucky", node.path("lucky").asText(""));
                cache.put(key(uid, cidFinal), result);
            } catch (Exception e) {
                log.warn("daily tarot cache save failed: {}", e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
    }
}
