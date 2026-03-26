package com.saju.server.service;

import com.saju.server.saju.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompatibilityService {

    private final ClaudeApiService claudeApiService;

    public Map<String, Object> analyzeSaju(LocalDate bd1, String bt1, LocalDate bd2, String bt2) {
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
                String prompt = buildCompatPrompt(r1, r2, score, relationship, branchRelation);
                String aiResult = claudeApiService.generate(
                    "당신은 40년 경력의 한국 사주 궁합 전문가입니다. 두 사람의 사주를 비교하여 궁합을 분석합니다. 3-4문장으로 핵심만 간결하게 한국어로 답변하세요.",
                    prompt, 400);
                if (aiResult != null && !aiResult.isBlank()) result.put("aiAnalysis", aiResult);
            } catch (Exception e) { log.warn("AI compat failed: {}", e.getMessage()); }
        }

        return result;
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
        return "【사람1】일간: " + r1.getDayMasterHanja() + r1.getDayMaster() + "(" + r1.getDayMasterElement() + ")\n" +
               "  사주: " + r1.getYearPillar().getFullHanja() + " " + r1.getMonthPillar().getFullHanja() + " " + r1.getDayPillar().getFullHanja() + (r1.getHourPillar() != null ? " " + r1.getHourPillar().getFullHanja() : "") + "\n" +
               "【사람2】일간: " + r2.getDayMasterHanja() + r2.getDayMaster() + "(" + r2.getDayMasterElement() + ")\n" +
               "  사주: " + r2.getYearPillar().getFullHanja() + " " + r2.getMonthPillar().getFullHanja() + " " + r2.getDayPillar().getFullHanja() + (r2.getHourPillar() != null ? " " + r2.getHourPillar().getFullHanja() : "") + "\n" +
               "【오행 관계】" + elRel + "\n" +
               "【일지 관계】" + brRel + "\n" +
               "【점수】" + score + "점\n" +
               "위 정보를 바탕으로 두 사람의 사주 궁합을 종합 분석해주세요.";
    }

    private int getDayMasterIndex(String dayMaster) {
        for (int i = 0; i < SajuConstants.CHEONGAN.length; i++) {
            if (SajuConstants.CHEONGAN[i].equals(dayMaster)) return i;
        }
        return 0;
    }
}
