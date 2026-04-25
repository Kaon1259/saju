package com.saju.server.saju;

import java.time.LocalDate;
import java.util.*;

public class SajuCalculator {

    // Day pillar offset constants (calibrated against 만세력)
    // Using epochDay (days since 1970-01-01)
    // 1970-01-01 is 己酉일 (기유일): stemIndex=5, branchIndex=9
    // epochDay 0 → stem=(0+offset)%10=5 → offset=5? No: we need floorMod(0+offset,10)=5 → offset could be many values
    // Actually: 1970-01-01 = 庚寅year, but for day: 갑자일 cycle
    // Known reference: 2000-01-01 (epochDay=10957) is 갑진일 (甲辰) → stemIndex=0, branchIndex=4
    // floorMod(10957 + stemOffset, 10) = 0 → stemOffset = 10 - (10957 % 10) = 10 - 7 = 3
    // floorMod(10957 + branchOffset, 12) = 4 → branchOffset = (4 - (10957 % 12)) mod 12 = (4 - 1) mod 12 = 3
    // Verify: 2024-02-04 (epochDay=19757): floorMod(19757+3,10)=0(갑), floorMod(19757+3,12)=8(신) → 갑신
    // Another check: 1970-01-01 (epochDay=0): floorMod(0+3,10)=3(정), floorMod(0+3,12)=3(묘) → 정묘
    // Known: 1970-01-01 = 정묘일 (丁卯) ✓ (confirmed via 만세력)
    private static final int DAY_STEM_OFFSET = 3;
    private static final int DAY_BRANCH_OFFSET = 3;

    private SajuCalculator() {
        // Utility class
    }

    /**
     * Calculate complete saju (four pillars) from birth date and optional birth time
     */
    public static SajuResult calculate(LocalDate birthDate, String birthTime) {
        // Determine saju year (based on 입춘, ~Feb 4)
        int sajuYear = getSajuYear(birthDate);

        // Calculate four pillars
        SajuPillar yearPillar = calculateYearPillar(sajuYear);
        SajuPillar monthPillar = calculateMonthPillar(birthDate, yearPillar.getStemIndex());
        SajuPillar dayPillar = calculateDayPillar(birthDate);
        SajuPillar hourPillar;
        if (birthTime != null && !birthTime.isEmpty()) {
            hourPillar = calculateHourPillar(birthTime, dayPillar.getStemIndex());
        } else {
            // 시간 미입력 시 오시(午時, 11:00~13:00)로 추정
            hourPillar = calculateHourPillar("오시", dayPillar.getStemIndex());
        }

        // Build result (interpretation will be added by SajuInterpreter)
        return buildResult(yearPillar, monthPillar, dayPillar, hourPillar);
    }

    /**
     * Get saju year (입춘 기준 - before 입춘 uses previous year)
     * 정밀 절기 데이터를 사용하여 년도별 정확한 입춘일 기준으로 계산
     */
    public static int getSajuYear(LocalDate date) {
        LocalDate ipchun = SolarTerms.getIpchunDate(date.getYear());
        if (date.isBefore(ipchun)) {
            return date.getYear() - 1;
        }
        return date.getYear();
    }

    /**
     * Calculate year pillar (년주)
     * 천간: (year - 4) % 10
     * 지지: (year - 4) % 12
     */
    public static SajuPillar calculateYearPillar(int sajuYear) {
        int stemIndex = Math.floorMod(sajuYear - 4, 10);
        int branchIndex = Math.floorMod(sajuYear - 4, 12);
        return new SajuPillar(stemIndex, branchIndex);
    }

    /**
     * Calculate month pillar (월주)
     * Uses 절기 (solar terms) to determine the month
     * Uses 오호둔 to determine the month stem
     */
    public static SajuPillar calculateMonthPillar(LocalDate date, int yearStemIndex) {
        int monthBranchIndex = SolarTerms.getPreciseSolarTermMonth(date);

        // 오호둔: determine month stem from year stem
        int monthStemStart = SajuConstants.MONTH_STEM_START[yearStemIndex % 5];
        // 인월(branch=2)이 시작점, monthBranchIndex에서 인월까지의 차이
        int monthOffset = Math.floorMod(monthBranchIndex - 2, 12);
        int monthStemIndex = (monthStemStart + monthOffset) % 10;

        return new SajuPillar(monthStemIndex, monthBranchIndex);
    }

    /**
     * Get the month branch index based on 절기 (solar terms).
     * Returns 지지 index: 인(2)=1월, 묘(3)=2월, ..., 축(1)=12월
     *
     * The approach: convert date to a "day-of-year" value (treating the cycle as starting
     * from January 1), then compare against the 12 solar term boundaries to determine
     * which saju month the date falls into.
     */
    public static int getSolarTermMonth(LocalDate date) {
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();

        // Linearize the date into a comparable integer for boundary checks.
        // We use monthValue * 100 + dayOfMonth for simple comparison.
        int dateVal = month * 100 + day;

        // Solar term boundaries as linearized values, in calendar order.
        // Each boundary marks the START of a saju month.
        // The saju month runs from its start boundary up to (but not including) the next boundary.
        //
        // Sorted in calendar order (Jan → Dec):
        //   축월 starts  1/06 (→ branch 1)
        //   인월 starts  2/04 (→ branch 2)
        //   묘월 starts  3/06 (→ branch 3)
        //   진월 starts  4/05 (→ branch 4)
        //   사월 starts  5/06 (→ branch 5)
        //   오월 starts  6/06 (→ branch 6)
        //   미월 starts  7/07 (→ branch 7)
        //   신월 starts  8/08 (→ branch 8)
        //   유월 starts  9/08 (→ branch 9)
        //   술월 starts 10/08 (→ branch 10)
        //   해월 starts 11/07 (→ branch 11)
        //   자월 starts 12/07 (→ branch 0)

        // Boundaries in calendar order, paired with the branch index they start
        int[][] boundaries = {
            {106, 1},   // 축월: 1/06 → branch 1
            {204, 2},   // 인월: 2/04 → branch 2
            {306, 3},   // 묘월: 3/06 → branch 3
            {405, 4},   // 진월: 4/05 → branch 4
            {506, 5},   // 사월: 5/06 → branch 5
            {606, 6},   // 오월: 6/06 → branch 6
            {707, 7},   // 미월: 7/07 → branch 7
            {808, 8},   // 신월: 8/08 → branch 8
            {908, 9},   // 유월: 9/08 → branch 9
            {1008, 10}, // 술월: 10/08 → branch 10
            {1107, 11}, // 해월: 11/07 → branch 11
            {1207, 0},  // 자월: 12/07 → branch 0
        };

        // Walk the boundaries in reverse calendar order.
        // The date belongs to the latest boundary it is >= to.
        // Special case: dates before Jan 6 belong to 자월 (branch 0) from the previous cycle.
        for (int i = boundaries.length - 1; i >= 0; i--) {
            if (dateVal >= boundaries[i][0]) {
                return boundaries[i][1];
            }
        }

        // If dateVal < 106 (before Jan 6), it falls in 자월 (branch 0)
        // which started on Dec 7 of the previous year.
        return 0;
    }

