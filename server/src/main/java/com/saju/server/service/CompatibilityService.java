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
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompatibilityService {

    private final ClaudeApiService claudeApiService;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> analyzeSaju(LocalDate bd1, String bt1, LocalDate bd2, String bt2) {
        // DB 캐시 체크
        String dbCacheKey = buildCacheKey("compatibility", bd1.toString(), bt1, bd2.toString(), bt2);
        Map<String, Object> dbCached = getFromCache("compatibility", dbCacheKey);
        if (dbCached != null) {
            return dbCached;
        }

        SajuResult r1 = SajuCalculator.calculate(bd1, bt1);
        SajuResult r2 = SajuCalculator.calculate(bd2, bt2);

        Map<String, Object> result = new LinkedHashMap<>();

        // 기본 정보
        result.put("person1", buildPersonInfo(r1, bd1));
        result.put("person2", buildPersonInfo(r2, bd2));

        // 일간 궁합 (오행 상생상극)
        int el1 = SajuConstants.CHEONGAN_OHENG[getDayMasterIndex(r1.getDayMaster())];
        int el2 = SajuConstants.CHEONGAN_OHENG[getDayMasterIndex(r2.getDayMaster())];

        int score = 60; // base score
        String relationship = "";

        if (el1 == el2) { score += 15; relationship = "비화(같은 오행) - 동질감이 강하고 서로를 잘 이해합니다"; }
        else if (SajuConstants.OHENG_PRODUCES[el1] == el2) { score += 25; relationship = "상생(내가 생해줌) - 내가 상대를 돕고 키워주는 관계"; }
        else if (SajuConstants.OHENG_PRODUCES[el2] == el1) { score += 20; relationship = "상생(상대가 생해줌) - 상대가 나를 지원하는 관계"; }
        else if (SajuConstants.OHENG_OVERCOMES[el1] == el2) { score -= 5; relationship = "상극(내가 극함) - 내가 상대를 제어하는 관계, 주도권 있음"; }
        else if (SajuConstants.OHENG_OVERCOMES[el2] == el1) { score -= 10; relationship = "상극(상대가 극함) - 상대에게 눌릴 수 있는 관계, 인내 필요"; }

        // 지지 합충 검사 (일지끼리)
        int branch1 = SajuCalculator.calculateDayPillar(bd1).getBranchIndex();
        int branch2 = SajuCalculator.calculateDayPillar(bd2).getBranchIndex();

        String branchRelation = "일반적 관계";
        // 육합 검사
        for (int[] yuk : SajuConstants.YUKAP) {
            if ((branch1 == yuk[0] && branch2 == yuk[1]) || (branch1 == yuk[1] && branch2 == yuk[0])) {
                score += 15; branchRelation = SajuConstants.JIJI[branch1] + SajuConstants.JIJI[branch2] + " 육합 - 천생연분의 인연!";
                break;
            }
        }
        // 충 검사
        if (Math.floorMod(branch1 - branch2, 12) == 6) {
            score -= 15; branchRelation = SajuConstants.JIJI[branch1] + SajuConstants.JIJI[branch2] + " 충 - 갈등이 있으나 서로 성장시키는 관계";
        }

        // 음양 조화
        boolean yang1 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r1.getDayMaster())] == 0;
        boolean yang2 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r2.getDayMaster())] == 0;
        if (yang1 != yang2) { score += 10; } // 음양 다르면 보완

        score = Math.max(20, Math.min(98, score));

        String grade;
        if (score >= 85) grade = "천생연분";
        else if (score >= 70) grade = "좋은 인연";
        else if (score >= 55) grade = "보통 인연";
        else if (score >= 40) grade = "노력 필요";
        else grade = "어려운 인연";

        result.put("score", score);
        result.put("grade", grade);
        result.put("elementRelation", relationship);
        result.put("branchRelation", branchRelation);
        result.put("yinyangBalance", yang1 != yang2 ? "음양 조화가 잘 맞습니다" : "같은 기운이라 경쟁할 수 있습니다");

        // AI 상세 분석
        if (claudeApiService.isAvailable()) {
            try {
                String systemPrompt = "당신은 40년 경력의 한국 사주 궁합 전문가입니다.\n"
                        + "두 사람의 사주 명식과 오행 관계를 깊이 분석하여 궁합을 풀이합니다.\n"
                        + "전통 역학의 격조를 유지하면서도 현대적이고 실용적인 조언을 제공합니다.\n\n"
                        + "【규칙】\n"
                        + "1. 반드시 JSON만 응답 (설명 텍스트 없이)\n"
                        + "2. summary: 궁합을 한 줄로 요약 (1문장)\n"
                        + "3. overall: 전반적 궁합 해석 3-4문장 (오행 관계의 의미, 두 사람의 기운 조화)\n"
                        + "4. loveCompat: 연애/결혼 궁합 3-4문장 (감정적 교류, 가정 운영, 장기적 전망)\n"
                        + "5. workCompat: 직장/업무 궁합 2-3문장 (협업 스타일, 비즈니스 관계)\n"
                        + "6. conflictPoint: 갈등 포인트와 해결 방법 2-3문장 (어떤 상황에서 충돌, 극복법)\n"
                        + "7. advice: 관계 개선을 위한 구체적 조언 2-3문장 (실천 가능한 행동 지침)\n"
                        + "8. score: 궁합 점수 1-100 (계산된 점수를 참고하되 AI 판단으로 조정 가능)\n"
                        + "9. grade: \"천생연분\",\"좋은 인연\",\"보통\",\"노력 필요\",\"상극\" 중 하나\n\n"
                        + "응답 형식:\n"
                        + "{\"summary\":\"한 줄 요약\","
                        + "\"overall\":\"전반적 해석\","
                        + "\"loveCompat\":\"연애/결혼 궁합\","
                        + "\"workCompat\":\"직장/업무 궁합\","
                        + "\"conflictPoint\":\"갈등 포인트\","
                        + "\"advice\":\"구체적 조언\","
                        + "\"score\":75,"
                        + "\"grade\":\"좋은 인연\"}";

                String userPrompt = buildCompatPrompt(r1, r2, score, relationship, branchRelation);
                String aiResponse = claudeApiService.generate(systemPrompt, userPrompt, 1500);

                if (aiResponse != null && !aiResponse.isBlank()) {
                    parseAndApplyCompatAI(result, aiResponse, score, grade);
                }
            } catch (Exception e) { log.warn("AI compat failed: {}", e.getMessage()); }
        }

        // DB 캐시 저장
        saveToCache("compatibility", dbCacheKey, result);

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
     * AI 궁합 응답 JSON을 파싱하여 result에 적용
     */
    private void parseAndApplyCompatAI(Map<String, Object> result, String aiResponse, int calcScore, String calcGrade) {
        try {
            String cleanJson = ClaudeApiService.extractJson(aiResponse);
            if (cleanJson == null) {
                log.warn("Failed to extract JSON from AI compatibility response");
                result.put("aiAnalysis", aiResponse);
                return;
            }

            JsonNode root = objectMapper.readTree(cleanJson);

            String summary = root.path("summary").asText(null);
            if (summary != null && !summary.isBlank()) result.put("aiSummary", summary);

            String overall = root.path("overall").asText(null);
            if (overall != null && !overall.isBlank()) result.put("aiOverall", overall);

            String loveCompat = root.path("loveCompat").asText(null);
            if (loveCompat != null && !loveCompat.isBlank()) result.put("aiLoveCompat", loveCompat);

            String workCompat = root.path("workCompat").asText(null);
            if (workCompat != null && !workCompat.isBlank()) result.put("aiWorkCompat", workCompat);

            String conflictPoint = root.path("conflictPoint").asText(null);
            if (conflictPoint != null && !conflictPoint.isBlank()) result.put("aiConflictPoint", conflictPoint);

            String advice = root.path("advice").asText(null);
            if (advice != null && !advice.isBlank()) result.put("aiAdvice", advice);

            // AI 점수/등급은 기존 계산값을 덮어쓰지 않고 별도 필드로 저장
            int aiScore = root.path("score").asInt(0);
            if (aiScore >= 1 && aiScore <= 100) result.put("aiScore", aiScore);

            String aiGrade = root.path("grade").asText(null);
            if (aiGrade != null && !aiGrade.isBlank()) result.put("aiGrade", aiGrade);

            log.info("AI compatibility analysis applied successfully");
        } catch (Exception e) {
            log.warn("Failed to parse AI compatibility response, using raw text: {}", e.getMessage());
            result.put("aiAnalysis", aiResponse);
        }
    }

    private Map<String, Object> buildPersonInfo(SajuResult r, LocalDate bd) {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("birthDate", bd.toString());
        info.put("dayMaster", r.getDayMasterHanja() + " " + r.getDayMaster());
        info.put("dayMasterElement", r.getDayMasterElement());
        info.put("dayMasterYang", r.isDayMasterYang());
        info.put("yearPillar", r.getYearPillar().getFullHanja());
        info.put("dayPillar", r.getDayPillar().getFullHanja());
        return info;
    }

    private String buildCompatPrompt(SajuResult r1, SajuResult r2, int score, String elRel, String brRel) {
        boolean yang1 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r1.getDayMaster())] == 0;
        boolean yang2 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r2.getDayMaster())] == 0;
        String yinyangInfo = (yang1 ? "양" : "음") + " / " + (yang2 ? "양" : "음") + (yang1 != yang2 ? " (음양 조화)" : " (같은 기운)");

        return "【사람1】일간: " + r1.getDayMasterHanja() + r1.getDayMaster() + "(" + r1.getDayMasterElement() + ", " + (yang1 ? "양" : "음") + ")\n"
               + "  사주: " + r1.getYearPillar().getFullHanja() + " " + r1.getMonthPillar().getFullHanja() + " " + r1.getDayPillar().getFullHanja() + (r1.getHourPillar() != null ? " " + r1.getHourPillar().getFullHanja() : "") + "\n"
               + "  오행: " + r1.getDayMasterElement() + "\n\n"
               + "【사람2】일간: " + r2.getDayMasterHanja() + r2.getDayMaster() + "(" + r2.getDayMasterElement() + ", " + (yang2 ? "양" : "음") + ")\n"
               + "  사주: " + r2.getYearPillar().getFullHanja() + " " + r2.getMonthPillar().getFullHanja() + " " + r2.getDayPillar().getFullHanja() + (r2.getHourPillar() != null ? " " + r2.getHourPillar().getFullHanja() : "") + "\n"
               + "  오행: " + r2.getDayMasterElement() + "\n\n"
               + "【오행 관계】" + elRel + "\n"
               + "【일지 관계】" + brRel + "\n"
               + "【음양 조화】" + yinyangInfo + "\n"
               + "【계산 점수】" + score + "점\n\n"
               + "위 사주 정보를 바탕으로 두 사람의 궁합을 JSON 형식으로 상세히 분석해주세요.\n"
               + "오행의 상생/상극 관계가 실제 관계에 어떤 영향을 미치는지 구체적으로 설명해주세요.";
    }

    private int getDayMasterIndex(String dayMaster) {
        for (int i = 0; i < SajuConstants.CHEONGAN.length; i++) {
            if (SajuConstants.CHEONGAN[i].equals(dayMaster)) return i;
        }
        return 0;
    }
}
