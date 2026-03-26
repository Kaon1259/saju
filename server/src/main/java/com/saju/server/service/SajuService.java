package com.saju.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.saju.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class SajuService {

    private final ClaudeApiService claudeApiService;
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

        // 날짜가 바뀌면 캐시 초기화
        if (!today.equals(cacheDate)) {
            cache.clear();
            cacheDate = today;
        }

        // 캐시 키 생성
        String genderKey = gender != null ? gender : "";
        String cacheKey = birthDate + "|" + (birthTime != null ? birthTime : "") + "|" + genderKey + "|" + today;
        SajuResult cached = cache.get(cacheKey);
        if (cached != null) {
            log.debug("Saju cache hit: {}", cacheKey);
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
                    "당신은 한국 전통 사주명리학 전문가입니다. 십성과 12운성의 조합으로 월별 운세를 해석합니다. 반드시 JSON 배열로만 응답하세요.",
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

        // 캐시 저장
        cache.put(cacheKey, result);
        return result;
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
                .build();
        } catch (Exception e) {
            log.error("Failed to parse AI fortune JSON: {}", e.getMessage());
            return null;
        }
    }
}