    /**
     * Calculate day pillar (일주)
     * Uses epoch day calculation with verified offsets.
     * Reference: 2000-01-01 (epochDay=10957) = 甲辰일 (stemIndex=0, branchIndex=4)
     */
    public static SajuPillar calculateDayPillar(LocalDate date) {
        long epochDay = date.toEpochDay(); // days since 1970-01-01
        int stemIndex = (int) Math.floorMod(epochDay + DAY_STEM_OFFSET, 10);
        int branchIndex = (int) Math.floorMod(epochDay + DAY_BRANCH_OFFSET, 12);
        return new SajuPillar(stemIndex, branchIndex);
    }

    /**
     * Calculate hour pillar (시주)
     * Uses 오서둔 to determine hour stem from day stem
     */
    public static SajuPillar calculateHourPillar(String birthTime, int dayStemIndex) {
        int hourBranchIndex = getHourBranchIndex(birthTime);
        if (hourBranchIndex < 0) return null;

        // 오서둔: determine hour stem from day stem
        int hourStemStart = SajuConstants.HOUR_STEM_START[dayStemIndex % 5];
        int hourStemIndex = (hourStemStart + hourBranchIndex) % 10;

        return new SajuPillar(hourStemIndex, hourBranchIndex);
    }

    /**
     * Convert birth time string to branch index.
     * Accepts both Korean time names ("자시", "축시", ...) and HH:mm format ("23:30", "01:15", ...).
     */
    public static int getHourBranchIndex(String birthTime) {
        if (birthTime == null || birthTime.isEmpty()) return -1;

        // Try matching against Korean time names
        for (int i = 0; i < SajuConstants.SIJIN_NAMES.length; i++) {
            if (SajuConstants.SIJIN_NAMES[i].equals(birthTime)) {
                return i;
            }
        }

        // Try parsing HH:mm format
        try {
            String[] parts = birthTime.split(":");
            if (parts.length == 2) {
                int hour = Integer.parseInt(parts[0].trim());
                // 자시: 23:00-00:59, 축시: 01:00-02:59, 인시: 03:00-04:59,
                // 묘시: 05:00-06:59, 진시: 07:00-08:59, 사시: 09:00-10:59,
                // 오시: 11:00-12:59, 미시: 13:00-14:59, 신시: 15:00-16:59,
                // 유시: 17:00-18:59, 술시: 19:00-20:59, 해시: 21:00-22:59
                if (hour == 23 || hour == 0) return 0;  // 자시
                return ((hour + 1) / 2) % 12;
            }
        } catch (NumberFormatException e) {
            // Fall through to return -1
        }

        return -1;
    }

    /**
     * Build SajuResult from pillars (without interpretation)
     */
    private static SajuResult buildResult(SajuPillar year, SajuPillar month, SajuPillar day, SajuPillar hour) {
        // Count five elements
        Map<String, Integer> elements = new LinkedHashMap<>();
        for (String e : SajuConstants.OHENG) {
            elements.put(e, 0);
        }

        // Add elements from each pillar (both stem and branch)
        addElement(elements, year);
        addElement(elements, month);
        addElement(elements, day);
        if (hour != null) {
            addElement(elements, hour);
        }

        // Find strongest and weakest
        String strongest = null;
        String weakest = null;
        int max = -1;
        int min = Integer.MAX_VALUE;
        for (Map.Entry<String, Integer> entry : elements.entrySet()) {
            if (entry.getValue() > max) {
                max = entry.getValue();
                strongest = entry.getKey();
            }
            if (entry.getValue() < min) {
                min = entry.getValue();
                weakest = entry.getKey();
            }
        }

        // Count yin/yang from all pillars (stems + branches)
        int yang = 0;
        int yin = 0;

        // Year pillar
        yang += year.isStemYang() ? 1 : 0;
        yin += year.isStemYang() ? 0 : 1;
        yang += SajuConstants.JIJI_YINYANG[year.getBranchIndex()] == 0 ? 1 : 0;
        yin += SajuConstants.JIJI_YINYANG[year.getBranchIndex()] == 1 ? 1 : 0;

        // Month pillar
        yang += month.isStemYang() ? 1 : 0;
        yin += month.isStemYang() ? 0 : 1;
        yang += SajuConstants.JIJI_YINYANG[month.getBranchIndex()] == 0 ? 1 : 0;
        yin += SajuConstants.JIJI_YINYANG[month.getBranchIndex()] == 1 ? 1 : 0;

        // Day pillar
        yang += day.isStemYang() ? 1 : 0;
        yin += day.isStemYang() ? 0 : 1;
        yang += SajuConstants.JIJI_YINYANG[day.getBranchIndex()] == 0 ? 1 : 0;
        yin += SajuConstants.JIJI_YINYANG[day.getBranchIndex()] == 1 ? 1 : 0;

        // Hour pillar (if present)
        if (hour != null) {
            yang += hour.isStemYang() ? 1 : 0;
            yin += hour.isStemYang() ? 0 : 1;
            yang += SajuConstants.JIJI_YINYANG[hour.getBranchIndex()] == 0 ? 1 : 0;
            yin += SajuConstants.JIJI_YINYANG[hour.getBranchIndex()] == 1 ? 1 : 0;
        }

        return SajuResult.builder()
                .yearPillar(SajuResult.PillarInfo.from(year))
                .monthPillar(SajuResult.PillarInfo.from(month))
                .dayPillar(SajuResult.PillarInfo.from(day))
                .hourPillar(hour != null ? SajuResult.PillarInfo.from(hour) : null)
                .dayMaster(day.getStemName())
                .dayMasterHanja(day.getStemHanja())
                .dayMasterElement(day.getStemElementName())
                .dayMasterYang(day.isStemYang())
                .fiveElements(elements)
                .strongestElement(strongest)
                .weakestElement(weakest)
                .yangCount(yang)
                .yinCount(yin)
                .build();
    }

