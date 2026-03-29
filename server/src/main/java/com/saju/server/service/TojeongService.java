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
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 메모리 캐싱: "birthDate|currentYear" → AI 보강된 TojeongResult
    private final ConcurrentHashMap<String, TojeongResult> cache = new ConcurrentHashMap<>();
    private volatile int cacheYear = 0;

    /**
     * 토정비결 분석 수행 (Claude API 사용 가능하면 AI 해석, 아니면 기본 해석)
     */
    @Transactional
    public TojeongResult analyze(LocalDate birthDate) {
        int currentYear = LocalDate.now().getYear();

        // DB 캐시 체크
        String dbCacheKey = buildCacheKey("tojeong", birthDate.toString(), String.valueOf(currentYear));
        Map<String, Object> dbCached = getFromCache("tojeong", dbCacheKey);
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

        // 메모리 캐시 키 생성
        String cacheKey = birthDate + "|" + currentYear;
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
            saveToCache("tojeong", dbCacheKey, resultMap);
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

    /**
     * Claude AI로 월별 운세 해석 보강
     */
    private void enhanceWithAI(TojeongResult result, int currentYear) {
        try {
            // 올해 간지 계산
            SajuPillar yearPillar = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(LocalDate.now()));
            String currentGanji = yearPillar.getFullHanja() + "(" + yearPillar.getFullName() + ")";

            String systemPrompt = "당신은 조선시대 토정 이지함의 토정비결을 계승한 대한민국 최고의 역술가입니다.\n"
                    + "괘 번호와 올해 간지를 기반으로 월별 운세를 해석합니다.\n\n"
                    + "【규칙】\n"
                    + "1. 반드시 JSON만 응답 (설명 텍스트 없이)\n"
                    + "2. yearSummary는 4-5문장으로 올해 전체 흐름을 상세히\n"
                    + "3. 각 월의 fortune은 3-4문장으로 구체적 조언 포함\n"
                    + "4. rating은 반드시 \"대길\",\"길\",\"보통\",\"흉\",\"대흉\" 중 하나\n"
                    + "5. 12개월 모두 빠짐없이 작성\n"
                    + "6. 월별로 재물운, 건강운, 인간관계를 골고루 반영\n"
                    + "7. 전통 역학 어투를 유지하되 현대적 조언도 포함\n\n"
                    + "응답 형식:\n"
                    + "{\"yearSummary\":\"올해 총평\",\"months\":[{\"month\":1,\"fortune\":\"1월 운세\",\"rating\":\"길\"},{\"month\":2,\"fortune\":\"2월 운세\",\"rating\":\"보통\"},...]}";


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

            String aiResponse = claudeApiService.generate(systemPrompt, userPrompt, 2000);

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
