package com.saju.server.saju;

import java.time.LocalDate;

/**
 * 정밀 절기 데이터 (년도별)
 * 각 년도의 12절기 시작일 (양력 월-일)
 * 절기: 소한, 입춘, 경칩, 청명, 입하, 망종, 소서, 입추, 백로, 한로, 입동, 대설
 *
 * 절기 계산에는 천문학적 계산이 필요하지만,
 * 아래 근사 공식으로 1920~2050년 범위에서 ±1일 이내 정밀도를 달성합니다.
 */
public class SolarTerms {

    private SolarTerms() {
        // Utility class
    }

    /**
     * 절기별 기본 데이터: {월, 기준일(2000년 기준)}
     * index 0 = 소한 (1월), index 1 = 입춘 (2월), ..., index 11 = 대설 (12월)
     */
    private static final double[][] TERM_DATA = {
        {1, 6.11},    // 소한 (index 0)  - 축월 시작
        {2, 4.15},    // 입춘 (index 1)  - 인월 시작
        {3, 5.63},    // 경칩 (index 2)  - 묘월 시작
        {4, 4.81},    // 청명 (index 3)  - 진월 시작
        {5, 5.52},    // 입하 (index 4)  - 사월 시작
        {6, 5.68},    // 망종 (index 5)  - 오월 시작
        {7, 7.11},    // 소서 (index 6)  - 미월 시작
        {8, 7.29},    // 입추 (index 7)  - 신월 시작
        {9, 7.64},    // 백로 (index 8)  - 유월 시작
        {10, 8.16},   // 한로 (index 9)  - 술월 시작
        {11, 7.44},   // 입동 (index 10) - 해월 시작
        {12, 7.04},   // 대설 (index 11) - 자월 시작
    };

    /** 절기 index → 지지 브랜치: 0→1(축), 1→2(인), ..., 10→11(해), 11→0(자) */
    private static final int[] BRANCH_BY_TERM = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0};

    /**
     * 특정 년도의 절기 시작일 계산 (정밀 근사 공식)
     *
     * 공식: day = baseDay(2000년) + (year - 2000) * 0.2422 - leapCorrection
     * 윤년 보정: 2000년 이후에는 (year-2000)/4 의 정수부분을 빼고,
     *           2000년 이전에는 (2000-year)/4 의 정수부분을 더함
     *
     * @param year      년도 (1920~2050 범위 권장)
     * @param termIndex 절기 인덱스 (0=소한, 1=입춘, 2=경칩, ..., 11=대설)
     * @return 해당 절기의 시작 날짜
     */
    public static LocalDate getSolarTermDate(int year, int termIndex) {
        double baseDay = TERM_DATA[termIndex][1];
        int month = (int) TERM_DATA[termIndex][0];

        double dayExact;
        if (year >= 2000) {
            // 2000년 이후: baseDay + 연차 증가분 - 윤년 보정
            int leapCorrection = (year - 2000) / 4;
            dayExact = baseDay + (year - 2000) * 0.2422 - leapCorrection;
        } else {
            // 2000년 이전: baseDay + 연차 증가분 + 윤년 보정
            int leapCorrection = (2000 - year) / 4;
            dayExact = baseDay + (year - 2000) * 0.2422 + leapCorrection;
        }

        int day = (int) Math.round(dayExact);

        // 월별 최대 일수 안전 범위
        int maxDay = LocalDate.of(year, month, 1).lengthOfMonth();
        day = Math.max(1, Math.min(day, maxDay));

        return LocalDate.of(year, month, day);
    }

    /**
     * 특정 년도의 입춘 날짜를 반환합니다.
     * getSajuYear() 계산에 사용됩니다.
     *
     * @param year 년도
     * @return 해당 년도 입춘 날짜
     */
    public static LocalDate getIpchunDate(int year) {
        return getSolarTermDate(year, 1); // index 1 = 입춘
    }

    /**
     * 정밀 절기 기반 사주 월 계산
     *
     * 12절기 경계일을 역순으로 검사하여 해당 날짜가 속하는 사주 월(지지)을 반환합니다.
     *
     * @param date 대상 날짜
     * @return 지지 브랜치 인덱스 (0=자, 1=축, 2=인, ..., 11=해)
     */
    public static int getPreciseSolarTermMonth(LocalDate date) {
        int year = date.getYear();

        // 역순으로 검사: 가장 마지막 절기(대설, 12월)부터 소한(1월)까지
        for (int i = 11; i >= 0; i--) {
            LocalDate termDate = getSolarTermDate(year, i);
            if (!date.isBefore(termDate)) {
                return BRANCH_BY_TERM[i];
            }
        }

        // 올해 소한(1월 초) 이전이면 작년 대설(12월)에 해당 → 자월(branch 0)
        return 0;
    }
}
