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

    public Map<String, Object> analyzeSaju(LocalDate bd1, String bt1, LocalDate bd2, String bt2) {
        return analyzeSaju(bd1, bt1, bd2, bt2, "M", "F");
    }

    public Map<String, Object> analyzeSaju(LocalDate bd1, String bt1, LocalDate bd2, String bt2, String gender1, String gender2) {
        // DB 캐시 체크
        String dbCacheKey = buildCacheKey("compatibility", bd1.toString(), bt1, bd2.toString(), bt2, gender1, gender2);
        Map<String, Object> dbCached = getFromCache("compatibility", dbCacheKey);
        if (dbCached != null) {
            return dbCached;
        }

        String label1 = "M".equalsIgnoreCase(gender1) ? "남자" : "여자";
        String label2 = "M".equalsIgnoreCase(gender2) ? "남자" : "여자";

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
                String systemPrompt = FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                        + "카페에서 친구 커플 궁합 봐주듯이 자연스럽게 대화하는 사주 궁합 전문가.\n"
                        + "'너네 둘이~', '이 남자는~', '이 여자는~' 같은 자연스러운 호칭 사용.\n"
                        + "JSON만 응답:\n"
                        + "- summary: 한 줄 요약\n"
                        + "- overall: 전반적 궁합 3-4문장\n"
                        + "- loveCompat: 연애 궁합 3-4문장\n"
                        + "- workCompat: 업무 궁합 2-3문장\n"
                        + "- conflictPoint: 갈등+해결 3-4문장\n"
                        + "- advice: 실천 조언 3-4문장\n"
                        + "- score: 1-100, grade: 천생연분/좋은 인연/보통/노력 필요/상극\n"
                        + "{\"summary\":\"\",\"overall\":\"\",\"loveCompat\":\"\",\"workCompat\":\"\",\"conflictPoint\":\"\",\"advice\":\"\",\"score\":75,\"grade\":\"\"}";

                String userPrompt = buildCompatPrompt(r1, r2, score, relationship, branchRelation, label1, label2);
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

    /**
     * 사주 궁합은 두 사람의 생년월일 기반으로 영속적. fortuneDate는 고정 anchor 사용.
     * TTL은 createdAt 기준 1시간 — 세션 내 반복 호출만 막는 용도.
     */
    private static final LocalDate CACHE_ANCHOR = LocalDate.of(2000, 1, 1);

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String type, String cacheKey) {
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, CACHE_ANCHOR);
            if (cached.isPresent()) {
                java.time.LocalDateTime createdAt = cached.get().getCreatedAt();
                if (createdAt != null && createdAt.plusHours(1).isBefore(java.time.LocalDateTime.now())) {
                    specialFortuneRepository.delete(cached.get());
                    return null;
                }
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result) {
        try {
            var existing = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, CACHE_ANCHOR);
            if (existing.isPresent()) return;
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(type).cacheKey(cacheKey).fortuneDate(CACHE_ANCHOR)
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) { /* ignore duplicate */ }
    }

    /**
     * 스트리밍 완료 후 캐시 저장용
     */
    public void saveCompatCache(String bd1, String bt1, String bd2, String bt2, String gender1, String gender2, Map<String, Object> result) {
        // 빈 문자열을 null로 통일 (basic 조회 시 null로 들어오므로)
        if (bt1 != null && bt1.isBlank()) bt1 = null;
        if (bt2 != null && bt2.isBlank()) bt2 = null;
        String dbCacheKey = buildCacheKey("compatibility", bd1, bt1, bd2, bt2, gender1, gender2);
        saveToCache("compatibility", dbCacheKey, result);
    }

    /**
     * 스트리밍 완료 후 결과 파싱 + 캐시 저장 (서버에서 직접)
     */
    public void parseAndSaveStreamResult(LocalDate bd1, String bt1, LocalDate bd2, String bt2,
                                          String gender1, String gender2, int score, String grade,
                                          String elementRelation, String branchRelation, String fullText) {
        try {
            SajuResult r1 = SajuCalculator.calculate(bd1, bt1);
            SajuResult r2 = SajuCalculator.calculate(bd2, bt2);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("person1", buildPersonInfo(r1, bd1));
            result.put("person2", buildPersonInfo(r2, bd2));
            result.put("score", score);
            result.put("grade", grade);
            result.put("elementRelation", elementRelation);
            result.put("branchRelation", branchRelation);

            boolean yang1 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r1.getDayMaster())] == 0;
            boolean yang2 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r2.getDayMaster())] == 0;
            result.put("yinyangBalance", yang1 != yang2 ? "음양 조화가 잘 맞습니다" : "같은 기운이라 경쟁할 수 있습니다");

            parseAndApplyCompatAI(result, fullText, score, grade);

            String dbCacheKey = buildCacheKey("compatibility", bd1.toString(), bt1, bd2.toString(), bt2, gender1, gender2);
            saveToCache("compatibility", dbCacheKey, result);
            log.info("궁합 스트리밍 캐시 저장 완료: key={}", dbCacheKey);
        } catch (Exception e) {
            log.warn("궁합 스트리밍 캐시 저장 실패: {}", e.getMessage());
        }
    }

    /**
     * AI 궁합 응답 JSON을 파싱하여 result에 적용
     */
    private void parseAndApplyCompatAI(Map<String, Object> result, String aiResponse, int calcScore, String calcGrade) {
        try {
            String cleanJson = ClaudeApiService.extractJson(aiResponse);
            if (cleanJson == null) {
                log.warn("Failed to extract JSON from AI compatibility response");
                // JSON 잔여물 제거 후 순수 텍스트만 저장
                String cleaned = aiResponse.replaceAll("```[a-z]*\\s*", "").replaceAll("```", "")
                    .replaceAll("\\{[^}]*\"[a-zA-Z]+\"\\s*:", "").replaceAll("[{}\\[\\]\"]", "")
                    .replaceAll("\\s*,\\s*$", "").replaceAll("(?m)^\\s*\\w+:\\s*$", "").trim();
                if (!cleaned.isBlank()) result.put("aiAnalysis", cleaned);
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

    private String buildCompatPrompt(SajuResult r1, SajuResult r2, int score, String elRel, String brRel, String label1, String label2) {
        boolean yang1 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r1.getDayMaster())] == 0;
        boolean yang2 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r2.getDayMaster())] == 0;
        String yinyangInfo = (yang1 ? "양" : "음") + " / " + (yang2 ? "양" : "음") + (yang1 != yang2 ? " (음양 조화)" : " (같은 기운)");

        return "【" + label1 + "】일간: " + r1.getDayMasterHanja() + r1.getDayMaster() + "(" + r1.getDayMasterElement() + ", " + (yang1 ? "양" : "음") + ")\n"
               + "  사주: " + r1.getYearPillar().getFullHanja() + " " + r1.getMonthPillar().getFullHanja() + " " + r1.getDayPillar().getFullHanja() + (r1.getHourPillar() != null ? " " + r1.getHourPillar().getFullHanja() : "") + "\n"
               + "  오행: " + r1.getDayMasterElement() + "\n\n"
               + "【" + label2 + "】일간: " + r2.getDayMasterHanja() + r2.getDayMaster() + "(" + r2.getDayMasterElement() + ", " + (yang2 ? "양" : "음") + ")\n"
               + "  사주: " + r2.getYearPillar().getFullHanja() + " " + r2.getMonthPillar().getFullHanja() + " " + r2.getDayPillar().getFullHanja() + (r2.getHourPillar() != null ? " " + r2.getHourPillar().getFullHanja() : "") + "\n"
               + "  오행: " + r2.getDayMasterElement() + "\n\n"
               + "【오행 관계】" + elRel + "\n"
               + "【일지 관계】" + brRel + "\n"
               + "【음양 조화】" + yinyangInfo + "\n"
               + "【계산 점수】" + score + "점\n\n"
               + "위 사주 정보를 바탕으로 " + label1 + "와 " + label2 + "의 궁합을 JSON 형식으로 상세히 분석해주세요.\n"
               + "반드시 '남자', '여자'로 지칭하고, '사람1', '사람2' 같은 표현은 절대 쓰지 마세요.\n"
               + "오행의 상생/상극 관계가 실제 관계에 어떤 영향을 미치는지 구체적으로 설명해주세요.";
    }

    /**
     * 사주 계산만 수행 (AI 제외) - 스트리밍 1단계용
     */
    public Map<String, Object> analyzeSajuBasic(LocalDate bd1, String bt1, LocalDate bd2, String bt2, String gender1, String gender2) {
        // DB 캐시 체크
        String dbCacheKey = buildCacheKey("compatibility", bd1.toString(), bt1, bd2.toString(), bt2, gender1, gender2);
        log.info("Basic 캐시 조회: key={}, bd1={}, bt1={}, bd2={}, bt2={}, g1={}, g2={}", dbCacheKey, bd1, bt1, bd2, bt2, gender1, gender2);
        Map<String, Object> dbCached = getFromCache("compatibility", dbCacheKey);
        if (dbCached != null) {
            log.info("Basic 캐시 히트!");
            return dbCached;
        }
        log.info("Basic 캐시 미스");

        SajuResult r1 = SajuCalculator.calculate(bd1, bt1);
        SajuResult r2 = SajuCalculator.calculate(bd2, bt2);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("person1", buildPersonInfo(r1, bd1));
        result.put("person2", buildPersonInfo(r2, bd2));

        int el1 = SajuConstants.CHEONGAN_OHENG[getDayMasterIndex(r1.getDayMaster())];
        int el2 = SajuConstants.CHEONGAN_OHENG[getDayMasterIndex(r2.getDayMaster())];
        int score = 60;
        String relationship = "";

        if (el1 == el2) { score += 15; relationship = "비화(같은 오행) - 동질감이 강하고 서로를 잘 이해합니다"; }
        else if (SajuConstants.OHENG_PRODUCES[el1] == el2) { score += 25; relationship = "상생(내가 생해줌) - 내가 상대를 돕고 키워주는 관계"; }
        else if (SajuConstants.OHENG_PRODUCES[el2] == el1) { score += 20; relationship = "상생(상대가 생해줌) - 상대가 나를 지원하는 관계"; }
        else if (SajuConstants.OHENG_OVERCOMES[el1] == el2) { score -= 5; relationship = "상극(내가 극함) - 내가 상대를 제어하는 관계, 주도권 있음"; }
        else if (SajuConstants.OHENG_OVERCOMES[el2] == el1) { score -= 10; relationship = "상극(상대가 극함) - 상대에게 눌릴 수 있는 관계, 인내 필요"; }

        int branch1 = SajuCalculator.calculateDayPillar(bd1).getBranchIndex();
        int branch2 = SajuCalculator.calculateDayPillar(bd2).getBranchIndex();
        String branchRelation = "일반적 관계";
        for (int[] yuk : SajuConstants.YUKAP) {
            if ((branch1 == yuk[0] && branch2 == yuk[1]) || (branch1 == yuk[1] && branch2 == yuk[0])) {
                score += 15; branchRelation = SajuConstants.JIJI[branch1] + SajuConstants.JIJI[branch2] + " 육합 - 천생연분의 인연!"; break;
            }
        }
        if (Math.floorMod(branch1 - branch2, 12) == 6) {
            score -= 15; branchRelation = SajuConstants.JIJI[branch1] + SajuConstants.JIJI[branch2] + " 충 - 갈등이 있으나 서로 성장시키는 관계";
        }

        boolean yang1 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r1.getDayMaster())] == 0;
        boolean yang2 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r2.getDayMaster())] == 0;
        if (yang1 != yang2) score += 10;
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
        return result;
    }

    /**
     * 궁합 AI 스트리밍용 프롬프트 생성
     */
    public String[] buildStreamPrompts(LocalDate bd1, String bt1, LocalDate bd2, String bt2, String gender1, String gender2, int score, String elementRelation, String branchRelation) {
        String label1 = "M".equalsIgnoreCase(gender1) ? "남자" : "여자";
        String label2 = "M".equalsIgnoreCase(gender2) ? "남자" : "여자";
        SajuResult r1 = SajuCalculator.calculate(bd1, bt1);
        SajuResult r2 = SajuCalculator.calculate(bd2, bt2);

        String systemPrompt = FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                + "카페에서 친구 커플 궁합 봐주듯이 자연스럽게 얘기하는 사주 궁합 전문가야.\n"
                + "20대가 이해하기 쉽게 친근한 반말로 풀어줘.\n"
                + "'너네 둘이~', '이 남자는~', '이 여자는~' 같은 자연스러운 호칭 사용.\n"
                + "'오행/일간/상생상극/사주명리' 같은 한자 용어 그대로 쓰지 말고 의미만 풀어서.\n\n"
                + "JSON만 응답:\n"
                + "- summary: 한 줄 요약 (30자 이내, 임팩트 있게)\n"
                + "- overall: 전반적 궁합 3-4문장\n"
                + "- loveCompat: 연애 궁합 3-4문장\n"
                + "- workCompat: 성격/케미 궁합 2-3문장\n"
                + "- conflictPoint: 갈등 포인트와 해결법 3-4문장\n"
                + "- advice: 실천 조언 3-4문장\n"
                + "- score: 1-100, grade: 천생연분/좋은 인연/보통/노력 필요/상극\n"
                + "{\"summary\":\"\",\"overall\":\"\",\"loveCompat\":\"\",\"workCompat\":\"\",\"conflictPoint\":\"\",\"advice\":\"\",\"score\":75,\"grade\":\"\"}";

        String userPrompt = buildCompatPrompt(r1, r2, score, elementRelation, branchRelation, label1, label2);
        return new String[]{systemPrompt, userPrompt};
    }

    /**
     * 빠른 궁합 점수 계산 (AI 없이, 사주 계산만)
     */
    public Map<String, Object> quickScore(LocalDate bd1, String bt1, LocalDate bd2) {
        SajuResult r1 = SajuCalculator.calculate(bd1, bt1);
        SajuResult r2 = SajuCalculator.calculate(bd2, null);

        int el1 = SajuConstants.CHEONGAN_OHENG[getDayMasterIndex(r1.getDayMaster())];
        int el2 = SajuConstants.CHEONGAN_OHENG[getDayMasterIndex(r2.getDayMaster())];

        int score = 60;
        if (el1 == el2) score += 15;
        else if (SajuConstants.OHENG_PRODUCES[el1] == el2) score += 25;
        else if (SajuConstants.OHENG_PRODUCES[el2] == el1) score += 20;
        else if (SajuConstants.OHENG_OVERCOMES[el1] == el2) score -= 5;
        else if (SajuConstants.OHENG_OVERCOMES[el2] == el1) score -= 10;

        int branch1 = SajuCalculator.calculateDayPillar(bd1).getBranchIndex();
        int branch2 = SajuCalculator.calculateDayPillar(bd2).getBranchIndex();
        for (int[] yuk : SajuConstants.YUKAP) {
            if ((branch1 == yuk[0] && branch2 == yuk[1]) || (branch1 == yuk[1] && branch2 == yuk[0])) {
                score += 15; break;
            }
        }
        if (Math.floorMod(branch1 - branch2, 12) == 6) score -= 15;

        boolean yang1 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r1.getDayMaster())] == 0;
        boolean yang2 = SajuConstants.CHEONGAN_YINYANG[getDayMasterIndex(r2.getDayMaster())] == 0;
        if (yang1 != yang2) score += 10;

        score = Math.max(20, Math.min(98, score));

        String grade;
        if (score >= 85) grade = "천생연분";
        else if (score >= 70) grade = "좋은 인연";
        else if (score >= 55) grade = "보통 인연";
        else if (score >= 40) grade = "노력 필요";
        else grade = "어려운 인연";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("score", score);
        result.put("grade", grade);
        return result;
    }

    private int getDayMasterIndex(String dayMaster) {
        for (int i = 0; i < SajuConstants.CHEONGAN.length; i++) {
            if (SajuConstants.CHEONGAN[i].equals(dayMaster)) return i;
        }
        return 0;
    }
}
