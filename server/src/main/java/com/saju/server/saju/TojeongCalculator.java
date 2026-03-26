package com.saju.server.saju;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 토정비결 (Tojeong Bigyeol) 계산기
 * 조선시대 토정 이지함이 만든 점술 체계로,
 * 상수(태세수), 중수(월건수), 하수(일진수)를 합산하여 괘를 구한다.
 */
public class TojeongCalculator {

    // 상수(태세수): 천간 기반 - 갑/기=1, 을/경=2, 병/신=3, 정/임=4, 무/계=5
    private static final int[] SANGSU_BY_CHEONGAN = {1, 2, 3, 4, 5, 1, 2, 3, 4, 5};

    // 중수(월건수): 절기 월 기반 (1월~12월)
    // Index 0 = 1월, Index 1 = 2월, ..., Index 11 = 12월
    private static final int[] JUNGSU_BY_MONTH = {5, 6, 4, 8, 3, 7, 2, 6, 4, 9, 5, 8};

    // 하수(일진수): 일지(지지) 기반
    // 자=1, 축=2, 인=3, 묘=4, 진=5, 사=6, 오=1, 미=2, 신=3, 유=4, 술=5, 해=6
    private static final int[] HASU_BY_JIJI = {1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6};

    // 괘 이름 (총 괘 번호 4~23에 매핑, index 0 = 괘 번호 4)
    private static final String[] GWAE_NAMES = {
        "지천태괘",   // 4
        "풍천소축괘", // 5
        "화천대유괘", // 6
        "택천쾌괘",   // 7
        "천풍구괘",   // 8
        "손위풍괘",   // 9
        "화풍정괘",   // 10
        "택풍대과괘", // 11
        "천화동인괘", // 12
        "풍화가인괘", // 13
        "이위화괘",   // 14
        "택화혁괘",   // 15
        "천택리괘",   // 16
        "풍택중부괘", // 17
        "화택규괘",   // 18
        "태위택괘",   // 19
        "수천수괘",   // 20
        "산천대축괘", // 21
        "지천임괘",   // 22
        "뇌천대장괘"  // 23
    };

    // 월별 운세 기본 템플릿 (AI 불가 시 fallback)
    private static final String[] FORTUNE_TEMPLATES = {
        "새로운 시작의 기운이 감도니 적극적으로 나서면 좋은 결과를 얻을 수 있습니다. 다만 성급함은 금물이니 차분히 준비하십시오.",
        "귀인의 도움으로 어려운 일이 풀리는 시기입니다. 주변 사람들과의 관계를 소중히 하면 뜻밖의 행운이 찾아옵니다.",
        "재물운이 상승하는 달이니 투자나 사업에 좋은 기회가 올 수 있습니다. 그러나 과욕은 금물이니 신중하게 판단하십시오.",
        "건강에 유의해야 하는 시기입니다. 무리한 일정을 피하고 충분한 휴식을 취하면 하반기에 좋은 결실을 맺을 것입니다.",
        "학업과 시험에 좋은 기운이 있으니 공부에 매진하면 좋은 성과를 거둘 수 있습니다. 집중력을 높이는 것이 관건입니다.",
        "대인관계에서 갈등이 생길 수 있으니 말조심을 하십시오. 특히 가까운 사람과의 오해를 풀기 위해 대화를 나누는 것이 좋습니다.",
        "이사나 이동수가 있는 달입니다. 변화를 두려워하지 말고 받아들이면 새로운 기회로 이어질 것입니다.",
        "금전적으로 안정적인 달이니 저축을 시작하기 좋은 시기입니다. 불필요한 소비를 줄이고 미래를 대비하십시오.",
        "직장이나 사업에서 승진이나 발전의 기회가 있을 수 있습니다. 성실함을 보여주면 윗사람의 인정을 받을 것입니다.",
        "가정에 경사가 있을 수 있는 달입니다. 가족과 함께하는 시간을 늘리고 화합을 도모하면 큰 복이 찾아옵니다.",
        "예상치 못한 지출이 발생할 수 있으니 비상금을 마련해두는 것이 좋겠습니다. 계획적인 소비가 필요한 시기입니다.",
        "여행이나 외출에 좋은 기운이 있습니다. 새로운 환경에서 영감을 얻고 재충전하는 시간을 가지면 좋겠습니다.",
        "문서 관련 일에 좋은 결과가 있을 수 있습니다. 계약이나 시험 등 중요한 서류는 꼼꼼히 확인하시기 바랍니다.",
        "연애운이 상승하는 시기이니 좋은 인연을 만날 수 있습니다. 적극적으로 사교활동에 참여하면 행운이 찾아올 것입니다.",
        "조상의 음덕으로 위기를 넘기는 달입니다. 마음을 바르게 하고 선행을 베풀면 복이 돌아올 것입니다.",
        "창의적인 활동에 좋은 기운이 있으니 새로운 아이디어를 실행에 옮기면 좋은 결과를 얻을 수 있습니다.",
        "소송이나 분쟁이 있다면 원만한 합의를 이루는 것이 유리합니다. 강경한 태도보다는 유연함이 필요한 시기입니다.",
        "부동산이나 토지와 관련된 일에 운이 따르는 달입니다. 좋은 매물이 나올 수 있으니 관심을 기울이십시오.",
        "건강이 회복되는 시기이니 규칙적인 운동과 식이조절로 몸 관리를 시작하면 좋겠습니다. 마음의 안정도 중요합니다.",
        "한 해의 노력이 결실을 맺는 시기입니다. 그동안의 수고가 빛을 발하니 자신감을 갖고 마무리하십시오."
    };

