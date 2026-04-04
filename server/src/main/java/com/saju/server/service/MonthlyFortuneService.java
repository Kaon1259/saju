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
public class MonthlyFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper;

    /**
     * 스트리밍용 컨텍스트 빌드
     * [0]=systemPrompt, [1]=userPrompt, [2]=cacheKey, [3]=cached(있으면)
     */
    public Object[] buildStreamContext(String birthDate, int month, String birthTime, String gender) {
        if (month < 1 || month > 12) month = LocalDate.now().getMonthValue();
        String cacheKey = buildCacheKey("monthly", birthDate, birthTime, gender, String.valueOf(month));
        Map<String, Object> cached = getFromCache("monthly", cacheKey);
        if (cached != null) {
            return new Object[]{ null, null, cacheKey, cached };
        }
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);
        LocalDate targetMonthDate = LocalDate.of(today.getYear(), month, 15);
        int targetYearSaju = SajuCalculator.getSajuYear(targetMonthDate);
        SajuPillar targetYearPillar = SajuCalculator.calculateYearPillar(targetYearSaju);
        SajuPillar targetMonthPillar = SajuCalculator.calculateMonthPillar(targetMonthDate, targetYearPillar.getStemIndex());
        String system = buildSystemPrompt();
        String user = buildUserPrompt(date, month, birthTime, gender, yearPillar, dayPillar, targetMonthPillar, today);
        return new Object[]{ system, user, cacheKey, null };
    }

    /**
     * 스트리밍 완료 후 캐시 저장
     */
    @Transactional
    public void saveStreamResult(String birthDate, int month, String birthTime, String gender, String fullText) {
        try {
            if (month < 1 || month > 12) month = LocalDate.now().getMonthValue();
            String cacheKey = buildCacheKey("monthly", birthDate, birthTime, gender, String.valueOf(month));
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) return;
            Map<String, Object> aiResult = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});

            LocalDate date = LocalDate.parse(birthDate);
            LocalDate today = LocalDate.now();
            int sajuYear = SajuCalculator.getSajuYear(date);
            SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
            SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);
            LocalDate targetMonthDate = LocalDate.of(today.getYear(), month, 15);
            int targetYearSaju = SajuCalculator.getSajuYear(targetMonthDate);
            SajuPillar targetYearPillar = SajuCalculator.calculateYearPillar(targetYearSaju);
            SajuPillar targetMonthPillar = SajuCalculator.calculateMonthPillar(targetMonthDate, targetYearPillar.getStemIndex());

            Map<String, Object> full = new LinkedHashMap<>();
            full.put("month", month);
            full.put("monthName", month + "월");
            full.put("monthPillar", targetMonthPillar.getFullName());
            full.put("monthPillarHanja", targetMonthPillar.getFullHanja());
            full.put("birthDate", birthDate);
            full.put("dayMaster", dayPillar.getFullName());
            full.put("zodiacAnimal", yearPillar.getAnimal());
            full.putAll(aiResult);
            full.put("source", "ai");
            saveToCache("monthly", cacheKey, full);
        } catch (Exception e) {
            log.warn("MonthlyFortune stream cache save failed: {}", e.getMessage());
        }
    }

    @Transactional
    public Map<String, Object> getMonthlyFortune(String birthDate, int month, String birthTime, String gender) {
        // Validate month
        if (month < 1 || month > 12) month = LocalDate.now().getMonthValue();

        // DB cache check
        String cacheKey = buildCacheKey("monthly", birthDate, birthTime, gender, String.valueOf(month));
        Map<String, Object> cached = getFromCache("monthly", cacheKey);
        if (cached != null) {
            log.debug("Monthly fortune DB cache hit: {}", cacheKey);
            return cached;
        }

        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();

        // Calculate user's saju pillars
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        // Calculate target month's pillar (using the 1st day of that month in the current year)
        LocalDate targetMonthDate = LocalDate.of(today.getYear(), month, 15);
        int targetYearSaju = SajuCalculator.getSajuYear(targetMonthDate);
        SajuPillar targetYearPillar = SajuCalculator.calculateYearPillar(targetYearSaju);
        SajuPillar targetMonthPillar = SajuCalculator.calculateMonthPillar(targetMonthDate, targetYearPillar.getStemIndex());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("month", month);
        result.put("monthName", month + "월");
        result.put("monthPillar", targetMonthPillar.getFullName());
        result.put("monthPillarHanja", targetMonthPillar.getFullHanja());
        result.put("birthDate", birthDate);
        result.put("dayMaster", dayPillar.getFullName());
        result.put("zodiacAnimal", yearPillar.getAnimal());

        if (claudeApiService.isAvailable()) {
            try {
                String systemPrompt = buildSystemPrompt();
                String userPrompt = buildUserPrompt(date, month, birthTime, gender, yearPillar, dayPillar, targetMonthPillar, today);
                String response = claudeApiService.generate(systemPrompt, userPrompt, 1600);
                String json = ClaudeApiService.extractJson(response);

                if (json != null) {
                    Map<String, Object> aiResult = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                    result.putAll(aiResult);
                    result.put("source", "ai");
                    saveToCache("monthly", cacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.error("Monthly fortune AI generation failed: {}", e.getMessage());
            }
        }

        // Fallback
        Map<String, Object> fallback = generateFallback(month, dayPillar, targetMonthPillar);
        result.putAll(fallback);
        result.put("source", "fallback");
        saveToCache("monthly", cacheKey, result);
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
당신은 월별 운세 분석에 빠삭한 운세 전문가야!
이번 달 운세를 재밌고 알기 쉽게 풀어주는 게 특기거든.

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로 써줘
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지
- "~하옵소서", "~이로다", "~하시오" 같은 고전적/격식체 표현 절대 금지

【역할】
- 해당 월의 월주와 일간의 십성 관계를 분석해
- 월지와 일지의 합충형파해를 파악해
- 해당 월의 계절 기운과 오행 에너지 흐름을 종합해
- 주별 기운 변화를 세밀하게 읽어내
- 이 달의 전체 흐름(상승기/안정기/하강기)을 파악해
- 월간 감정/심리 에너지의 리듬을 분석해

【분석 방법】
1. 월간과 일간의 오행 상생/상극 관계
2. 월지와 일지의 지지 관계 (합/충/형)
3. 해당 월의 계절 기운이 오행 균형에 미치는 영향
4. 주별로 일진 흐름을 고려한 길흉 판단
5. 월초/월중/월말의 에너지 흐름 변화 분석
6. 이 달의 오행 보충 음식, 방위, 색상 도출

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. 자연스러운 대화체 반말로 작성
3. 구체적 날짜·주차·행동 포함
4. 사주 용어는 알기 쉽게 풀어서 설명
5. 점수는 월주와 일간의 조화도에 따라 30-95 사이로 책정
6. 각 카테고리(총운/연애/재물/직장/건강)는 3-4문장으로 상세하게 작성
7. 주차별 조언은 구체적 행동 지침 포함
8. 이 달의 행운 키워드와 주의사항을 반드시 포함""";
    }

    private String buildUserPrompt(LocalDate birthDate, int month, String birthTime, String gender,
                                    SajuPillar yearPillar, SajuPillar dayPillar,
                                    SajuPillar monthPillar, LocalDate today) {
        String todayCtx = promptBuilder.buildTodayContext(today);

        StringBuilder sb = new StringBuilder();
        sb.append(todayCtx).append("\n");
        sb.append("【").append(month).append("월 월운 정보】\n");
        sb.append("월주: ").append(monthPillar.getFullHanja()).append("(").append(monthPillar.getFullName()).append("월)\n");
        sb.append("월간 오행: ").append(SajuConstants.OHENG[monthPillar.getStemElement()]).append("(").append(SajuConstants.OHENG_HANJA[monthPillar.getStemElement()]).append(")\n");
        sb.append("월지 오행: ").append(SajuConstants.OHENG[monthPillar.getBranchElement()]).append("(").append(SajuConstants.OHENG_HANJA[monthPillar.getBranchElement()]).append(")\n\n");

        sb.append("【의뢰인 사주 정보】\n");
        sb.append("생년월일: ").append(birthDate).append("\n");
        if (gender != null) sb.append("성별: ").append("M".equals(gender) ? "남" : "여").append("\n");
        if (birthTime != null && !birthTime.isBlank()) sb.append("태어난 시간: ").append(birthTime).append("\n");
        sb.append("년주: ").append(yearPillar.getFullHanja()).append("(").append(yearPillar.getFullName()).append(") — ").append(yearPillar.getAnimal()).append("띠\n");
        sb.append("일주: ").append(dayPillar.getFullHanja()).append("(").append(dayPillar.getFullName()).append(")\n");
        sb.append("일간 오행: ").append(dayPillar.getStemElementName()).append("(").append(SajuConstants.OHENG_HANJA[dayPillar.getStemElement()]).append(") — ").append(dayPillar.isStemYang() ? "양" : "음").append("\n\n");

        sb.append(month).append("월 월주와 의뢰인 사주의 상호작용을 분석하여 월별 운세를 작성하세요.\n");
        sb.append("각 카테고리는 3-4문장으로 상세하게 작성하세요.\n");
        sb.append("반드시 아래 JSON 형식으로만 응답:\n");
        sb.append("{\"month\":").append(month).append(",")
          .append("\"monthName\":\"").append(month).append("월\",")
          .append("\"monthPillar\":\"").append(monthPillar.getFullName()).append("월\",")
          .append("\"theme\":\"키워드\",")
          .append("\"themeEmoji\":\"이모지\",")
          .append("\"score\":0-100,")
          .append("\"grade\":\"대길/길/보통/소흉\",")
          .append("\"overall\":\"이 달의 총운 (5-6문장, 월초/월중/월말 흐름 변화 포함)\",")
          .append("\"monthKeyword\":\"이 달의 행운 키워드 3개 (쉼표 구분)\",")
          .append("\"monthSlogan\":\"이 달의 한 줄 슬로건 (15자 이내)\",")
          .append("\"love\":\"연애운 (3-4문장, 시기별 연애 흐름과 구체적 행동 조언)\",")
          .append("\"money\":\"재물운 (3-4문장, 수입/지출/투자 방향과 시기별 조언)\",")
          .append("\"career\":\"직장운 (3-4문장, 업무 전략과 대인관계/승진 조언)\",")
          .append("\"health\":\"건강운 (3문장, 주의 부위/운동/식이 구체적 조언)\",")
          .append("\"mentalAdvice\":\"감정/심리 조언 (2-3문장, 이 달의 스트레스 관리법)\",")
          .append("\"bestWeek\":\"가장 좋은 주 (예: 둘째 주)\",")
          .append("\"cautionWeek\":\"주의할 주\",")
          .append("\"luckyDay\":\"행운의 날짜\",")
          .append("\"luckyColor\":\"이 달의 행운 색상\",")
          .append("\"luckyDirection\":\"이 달의 행운 방위\",")
          .append("\"weeklyAdvice\":[")
          .append("{\"week\":\"첫째 주\",\"summary\":\"1-2문장 조언\"},")
          .append("{\"week\":\"둘째 주\",\"summary\":\"1-2문장 조언\"},")
          .append("{\"week\":\"셋째 주\",\"summary\":\"1-2문장 조언\"},")
          .append("{\"week\":\"넷째 주\",\"summary\":\"1-2문장 조언\"}")
          .append("],")
          .append("\"caution\":\"이 달의 주의사항 (2문장)\",")
          .append("\"advice\":\"이 달의 핵심 조언 (3문장, 구체적 행동 지침)\"}");

        return sb.toString();
    }

    private Map<String, Object> generateFallback(int month, SajuPillar dayPillar, SajuPillar monthPillar) {
        long seed = (dayPillar.getFullName() + monthPillar.getFullName() + month).hashCode();
        Random r = new Random(seed);

        int dayStemEl = dayPillar.getStemElement();
        int monthStemEl = monthPillar.getStemElement();

        // Base score from element interaction
        int baseScore = 60;
        if ((dayStemEl + 1) % 5 == monthStemEl) baseScore += 12;
        if ((monthStemEl + 1) % 5 == dayStemEl) baseScore += 10;
        if (dayStemEl == monthStemEl) baseScore += 6;
        if ((dayStemEl + 2) % 5 == monthStemEl) baseScore -= 5;
        if ((monthStemEl + 2) % 5 == dayStemEl) baseScore -= 8;

        baseScore += r.nextInt(11) - 5;
        int score = Math.max(30, Math.min(95, baseScore));

        String grade;
        if (score >= 80) grade = "대길";
        else if (score >= 65) grade = "길";
        else if (score >= 50) grade = "보통";
        else grade = "소흉";

        String[] themes = {"전진", "안정", "성장", "도약", "수확", "열정", "지혜", "인연", "변화", "희망", "노력", "결실"};
        String[] emojis = {"🚀", "🌿", "🌱", "⭐", "🍀", "🔥", "💡", "💕", "🦋", "🌈", "💪", "🎯"};

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("theme", themes[month - 1]);
        m.put("themeEmoji", emojis[month - 1]);
        m.put("score", score);
        m.put("grade", grade);
        m.put("overall", month + "월은 " + monthPillar.getFullName() + "월의 기운이 흐르는 달입니다. " +
            "일간 " + dayPillar.getFullName() + "과 " + SajuConstants.OHENG[monthStemEl] + "의 기운이 만나 " +
            (score >= 65 ? "좋은 에너지가 흐릅니다. " : "신중한 접근이 필요합니다. ") +
            "이 달에는 계획적으로 움직이는 것이 중요합니다. " +
            "주변 사람들과의 소통에 신경 쓰면 더 좋은 결과를 얻을 수 있습니다.");
        m.put("love", "이 달의 연애운은 " + (score >= 60 ? "새로운 만남의 기운이 있습니다." : "기존 관계에 집중하는 것이 좋습니다.") +
            " 진심을 담은 표현이 관계를 깊게 합니다. 소소한 데이트가 큰 행복을 줍니다.");
        m.put("money", "재물운은 " + (score >= 65 ? "수입이 늘어나는 시기입니다." : "지출 관리에 주의하세요.") +
            " 계획적인 소비가 중요합니다. 부업이나 새로운 수입원을 탐색해보세요.");
        m.put("career", "직장에서는 " + (score >= 60 ? "좋은 성과를 낼 수 있는 달입니다." : "꾸준히 실력을 쌓는 시기입니다.") +
            " 팀워크를 중시하면 좋은 결과가 따릅니다. 새로운 아이디어를 적극 제안하세요.");
        m.put("health", "건강 관리에 신경 쓰는 달입니다. " +
            (month <= 3 || month >= 11 ? "면역력 관리와 보온에 주의하세요." :
             month <= 5 ? "알레르기와 피로 관리에 유의하세요." :
             month <= 8 ? "수분 보충과 자외선 차단에 신경 쓰세요." :
             "환절기 감기 예방에 주의하세요."));
        String[] weeks = {"첫째 주", "둘째 주", "셋째 주", "넷째 주"};
        int bestWeek = r.nextInt(4);
        int cautionWeek;
        do { cautionWeek = r.nextInt(4); } while (cautionWeek == bestWeek);
        m.put("bestWeek", weeks[bestWeek]);
        m.put("cautionWeek", weeks[cautionWeek]);
        m.put("luckyDay", month + "월 " + (r.nextInt(20) + 5) + "일");
        m.put("advice", SajuConstants.OHENG[monthStemEl] + "의 기운을 잘 활용하세요. " +
            "작은 목표부터 달성해나가면 큰 성과로 이어집니다.");

        return m;
    }
}
