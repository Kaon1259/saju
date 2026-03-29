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
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class YearFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper;

    private static final int YEAR = 2026;

    @Transactional
    public Map<String, Object> getYearFortune(String birthDate, String birthTime, String gender, String calendarType) {
        // DB cache check
        String cacheKey = buildCacheKey("yearly", birthDate, birthTime, gender, calendarType);
        Map<String, Object> cached = getFromCache("yearly", cacheKey);
        if (cached != null) {
            log.debug("Year fortune DB cache hit: {}", cacheKey);
            return cached;
        }

        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();

        // Calculate user's saju pillars
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar monthPillar = SajuCalculator.calculateMonthPillar(date, yearPillar.getStemIndex());
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        // Calculate 2026 year pillar (병오년)
        int year2026Saju = SajuCalculator.getSajuYear(LocalDate.of(YEAR, 6, 1));
        SajuPillar year2026Pillar = SajuCalculator.calculateYearPillar(year2026Saju);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("year", YEAR);
        result.put("yearPillar", year2026Pillar.getFullName());
        result.put("yearPillarHanja", year2026Pillar.getFullHanja());
        result.put("birthDate", birthDate);
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());

        if (claudeApiService.isAvailable()) {
            try {
                String systemPrompt = buildSystemPrompt();
                String userPrompt = buildUserPrompt(date, birthTime, gender, yearPillar, monthPillar, dayPillar, year2026Pillar, today);
                String response = claudeApiService.generate(systemPrompt, userPrompt, 2400);
                String json = ClaudeApiService.extractJson(response);

                if (json != null) {
                    Map<String, Object> aiResult = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                    result.putAll(aiResult);
                    result.put("source", "ai");
                    saveToCache("yearly", cacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.error("Year fortune AI generation failed: {}", e.getMessage());
            }
        }

        // Fallback
        Map<String, Object> fallback = generateFallback(dayPillar, year2026Pillar, yearPillar);
        result.putAll(fallback);
        result.put("source", "fallback");
        saveToCache("yearly", cacheKey, result);
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
당신은 50년 경력의 사주명리학 대가 '세운(歲運) 선생'입니다.
대한민국에서 가장 정확한 신년 운세를 제공하는 것으로 유명하며,
수만 명의 신년 운세를 감정해온 최고의 역술인입니다.

【역할】
- 2026년 세운(歲運)과 의뢰인 사주의 상호작용을 정밀 분석합니다
- 대운 흐름에서 올해의 위치를 파악하고 종합적으로 해석합니다
- 년주·월주·일주와 2026년 병오(丙午)년의 오행 상생/상극을 분석합니다
- 분기별 운세 흐름을 세밀하게 읽어냅니다
- 올해의 핵심 전환점과 기회의 시기를 정확히 짚어냅니다
- 연간 감정/심리 에너지의 흐름과 성장 방향을 제시합니다

【분석 방법】
1. 의뢰인 일간(日干)과 2026년 세운 천간(丙)의 십성 관계 분석
2. 의뢰인 일지(日支)와 2026년 세운 지지(午)의 합충형파해 관계 분석
3. 사주 원국의 오행 균형과 2026년 오행이 미치는 영향 파악
4. 분기별로 월운(月運)의 변화를 고려하여 세부 운세 도출
5. 상반기/하반기 에너지 흐름의 차이 분석
6. 올해 가장 중요한 전환점(월) 도출

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. "~할 수 있습니다" 대신 "~하세요", "~입니다" 단정적 표현 사용
3. 구체적 시기·방위·색상·숫자 포함
4. 사주 용어는 알기 쉽게 풀어서 설명
5. 점수는 사주와 세운의 조화도에 따라 30-95 사이로 책정
6. 각 카테고리(총운/연애/재물/직장/건강/대인관계)는 4-5문장으로 상세 작성
7. 분기별 분석은 3-4문장으로 상세하게, 핵심 행동 지침 포함
8. 올해 핵심 키워드 3개와 최고/주의 분기를 반드시 포함""";
    }

    private String buildUserPrompt(LocalDate birthDate, String birthTime, String gender,
                                    SajuPillar yearPillar, SajuPillar monthPillar, SajuPillar dayPillar,
                                    SajuPillar year2026Pillar, LocalDate today) {
        String todayCtx = promptBuilder.buildTodayContext(today);

        StringBuilder sb = new StringBuilder();
        sb.append(todayCtx).append("\n");
        sb.append("【2026년 세운 정보】\n");
        sb.append("2026년 년주: ").append(year2026Pillar.getFullHanja()).append("(").append(year2026Pillar.getFullName()).append("년)\n");
        sb.append("세운 천간 오행: ").append(SajuConstants.OHENG[year2026Pillar.getStemElement()]).append("(").append(SajuConstants.OHENG_HANJA[year2026Pillar.getStemElement()]).append(")\n");
        sb.append("세운 지지 오행: ").append(SajuConstants.OHENG[year2026Pillar.getBranchElement()]).append("(").append(SajuConstants.OHENG_HANJA[year2026Pillar.getBranchElement()]).append(")\n\n");

        sb.append("【의뢰인 사주 정보】\n");
        sb.append("생년월일: ").append(birthDate).append("\n");
        if (gender != null) sb.append("성별: ").append("M".equals(gender) ? "남" : "여").append("\n");
        if (birthTime != null && !birthTime.isBlank()) sb.append("태어난 시간: ").append(birthTime).append("\n");
        sb.append("년주: ").append(yearPillar.getFullHanja()).append("(").append(yearPillar.getFullName()).append(") — ").append(yearPillar.getAnimal()).append("띠\n");
        sb.append("월주: ").append(monthPillar.getFullHanja()).append("(").append(monthPillar.getFullName()).append(")\n");
        sb.append("일주: ").append(dayPillar.getFullHanja()).append("(").append(dayPillar.getFullName()).append(")\n");
        sb.append("일간 오행: ").append(dayPillar.getStemElementName()).append("(").append(SajuConstants.OHENG_HANJA[dayPillar.getStemElement()]).append(") — ").append(dayPillar.isStemYang() ? "양" : "음").append("\n\n");

        sb.append("위 사주 정보와 2026년 세운의 상호작용을 분석하여 신년 운세를 작성하세요.\n");
        sb.append("각 카테고리는 4-5문장, 분기별 분석은 3-4문장으로 상세하게 작성하세요.\n");
        sb.append("반드시 아래 JSON 형식으로만 응답:\n");
        sb.append("{\"yearTheme\":\"올해의 핵심 키워드 (4글자)\",")
          .append("\"yearEmoji\":\"대표 이모지\",")
          .append("\"overallScore\":0-100,")
          .append("\"overallGrade\":\"대길/길/보통/소흉/흉\",")
          .append("\"summary\":\"올해 총운 요약 (6-8문장, 상반기/하반기 흐름 차이 포함)\",")
          .append("\"yearSlogan\":\"올해의 한 줄 슬로건 (15자 이내)\",")
          .append("\"yearKeywords\":\"올해 핵심 키워드 3개 (쉼표 구분)\",")
          .append("\"bestQuarter\":\"가장 좋은 분기 (예: 2분기)\",")
          .append("\"cautionQuarter\":\"주의할 분기 (예: 4분기)\",")
          .append("\"love\":\"연애/결혼운 (4-5문장, 시기별 연애 흐름과 구체적 조언)\",")
          .append("\"money\":\"재물/사업운 (4-5문장, 투자 시기/방법과 주의사항)\",")
          .append("\"career\":\"직장/학업운 (4-5문장, 승진/이직 시기와 전략)\",")
          .append("\"health\":\"건강운 (3-4문장, 계절별 주의사항과 운동/식이 조언)\",")
          .append("\"relationship\":\"대인관계운 (3-4문장, 귀인 방향과 관계 전략)\",")
          .append("\"mentalGrowth\":\"올해 성장/심리 조언 (3문장, 내면 성장 방향과 마인드셋)\",")
          .append("\"luckyMonths\":\"가장 좋은 달 (예: 3월, 8월)\",")
          .append("\"cautionMonths\":\"주의할 달 (예: 6월, 11월)\",")
          .append("\"turningPoint\":\"올해 가장 중요한 전환점 월과 이유 (1-2문장)\",")
          .append("\"luckyColor\":\"행운 색\",")
          .append("\"luckyNumber\":숫자,")
          .append("\"luckyDirection\":\"행운 방위\",")
          .append("\"luckyFood\":\"올해 행운 음식\",")
          .append("\"yearAdvice\":\"올해를 위한 핵심 조언 (4문장, 구체적 행동 지침)\",")
          .append("\"quarterly\":[")
          .append("{\"quarter\":\"1분기 (1~3월)\",\"score\":0-100,\"keyword\":\"키워드\",\"summary\":\"3-4문장 (핵심 이벤트와 행동 지침 포함)\",\"tip\":\"이 분기 핵심 한마디\"},")
          .append("{\"quarter\":\"2분기 (4~6월)\",\"score\":0-100,\"keyword\":\"키워드\",\"summary\":\"3-4문장\",\"tip\":\"핵심 한마디\"},")
          .append("{\"quarter\":\"3분기 (7~9월)\",\"score\":0-100,\"keyword\":\"키워드\",\"summary\":\"3-4문장\",\"tip\":\"핵심 한마디\"},")
          .append("{\"quarter\":\"4분기 (10~12월)\",\"score\":0-100,\"keyword\":\"키워드\",\"summary\":\"3-4문장\",\"tip\":\"핵심 한마디\"}")
          .append("]}");

        return sb.toString();
    }

    private Map<String, Object> generateFallback(SajuPillar dayPillar, SajuPillar year2026Pillar, SajuPillar yearPillar) {
        long seed = (dayPillar.getFullName() + year2026Pillar.getFullName() + yearPillar.getFullName()).hashCode();
        Random r = new Random(seed);

        int dayStemEl = dayPillar.getStemElement();
        int yearStemEl = year2026Pillar.getStemElement();

        // Base score from element interaction
        int baseScore = 60;
        // Producing cycle: wood->fire->earth->metal->water->wood
        if ((dayStemEl + 1) % 5 == yearStemEl) baseScore += 15; // I produce the year
        if ((yearStemEl + 1) % 5 == dayStemEl) baseScore += 12; // Year produces me
        // Same element
        if (dayStemEl == yearStemEl) baseScore += 8;
        // Overcoming
        if ((dayStemEl + 2) % 5 == yearStemEl) baseScore -= 5;
        if ((yearStemEl + 2) % 5 == dayStemEl) baseScore -= 10;

        baseScore += r.nextInt(11) - 5;
        int overallScore = Math.max(30, Math.min(95, baseScore));

        String grade;
        if (overallScore >= 80) grade = "대길";
        else if (overallScore >= 65) grade = "길";
        else if (overallScore >= 50) grade = "보통";
        else if (overallScore >= 35) grade = "소흉";
        else grade = "흉";

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("yearTheme", "새봄도약");
        m.put("yearEmoji", "🌟");
        m.put("overallScore", overallScore);
        m.put("overallGrade", grade);
        m.put("summary", "2026년 " + year2026Pillar.getFullName() + "년의 기운이 일간 " + dayPillar.getFullName() + "과 만나는 한 해입니다. " +
            SajuConstants.OHENG[yearStemEl] + "의 기운이 " + SajuConstants.OHENG[dayStemEl] + "의 기질과 어우러져 " +
            (overallScore >= 65 ? "긍정적인 변화가 많은 해가 됩니다. " : "신중한 접근이 필요한 해입니다. ") +
            "특히 상반기에 중요한 기회가 찾아올 수 있으니 준비하세요. " +
            "꾸준한 노력이 하반기에 결실을 맺게 됩니다. " +
            "자기 발전에 투자하는 것이 올해의 핵심입니다.");
        m.put("love", "올해 연애운은 " + (overallScore >= 60 ? "좋은 인연이 기대되는 흐름입니다." : "차분하게 내면을 가꾸는 시기입니다.") +
            " 봄에 새로운 만남의 기회가 있습니다. 진심을 담은 소통이 관계를 발전시킵니다. 조급하지 않게 자연스러운 흐름을 따르세요.");
        m.put("money", "재물운은 " + (overallScore >= 65 ? "안정적인 수입이 기대됩니다." : "지출 관리에 신경 쓰는 것이 좋습니다.") +
            " 투자보다는 저축에 집중하세요. 예상치 못한 수입이 하반기에 있을 수 있습니다. 큰 금액의 결정은 신중하게 내리세요.");
        m.put("career", "직장운은 " + (overallScore >= 60 ? "승진이나 이직의 기회가 보입니다." : "현재 위치에서 실력을 쌓는 시기입니다.") +
            " 새로운 프로젝트에 적극적으로 참여하세요. 상반기에 중요한 성과를 낼 수 있습니다. 동료와의 협력이 성공의 열쇠입니다.");
        m.put("health", "건강 관리에 특히 신경 쓰는 해입니다. 규칙적인 운동과 충분한 수면이 중요합니다. 환절기 건강에 주의하세요.");
        m.put("relationship", "대인관계에서 좋은 인연을 만나게 됩니다. 주변 사람들에게 감사를 표현하세요. 새로운 모임에 참여하면 도움이 됩니다.");
        m.put("luckyMonths", (r.nextInt(3) + 3) + "월, " + (r.nextInt(3) + 8) + "월");
        m.put("cautionMonths", (r.nextInt(2) + 6) + "월, " + (r.nextInt(2) + 11) + "월");
        m.put("luckyColor", new String[]{"빨강", "파랑", "초록", "노랑", "보라"}[r.nextInt(5)]);
        m.put("luckyNumber", r.nextInt(45) + 1);
        m.put("luckyDirection", new String[]{"동쪽", "서쪽", "남쪽", "북쪽", "동남쪽", "북서쪽"}[r.nextInt(6)]);
        m.put("yearAdvice", "올해는 " + SajuConstants.OHENG[yearStemEl] + "의 기운을 잘 활용하는 것이 핵심입니다. " +
            "무리하지 말고 자신의 페이스를 유지하세요. " +
            "작은 성공을 쌓아가면 큰 결과로 이어집니다.");

        // Quarterly
        List<Map<String, Object>> quarterly = new ArrayList<>();
        String[][] quarterInfo = {
            {"1분기 (1~3월)", "새출발"},
            {"2분기 (4~6월)", "성장기"},
            {"3분기 (7~9월)", "도약기"},
            {"4분기 (10~12월)", "결실기"}
        };
        for (String[] qi : quarterInfo) {
            Map<String, Object> q = new LinkedHashMap<>();
            q.put("quarter", qi[0]);
            int qScore = overallScore + r.nextInt(21) - 10;
            qScore = Math.max(30, Math.min(95, qScore));
            q.put("score", qScore);
            q.put("keyword", qi[1]);
            q.put("summary", qi[1] + "의 기운이 감도는 시기입니다. " +
                (qScore >= 65 ? "적극적으로 행동하면 좋은 결과가 있습니다." : "신중하게 판단하고 준비하는 시기입니다."));
            quarterly.add(q);
        }
        m.put("quarterly", quarterly);

        return m;
    }
}