    // 월별 운세 등급 결정용 패턴 (각 괘 번호별 12개월 기본 등급)
    private static final String[] RATINGS = {"대길", "길", "보통", "흉", "대흉"};

    private TojeongCalculator() {
        // Utility class
    }

    /**
     * 토정비결 계산 수행
     * @param birthDate 생년월일 (양력)
     * @return TojeongResult 토정비결 결과
     */
    public static TojeongResult calculate(LocalDate birthDate) {
        // 사주 년도 계산 (입춘 기준)
        int sajuYear = SajuCalculator.getSajuYear(birthDate);

        // 년주에서 천간 추출하여 상수 계산
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        int sangsu = SANGSU_BY_CHEONGAN[yearPillar.getStemIndex()];

        // 절기 기반 월 계산 → 중수
        int monthBranchIndex = SajuCalculator.getSolarTermMonth(birthDate);
        int sajuMonth = branchIndexToSajuMonth(monthBranchIndex);
        int jungsu = JUNGSU_BY_MONTH[sajuMonth - 1]; // 1-based to 0-based

        // 일주에서 지지 추출하여 하수 계산
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(birthDate);
        int hasu = HASU_BY_JIJI[dayPillar.getBranchIndex()];

        // 총 괘 번호 (범위: 4~23)
        int totalGwae = sangsu + jungsu + hasu;

        // 괘 이름
        String gwaeName = getGwaeName(totalGwae);

        // 월별 운세 (기본 템플릿 기반 fallback)
        List<TojeongResult.MonthlyFortune> monthlyFortunes = generateTemplateFortunes(totalGwae);

        // 기본 올해 총평
        String yearSummary = generateDefaultYearSummary(totalGwae, gwaeName);

        return TojeongResult.builder()
                .sangsu(sangsu)
                .jungsu(jungsu)
                .hasu(hasu)
                .totalGwae(totalGwae)
                .gwaeName(gwaeName)
                .yearSummary(yearSummary)
                .monthlyFortunes(monthlyFortunes)
                .build();
    }