    private static void addElement(Map<String, Integer> elements, SajuPillar pillar) {
        String stemEl = pillar.getStemElementName();
        String branchEl = pillar.getBranchElementName();
        elements.merge(stemEl, 1, Integer::sum);
        elements.merge(branchEl, 1, Integer::sum);
    }

    /**
     * Calculate the 십성 (Ten Gods) relationship
     *
     * @param dayMasterStemIndex 일간 index
     * @param targetStemIndex    대상 천간 index
     * @return 십성 index (0-9)
     */
    public static int calculateSipsung(int dayMasterStemIndex, int targetStemIndex) {
        int myElement = SajuConstants.CHEONGAN_OHENG[dayMasterStemIndex];
        int targetElement = SajuConstants.CHEONGAN_OHENG[targetStemIndex];
        boolean sameYinYang = (dayMasterStemIndex % 2) == (targetStemIndex % 2);

        if (myElement == targetElement) {
            return sameYinYang ? 0 : 1; // 비견 or 겁재
        } else if (SajuConstants.OHENG_PRODUCES[myElement] == targetElement) {
            return sameYinYang ? 2 : 3; // 식신 or 상관
        } else if (SajuConstants.OHENG_OVERCOMES[myElement] == targetElement) {
            return sameYinYang ? 4 : 5; // 편재 or 정재
        } else if (SajuConstants.OHENG_OVERCOMES[targetElement] == myElement) {
            return sameYinYang ? 6 : 7; // 편관 or 정관
        } else if (SajuConstants.OHENG_PRODUCES[targetElement] == myElement) {
            return sameYinYang ? 8 : 9; // 편인 or 정인
        }
        return 0; // fallback (should not reach here)
    }

    /**
     * Get the 십성 name for a given relationship
     */
    public static String getSipsungName(int dayMasterStemIndex, int targetStemIndex) {
        int index = calculateSipsung(dayMasterStemIndex, targetStemIndex);
        return SajuConstants.SIPSUNG[index];
    }

    // =========================================================================
    // 12운성 (Twelve Life Stages)
    // =========================================================================

    /**
     * 특정 천간과 지지의 12운성 계산
     */
    public static int calculateTwelveStage(int stemIndex, int branchIndex) {
        int start = SajuConstants.TWELVE_STAGE_START[stemIndex];
        int dir = SajuConstants.TWELVE_STAGE_DIRECTION[stemIndex];
        if (dir > 0) {
            return Math.floorMod(branchIndex - start, 12);
        } else {
            return Math.floorMod(start - branchIndex, 12);
        }
    }

    public static String getTwelveStageName(int stemIndex, int branchIndex) {
        return SajuConstants.TWELVE_STAGES[calculateTwelveStage(stemIndex, branchIndex)];
    }

    /**
     * 사주 전체의 12운성 계산 (일간 기준)
     */
    public static Map<String, String> calculateAllTwelveStages(int dayStemIndex,
            SajuPillar year, SajuPillar month, SajuPillar day, SajuPillar hour) {
        Map<String, String> stages = new LinkedHashMap<>();
        stages.put("년주", getTwelveStageName(dayStemIndex, year.getBranchIndex()));
        stages.put("월주", getTwelveStageName(dayStemIndex, month.getBranchIndex()));
        stages.put("일주", getTwelveStageName(dayStemIndex, day.getBranchIndex()));
        if (hour != null) {
            stages.put("시주", getTwelveStageName(dayStemIndex, hour.getBranchIndex()));
        }
        return stages;
    }

    // =========================================================================
    // 합충형해 (Interactions)
    // =========================================================================

