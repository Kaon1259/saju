package com.saju.server.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.saju.server.saju.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TojeongService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 메모리 캐싱: "birthDate|currentYear" → AI 보강된 TojeongResult
    private final ConcurrentHashMap<String, TojeongResult> cache = new ConcurrentHashMap<>();
    private volatile int cacheYear = 0;

    /**
     * 스트리밍용 컨텍스트 빌드
     * [0]=systemPrompt, [1]=userPrompt, [2]=cacheKey, [3]=cached(있으면)
     */
    public Object[] buildStreamContext(LocalDate birthDate) {
        return buildStreamContext(birthDate, null, null, null);
    }

    public Object[] buildStreamContext(LocalDate birthDate, String gender, String targetType, String targetName) {
        int currentYear = LocalDate.now().getYear();
        String dbCacheKey = buildCacheKey("tojeong", birthDate.toString(), String.valueOf(currentYear), gender, targetType, targetName);
        Map<String, Object> dbCached = getFromCache("tojeong", dbCacheKey, currentYear);
        if (dbCached != null) {
            return new Object[]{ null, null, dbCacheKey, dbCached };
        }
        // 메모리 캐시 체크
        String memKey = birthDate + "|" + currentYear + "|" + nz(gender) + "|" + nz(targetType) + "|" + nz(targetName);
        TojeongResult memoryCached = cache.get(memKey);
        if (memoryCached != null) {
            try {
                Map<String, Object> m = objectMapper.convertValue(memoryCached, new TypeReference<Map<String, Object>>() {});
                return new Object[]{ null, null, dbCacheKey, m };
            } catch (Exception ignored) {}
        }

        TojeongResult base = TojeongCalculator.calculate(birthDate);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(LocalDate.now()));
        String currentGanji = yearPillar.getFullHanja() + "(" + yearPillar.getFullName() + ")";

        String systemPrompt = "당신은 토정비결에 빠삭한 운세 전문가야. 괘의 의미를 쉽고 재밌게 풀어주는 게 특기거든!\n"
            + "단순히 '좋다/나쁘다'가 아니라, 구체적인 상황이랑 이유를 설명해서 실생활에 바로 써먹을 수 있는 조언을 해줘.\n\n"
            + FortunePromptBuilder.COMMON_TONE_RULES + "\n"
            + FortunePromptBuilder.TARGET_AWARE_RULES + "\n"
            + "【규칙】\n"
            + "1. 반드시 JSON만 응답 (설명 텍스트 없이)\n"
            + "2. yearSummary는 6-8문장으로 작성\n"
            + "3. yearKeywords는 올해를 대표하는 핵심 키워드 3개 배열\n"
            + "4. bestMonth는 가장 운이 좋은 달 번호 (1-12)\n"
            + "5. cautionMonth는 가장 조심해야 할 달 번호 (1-12)\n"
            + "6. yearAdvice는 올해를 잘 보내기 위한 핵심 조언 2-3문장\n"
            + "7. 각 월의 fortune은 5-6문장으로 구체적으로 작성\n"
            + "8. rating은 반드시 \"대길\",\"길\",\"보통\",\"흉\",\"대흉\" 중 하나\n"
            + "9. 12개월 모두 빠짐없이 작성\n\n"
            + "응답 형식:\n"
            + "{\"yearSummary\":\"올해 총평 6-8문장\","
            + "\"yearKeywords\":[\"키워드1\",\"키워드2\",\"키워드3\"],"
            + "\"bestMonth\":1,"
            + "\"cautionMonth\":7,"
            + "\"yearAdvice\":\"올해 핵심 조언 2-3문장\","
            + "\"months\":[{\"month\":1,\"fortune\":\"1월 운세 5-6문장\",\"rating\":\"길\"},...12개월 모두]}";

        String personCtx = promptBuilder.buildPersonContext(birthDate.toString(), gender);
        String targetCtx = promptBuilder.buildTargetContext(targetType, targetName);
        String userPrompt = String.format(
            "토정비결 괘 번호: %d (%s)\n"
            + "상수(태세수): %d, 중수(월건수): %d, 하수(일진수): %d\n"
            + "올해 간지: %d년 %s\n",
            base.getTotalGwae(), base.getGwaeName(),
            base.getSangsu(), base.getJungsu(), base.getHasu(),
            currentYear, currentGanji
        )
            + (personCtx.isEmpty() ? "" : personCtx + "\n")
            + (targetCtx.isEmpty() ? "" : targetCtx + "\n")
            + "위 정보를 바탕으로 토정비결 월별 운세를 JSON으로 작성해주세요.";
        return new Object[]{ systemPrompt, userPrompt, dbCacheKey, null, base };
    }

    /**
     * 스트리밍 완료 후 캐시 저장
     */
    @Transactional
    public Map<String, Object> saveStreamResult(LocalDate birthDate, String fullText) {
        return saveStreamResult(birthDate, null, null, null, fullText);
    }

    @Transactional
    public Map<String, Object> saveStreamResult(LocalDate birthDate, String gender, String targetType, String targetName, String fullText) {
        try {
            int currentYear = LocalDate.now().getYear();
            String dbCacheKey = buildCacheKey("tojeong", birthDate.toString(), String.valueOf(currentYear), gender, targetType, targetName);

            // 기본 계산 결과
            TojeongResult base = TojeongCalculator.calculate(birthDate);

            // AI 결과 파싱 및 적용
            String cleanJson = ClaudeApiService.extractJson(fullText);
            if (cleanJson != null) {
                parseAndApplyAIResponse(base, cleanJson);
            }

            // 메모리 캐시 저장
            String memKey = birthDate + "|" + currentYear + "|" + nz(gender) + "|" + nz(targetType) + "|" + nz(targetName);
            cache.put(memKey, base);

            // DB 캐시 저장
            Map<String, Object> resultMap = objectMapper.convertValue(base, new TypeReference<Map<String, Object>>() {});
            saveToCache("tojeong", dbCacheKey, resultMap, currentYear);
            return resultMap;
        } catch (Exception e) {
            log.warn("Tojeong stream cache save failed: {}", e.getMessage());
            return null;
        }
    }

    private static String nz(String s) { return s == null ? "" : s; }

    /**
     * 토정비결 분석 수행 (Claude API 사용 가능하면 AI 해석, 아니면 기본 해석)
     */
    @Transactional
    public TojeongResult analyze(LocalDate birthDate) {
        int currentYear = LocalDate.now().getYear();

        // DB 캐시 체크 (analyze는 gender/target 없음)
        String dbCacheKey = buildCacheKey("tojeong", birthDate.toString(), String.valueOf(currentYear), null, null, null);
        Map<String, Object> dbCached = getFromCache("tojeong", dbCacheKey, currentYear);
        if (dbCached != null) {
            try {
                TojeongResult dbResult = objectMapper.convertValue(dbCached, TojeongResult.class);
                log.debug("Tojeong DB cache hit: {}", dbCacheKey);
                return dbResult;
            } catch (Exception e) {
                log.warn("Failed to deserialize DB cached tojeong result: {}", e.getMessage());
            }
        }

        // 연도가 바뀌면 메모리 캐시 초기화
        if (currentYear != cacheYear) {
            cache.clear();
            cacheYear = currentYear;
        }

        // 메모리 캐시 키 생성 (analyze는 gender/target 없음)
        String cacheKey = birthDate + "|" + currentYear + "|||";
        TojeongResult cached = cache.get(cacheKey);
        if (cached != null) {
            log.debug("Tojeong memory cache hit: {}", cacheKey);
            return cached;
        }

        // 기본 계산
        TojeongResult result = TojeongCalculator.calculate(birthDate);

        // Claude API 사용 가능하면 AI 해석으로 보강
        if (claudeApiService.isAvailable()) {
            enhanceWithAI(result, currentYear);
        }

        // 메모리 캐시 저장
        cache.put(cacheKey, result);

        // DB 캐시 저장
        try {
            Map<String, Object> resultMap = objectMapper.convertValue(result, new TypeReference<Map<String, Object>>() {});
            saveToCache("tojeong", dbCacheKey, resultMap, currentYear);
        } catch (Exception e) {
            log.warn("Failed to save tojeong result to DB cache: {}", e.getMessage());
        }

        return result;
    }

    // ===== DB 캐싱 헬퍼 메서드 =====

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

    /**
     * 토정비결은 연간 단위 캐시 — fortuneDate를 해당 연도의 1월 1일로 고정해서
     * 연중 같은 키로 조회/저장되도록 한다. (LocalDate.now()로 저장 시 매일 캐시 미스 발생)
     */
    private static LocalDate cacheAnchorDate(int year) {
        return LocalDate.of(year, 1, 1);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String type, String cacheKey, int year) {
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, cacheAnchorDate(year));
            if (cached.isPresent()) {
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result, int year) {
        try {
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(type).cacheKey(cacheKey).fortuneDate(cacheAnchorDate(year))
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) { /* ignore duplicate */ }
    }

    /**
     * Claude AI로 월별 운세 해석 보강
     */
    private void enhanceWithAI(TojeongResult result, int currentYear) {
        try {
            // 올해 간지 계산
            SajuPillar yearPillar = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(LocalDate.now()));
            String currentGanji = yearPillar.getFullHanja() + "(" + yearPillar.getFullName() + ")";

            String systemPrompt = "당신은 토정비결에 빠삭한 운세 전문가야. 괘의 의미를 쉽고 재밌게 풀어주는 게 특기거든!\n"
                    + "단순히 '좋다/나쁘다'가 아니라, 구체적인 상황이랑 이유를 설명해서 실생활에 바로 써먹을 수 있는 조언을 해줘.\n\n"
                    + FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                    + "【규칙】\n"
                    + "1. 반드시 JSON만 응답 (설명 텍스트 없이)\n"
                    + "2. yearSummary는 6-8문장으로 작성:\n"
                    + "   - 올해 전반적 기운의 흐름과 괘의 상징적 의미\n"
                    + "   - 상반기와 하반기의 구분된 운세 흐름\n"
                    + "   - 특별히 주의해야 할 점\n"
                    + "   - 올해 행운을 가져올 활동이나 방향\n"
                    + "3. yearKeywords는 올해를 대표하는 핵심 키워드 3개 (예: [\"새로운 시작\", \"재물 성장\", \"건강 관리\"])\n"
                    + "4. bestMonth는 12개월 중 가장 운이 좋은 달 번호 (1-12)\n"
                    + "5. cautionMonth는 12개월 중 가장 조심해야 할 달 번호 (1-12)\n"
                    + "6. yearAdvice는 올해를 잘 보내기 위한 핵심 조언 2-3문장\n"
                    + "7. 각 월의 fortune은 5-6문장으로 구체적으로 작성:\n"
                    + "   - 해당 월의 기운과 분위기 설명\n"
                    + "   - 재물운에 대한 구체적 조언 (투자, 저축, 소비 등)\n"
                    + "   - 건강 주의사항 (어떤 부분을 조심할지)\n"
                    + "   - 대인관계 또는 직장/학업 관련 조언\n"
                    + "   - 그 달에 실천할 행동 지침\n"
                    + "   - rating 등급에 맞는 구체적 이유\n"
                    + "8. rating은 반드시 \"대길\",\"길\",\"보통\",\"흉\",\"대흉\" 중 하나\n"
                    + "9. 12개월 모두 빠짐없이 작성\n"
                    + "10. 괘의 상징적 의미를 각 월에 연결하여 풀이\n"
                    + "11. 자연스러운 대화체 반말로, 현대인이 바로 실천할 수 있는 조언 포함\n\n"
                    + "응답 형식:\n"
                    + "{\"yearSummary\":\"올해 총평 6-8문장\","
                    + "\"yearKeywords\":[\"키워드1\",\"키워드2\",\"키워드3\"],"
                    + "\"bestMonth\":1,"
                    + "\"cautionMonth\":7,"
                    + "\"yearAdvice\":\"올해 핵심 조언 2-3문장\","
                    + "\"months\":[{\"month\":1,\"fortune\":\"1월 운세 5-6문장\",\"rating\":\"길\"},...12개월 모두]}";


            String userPrompt = String.format(
                    "토정비결 괘 번호: %d (%s)\n"
                    + "상수(태세수): %d, 중수(월건수): %d, 하수(일진수): %d\n"
                    + "올해 간지: %d년 %s\n"
                    + "위 정보를 바탕으로 토정비결 월별 운세를 JSON으로 작성해주세요.",
                    result.getTotalGwae(),
                    result.getGwaeName(),
                    result.getSangsu(),
                    result.getJungsu(),
                    result.getHasu(),
                    currentYear,
                    currentGanji
            );

            String aiResponse = claudeApiService.generate(systemPrompt, userPrompt, 2500);

            if (aiResponse != null && !aiResponse.isBlank()) {
                parseAndApplyAIResponse(result, aiResponse);
            }
        } catch (Exception e) {
            log.warn("AI tojeong interpretation failed, using template fallback: {}", e.getMessage());
        }
    }

    /**
     * AI 응답 JSON을 파싱하여 TojeongResult에 적용
     */
    private void parseAndApplyAIResponse(TojeongResult result, String aiResponse) {
        try {
            String cleanJson = ClaudeApiService.extractJson(aiResponse);
            if (cleanJson == null) {
                log.warn("Failed to extract JSON from AI tojeong response");
                return;
            }

            JsonNode root = objectMapper.readTree(cleanJson);

            // 올해 총평 적용
            String yearSummary = root.path("yearSummary").asText(null);
            if (yearSummary != null && !yearSummary.isBlank()) {
                result.setYearSummary(yearSummary);
            }

            // 올해 핵심 키워드 적용
            JsonNode keywordsNode = root.path("yearKeywords");
            if (keywordsNode.isArray() && keywordsNode.size() > 0) {
                List<String> keywords = new ArrayList<>();
                for (JsonNode kw : keywordsNode) {
                    String text = kw.asText(null);
                    if (text != null && !text.isBlank()) keywords.add(text);
                }
                if (!keywords.isEmpty()) result.setYearKeywords(keywords);
            }

            // 가장 좋은 달 / 조심할 달 적용
            int bestMonth = root.path("bestMonth").asInt(0);
            if (bestMonth >= 1 && bestMonth <= 12) result.setBestMonth(bestMonth);

            int cautionMonth = root.path("cautionMonth").asInt(0);
            if (cautionMonth >= 1 && cautionMonth <= 12) result.setCautionMonth(cautionMonth);

            // 올해 핵심 조언 적용
            String yearAdvice = root.path("yearAdvice").asText(null);
            if (yearAdvice != null && !yearAdvice.isBlank()) {
                result.setYearAdvice(yearAdvice);
            }

            // 월별 운세 적용
            JsonNode monthsNode = root.path("months");
            if (monthsNode.isArray() && monthsNode.size() > 0) {
                List<TojeongResult.MonthlyFortune> aiFortunes = new ArrayList<>();

                for (JsonNode monthNode : monthsNode) {
                    int month = monthNode.path("month").asInt(0);
                    String fortune = monthNode.path("fortune").asText("");
                    String rating = monthNode.path("rating").asText("보통");

                    if (month >= 1 && month <= 12 && !fortune.isBlank()) {
                        aiFortunes.add(TojeongResult.MonthlyFortune.builder()
                                .month(month)
                                .fortune(fortune)
                                .rating(rating)
                                .build());
                    }
                }

                // AI 응답이 12개월분 모두 있으면 교체, 부분적이면 병합
                if (aiFortunes.size() == 12) {
                    result.setMonthlyFortunes(aiFortunes);
                } else if (!aiFortunes.isEmpty()) {
                    // 부분 병합: AI 결과가 있는 월만 교체
                    List<TojeongResult.MonthlyFortune> merged = new ArrayList<>(result.getMonthlyFortunes());
                    for (TojeongResult.MonthlyFortune aiFortune : aiFortunes) {
                        for (int i = 0; i < merged.size(); i++) {
                            if (merged.get(i).getMonth() == aiFortune.getMonth()) {
                                merged.set(i, aiFortune);
                                break;
                            }
                        }
                    }
                    result.setMonthlyFortunes(merged);
                }
            }

            log.info("AI tojeong interpretation applied successfully for gwae {}", result.getTotalGwae());
        } catch (Exception e) {
            log.error("Failed to parse AI tojeong response: {}", e.getMessage());
        }
    }
}
