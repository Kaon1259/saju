package com.saju.server.saju;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 향후 12개월 "연애 타이밍" 계산기 — AI 호출 없이 결정론적으로 계산(하트 소모 없음).
 *
 * 근거(명리): 월운 천간·지지 본기의 십성이 연애 별(남=재성 / 여=관성)이면 인연이 움직이는 달,
 * 월지가 일지(배우자궁)와 육합이면 관계가 붙는 달, 충·형이면 흔들리는 달로 본다.
 * ⚠️ 절기월 경계는 SajuCalculator 기준(월 15일 시점의 월주). "운세의 관점"이며 단정이 아니다.
 */
public final class LoveTimingBuilder {

    private LoveTimingBuilder() {}

    public static Map<String, Object> build(LocalDate birth, boolean isMale, LocalDate today) {
        int sajuYear = SajuCalculator.getSajuYear(birth);
        SajuPillar yp = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dp = SajuCalculator.calculateDayPillar(birth);
        int dayStem = dp.getStemIndex();
        int spouseBranch = dp.getBranchIndex();
        SajuPillar natalMonth = SajuCalculator.calculateMonthPillar(birth, yp.getStemIndex());
        boolean natalHasLover = natalHasLoverStar(dayStem, isMale, yp, natalMonth, dp);
        int peachA = peachBlossom(dp.getBranchIndex());
        int peachB = peachBlossom(yp.getBranchIndex());

        List<Map<String, Object>> months = new ArrayList<>();
        int bestIdx = -1;
        double bestScore = -99;

        for (int i = 0; i < 12; i++) {
            LocalDate mid = today.plusMonths(i).withDayOfMonth(15);
            SajuPillar y = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(mid));
            SajuPillar m = SajuCalculator.calculateMonthPillar(mid, y.getStemIndex());

            String stemSip = SajuCalculator.getSipsungName(dayStem, m.getStemIndex());
            int[] hidden = SajuConstants.JIJANGGAN[m.getBranchIndex()];
            String branchSip = SajuCalculator.getSipsungName(dayStem, hidden[hidden.length - 1]);
            boolean stemLover = isLoverStar(stemSip, isMale);
            boolean branchLover = isLoverStar(branchSip, isMale);

            double score = 0;
            List<String> why = new ArrayList<>();
            if (stemLover) { score += 1.5; why.add("연애 별(" + stemSip + ")이 들어옴"); }
            if (branchLover) { score += 1.0; why.add("월지에도 연애 별(" + branchSip + ")"); }
            if ((stemLover || branchLover) && !natalHasLover) {
                score += 0.5; why.add("원국에 없던 연애 별이 들어와 더 두드러짐");
            }
            boolean peach = m.getBranchIndex() == peachA || m.getBranchIndex() == peachB;
            if (peach) { score += 1.0; why.add("도화 기운(이성 인연·매력 상승)"); }

            boolean harmony = false, clash = false;
            for (String rel : DecisionFactsBuilder.relations(m.getBranchIndex(), spouseBranch)) {
                switch (rel) {
                    case "육합" -> { score += 2.0; harmony = true; why.add("배우자궁(일지)과 합"); }
                    case "충" -> { score -= 2.0; clash = true; why.add("배우자궁(일지)과 충"); }
                    case "형" -> { score -= 1.0; why.add("배우자궁(일지)과 형"); }
                    case "해" -> { score -= 0.5; why.add("배우자궁(일지)과 해"); }
                    default -> { }
                }
            }
            int st = SajuCalculator.calculateTwelveStage(dayStem, m.getBranchIndex());
            if (st == 0 || st == 2 || st == 3 || st == 4) score += 0.5; // 장생·관대·건록·제왕

            String grade = score >= 1.5 ? "유리" : score <= -1.5 ? "주의" : "보통";
            String keyword;
            String tip;
            if (harmony && (stemLover || branchLover)) {
                keyword = "인연이 붙는 달";
                tip = "만남·고백·관계 진전에 힘이 실려요. 미루던 말을 꺼내기 좋은 시기입니다.";
            } else if (stemLover) {
                keyword = "인연의 별이 뜨는 달";
                tip = "새 만남이나 소개가 들어오기 쉬워요. 사람 만나는 자리를 늘려 보세요.";
            } else if (peach && !clash) {
                keyword = "매력이 올라가는 달";
                tip = "눈에 띄고 호감을 사기 쉬운 시기예요. 모임과 외출을 늘리면 반응이 옵니다.";
            } else if (branchLover) {
                keyword = "인연이 스치는 달";
                tip = "은근한 만남의 기회가 있어요. 눈에 띄는 변화보다 작은 계기를 놓치지 마세요.";
            } else if (harmony) {
                keyword = "관계가 가까워지는 달";
                tip = "가까운 사이라면 마음이 더 모이는 흐름이에요. 연락과 약속을 챙기세요.";
            } else if (clash) {
                keyword = "관계가 흔들리는 달";
                tip = "충돌이 생기기 쉬워요. 큰 결정은 미루고 감정이 격할 땐 말을 줄이세요.";
            } else if ("주의".equals(grade)) {
                keyword = "속도를 늦추는 달";
                tip = "무리해서 밀어붙이면 어긋나기 쉬워요. 상대 반응을 보며 천천히 가세요.";
            } else {
                keyword = "잔잔한 달";
                tip = "큰 변화는 적어요. 나를 가꾸고 관계의 기본기를 다지기 좋은 시기입니다.";
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ym", mid.getYear() + "-" + String.format("%02d", mid.getMonthValue()));
            row.put("month", mid.getMonthValue());
            row.put("ganji", m.getFullName());
            row.put("sipsung", stemSip);
            row.put("grade", grade);
            row.put("score", Math.round(score * 10) / 10.0);
            row.put("keyword", keyword);
            row.put("tip", tip);
            row.put("why", why);
            months.add(row);

            if (score > bestScore) { bestScore = score; bestIdx = i; }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("months", months);
        out.put("bestIndex", bestScore >= 1.0 ? bestIdx : -1);
        out.put("dayMaster", SajuConstants.CHEONGAN[dayStem]);
        out.put("spouseBranch", SajuConstants.JIJI[spouseBranch]);
        out.put("loverStar", isMale ? "재성" : "관성");
        return out;
    }

    /** 도화(桃花): 申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子 */
    static int peachBlossom(int branch) {
        return switch (branch) {
            case 8, 0, 4 -> 9;
            case 2, 6, 10 -> 3;
            case 5, 9, 1 -> 6;
            default -> 0; // 亥卯未
        };
    }

    /** 원국(년·월 천간, 년·월·일 지지 본기)에 연애 별이 하나라도 있는가 (시주 제외). */
    private static boolean natalHasLoverStar(int dayStem, boolean isMale, SajuPillar yp, SajuPillar mp, SajuPillar dp) {
        int[] stems = { yp.getStemIndex(), mp.getStemIndex() };
        for (int st : stems) if (isLoverStar(SajuCalculator.getSipsungName(dayStem, st), isMale)) return true;
        for (SajuPillar p : new SajuPillar[]{ yp, mp, dp }) {
            int[] h = SajuConstants.JIJANGGAN[p.getBranchIndex()];
            if (isLoverStar(SajuCalculator.getSipsungName(dayStem, h[h.length - 1]), isMale)) return true;
        }
        return false;
    }

    private static boolean isLoverStar(String sipsung, boolean isMale) {
        return isMale
            ? "정재".equals(sipsung) || "편재".equals(sipsung)
            : "정관".equals(sipsung) || "편관".equals(sipsung);
    }
}