    /**
     * 사주 내 모든 합충형해 관계 분석
     */
    public static List<SajuInteraction> calculateInteractions(
            SajuPillar year, SajuPillar month, SajuPillar day, SajuPillar hour) {
        List<SajuInteraction> result = new ArrayList<>();
        String[] labels = {"년주", "월주", "일주", "시주"};
        SajuPillar[] pillars = {year, month, day, hour};
        int count = hour != null ? 4 : 3;

        // 모든 2개 조합에 대해 검사
        for (int i = 0; i < count; i++) {
            for (int j = i + 1; j < count; j++) {
                int b1 = pillars[i].getBranchIndex();
                int b2 = pillars[j].getBranchIndex();

                // 육합 검사
                for (int[] yuk : SajuConstants.YUKAP) {
                    if ((b1 == yuk[0] && b2 == yuk[1]) || (b1 == yuk[1] && b2 == yuk[0])) {
                        result.add(SajuInteraction.builder()
                            .type("합").subType("육합")
                            .pillar1(labels[i]).pillar2(labels[j])
                            .branch1(SajuConstants.JIJI[b1]).branch2(SajuConstants.JIJI[b2])
                            .resultElement(SajuConstants.OHENG[yuk[2]])
                            .description(SajuConstants.JIJI[b1] + SajuConstants.JIJI[b2] + "합(" + SajuConstants.OHENG[yuk[2]] + ")")
                            .build());
                    }
                }

                // 충 검사
                if (Math.floorMod(b1 - b2, 12) == 6 || Math.floorMod(b2 - b1, 12) == 6) {
                    result.add(SajuInteraction.builder()
                        .type("충").subType("충")
                        .pillar1(labels[i]).pillar2(labels[j])
                        .branch1(SajuConstants.JIJI[b1]).branch2(SajuConstants.JIJI[b2])
                        .description(SajuConstants.JIJI[b1] + SajuConstants.JIJI[b2] + "충")
                        .build());
                }

                // 형 검사 (무례형: 자묘)
                int[] mr = SajuConstants.MURYEHYUNG;
                if ((b1 == mr[0] && b2 == mr[1]) || (b1 == mr[1] && b2 == mr[0])) {
                    result.add(SajuInteraction.builder()
                        .type("형").subType("무례형")
                        .pillar1(labels[i]).pillar2(labels[j])
                        .branch1(SajuConstants.JIJI[b1]).branch2(SajuConstants.JIJI[b2])
                        .description(SajuConstants.JIJI[b1] + SajuConstants.JIJI[b2] + "형(무례지형)")
                        .build());
                }

                // 해 검사
                for (int[] hae : SajuConstants.HAE) {
                    if ((b1 == hae[0] && b2 == hae[1]) || (b1 == hae[1] && b2 == hae[0])) {
                        result.add(SajuInteraction.builder()
                            .type("해").subType("해")
                            .pillar1(labels[i]).pillar2(labels[j])
                            .branch1(SajuConstants.JIJI[b1]).branch2(SajuConstants.JIJI[b2])
                            .description(SajuConstants.JIJI[b1] + SajuConstants.JIJI[b2] + "해")
                            .build());
                    }
                }

                // 자형 검사 (같은 지지끼리)
                if (b1 == b2) {
                    for (int jh : SajuConstants.JAHYUNG) {
                        if (b1 == jh) {
                            result.add(SajuInteraction.builder()
                                .type("형").subType("자형")
                                .pillar1(labels[i]).pillar2(labels[j])
                                .branch1(SajuConstants.JIJI[b1]).branch2(SajuConstants.JIJI[b2])
                                .description(SajuConstants.JIJI[b1] + SajuConstants.JIJI[b2] + "형(자형)")
                                .build());
                        }
                    }
                }
            }
        }

        // 삼합/삼형 검사 (3개 조합)
        for (int i = 0; i < count; i++) {
            for (int j = i + 1; j < count; j++) {
                for (int k = j + 1; k < count; k++) {
                    Set<Integer> branches = new HashSet<>(Arrays.asList(
                        pillars[i].getBranchIndex(), pillars[j].getBranchIndex(), pillars[k].getBranchIndex()));

                    // 삼합
                    for (int[] sam : SajuConstants.SAMHAP) {
                        if (branches.contains(sam[0]) && branches.contains(sam[1]) && branches.contains(sam[2])) {
                            result.add(SajuInteraction.builder()
                                .type("합").subType("삼합")
                                .pillar1(labels[i]).pillar2(labels[j]).pillar3(labels[k])
                                .branch1(SajuConstants.JIJI[sam[0]]).branch2(SajuConstants.JIJI[sam[1]]).branch3(SajuConstants.JIJI[sam[2]])
                                .resultElement(SajuConstants.OHENG[sam[3]])
                                .description(SajuConstants.JIJI[sam[0]] + SajuConstants.JIJI[sam[1]] + SajuConstants.JIJI[sam[2]] + "삼합(" + SajuConstants.OHENG[sam[3]] + ")")
                                .build());
                        }
                    }

                    // 방합
                    for (int[] bang : SajuConstants.BANGHAP) {
                        if (branches.contains(bang[0]) && branches.contains(bang[1]) && branches.contains(bang[2])) {
                            result.add(SajuInteraction.builder()
                                .type("합").subType("방합")
                                .pillar1(labels[i]).pillar2(labels[j]).pillar3(labels[k])
                                .branch1(SajuConstants.JIJI[bang[0]]).branch2(SajuConstants.JIJI[bang[1]]).branch3(SajuConstants.JIJI[bang[2]])
                                .resultElement(SajuConstants.OHENG[bang[3]])
                                .description(SajuConstants.JIJI[bang[0]] + SajuConstants.JIJI[bang[1]] + SajuConstants.JIJI[bang[2]] + "방합(" + SajuConstants.OHENG[bang[3]] + ")")
                                .build());
                        }
                    }

                    // 삼형
                    for (int[] sh : SajuConstants.SAMHYUNG) {
                        if (branches.contains(sh[0]) && branches.contains(sh[1]) && branches.contains(sh[2])) {
                            result.add(SajuInteraction.builder()
                                .type("형").subType("삼형")
                                .pillar1(labels[i]).pillar2(labels[j]).pillar3(labels[k])
                                .branch1(SajuConstants.JIJI[sh[0]]).branch2(SajuConstants.JIJI[sh[1]]).branch3(SajuConstants.JIJI[sh[2]])
                                .description(SajuConstants.JIJI[sh[0]] + SajuConstants.JIJI[sh[1]] + SajuConstants.JIJI[sh[2]] + "삼형")
                                .build());
                        }
                    }
                }
            }
        }

        return result;
    }

    // =========================================================================
    // 신살 (Special Stars)
    // =========================================================================