    /**
     * 지지 브랜치 인덱스를 사주 월(1~12)로 변환
     * 인(2)=1월, 묘(3)=2월, ..., 축(1)=12월
     */
    private static int branchIndexToSajuMonth(int branchIndex) {
        // 인(2)→1, 묘(3)→2, 진(4)→3, 사(5)→4, 오(6)→5, 미(7)→6
        // 신(8)→7, 유(9)→8, 술(10)→9, 해(11)→10, 자(0)→11, 축(1)→12
        if (branchIndex >= 2) {
            return branchIndex - 1; // 인(2)→1, 묘(3)→2, ..., 해(11)→10
        } else {
            return branchIndex + 11; // 자(0)→11, 축(1)→12
        }
    }

    /**
     * 괘 번호로 괘 이름 조회
     */
    private static String getGwaeName(int totalGwae) {
        int index = totalGwae - 4; // 최소값 4를 0-based로 변환
        if (index >= 0 && index < GWAE_NAMES.length) {
            return GWAE_NAMES[index];
        }
        return "미정괘";
    }

    /**
     * 기본 올해 총평 생성
     */
    private static String generateDefaultYearSummary(int totalGwae, String gwaeName) {
        if (totalGwae <= 7) {
            return gwaeName + "의 기운이 감도는 해입니다. 전반적으로 순탄한 흐름이 예상되며, "
                    + "새로운 시작에 좋은 기운이 함께합니다. 다만 후반기에는 다소 주의가 필요하니 "
                    + "미리 대비하시면 좋겠습니다.";
        } else if (totalGwae <= 11) {
            return gwaeName + "의 기운 아래 변화와 성장이 기대되는 해입니다. "
                    + "중반까지는 노력의 대가가 돌아오는 시기이며, 인간관계에서 귀인을 만날 수 있습니다. "
                    + "건강 관리에도 신경 쓰시면 더욱 좋은 한 해가 될 것입니다.";
        } else if (totalGwae <= 15) {
            return gwaeName + "의 기운이 있는 해로, 안정과 균형을 추구하는 것이 좋습니다. "
                    + "급격한 변화보다는 꾸준한 노력이 빛을 발하는 시기입니다. "
                    + "가정의 화합을 이루면 밖의 일도 순조로워질 것입니다.";
        } else if (totalGwae <= 19) {
            return gwaeName + "의 기운 아래 도전과 극복의 해가 될 수 있습니다. "
                    + "어려움이 있더라도 포기하지 않으면 후반기에 반전의 기회가 찾아옵니다. "
                    + "주변의 조언에 귀 기울이고 신중하게 결정하시기 바랍니다.";
        } else {
            return gwaeName + "의 기운이 감싸는 해입니다. 큰 그림을 그리되 세부 실행에 주의를 기울이십시오. "
                    + "상반기에 기초를 다지면 하반기에 풍성한 결실을 맺을 수 있습니다. "
                    + "자기 관리와 내면의 수양이 행운의 열쇠가 될 것입니다.";
        }
    }

    /**
     * 괘 번호와 월 조합으로 결정론적(deterministic) 템플릿 기반 월별 운세 생성
     */
    private static List<TojeongResult.MonthlyFortune> generateTemplateFortunes(int totalGwae) {
        List<TojeongResult.MonthlyFortune> fortunes = new ArrayList<>();

        for (int month = 1; month <= 12; month++) {
            // 결정론적 시드: 괘 번호와 월의 조합
            int seed = (totalGwae * 7 + month * 13) % FORTUNE_TEMPLATES.length;
            String fortune = FORTUNE_TEMPLATES[seed];

            // 등급 결정 (괘 번호와 월의 조합으로 다양하게 분포)
            int ratingSeed = ((totalGwae * 17 + month * 31 + 7) % 100);
            String rating;
            if (ratingSeed < 15) rating = "대길";
            else if (ratingSeed < 40) rating = "길";
            else if (ratingSeed < 70) rating = "보통";
            else if (ratingSeed < 90) rating = "흉";
            else rating = "대흉";

            fortunes.add(TojeongResult.MonthlyFortune.builder()
                    .month(month)
                    .fortune(fortune)
                    .rating(rating)
                    .build());
        }

        return fortunes;
    }
}
