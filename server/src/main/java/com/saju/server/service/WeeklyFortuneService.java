package com.saju.server.service;

import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuConstants;
import com.saju.server.saju.SajuPillar;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeeklyFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper;

    private static final String[] DAY_NAMES = {"월", "화", "수", "목", "금", "토", "일"};

    @Transactional
    public Map<String, Object> getWeeklyFortune(String birthDate, String birthTime, String gender) {
        LocalDate today = LocalDate.now();

        // Calculate this week's Monday and Sunday
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // DB cache check
        String cacheKey = buildCacheKey("weekly", birthDate, birthTime, gender, weekStart.toString());
        Map<String, Object> cached = getFromCache("weekly", cacheKey);
        if (cached != null) {
            log.debug("Weekly fortune DB cache hit: {}", cacheKey);
            return cached;
        }

        LocalDate date = LocalDate.parse(birthDate);

        // Calculate user's saju pillars
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        // Calculate day pillars for each day of the week
        List<SajuPillar> weekDayPillars = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = weekStart.plusDays(i);
            weekDayPillars.add(SajuCalculator.calculateDayPillar(d));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("weekStart", weekStart.toString());
        result.put("weekEnd", weekEnd.toString());
        result.put("birthDate", birthDate);
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());

        if (claudeApiService.isAvailable()) {
            try {
                String systemPrompt = buildSystemPrompt();
                String userPrompt = buildUserPrompt(date, birthTime, gender, yearPillar, dayPillar,
                    weekStart, weekEnd, weekDayPillars, today);
                String response = claudeApiService.generate(systemPrompt, userPrompt, 1600);
                String json = ClaudeApiService.extractJson(response);

                if (json != null) {
                    Map<String, Object> aiResult = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                    result.putAll(aiResult);
                    result.put("source", "ai");
                    saveToCache("weekly", cacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.error("Weekly fortune AI generation failed: {}", e.getMessage());
            }
        }

        // Fallback
        Map<String, Object> fallback = generateFallback(dayPillar, weekStart, weekEnd, weekDayPillars);
        result.putAll(fallback);
        result.put("source", "fallback");
        saveToCache("weekly", cacheKey, result);
        return result;
    }

    private String buildCacheKey(String... parts) {
        String raw = String.join("|", java.util.Arrays.stream(parts).map(p -> p != null ? p : "").toArray(String[]::new));
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
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result) {
        try {
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(type).cacheKey(cacheKey).fortuneDate(LocalDate.now())
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) { /* ignore duplicate */ }
    }

    private String buildSystemPrompt() {
        return """
당신은 40년 경력의 주운(週運) 분석 대가 '주명(週命) 선생'입니다.
매주 7일간의 일진(日辰) 흐름을 정밀 분석하여
의뢰인에게 가장 적확한 주간 운세를 제공합니다.

【역할】
- 이번 주 7일간의 일주(日柱) 천간지지를 의뢰인 일간과 대조합니다
- 각 요일별 기운의 강약과 길흉을 판단합니다
- 한 주의 전체 흐름과 리듬을 읽어 종합적 조언을 제공합니다
- 가장 좋은 날과 주의할 날을 정확히 짚어냅니다
- 시간대별(오전/오후/저녁) 기운 변화를 세밀하게 파악합니다
- 주간 감정/심리 흐름과 대인관계 조언을 함께 제공합니다

【분석 방법】
1. 의뢰인 일간과 각 날의 일간 오행 상생/상극 관계
2. 의뢰인 일지와 각 날의 일지 합충형 관계
3. 7일간의 오행 기운 흐름 변화 패턴
4. 주 초·중·후반의 에너지 리듬 분석
5. 각 요일의 시간대별 길흉 변화 분석
6. 주간 전체 감정/심리 에너지의 흐름 파악

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. "~할 수 있습니다" 대신 "~하세요", "~입니다" 단정적 표현 사용
3. 각 요일별 구체적 행동 조언(tip)과 핵심 조언(advice) 포함
4. 사주 용어는 알기 쉽게 풀어서 설명
5. 점수는 일진과 의뢰인 사주의 조화도에 따라 30-95 사이로 책정
6. 각 카테고리(총운/연애/재물/직장)는 3-4문장으로 상세하게 작성
7. 요일별 tip은 2문장 이상, 시간대 조언 포함
8. 주간 종합 메시지와 핵심 키워드를 반드시 포함""";
    }

    private String buildUserPrompt(LocalDate birthDate, String birthTime, String gender,
                                    SajuPillar yearPillar, SajuPillar dayPillar,
                                    LocalDate weekStart, LocalDate weekEnd,
                                    List<SajuPillar> weekDayPillars, LocalDate today) {
        String todayCtx = promptBuilder.buildTodayContext(today);
        DateTimeFormatter mmdd = DateTimeFormatter.ofPattern("M/d");

        StringBuilder sb = new StringBuilder();
        sb.append(todayCtx).append("\n");
        sb.append("【이번 주 일진 정보 (").append(weekStart.format(mmdd)).append(" ~ ").append(weekEnd.format(mmdd)).append(")】\n");
        for (int i = 0; i < 7; i++) {
            LocalDate d = weekStart.plusDays(i);
            SajuPillar p = weekDayPillars.get(i);
            sb.append(DAY_NAMES[i]).append("(").append(d.format(mmdd)).append("): ")
              .append(p.getFullHanja()).append("(").append(p.getFullName()).append(") — ")
              .append(p.getStemElementName()).append(SajuConstants.OHENG_HANJA[p.getStemElement()])
              .append("\n");
        }

        sb.append("\n【의뢰인 사주 정보】\n");
        sb.append("생년월일: ").append(birthDate).append("\n");
        if (gender != null) sb.append("성별: ").append("M".equals(gender) ? "남" : "여").append("\n");
        if (birthTime != null && !birthTime.isBlank()) sb.append("태어난 시간: ").append(birthTime).append("\n");
        sb.append("년주: ").append(yearPillar.getFullHanja()).append("(").append(yearPillar.getFullName()).append(") — ").append(yearPillar.getAnimal()).append("띠\n");
        sb.append("일주: ").append(dayPillar.getFullHanja()).append("(").append(dayPillar.getFullName()).append(")\n");
        sb.append("일간 오행: ").append(dayPillar.getStemElementName()).append("(").append(SajuConstants.OHENG_HANJA[dayPillar.getStemElement()]).append(") — ").append(dayPillar.isStemYang() ? "양" : "음").append("\n\n");

        sb.append("이번 주 7일간의 일진과 의뢰인 사주의 상호작용을 분석하여 주간 운세를 작성하세요.\n");
        sb.append("각 카테고리는 3-4문장으로 상세하게, 요일별 tip은 2문장 이상으로 작성하세요.\n");
        sb.append("반드시 아래 JSON 형식으로만 응답:\n");
        sb.append("{\"weekStart\":\"").append(weekStart).append("\",");
        sb.append("\"weekEnd\":\"").append(weekEnd).append("\",");
        sb.append("\"weekTheme\":\"이번 주 키워드\",")
          .append("\"weekEmoji\":\"이모지\",")
          .append("\"overallScore\":0-100,")
          .append("\"summary\":\"이번 주 총운 (4-5문장, 주 초/중/후반 흐름 포함)\",")
          .append("\"weekSummary\":\"이번 주 한 줄 요약 슬로건 (15자 이내)\",")
          .append("\"weekKeyword\":\"이번 주를 관통하는 핵심 키워드 3개 (쉼표 구분)\",")
          .append("\"bestDay\":\"가장 좋은 요일\",")
          .append("\"cautionDay\":\"주의할 요일\",")
          .append("\"love\":\"이번 주 연애운 (3-4문장, 구체적 행동 조언과 시간대 포함)\",")
          .append("\"money\":\"이번 주 재물운 (3-4문장, 지출/수입/투자 방향 포함)\",")
          .append("\"career\":\"이번 주 직장운 (3-4문장, 업무 전략과 대인관계 조언 포함)\",")
          .append("\"health\":\"이번 주 건강운 (2-3문장, 주의 부위와 운동/식이 조언)\",")
          .append("\"mentalAdvice\":\"이번 주 감정/심리 조언 (2-3문장, 스트레스 관리법 포함)\",")
          .append("\"advice\":\"이번 주 핵심 조언 (3문장, 구체적 행동 지침)\",")
          .append("\"days\":[");

        for (int i = 0; i < 7; i++) {
            LocalDate d = weekStart.plusDays(i);
            if (i > 0) sb.append(",");
            sb.append("{\"day\":\"").append(DAY_NAMES[i]).append("\",");
            sb.append("\"date\":\"").append(d.format(mmdd)).append("\",");
            sb.append("\"score\":0-100,\"keyword\":\"키워드\",\"tip\":\"구체적 조언 2문장 (시간대별 행동 포함)\",\"advice\":\"이 날의 핵심 한마디\"}");
        }
        sb.append("]}");

        return sb.toString();
    }

    private Map<String, Object> generateFallback(SajuPillar dayPillar,
                                                   LocalDate weekStart, LocalDate weekEnd,
                                                   List<SajuPillar> weekDayPillars) {
        long seed = (dayPillar.getFullName() + weekStart).hashCode();
        Random r = new Random(seed);
        DateTimeFormatter mmdd = DateTimeFormatter.ofPattern("M/d");

        int dayStemEl = dayPillar.getStemElement();

        // Calculate scores for each day based on element interaction
        List<Map<String, Object>> days = new ArrayList<>();
        int bestScore = -1, worstScore = 101;
        String bestDay = "월", cautionDay = "월";

        for (int i = 0; i < 7; i++) {
            SajuPillar weekDayP = weekDayPillars.get(i);
            LocalDate d = weekStart.plusDays(i);
            int dayEl = weekDayP.getStemElement();

            int dayScore = 60;
            // Producing cycle
            if ((dayStemEl + 1) % 5 == dayEl) dayScore += 12;
            if ((dayEl + 1) % 5 == dayStemEl) dayScore += 10;
            if (dayStemEl == dayEl) dayScore += 6;
            // Overcoming
            if ((dayStemEl + 2) % 5 == dayEl) dayScore -= 5;
            if ((dayEl + 2) % 5 == dayStemEl) dayScore -= 8;

            dayScore += r.nextInt(15) - 7;
            dayScore = Math.max(30, Math.min(95, dayScore));

            if (dayScore > bestScore) {
                bestScore = dayScore;
                bestDay = DAY_NAMES[i];
            }
            if (dayScore < worstScore) {
                worstScore = dayScore;
                cautionDay = DAY_NAMES[i];
            }

            String[] tips = {
                "중요한 미팅이나 계약에 좋은 날입니다.",
                "새로운 시작에 적합한 하루입니다.",
                "대인관계에 집중하면 좋은 결과가 있습니다.",
                "학습과 자기 계발에 최적의 날입니다.",
                "재정 관련 결정을 내리기 좋은 날입니다.",
                "건강 관리에 신경 쓰는 하루를 보내세요.",
                "차분하게 계획을 세우는 것이 좋습니다.",
                "적극적으로 행동하면 성과가 있습니다.",
                "주변 사람들과의 소통이 중요한 날입니다.",
                "창의적인 아이디어가 떠오르는 하루입니다."
            };

            String[] keywords = {"활력", "집중", "소통", "성장", "행운", "안정", "도전", "인연", "지혜", "결실"};

            Map<String, Object> dayMap = new LinkedHashMap<>();
            dayMap.put("day", DAY_NAMES[i]);
            dayMap.put("date", d.format(mmdd));
            dayMap.put("score", dayScore);
            dayMap.put("keyword", keywords[r.nextInt(keywords.length)]);
            dayMap.put("tip", tips[r.nextInt(tips.length)]);
            days.add(dayMap);
        }

        // Overall score is average
        int totalScore = days.stream().mapToInt(d -> (int) d.get("score")).sum();
        int overallScore = totalScore / 7;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("weekStart", weekStart.toString());
        m.put("weekEnd", weekEnd.toString());
        m.put("weekTheme", overallScore >= 70 ? "순풍순항" : overallScore >= 55 ? "차근차근" : "인내필요");
        m.put("weekEmoji", overallScore >= 70 ? "🌟" : overallScore >= 55 ? "🌿" : "💪");
        m.put("overallScore", overallScore);
        m.put("summary", "이번 주는 " + dayPillar.getStemElementName() + " 기운의 일간이 다양한 일진과 만나는 한 주입니다. " +
            bestDay + "요일에 가장 좋은 기운이 흐르니 중요한 일을 배치하세요. " +
            cautionDay + "요일에는 무리하지 말고 차분하게 보내는 것이 좋습니다. " +
            "전반적으로 " + (overallScore >= 65 ? "활기찬 한 주가 예상됩니다." : "신중하게 움직이면 좋은 결과를 얻을 수 있습니다."));
        m.put("bestDay", bestDay + "요일");
        m.put("cautionDay", cautionDay + "요일");
        m.put("love", "이번 주 연애운은 " + (overallScore >= 60 ? "좋은 기운이 흐릅니다." : "차분하게 마음을 다스리세요.") +
            " " + bestDay + "요일에 데이트를 계획하면 좋은 시간을 보낼 수 있습니다.");
        m.put("money", "재물운은 " + (overallScore >= 65 ? "안정적입니다." : "과도한 지출에 주의하세요.") +
            " 계획적인 소비 습관이 중요한 한 주입니다.");
        m.put("career", "직장에서는 " + (overallScore >= 60 ? "좋은 성과를 낼 수 있습니다." : "꾸준한 노력이 필요합니다.") +
            " 동료들과의 협업에 적극적으로 참여하세요.");
        m.put("advice", "이번 주의 핵심은 " + (overallScore >= 65 ? "적극적인 실행" : "차분한 준비") + "입니다. " +
            "하루하루 최선을 다하면 좋은 결과가 따라옵니다.");
        m.put("days", days);

        return m;
    }
}