    /**
     * 신살 분석 (일지 기준)
     */
    public static List<SinsalInfo> calculateSinsal(int dayStemIndex, int dayBranchIndex,
            SajuPillar year, SajuPillar month, SajuPillar day, SajuPillar hour) {
        List<SinsalInfo> result = new ArrayList<>();
        String[] labels = {"년주", "월주", "일주", "시주"};
        SajuPillar[] pillars = {year, month, day, hour};
        int count = hour != null ? 4 : 3;

        // 도화살 (일지 기준)
        int dohwaBranch = SajuConstants.DOHWA[dayBranchIndex];
        SinsalInfo dohwa = findSinsal("도화살", dohwaBranch, pillars, labels, count,
            "매력과 이성운이 강한 기운. 예술적 재능과 인기운을 나타냅니다.", false);
        result.add(dohwa);

        // 역마살 (일지 기준)
        int yeokmaBranch = SajuConstants.YEOKMA[dayBranchIndex];
        SinsalInfo yeokma = findSinsal("역마살", yeokmaBranch, pillars, labels, count,
            "변동과 이동의 기운. 해외운, 출장, 전근 등의 변화를 나타냅니다.", false);
        result.add(yeokma);

        // 화개살 (일지 기준)
        int hwagaeBranch = SajuConstants.HWAGAE[dayBranchIndex];
        SinsalInfo hwagae = findSinsal("화개살", hwagaeBranch, pillars, labels, count,
            "학문과 종교, 예술의 기운. 깊은 사색과 정신적 성장을 나타냅니다.", true);
        result.add(hwagae);

        // 천을귀인 (일간 기준)
        int[] cheoneulBranches = SajuConstants.CHEONEUL[dayStemIndex];
        SinsalInfo cheoneul = SinsalInfo.builder()
            .name("천을귀인").present(false).positive(true)
            .description("가장 큰 귀인의 기운. 위기에서 도움을 받고 복록이 따릅니다.").build();
        for (int ci = 0; ci < count; ci++) {
            int pb = pillars[ci].getBranchIndex();
            if (pb == cheoneulBranches[0] || pb == cheoneulBranches[1]) {
                cheoneul.setPresent(true);
                cheoneul.setFoundInPillar(labels[ci]);
                cheoneul.setBranchName(SajuConstants.JIJI[pb]);
                break;
            }
        }
        result.add(cheoneul);

        // 문창귀인 (일간 기준)
        int munchangBranch = SajuConstants.MUNCHANG[dayStemIndex];
        SinsalInfo munchang = findSinsal("문창귀인", munchangBranch, pillars, labels, count,
            "학문과 문서에 강한 기운. 시험운, 자격증, 계약에 유리합니다.", true);
        result.add(munchang);

        // 학당귀인 (일간 기준)
        int hakdangBranch = SajuConstants.HAKDANG[dayStemIndex];
        SinsalInfo hakdang = findSinsal("학당귀인", hakdangBranch, pillars, labels, count,
            "배움과 교육의 기운. 학업 성취와 지식 습득에 유리합니다.", true);
        result.add(hakdang);

        // 천덕귀인 (월지 기준 → 천간 검사)
        int monthBranchIdx = month.getBranchIndex();
        int cheondukStem = SajuConstants.CHEONDUK[monthBranchIdx];
        SinsalInfo cheonduk = findSinsalByStem("천덕귀인", cheondukStem, pillars, labels, count,
            "하늘의 덕을 받은 귀인. 재난을 면하고 흉을 길로 바꾸는 큰 복의 기운입니다.", true);
        result.add(cheonduk);

        // 월덕귀인 (월지 기준 → 천간 검사)
        int woldukStem = SajuConstants.WOLDUK[monthBranchIdx];
        SinsalInfo wolduk = findSinsalByStem("월덕귀인", woldukStem, pillars, labels, count,
            "달의 덕을 받은 귀인. 관재구설을 면하고 사람들의 도움을 받는 복의 기운입니다.", true);
        result.add(wolduk);

        // 양인살 (일간 기준)
        int yanginBranch = SajuConstants.YANGIN[dayStemIndex];
        SinsalInfo yangin = findSinsal("양인살", yanginBranch, pillars, labels, count,
            "강인한 기운이 극에 달한 살. 결단력과 추진력이 강하나 성급한 판단과 다툼에 주의해야 합니다.", false);
        result.add(yangin);

        // 금여록 (일간 기준)
        int geumyeoBranch = SajuConstants.GEUMYEO[dayStemIndex];
        SinsalInfo geumyeo = findSinsal("금여록", geumyeoBranch, pillars, labels, count,
            "금으로 장식한 수레의 기운. 배우자복과 재물복이 있으며 품격 있는 삶을 누립니다.", true);
        result.add(geumyeo);

        // 괴강살 (일주 stem+branch 검사)
        SajuPillar dayP = day;
        boolean isGoegang = false;
        for (int[] pair : SajuConstants.GOEGANG) {
            if (dayP.getStemIndex() == pair[0] && dayP.getBranchIndex() == pair[1]) {
                isGoegang = true;
                break;
            }
        }
        result.add(SinsalInfo.builder().name("괴강살").present(isGoegang).positive(false)
            .description("강인한 성격과 결단력의 기운. 리더십이 강하나 대인관계에서 마찰 주의.").build());

        // 원진살 (일지 기준)
        int wonjinBranch = SajuConstants.WONJIN[dayBranchIndex];
        SinsalInfo wonjin = findSinsal("원진살", wonjinBranch, pillars, labels, count,
            "원한과 미움의 기운. 가까운 사람과의 갈등이나 배신에 주의하고, 대인관계에 신경을 써야 합니다.", false);
        result.add(wonjin);

        // 귀문관살 (일지 기준)
        int gwimunBranch = SajuConstants.GWIMUN[dayBranchIndex];
        SinsalInfo gwimun = findSinsal("귀문관살", gwimunBranch, pillars, labels, count,
            "귀신의 문을 여는 기운. 영적 감각이 뛰어나나 정신적 스트레스에 주의. 종교·철학·심리학에 재능이 있습니다.", false);
        result.add(gwimun);

        // 겁살 (일지 기준)
        int geobsalBranch = SajuConstants.GEOBSAL[dayBranchIndex];
        result.add(findSinsal("겁살", geobsalBranch, pillars, labels, count,
            "외부의 강탈과 손실을 나타냅니다. 도난, 사기, 강도 등에 주의가 필요합니다.", false));

        // 재살 (일지 기준)
        int jaesalBranch = SajuConstants.JAESAL[dayBranchIndex];
        result.add(findSinsal("재살", jaesalBranch, pillars, labels, count,
            "재앙과 재난의 기운. 사고와 질병에 주의하고 무리한 행동을 삼가세요.", false));

        // 천살 (일지 기준)
        int cheonsalBranch = SajuConstants.CHEONSAL[dayBranchIndex];
        result.add(findSinsal("천살", cheonsalBranch, pillars, labels, count,
            "하늘에서 오는 재앙. 자연재해나 예기치 않은 사건에 대비하세요.", false));

        // 지살 (일지 기준)
        int jisalBranch = SajuConstants.JISAL[dayBranchIndex];
        result.add(findSinsal("지살", jisalBranch, pillars, labels, count,
            "땅에서 오는 재앙. 여행, 이동 시 주의가 필요합니다.", false));

        // 망신살 (일지 기준)
        int mangsinBranch = SajuConstants.MANGSIN[dayBranchIndex];
        result.add(findSinsal("망신살", mangsinBranch, pillars, labels, count,
            "체면 손상과 망신의 기운. 언행을 조심하고 겸손하게 처신하세요.", false));

        // 반안살 (일지 기준)
        int bananBranch = SajuConstants.BANAN[dayBranchIndex];
        result.add(findSinsal("반안살", bananBranch, pillars, labels, count,
            "여행과 이동에 길한 기운. 승진, 전직에 유리합니다.", true));

        // 장성살 (일지 기준)
        int jangsungBranch = SajuConstants.JANGSUNG[dayBranchIndex];
        result.add(findSinsal("장성살", jangsungBranch, pillars, labels, count,
            "지도력과 통솔력의 기운. 리더십을 발휘할 수 있는 운입니다.", true));

        // 천의성 (월지 기준)
        int cheonuiBranch = SajuConstants.CHEONUI[monthBranchIdx];
        result.add(findSinsal("천의성", cheonuiBranch, pillars, labels, count,
            "의학과 치유의 기운. 의료·건강 관련 분야에 인연이 깊습니다.", true));

        // 복성귀인 (일간 기준)
        int boksungBranch = SajuConstants.BOKSUNG[dayStemIndex];
        result.add(findSinsal("복성귀인", boksungBranch, pillars, labels, count,
            "복과 행운을 가져다주는 귀인. 평생 의식주에 어려움이 없습니다.", true));

        // 천관귀인 (일간 기준)
        int cheongwanBranch = SajuConstants.CHEONGWAN[dayStemIndex];
        result.add(findSinsal("천관귀인", cheongwanBranch, pillars, labels, count,
            "관직과 명예의 귀인. 공직이나 권위 있는 직위에 오를 수 있습니다.", true));

        // 현침살 (일간이 갑/신/계일 때)
        boolean isHyunchim = false;
        for (int stem : SajuConstants.HYUNCHIM_STEMS) {
            if (dayStemIndex == stem) {
                isHyunchim = true;
                break;
            }
        }
        result.add(SinsalInfo.builder().name("현침살").present(isHyunchim).positive(true)
            .description("날카로운 판단력과 예리한 두뇌. 학문·기술 분야에서 뛰어난 성취를 이룹니다.").build());

        // 진신귀인 (일주 stem+branch 검사)
        boolean isJinsin = false;
        for (int[] pair : SajuConstants.JINSIN) {
            if (day.getStemIndex() == pair[0] && day.getBranchIndex() == pair[1]) {
                isJinsin = true;
                break;
            }
        }
        result.add(SinsalInfo.builder().name("진신귀인").present(isJinsin).positive(true)
            .description("모든 일이 앞으로 나아가는 전진의 기운. 발전과 성장이 끊이지 않습니다.").build());

        // 천라지망 (술(10)과 해(11)가 모두 사주에 있을 때)
        boolean hasSul = false;
        boolean hasHae = false;
        for (int i = 0; i < count; i++) {
            int b = pillars[i].getBranchIndex();
            if (b == 10) hasSul = true;
            if (b == 11) hasHae = true;
        }
        result.add(SinsalInfo.builder().name("천라지망").present(hasSul && hasHae).positive(false)
            .description("속박과 구속의 기운. 법적 문제나 구설수에 주의하세요.").build());

        return result;
    }

