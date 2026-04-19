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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class SajuService {

    private final ClaudeApiService claudeApiService;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 메모리 캐싱: "birthDate|birthTime|today" → AI 보강된 SajuResult
    private final ConcurrentHashMap<String, SajuResult> cache = new ConcurrentHashMap<>();
    private volatile LocalDate cacheDate = null;

    /**
     * 사주 분석 수행 (gender 없는 버전 - 하위 호환)
     */
    public SajuResult analyze(LocalDate birthDate, String birthTime) {
        return analyze(birthDate, birthTime, null);
    }

    /**
     * 사주 분석 수행 (Claude API 사용 가능하면 AI 해석, 아니면 기본 해석)
     */
    public SajuResult analyze(LocalDate birthDate, String birthTime, String gender) {
        LocalDate today = LocalDate.now();

        // DB 캐시 체크
        String dbCacheKey = buildCacheKey("saju", birthDate.toString(), birthTime, gender);
        Map<String, Object> dbCached = getFromCache("saju", dbCacheKey);
        if (dbCached != null) {
            try {
                SajuResult dbResult = objectMapper.convertValue(dbCached, SajuResult.class);
                log.debug("Saju DB cache hit: {}", dbCacheKey);
                return dbResult;
            } catch (Exception e) {
                log.warn("Failed to deserialize DB cached saju result: {}", e.getMessage());
            }
        }

        // 날짜가 바뀌면 메모리 캐시 초기화
        if (!today.equals(cacheDate)) {
            cache.clear();
            cacheDate = today;
        }

        // 메모리 캐시 키 생성
        String genderKey = gender != null ? gender : "";
        String cacheKey = birthDate + "|" + (birthTime != null ? birthTime : "") + "|" + genderKey + "|" + today;
        SajuResult cached = cache.get(cacheKey);
        if (cached != null) {
            log.debug("Saju memory cache hit: {}", cacheKey);
            return cached;
        }

        SajuResult result = SajuCalculator.calculate(birthDate, birthTime);

        // 고급 분석 추가
        int dayStemIdx = getDayMasterIndex(result.getDayMaster());
        if (dayStemIdx >= 0) {
            SajuPillar yearP = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(birthDate));
            SajuPillar monthP = SajuCalculator.calculateMonthPillar(birthDate, yearP.getStemIndex());
            SajuPillar dayP = SajuCalculator.calculateDayPillar(birthDate);
            SajuPillar hourP = (birthTime != null && !birthTime.isEmpty())
                ? SajuCalculator.calculateHourPillar(birthTime, dayP.getStemIndex()) : null;

            // 합충형해
            result.setInteractions(SajuCalculator.calculateInteractions(yearP, monthP, dayP, hourP));
            // 신살
            result.setSinsalList(SajuCalculator.calculateSinsal(dayStemIdx, dayP.getBranchIndex(), yearP, monthP, dayP, hourP));
            // 12운성
            result.setTwelveStages(SajuCalculator.calculateAllTwelveStages(dayStemIdx, yearP, monthP, dayP, hourP));
            // 격국
            result.setGyeokguk(SajuCalculator.calculateGyeokguk(dayStemIdx, monthP));

            // 해석 텍스트 추가
            result.setInteractionAnalysis(SajuInterpreter.interpretInteractions(result.getInteractions()));
            result.setGyeokgukAnalysis(SajuInterpreter.interpretGyeokguk(result.getGyeokguk()));
            result.setSinsalAnalysis(SajuInterpreter.interpretSinsal(result.getSinsalList()));

            // 대운 (성별 필요)
            if (gender != null && !gender.isBlank()) {
                boolean isMale = "M".equalsIgnoreCase(gender);
                result.setDaeunList(SajuCalculator.calculateDaeun(birthDate, yearP.getStemIndex(), monthP, isMale, dayStemIdx));
                result.setDaeunStartAge(result.getDaeunList().isEmpty() ? null : result.getDaeunList().get(0).getStartAge());
                // 대운 상세 해석
                if (result.getDaeunList() != null) {
                    result.setDaeunAnalysis(SajuInterpreter.interpretDaeun(result.getDaeunList()));
                }
            }

            // 월운 (12개월)
            result.setMonthlyFortunes(SajuCalculator.calculateMonthlyFortunes(dayStemIdx, today.getYear()));
        }

        // 기본 로직 해석 먼저 적용
        SajuInterpreter.interpret(result, today);

        // Claude API 사용 가능하면 AI 해석으로 보강
        if (claudeApiService.isAvailable()) {
            enhanceWithAI(result, birthDate, birthTime, today);
        }

        // 월운 AI 해석 보강
        if (claudeApiService.isAvailable() && result.getMonthlyFortunes() != null) {
            try {
                StringBuilder monthPrompt = new StringBuilder();
                monthPrompt.append("【사주 정보】\n");
                monthPrompt.append("일간: ").append(result.getDayMasterHanja()).append(" ").append(result.getDayMaster());
                monthPrompt.append(" (").append(result.getDayMasterElement()).append(")\n\n");
                monthPrompt.append("【올해 월운】\n");
                for (var mf : result.getMonthlyFortunes()) {
                    monthPrompt.append(mf.getMonth()).append("월: ").append(mf.getFullName());
                    monthPrompt.append(" / ").append(mf.getSipsung());
                    monthPrompt.append(" / ").append(mf.getTwelveStage());
                    monthPrompt.append(" [").append(mf.getRating()).append("]\n");
                }
                monthPrompt.append("\n각 월의 십성과 12운성을 기반으로 2-3문장의 구체적 월별 운세를 작성하세요.\n");
                monthPrompt.append("반드시 JSON 배열로만 응답: [{\"month\":1,\"summary\":\"1월 운세\"},{\"month\":2,\"summary\":\"2월 운세\"},...]\n");

                String aiMonthly = claudeApiService.generate(
                    FortunePromptBuilder.COMMON_TONE_RULES + "\n카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 사주 전문가야. 십성과 12운성의 조합으로 월별 운세를 해석해줘. 반드시 JSON 배열로만 응답해.",
                    monthPrompt.toString(), 1500);

                String json = ClaudeApiService.extractJson(aiMonthly);
                if (json == null && aiMonthly != null && aiMonthly.contains("[")) {
                    // Try extracting array directly
                    int arrStart = aiMonthly.indexOf("[");
                    int arrEnd = aiMonthly.lastIndexOf("]");
                    if (arrStart >= 0 && arrEnd > arrStart) {
                        json = aiMonthly.substring(arrStart, arrEnd + 1);
                    }
                }
                if (json != null) {
                    var monthNodes = objectMapper.readTree(json);
                    if (monthNodes.isArray()) {
                        for (var node : monthNodes) {
                            int month = node.path("month").asInt(0);
                            String summary = node.path("summary").asText("");
                            if (month >= 1 && month <= 12 && !summary.isBlank()) {
                                result.getMonthlyFortunes().get(month - 1).setSummary(summary);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("AI monthly fortune enhancement failed: {}", e.getMessage());
            }
        }

        // 메모리 캐시 저장
        cache.put(cacheKey, result);

        // DB 캐시 저장
        try {
            Map<String, Object> resultMap = objectMapper.convertValue(result, new TypeReference<Map<String, Object>>() {});
            saveToCache("saju", dbCacheKey, resultMap);
        } catch (Exception e) {
            log.warn("Failed to save saju result to DB cache: {}", e.getMessage());
        }

        return result;
    }

    /**
     * DB 캐시에서 사주 분석 결과 조회 (스트리밍 캐시 체크용)
     */
    public SajuResult getCachedResult(LocalDate birthDate, String birthTime, String gender) {
        String dbCacheKey = buildCacheKey("saju", birthDate.toString(), birthTime, gender);
        Map<String, Object> dbCached = getFromCache("saju", dbCacheKey);
        if (dbCached != null) {
            try {
                return objectMapper.convertValue(dbCached, SajuResult.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize cached saju result: {}", e.getMessage());
            }
        }
        return null;
    }

    /**
     * 기본 사주 계산 (AI 호출 없이 - 빠른 응답용)
     */
    public SajuResult buildBasicResult(LocalDate birthDate, String birthTime, String gender) {
        SajuResult result = SajuCalculator.calculate(birthDate, birthTime);
        int dayStemIdx = getDayMasterIndex(result.getDayMaster());
        if (dayStemIdx >= 0) {
            SajuPillar yearP = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(birthDate));
            SajuPillar monthP = SajuCalculator.calculateMonthPillar(birthDate, yearP.getStemIndex());
            SajuPillar dayP = SajuCalculator.calculateDayPillar(birthDate);
            SajuPillar hourP = (birthTime != null && !birthTime.isEmpty())
                ? SajuCalculator.calculateHourPillar(birthTime, dayP.getStemIndex()) : null;
            result.setInteractions(SajuCalculator.calculateInteractions(yearP, monthP, dayP, hourP));
            result.setSinsalList(SajuCalculator.calculateSinsal(dayStemIdx, dayP.getBranchIndex(), yearP, monthP, dayP, hourP));
            result.setTwelveStages(SajuCalculator.calculateAllTwelveStages(dayStemIdx, yearP, monthP, dayP, hourP));
            result.setGyeokguk(SajuCalculator.calculateGyeokguk(dayStemIdx, monthP));
            result.setInteractionAnalysis(SajuInterpreter.interpretInteractions(result.getInteractions()));
            result.setGyeokgukAnalysis(SajuInterpreter.interpretGyeokguk(result.getGyeokguk()));
            result.setSinsalAnalysis(SajuInterpreter.interpretSinsal(result.getSinsalList()));
        }
        SajuInterpreter.interpret(result, LocalDate.now());
        return result;
    }

    /**
     * 스트리밍 완료 후 AI 응답을 파싱하여 캐시 저장
     */
    @Transactional
    public void parseAndSaveStreamResult(LocalDate birthDate, String birthTime, String gender, SajuResult basicResult, String fullText) {
        try {
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) {
                log.error("Saju stream: JSON extraction failed from fullText length={}", fullText.length());
                return;
            }

            JsonNode node = objectMapper.readTree(json);

            // AI 결과를 basicResult에 병합
            if (node.has("personalityReading")) {
                basicResult.setPersonalityReading(node.get("personalityReading").asText());
            }
            java.util.List<java.util.Map<String, Object>> hourly = null;
            if (node.has("hourlyFortune") && node.get("hourlyFortune").isArray()) {
                try {
                    hourly = objectMapper.convertValue(node.get("hourlyFortune"),
                        new TypeReference<java.util.List<java.util.Map<String, Object>>>() {});
                } catch (Exception ignored) {}
            }
            SajuResult.CategoryFortune fortune = SajuResult.CategoryFortune.builder()
                .overall(node.has("overall") ? node.get("overall").asText() : "")
                .love(node.has("love") ? node.get("love").asText() : "")
                .money(node.has("money") ? node.get("money").asText() : "")
                .health(node.has("health") ? node.get("health").asText() : "")
                .work(node.has("work") ? node.get("work").asText() : "")
                .score(node.has("score") ? node.get("score").asInt() : 70)
                .luckyNumber(node.has("luckyNumber") ? node.get("luckyNumber").asInt() : 7)
                .luckyColor(node.has("luckyColor") ? node.get("luckyColor").asText() : "파랑")
                .hourlyFortune(hourly)
                .build();
            basicResult.setTodayFortune(fortune);

            // DB 캐시에 저장
            String dbCacheKey = buildCacheKey("saju", birthDate.toString(), birthTime, gender);
            Map<String, Object> resultMap = objectMapper.convertValue(basicResult, new TypeReference<Map<String, Object>>() {});
            saveToCache("saju", dbCacheKey, resultMap);
            log.info("Saju stream result cached: birthDate={}", birthDate);
        } catch (Exception e) {
            log.error("Failed to parse/save saju stream result: {}", e.getMessage(), e);
        }
    }

    /**
     * 사주 분석용 사주 요약 문자열 (외부에서 접근 가능)
     */
    public String getSajuSummary(SajuResult result, LocalDate birthDate, String birthTime, LocalDate today) {
        return buildSajuSummary(result, birthDate, birthTime, today);
    }

    // ===== 만세력 AI 해석 캐시 메서드 =====

    /**
     * 만세력 캐시 키 생성 (외부 접근 가능)
     */
    public String buildManseryeokCacheKey(String date, String birthDate) {
        return buildCacheKey("manseryeok", date, birthDate);
    }

    /**
     * 만세력 AI 해석 캐시 조회
     */
    public Map<String, Object> getManseryeokCache(String cacheKey) {
        return getFromCache("manseryeok", cacheKey);
    }

    /**
     * 만세력 AI 스트리밍 완료 후 결과 파싱 및 캐시 저장
     */
    @Transactional
    public void parseManseryeokStreamResult(String cacheKey, String fullText) {
        try {
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) {
                log.error("Manseryeok stream: JSON extraction failed from fullText length={}", fullText.length());
                return;
            }
            Map<String, Object> resultMap = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            saveToCache("manseryeok", cacheKey, resultMap);
            log.info("Manseryeok stream result cached: cacheKey={}", cacheKey);
        } catch (Exception e) {
            log.error("Failed to parse/save manseryeok stream result: {}", e.getMessage(), e);
        }
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
            // 이미 존재하면 저장하지 않음
            var existing = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, LocalDate.now());
            if (existing.isPresent()) return;
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(type).cacheKey(cacheKey).fortuneDate(LocalDate.now())
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) {
            log.debug("Cache save skipped (duplicate): {}", cacheKey);
        }
    }

    /**
     * Claude AI로 해석 보강
     */
    private void enhanceWithAI(SajuResult result, LocalDate birthDate, String birthTime, LocalDate today) {
        String sajuSummary = buildSajuSummary(result, birthDate, birthTime, today);

        // 1. AI 성격 분석
        try {
            String aiPersonality = claudeApiService.generatePersonalityReading(sajuSummary);
            if (aiPersonality != null && !aiPersonality.isBlank()) {
                result.setPersonalityReading(aiPersonality);
            }
        } catch (Exception e) {
            log.warn("AI personality reading failed, using template: {}", e.getMessage());
        }

        // 2. AI 년운
        try {
            String aiYearFortune = claudeApiService.generateYearFortune(sajuSummary, today.getYear());
            if (aiYearFortune != null && !aiYearFortune.isBlank()) {
                result.setYearFortune(aiYearFortune);
            }
        } catch (Exception e) {
            log.warn("AI year fortune failed, using template: {}", e.getMessage());
        }

        // 3. AI 오늘의 운세
        try {
            String aiFortuneJson = claudeApiService.generateSajuFortune(sajuSummary);
            if (aiFortuneJson != null && !aiFortuneJson.isBlank()) {
                SajuResult.CategoryFortune aiFortune = parseAiFortune(aiFortuneJson);
                if (aiFortune != null) {
                    result.setTodayFortune(aiFortune);
                }
            }
        } catch (Exception e) {
            log.warn("AI daily fortune failed, using template: {}", e.getMessage());
        }

        // 4. AI 오행 분석 강화
        try {
            String elementPrompt = buildElementAnalysisPrompt(result);
            if (elementPrompt != null) {
                String aiElement = claudeApiService.generate(
                    FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                    + "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 사주 전문가야. "
                    + "오행의 균형과 보충 방법을 쉽게 풀어서 설명해줘. "
                    + "JSON이 아닌 일반 텍스트로 응답해.",
                    elementPrompt, 800);
                if (aiElement != null && !aiElement.isBlank()) {
                    result.setElementAnalysis(aiElement);
                }
            }
        } catch (Exception e) {
            log.warn("AI element analysis failed, using template: {}", e.getMessage());
        }

        // 5. AI 신살 해석 강화
        try {
            if (result.getSinsalList() != null && !result.getSinsalList().isEmpty()) {
                String sinsalPrompt = buildSinsalPrompt(result);
                String aiSinsal = claudeApiService.generate(
                    FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                    + "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 사주 전문가야. "
                    + "신살의 의미와 일상생활에서의 구체적 영향을 친근하게 해석해줘. "
                    + "각 신살이 실생활에 미치는 영향과 주의사항을 쉬운 말로 설명해. "
                    + "JSON이 아닌 일반 텍스트로 응답해.",
                    sinsalPrompt, 800);
                if (aiSinsal != null && !aiSinsal.isBlank()) {
                    result.setSinsalAnalysis(aiSinsal);
                }
            }
        } catch (Exception e) {
            log.warn("AI sinsal analysis failed, using template: {}", e.getMessage());
        }

        // 6. AI 격국 해석 강화
        try {
            if (result.getGyeokguk() != null && !result.getGyeokguk().isBlank()) {
                String gyeokgukPrompt = buildGyeokgukPrompt(result);
                String aiGyeokguk = claudeApiService.generate(
                    FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                    + "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 사주 전문가야. "
                    + "격국의 의미를 친근하게 해석해주고, 격국과 오행의 조합에 따른 "
                    + "직업 추천, 결혼운, 재물운 성향을 쉬운 말로 분석해줘. "
                    + "JSON이 아닌 일반 텍스트로 응답해.",
                    gyeokgukPrompt, 800);
                if (aiGyeokguk != null && !aiGyeokguk.isBlank()) {
                    result.setGyeokgukAnalysis(aiGyeokguk);
                }
            }
        } catch (Exception e) {
            log.warn("AI gyeokguk analysis failed, using template: {}", e.getMessage());
        }

        // 7. AI 대운 분석 강화
        try {
            if (result.getDaeunList() != null && !result.getDaeunList().isEmpty()) {
                String daeunPrompt = buildDaeunPrompt(result);
                String aiDaeun = claudeApiService.generate(
                    FortunePromptBuilder.COMMON_TONE_RULES + "\n"
                    + "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 사주 전문가야. "
                    + "대운의 흐름을 친근하게 해석해주고, 현재 대운의 기회와 위기, "
                    + "구체적 행동 지침을 쉬운 말로 알려줘. "
                    + "JSON이 아닌 일반 텍스트로 응답해.",
                    daeunPrompt, 1200);
                if (aiDaeun != null && !aiDaeun.isBlank()) {
                    result.setDaeunAnalysis(aiDaeun);
                }
            }
        } catch (Exception e) {
            log.warn("AI daeun analysis failed, using template: {}", e.getMessage());
        }
    }

    /**
     * 오행 분석 AI 프롬프트 생성
     */
    private String buildElementAnalysisPrompt(SajuResult result) {
        if (result.getFiveElements() == null) return null;
        StringBuilder sb = new StringBuilder();
        sb.append("다음 사주의 오행 분석을 깊이 있게 해주세요.\n\n");
        sb.append("【일간】").append(result.getDayMasterHanja()).append(" ")
          .append(result.getDayMaster()).append(" (").append(result.getDayMasterElement()).append(")\n");
        sb.append("【오행 분포】");
        result.getFiveElements().forEach((k, v) -> sb.append(" ").append(k).append(":").append(v));
        sb.append("\n");
        sb.append("최강 오행: ").append(result.getStrongestElement())
          .append(", 최약 오행: ").append(result.getWeakestElement()).append("\n");
        sb.append("양:").append(result.getYangCount()).append(" 음:").append(result.getYinCount()).append("\n\n");

        sb.append("아래 내용을 반드시 포함하여 분석해주세요:\n");
        sb.append("1. 오행 전체 균형 진단 (어떤 오행이 과다하고 부족한지)\n");
        sb.append("2. 과다한 오행이 미치는 영향과 완화 방법\n");
        sb.append("3. 약한 오행 보충 방법을 구체적으로:\n");
        sb.append("   - 색상: 어떤 색의 옷이나 소품을 활용하면 좋은지\n");
        sb.append("   - 방위: 어느 방향이 길한지\n");
        sb.append("   - 음식: 어떤 음식이 도움되는지\n");
        sb.append("   - 활동: 어떤 취미나 운동이 좋은지\n");
        sb.append("4. 음양 균형 진단과 조언\n");
        sb.append("5. 오행 기반 건강 취약 부위 (목→간담, 화→심장, 토→비위, 금→폐, 수→신장)\n\n");
        sb.append("예시 형식: '수(水)가 부족하므로 검정색 계열 옷, 북쪽 방향, 해산물/검은콩 등이 도움됩니다'\n");
        return sb.toString();
    }

    /**
     * 신살 해석 AI 프롬프트 생성
     */
    private String buildSinsalPrompt(SajuResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("다음 사주의 신살(神殺)을 깊이 있게 해석해주세요.\n\n");
        sb.append("【일간】").append(result.getDayMasterHanja()).append(" ")
          .append(result.getDayMaster()).append(" (").append(result.getDayMasterElement()).append(")\n\n");
        sb.append("【신살 목록】\n");
        for (var sinsal : result.getSinsalList()) {
            sb.append("- ").append(sinsal.getName()).append(": ");
            if (sinsal.isPresent()) {
                sb.append("있음 (").append(sinsal.getFoundInPillar()).append(" ").append(sinsal.getBranchName()).append(")");
            } else {
                sb.append("없음");
            }
            sb.append("\n");
        }
        sb.append("\n아래 내용을 반드시 포함하여 분석해주세요:\n");
        sb.append("1. 보유한 신살 각각에 대해:\n");
        sb.append("   - 해당 신살의 본질적 의미\n");
        sb.append("   - 일상생활에서의 구체적 영향 (직장, 연애, 대인관계 등)\n");
        sb.append("   - 주의사항과 활용법\n");
        sb.append("   - 어느 주(柱)에 있는지에 따른 의미 차이\n");
        sb.append("2. 신살 조합의 종합적 해석\n");
        sb.append("3. 없는 신살 중 중요한 것이 있다면 그 부재의 의미\n");
        return sb.toString();
    }

    /**
     * 격국 해석 AI 프롬프트 생성
     */
    private String buildGyeokgukPrompt(SajuResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("다음 사주의 격국(格局)을 깊이 있게 해석해주세요.\n\n");
        sb.append("【일간】").append(result.getDayMasterHanja()).append(" ")
          .append(result.getDayMaster()).append(" (").append(result.getDayMasterElement()).append(")\n");
        sb.append("【격국】").append(result.getGyeokguk()).append("\n");
        sb.append("【오행 분포】");
        if (result.getFiveElements() != null) {
            result.getFiveElements().forEach((k, v) -> sb.append(" ").append(k).append(":").append(v));
        }
        sb.append("\n");
        if (result.getTwelveStages() != null) {
            sb.append("【12운성】");
            result.getTwelveStages().forEach((k, v) -> sb.append(" ").append(k).append(":").append(v));
            sb.append("\n");
        }
        sb.append("\n아래 내용을 반드시 포함하여 분석해주세요:\n");
        sb.append("1. 이 격국의 본질적 의미와 특성\n");
        sb.append("2. 격국 + 오행 조합에 따른 해석\n");
        sb.append("3. 직업 추천: 이 격국에 맞는 구체적 직업/분야 3-5개\n");
        sb.append("4. 결혼운: 배우자 성향, 결혼 시기 특성, 가정에서의 역할\n");
        sb.append("5. 재물운 성향: 돈을 버는 방식, 축재 능력, 투자 성향\n");
        sb.append("6. 이 격국의 강점을 극대화하는 삶의 전략\n");
        sb.append("7. 이 격국에서 주의해야 할 함정\n");
        return sb.toString();
    }

    /**
     * 대운 분석 AI 프롬프트 생성
     */
    private String buildDaeunPrompt(SajuResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("다음 사주의 대운(大運) 흐름을 깊이 있게 분석해주세요.\n\n");
        sb.append("【일간】").append(result.getDayMasterHanja()).append(" ")
          .append(result.getDayMaster()).append(" (").append(result.getDayMasterElement()).append(")\n");
        if (result.getGyeokguk() != null) {
            sb.append("【격국】").append(result.getGyeokguk()).append("\n");
        }
        sb.append("【오행 분포】");
        if (result.getFiveElements() != null) {
            result.getFiveElements().forEach((k, v) -> sb.append(" ").append(k).append(":").append(v));
        }
        sb.append("\n\n【대운 흐름】\n");
        for (var daeun : result.getDaeunList()) {
            sb.append(daeun.getStartAge()).append("~").append(daeun.getEndAge()).append("세: ");
            sb.append(daeun.getFullHanja()).append("(").append(daeun.getFullName()).append(") - ");
            sb.append(daeun.getSipsung()).append(" / ").append(daeun.getTwelveStage());
            if (daeun.isCurrent()) sb.append(" ★현재 대운");
            sb.append("\n");
        }
        sb.append("\n아래 내용을 반드시 포함하여 분석해주세요:\n");
        sb.append("1. 대운의 전체적 흐름 개요 (인생 곡선)\n");
        sb.append("2. 현재 대운(★표시) 상세 분석:\n");
        sb.append("   - 현재 대운의 핵심 의미\n");
        sb.append("   - 이 시기의 기회 요소\n");
        sb.append("   - 이 시기의 위기/주의 요소\n");
        sb.append("   - 구체적 행동 지침 (직업, 재물, 관계)\n");
        sb.append("3. 다음 대운으로의 전환:\n");
        sb.append("   - 다음 대운의 특성 미리보기\n");
        sb.append("   - 전환 시 주의사항 및 준비할 것\n");
        sb.append("4. 인생에서 가장 좋은 대운 시기와 이유\n");
        sb.append("5. 인생에서 가장 주의해야 할 대운 시기와 대처법\n");
        return sb.toString();
    }

    /**
     * 사주 요약 문자열 생성 (AI 프롬프트용)
     */
    private String buildSajuSummary(SajuResult result, LocalDate birthDate, String birthTime, LocalDate today) {
        StringBuilder sb = new StringBuilder();
        sb.append("【생년월일】").append(birthDate);
        if (birthTime != null && !birthTime.isEmpty()) {
            sb.append(" ").append(birthTime);
        }
        sb.append("\n");

        sb.append("【사주팔자】\n");
        sb.append("  년주: ").append(result.getYearPillar().getFullHanja())
          .append("(").append(result.getYearPillar().getFullName()).append(") - ")
          .append(result.getYearPillar().getStemElement()).append("/")
          .append(result.getYearPillar().getBranchElement()).append("\n");
        sb.append("  월주: ").append(result.getMonthPillar().getFullHanja())
          .append("(").append(result.getMonthPillar().getFullName()).append(") - ")
          .append(result.getMonthPillar().getStemElement()).append("/")
          .append(result.getMonthPillar().getBranchElement()).append("\n");
        sb.append("  일주: ").append(result.getDayPillar().getFullHanja())
          .append("(").append(result.getDayPillar().getFullName()).append(") - ")
          .append(result.getDayPillar().getStemElement()).append("/")
          .append(result.getDayPillar().getBranchElement()).append("\n");
        if (result.getHourPillar() != null) {
            sb.append("  시주: ").append(result.getHourPillar().getFullHanja())
              .append("(").append(result.getHourPillar().getFullName()).append(") - ")
              .append(result.getHourPillar().getStemElement()).append("/")
              .append(result.getHourPillar().getBranchElement()).append("\n");
        }

        sb.append("【일간(日干)】").append(result.getDayMasterHanja())
          .append(" ").append(result.getDayMaster())
          .append(" (").append(result.getDayMasterElement()).append(", ")
          .append(result.isDayMasterYang() ? "양" : "음").append(")\n");

        sb.append("【오행 분포】");
        if (result.getFiveElements() != null) {
            result.getFiveElements().forEach((k, v) -> sb.append(" ").append(k).append(":").append(v));
        }
        sb.append("\n");
        sb.append("  최강: ").append(result.getStrongestElement())
          .append(", 최약: ").append(result.getWeakestElement()).append("\n");
        sb.append("  양:").append(result.getYangCount())
          .append(" 음:").append(result.getYinCount()).append("\n");

        // 오늘 일진
        SajuPillar todayPillar = SajuCalculator.calculateDayPillar(today);
        sb.append("【오늘 일진】").append(today).append(" ")
          .append(todayPillar.getFullHanja()).append("(").append(todayPillar.getFullName()).append(") - ")
          .append(todayPillar.getStemElementName()).append("/").append(todayPillar.getBranchElementName()).append("\n");

        // 올해 간지
        int sajuYear = SajuCalculator.getSajuYear(today);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        sb.append("【올해 간지】").append(yearPillar.getFullHanja())
          .append("(").append(yearPillar.getFullName()).append(")\n");

        // 십성 관계
        int dayMasterIdx = getDayMasterIndex(result.getDayMaster());
        if (dayMasterIdx >= 0) {
            int todaySipsung = SajuCalculator.calculateSipsung(dayMasterIdx, todayPillar.getStemIndex());
            sb.append("【오늘 십성】").append(SajuConstants.SIPSUNG[todaySipsung]).append("\n");

            int yearSipsung = SajuCalculator.calculateSipsung(dayMasterIdx, yearPillar.getStemIndex());
            sb.append("【올해 십성】").append(SajuConstants.SIPSUNG[yearSipsung]).append("\n");
        }

        // 12운성
        if (result.getTwelveStages() != null && !result.getTwelveStages().isEmpty()) {
            sb.append("【12운성】");
            result.getTwelveStages().forEach((k, v) -> sb.append(" ").append(k).append(":").append(v));
            sb.append("\n");
        }

        // 격국
        if (result.getGyeokguk() != null) {
            sb.append("【격국】").append(result.getGyeokguk()).append("\n");
        }

        // 합충형해
        if (result.getInteractions() != null && !result.getInteractions().isEmpty()) {
            sb.append("【합충형해】\n");
            for (var interaction : result.getInteractions()) {
                sb.append("  ").append(interaction.getPillar1()).append("-").append(interaction.getPillar2());
                if (interaction.getPillar3() != null) sb.append("-").append(interaction.getPillar3());
                sb.append(": ").append(interaction.getDescription()).append("\n");
            }
        }

        // 신살
        if (result.getSinsalList() != null) {
            sb.append("【신살】\n");
            for (var sinsal : result.getSinsalList()) {
                sb.append("  ").append(sinsal.getName()).append(": ");
                if (sinsal.isPresent()) {
                    sb.append("있음 (").append(sinsal.getFoundInPillar()).append(" ").append(sinsal.getBranchName()).append(")");
                } else {
                    sb.append("없음");
                }
                sb.append("\n");
            }
        }

        // 대운
        if (result.getDaeunList() != null && !result.getDaeunList().isEmpty()) {
            sb.append("【대운 흐름】\n");
            for (var daeun : result.getDaeunList()) {
                sb.append("  ").append(daeun.getStartAge()).append("~").append(daeun.getEndAge()).append("세: ");
                sb.append(daeun.getFullHanja()).append("(").append(daeun.getFullName()).append(") - ");
                sb.append(daeun.getSipsung()).append(" / ").append(daeun.getTwelveStage());
                if (daeun.isCurrent()) sb.append(" ★현재");
                sb.append("\n");
            }
        }

        return sb.toString();
    }

    private int getDayMasterIndex(String dayMaster) {
        for (int i = 0; i < SajuConstants.CHEONGAN.length; i++) {
            if (SajuConstants.CHEONGAN[i].equals(dayMaster)) return i;
        }
        return -1;
    }

    /**
     * AI 응답 JSON을 CategoryFortune으로 파싱
     */
    private SajuResult.CategoryFortune parseAiFortune(String json) {
        try {
            String cleanJson = ClaudeApiService.extractJson(json);
            if (cleanJson == null) return null;

            JsonNode node = objectMapper.readTree(cleanJson);
            return SajuResult.CategoryFortune.builder()
                .overall(node.path("overall").asText(""))
                .love(node.path("love").asText(""))
                .money(node.path("money").asText(""))
                .health(node.path("health").asText(""))
                .work(node.path("work").asText(""))
                .score(node.path("score").asInt(70))
                .luckyNumber(node.path("luckyNumber").asInt(7))
                .luckyColor(node.path("luckyColor").asText("파랑"))
                .summary(node.path("summary").asText(""))
                .timeAdvice(node.path("timeAdvice").asText(""))
                .direction(node.path("direction").asText(""))
                .food(node.path("food").asText(""))
                .avoid(node.path("avoid").asText(""))
                .emotion(node.path("emotion").asText(""))
                .build();
        } catch (Exception e) {
            log.error("Failed to parse AI fortune JSON: {}", e.getMessage());
            return null;
        }
    }
}
