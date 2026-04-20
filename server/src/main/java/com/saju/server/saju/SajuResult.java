package com.saju.server.saju;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SajuResult {
    // Four Pillars
    private PillarInfo yearPillar;
    private PillarInfo monthPillar;
    private PillarInfo dayPillar;
    private PillarInfo hourPillar; // nullable

    // Day Master (일간) info
    private String dayMaster;          // e.g. "갑"
    private String dayMasterHanja;     // e.g. "甲"
    private String dayMasterElement;   // e.g. "목"
    private boolean dayMasterYang;

    // Five Elements Distribution
    private Map<String, Integer> fiveElements; // {"목":2, "화":1, "토":3, "금":1, "수":1}
    private String strongestElement;
    private String weakestElement;

    // 음양 balance
    private int yangCount;
    private int yinCount;

    // Interpretation
    private String personalityReading;    // 일간 기반 성격
    private String elementAnalysis;       // 오행 분석
    private String yearFortune;           // 올해 운세
    private CategoryFortune todayFortune; // 오늘의 운세

    // Advanced analysis
    private java.util.List<SajuInteraction> interactions;  // 합충형해
    private java.util.List<SinsalInfo> sinsalList;         // 신살
    private java.util.Map<String, String> twelveStages;    // 12운성
    private String gyeokguk;                               // 격국
    private java.util.List<DaeunInfo> daeunList;           // 대운
    private Integer daeunStartAge;                         // 대운 시작 나이
    private List<MonthFortune> monthlyFortunes;            // 월운 (12개월)
    private String interactionAnalysis;                    // 합충형해 해석
    private String gyeokgukAnalysis;                       // 격국 해석
    private String sinsalAnalysis;                         // 신살 해석
    private String daeunAnalysis;                          // 대운 상세 해석

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PillarInfo {
        private String stem;        // "갑"
        private String branch;      // "자"
        private String stemHanja;   // "甲"
        private String branchHanja; // "子"
        private String fullName;    // "갑자"
        private String fullHanja;   // "甲子"
        private String stemElement; // "목"
        private String branchElement; // "수"
        private String animal;      // "쥐" (only meaningful for year/day)

        public static PillarInfo from(SajuPillar pillar) {
            if (pillar == null) return null;
            return PillarInfo.builder()
                    .stem(pillar.getStemName())
                    .branch(pillar.getBranchName())
                    .stemHanja(pillar.getStemHanja())
                    .branchHanja(pillar.getBranchHanja())
                    .fullName(pillar.getFullName())
                    .fullHanja(pillar.getFullHanja())
                    .stemElement(pillar.getStemElementName())
                    .branchElement(pillar.getBranchElementName())
                    .animal(pillar.getAnimal())
                    .build();
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryFortune {
        private String overall;
        private String love;
        private String money;
        private String health;
        private String work;
        private int score;
        private int luckyNumber;
        private String luckyColor;
        // 신규 필드
        private String summary;      // 한 줄 핵심 메시지 (운세 슬로건)
        private String timeAdvice;   // 시간대별 조언
        private String direction;    // 오늘 길한 방위
        private String food;         // 오행 기반 추천 음식/차
        private String avoid;        // 오늘 피해야 할 것
        private String emotion;      // 감정/심리 상태 진단과 조언
        private java.util.List<java.util.Map<String, Object>> hourlyFortune; // 시간대별 운세 (5구간)
        private String luckyDirection; // 오늘 길한 방위
        private String luckyFood;      // 오늘 추천 음식/차
        private String luckyFashion;   // 오늘 추천 옷차림
        private String luckyItem;      // 오늘 추천 소품/아이템
        private String academic;       // 학업운/자기계발운
        private String luckyPerson;    // 오늘 만나면 좋은 사람
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthFortune {
        private int month;          // 1~12
        private String stemName;    // 월간
        private String branchName;  // 월지
        private String fullName;    // 예: "경인"
        private String sipsung;     // 십성
        private String twelveStage; // 12운성
        private String rating;      // 대길/길/보통/흉/대흉
        private String summary;     // 간단 해석
    }
}