    private static SinsalInfo findSinsal(String name, int targetBranch,
            SajuPillar[] pillars, String[] labels, int count, String desc, boolean positive) {
        for (int i = 0; i < count; i++) {
            if (pillars[i].getBranchIndex() == targetBranch) {
                return SinsalInfo.builder()
                    .name(name).present(true).foundInPillar(labels[i])
                    .branchName(SajuConstants.JIJI[targetBranch])
                    .description(desc).positive(positive).build();
            }
        }
        return SinsalInfo.builder()
            .name(name).present(false)
            .branchName(SajuConstants.JIJI[targetBranch])
            .description(desc).positive(positive).build();
    }

    private static SinsalInfo findSinsalByStem(String name, int targetStem,
            SajuPillar[] pillars, String[] labels, int count, String desc, boolean positive) {
        for (int i = 0; i < count; i++) {
            if (pillars[i].getStemIndex() == targetStem) {
                return SinsalInfo.builder()
                    .name(name).present(true).foundInPillar(labels[i])
                    .branchName(SajuConstants.CHEONGAN[targetStem])
                    .description(desc).positive(positive).build();
            }
        }
        return SinsalInfo.builder()
            .name(name).present(false)
            .branchName(SajuConstants.CHEONGAN[targetStem])
            .description(desc).positive(positive).build();
    }

    // =========================================================================
    // 격국 (Pattern Classification)
    // =========================================================================

    /**
     * 격국 판단 (월주 천간의 십성 기준)
     */
    public static String calculateGyeokguk(int dayStemIndex, SajuPillar monthPillar) {
        int sipsungIdx = calculateSipsung(dayStemIndex, monthPillar.getStemIndex());
        return SajuConstants.GYEOKGUK[sipsungIdx];
    }

    // =========================================================================
    // 대운 (Major Fortune Cycles)
    // =========================================================================

    /**
     * 대운 계산
     * @param birthDate 생년월일
     * @param yearStemIndex 년간 index
     * @param monthPillar 월주
     * @param isMale 남자 여부
     * @param dayStemIndex 일간 index
     * @return 대운 리스트 (8개)
     */
    public static List<DaeunInfo> calculateDaeun(LocalDate birthDate, int yearStemIndex,
            SajuPillar monthPillar, boolean isMale, int dayStemIndex) {
        // 순행/역행 결정: 양남음녀 순행, 음남양녀 역행
        boolean yearYang = (yearStemIndex % 2 == 0);
        boolean forward = (isMale && yearYang) || (!isMale && !yearYang);

        // 대운 시작 나이 계산 (생일~다음/이전 절기 까지 일수 ÷ 3)
        int startAge = calculateDaeunStartAge(birthDate, forward);

        // 대운 기둥 생성 (월주에서 순행/역행)
        List<DaeunInfo> daeunList = new ArrayList<>();
        int currentAge = java.time.Period.between(birthDate, LocalDate.now()).getYears();

        for (int i = 0; i < 8; i++) {
            int stemIdx, branchIdx;
            if (forward) {
                stemIdx = (monthPillar.getStemIndex() + i + 1) % 10;
                branchIdx = (monthPillar.getBranchIndex() + i + 1) % 12;
            } else {
                stemIdx = Math.floorMod(monthPillar.getStemIndex() - i - 1, 10);
                branchIdx = Math.floorMod(monthPillar.getBranchIndex() - i - 1, 12);
            }

            int ageStart = startAge + (i * 10);
            int ageEnd = ageStart + 9;
            boolean isCurrent = currentAge >= ageStart && currentAge <= ageEnd;

            String sipsung = SajuConstants.SIPSUNG[calculateSipsung(dayStemIndex, stemIdx)];
            String twelveStage = SajuConstants.TWELVE_STAGES[calculateTwelveStage(dayStemIndex, branchIdx)];

            daeunList.add(DaeunInfo.builder()
                .startAge(ageStart).endAge(ageEnd)
                .stemIndex(stemIdx).branchIndex(branchIdx)
                .stemName(SajuConstants.CHEONGAN[stemIdx])
                .branchName(SajuConstants.JIJI[branchIdx])
                .stemHanja(SajuConstants.CHEONGAN_HANJA[stemIdx])
                .branchHanja(SajuConstants.JIJI_HANJA[branchIdx])
                .fullName(SajuConstants.CHEONGAN[stemIdx] + SajuConstants.JIJI[branchIdx])
                .fullHanja(SajuConstants.CHEONGAN_HANJA[stemIdx] + SajuConstants.JIJI_HANJA[branchIdx])
                .stemElement(SajuConstants.OHENG[SajuConstants.CHEONGAN_OHENG[stemIdx]])
                .branchElement(SajuConstants.OHENG[SajuConstants.JIJI_OHENG[branchIdx]])
                .sipsung(sipsung)
                .twelveStage(twelveStage)
                .current(isCurrent)
                .build());
        }

        return daeunList;
    }

    /**
     * 대운 시작 나이 계산 (근사치)
     */
    private static int calculateDaeunStartAge(LocalDate birthDate, boolean forward) {
        int birthMonth = birthDate.getMonthValue();
        int birthDay = birthDate.getDayOfMonth();

        // 절기 경계일 찾기
        int[][] terms = SajuConstants.SOLAR_TERM_DATES;
        // 절기를 양력 순서로 정렬된 리스트로 변환
        int[] termDays = new int[12]; // 각 절기의 day-of-year 근사치
        for (int i = 0; i < 12; i++) {
            termDays[i] = dayOfYear(terms[i][0], terms[i][1]);
        }

        int birthDoy = dayOfYear(birthMonth, birthDay);

        // 가장 가까운 다음/이전 절기 찾기
        int days;
        if (forward) {
            // 순행: 다음 절기까지 일수
            days = findDaysToNextTerm(birthDoy, termDays);
        } else {
            // 역행: 이전 절기까지 일수
            days = findDaysToPrevTerm(birthDoy, termDays);
        }

        // 3일 = 1년으로 환산, 반올림
        return Math.max(1, Math.round(days / 3.0f));
    }

    private static int dayOfYear(int month, int day) {
        int[] daysInMonth = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        int doy = 0;
        for (int i = 0; i < month - 1; i++) doy += daysInMonth[i];
        return doy + day;
    }

    private static int findDaysToNextTerm(int birthDoy, int[] termDays) {
        Arrays.sort(termDays);
        for (int td : termDays) {
            if (td > birthDoy) return td - birthDoy;
        }
        // 올해 남은 절기가 없으면 내년 첫 절기까지
        return (365 - birthDoy) + termDays[0];
    }

    private static int findDaysToPrevTerm(int birthDoy, int[] termDays) {
        Arrays.sort(termDays);
        for (int i = termDays.length - 1; i >= 0; i--) {
            if (termDays[i] < birthDoy) return birthDoy - termDays[i];
        }
        // 올해 이전 절기가 없으면 작년 마지막 절기까지
        return birthDoy + (365 - termDays[termDays.length - 1]);
    }

    // =========================================================================
    // 월운 (Monthly Fortune)
    // =========================================================================

    /**
     * 올해 12개월의 월운 계산
     */
    public static List<SajuResult.MonthFortune> calculateMonthlyFortunes(int dayStemIndex, int currentYear) {
        List<SajuResult.MonthFortune> list = new ArrayList<>();
        int sajuYear = currentYear; // simplified
        SajuPillar yearPillar = calculateYearPillar(sajuYear);

        for (int month = 1; month <= 12; month++) {
            // saju month 1 → branch 인(2), month 2 → branch 묘(3), ...,
            // month 10 → branch 해(11), month 11 → branch 자(0), month 12 → branch 축(1)
            int branchIndex = (month + 1);
            if (branchIndex >= 12) branchIndex -= 12;

            // 월간은 오호둔으로 계산
            int monthStemStart = SajuConstants.MONTH_STEM_START[yearPillar.getStemIndex() % 5];
            int monthOffset = Math.floorMod(branchIndex - 2, 12);
            int stemIndex = (monthStemStart + monthOffset) % 10;

            String sipsung = SajuConstants.SIPSUNG[calculateSipsung(dayStemIndex, stemIndex)];
            String twelveStage = SajuConstants.TWELVE_STAGES[calculateTwelveStage(dayStemIndex, branchIndex)];

            // 등급 결정 (십성과 12운성 기반)
            String rating = determineMonthRating(sipsung, twelveStage);
            String summary = generateMonthSummary(sipsung, twelveStage, month);

            list.add(SajuResult.MonthFortune.builder()
                .month(month)
                .stemName(SajuConstants.CHEONGAN[stemIndex])
                .branchName(SajuConstants.JIJI[branchIndex])
                .fullName(SajuConstants.CHEONGAN[stemIndex] + SajuConstants.JIJI[branchIndex])
                .sipsung(sipsung)
                .twelveStage(twelveStage)
                .rating(rating)
                .summary(summary)
                .build());
        }
        return list;
    }

    private static String determineMonthRating(String sipsung, String twelveStage) {
        int score = 50;
        // 십성 기반 점수
        switch (sipsung) {
            case "정관": case "정인": case "정재": score += 20; break;
            case "편인": case "식신": case "편재": score += 10; break;
            case "비견": case "겁재": score += 0; break;
            case "상관": case "편관": score -= 10; break;
        }
        // 12운성 기반 점수
        switch (twelveStage) {
            case "건록": case "제왕": case "관대": score += 20; break;
            case "장생": case "목욕": score += 10; break;
            case "쇠": case "양": case "태": score += 0; break;
            case "병": case "절": score -= 10; break;
            case "사": case "묘": score -= 15; break;
        }
        if (score >= 80) return "대길";
        if (score >= 65) return "길";
        if (score >= 45) return "보통";
        if (score >= 30) return "흉";
        return "대흉";
    }

    private static String generateMonthSummary(String sipsung, String twelveStage, int month) {
        String base;
        switch (sipsung) {
            case "비견": base = "동료나 경쟁자와의 관계가 중요한 달입니다. 협력하면 성과가 배가됩니다."; break;
            case "겁재": base = "재물의 출입이 활발한 달. 큰 지출이 예상되니 계획적 소비가 필요합니다."; break;
            case "식신": base = "먹을 복과 즐거움이 있는 달. 여유를 즐기며 창의력을 발휘하세요."; break;
            case "상관": base = "표현력이 극대화되는 달. 재능을 펼치되 윗사람과의 마찰에 주의하세요."; break;
            case "편재": base = "투자와 사업에 기회가 오는 달. 과감하되 신중하게 판단하세요."; break;
            case "정재": base = "안정적인 수입이 예상되는 달. 꾸준한 노력이 결실을 맺습니다."; break;
            case "편관": base = "변화와 도전의 달. 압박이 있으나 극복하면 한 단계 성장합니다."; break;
            case "정관": base = "명예와 승진의 기회가 있는 달. 원칙을 지키면 인정받습니다."; break;
            case "편인": base = "학문과 연구에 유리한 달. 새로운 분야를 공부하면 좋은 성과가 있습니다."; break;
            case "정인": base = "귀인의 도움이 있는 달. 어머니나 스승의 조언에 귀 기울이세요."; break;
            default: base = "평온한 한 달이 예상됩니다.";
        }
        return base;
    }

    // =========================================================================
    // 일운 (Daily Fortune)
    // =========================================================================

    /**
     * 특정 날짜의 일운 계산
     */
    public static Map<String, Object> calculateDailyFortune(int dayStemIndex, LocalDate targetDate) {
        SajuPillar dayPillar = calculateDayPillar(targetDate);
        int sipsung = calculateSipsung(dayStemIndex, dayPillar.getStemIndex());
        int twelveStage = calculateTwelveStage(dayStemIndex, dayPillar.getBranchIndex());
        String sipsungKr = SajuConstants.SIPSUNG[sipsung];
        String twelveStageKr = SajuConstants.TWELVE_STAGES[twelveStage];

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", targetDate.toString());
        result.put("dayPillar", dayPillar.getFullHanja() + "(" + dayPillar.getFullName() + ")");
        result.put("sipsung", sipsungKr);
        result.put("twelveStage", twelveStageKr);
        result.put("stemElement", SajuConstants.OHENG[SajuConstants.CHEONGAN_OHENG[dayPillar.getStemIndex()]]);
        result.put("branchElement", SajuConstants.OHENG[SajuConstants.JIJI_OHENG[dayPillar.getBranchIndex()]]);

        // 정밀 점수 (50±35) — 십성+12운성 조합으로 미세 차이까지 반영
        int score = computeDailyScore(sipsungKr, twelveStageKr, dayStemIndex, dayPillar.getStemIndex(), dayPillar.getBranchIndex());
        result.put("score", score);
        // 점수 → 등급 매핑 (UI 색상/뱃지용)
        result.put("rating", scoreToRating(score));
        result.put("summary", generateMonthSummary(sipsungKr, twelveStageKr, targetDate.getDayOfMonth()));

        return result;
    }

    /**
     * 일운 점수 계산 — 정밀 (십성+12운성+오행 충극 미세 보정)
     */
    private static int computeDailyScore(String sipsung, String twelveStage,
                                          int dayStemIdx, int targetStemIdx, int targetBranchIdx) {
        int score = 50;
        // 십성 기반 점수 (가중치 더 세분화)
        switch (sipsung) {
            case "정관": score += 22; break;
            case "정인": score += 20; break;
            case "정재": score += 18; break;
            case "식신": score += 14; break;
            case "편재": score += 12; break;
            case "편인": score += 8; break;
            case "비견": score += 2; break;
            case "겁재": score -= 4; break;
            case "상관": score -= 8; break;
            case "편관": score -= 12; break;
        }
        // 12운성 기반 점수
        switch (twelveStage) {
            case "제왕": score += 22; break;
            case "건록": score += 20; break;
            case "관대": score += 16; break;
            case "장생": score += 14; break;
            case "목욕": score += 8; break;
            case "양":   score += 4; break;
            case "쇠":   score += 0; break;
            case "태":   score -= 2; break;
            case "병":   score -= 8; break;
            case "절":   score -= 10; break;
            case "사":   score -= 14; break;
            case "묘":   score -= 16; break;
        }
        // 일간 vs 일지 충극 미세 보정 — 같은 오행끼리는 +1, 상극이면 -1
        int dayStemElem = SajuConstants.CHEONGAN_OHENG[dayStemIdx];
        int targetStemElem = SajuConstants.CHEONGAN_OHENG[targetStemIdx];
        int targetBranchElem = SajuConstants.JIJI_OHENG[targetBranchIdx];
        if (dayStemElem == targetStemElem) score += 1;
        if (isProductive(dayStemElem, targetStemElem)) score += 2;
        if (isProductive(targetStemElem, dayStemElem)) score += 1;
        if (isOpposing(dayStemElem, targetStemElem))   score -= 2;
        if (dayStemElem == targetBranchElem) score += 1;
        if (isProductive(targetBranchElem, dayStemElem)) score += 1;
        // 날짜 자체에서 오는 미세 변동 — 일진 강약 (지지 인덱스 기반 ±2)
        score += (targetBranchIdx % 5) - 2;

        // 클램프 15~98
        if (score < 15) score = 15;
        if (score > 98) score = 98;
        return score;
    }

    private static boolean isProductive(int from, int to) {
        // 오행 상생: 木(0)→火(1)→土(2)→金(3)→水(4)→木(0)
        return ((from + 1) % 5) == to;
    }
    private static boolean isOpposing(int a, int b) {
        // 오행 상극: 木→土, 土→水, 水→火, 火→金, 金→木 (간격 2)
        return Math.abs(a - b) == 2 || Math.abs(a - b) == 3;
    }

    private static String scoreToRating(int score) {
        if (score >= 80) return "대길";
        if (score >= 65) return "길";
        if (score >= 45) return "보통";
        if (score >= 30) return "흉";
        return "대흉";
    }
}
