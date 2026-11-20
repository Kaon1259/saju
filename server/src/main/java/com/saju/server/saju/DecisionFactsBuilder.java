package com.saju.server.saju;

import java.time.LocalDate;
import java.util.*;

/**
 * 결정 상담용 명리 사실 계산기 (신강/신약 후보 + 월운·세운·대운의 합충형해 + 월별 등급).
 *
 * ⚠️ 가중치·임계값은 "검증 전 초기값"이다. 전통의 유일한 표준이 아니며 골든 케이스로 조정해야 한다.
 *    조후(계절 보정)·통근·투간·합화 성립·종격은 반영하지 않으므로 "후보" 표현만 쓴다(용신 확정 아님).
 */
public final class DecisionFactsBuilder {

    private DecisionFactsBuilder() {}

    /** 엔진 버전 — 계산 규칙을 바꾸면 올려서 캐시를 무효화한다. */
    public static final String ENGINE_VERSION = "df2";

    // ── 신강/신약 가중치 (초기값) ──
    static final double W_MONTH_BRANCH = 3.0, W_DAY_BRANCH = 2.0, W_OTHER_BRANCH = 1.0;
    static final double W_MONTH_STEM = 1.2, W_OTHER_STEM = 1.0, W_DAY_STEM = 1.0;
    static final double W_INSEONG_DISCOUNT = 0.8;   // 인성은 비겁보다 낮게 반영
    // 임계값: 제안안(0.40/0.60)을 1960~2005 생년 균등 표본에 돌려 보니 신약 54% · 신강 6% 로 쏠렸다
    // (중앙값 0.384, p35=0.330, p65=0.439). 그래서 신약/중화/신강 이 대략 35/30/35 가 되도록 보정했다.
    // ⚠️ "균형 기준" 보정일 뿐 전문가 풀이 대비 정확도 검증이 아니다 — 골든 케이스로 다시 조정할 것.
    static final double RATIO_WEAK = 0.33, RATIO_STRONG = 0.44;

    // ── 월 등급 임계 (초기값) ──
    static final double GRADE_GOOD = 2.0, GRADE_BAD = -2.0;

    private static final String[] EL = SajuConstants.OHENG;

    public static DecisionFacts build(LocalDate birth, String birthTime, boolean isMale, LocalDate today) {
        int sajuYear = SajuCalculator.getSajuYear(birth);
        SajuPillar yp = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar mp = SajuCalculator.calculateMonthPillar(birth, yp.getStemIndex());
        SajuPillar dp = SajuCalculator.calculateDayPillar(birth);
        int dayStem = dp.getStemIndex();
        SajuPillar hp = (birthTime != null && !birthTime.isBlank())
            ? SajuCalculator.calculateHourPillar(birthTime, dayStem) : null;

        // ── 1) 가중 오행 에너지 (지장간 비율 + 월령 가중) ──
        double[] energy = new double[5];
        energy[SajuConstants.CHEONGAN_OHENG[yp.getStemIndex()]] += W_OTHER_STEM;
        energy[SajuConstants.CHEONGAN_OHENG[mp.getStemIndex()]] += W_MONTH_STEM;
        energy[SajuConstants.CHEONGAN_OHENG[dayStem]] += W_DAY_STEM;
        if (hp != null) energy[SajuConstants.CHEONGAN_OHENG[hp.getStemIndex()]] += W_OTHER_STEM;
        addHidden(energy, yp.getBranchIndex(), W_OTHER_BRANCH);
        addHidden(energy, mp.getBranchIndex(), W_MONTH_BRANCH);
        addHidden(energy, dp.getBranchIndex(), W_DAY_BRANCH);
        if (hp != null) addHidden(energy, hp.getBranchIndex(), W_OTHER_BRANCH);

        int dEl = SajuConstants.CHEONGAN_OHENG[dayStem];
        int inEl = -1, gwanEl = -1;
        for (int e = 0; e < 5; e++) {
            if (SajuConstants.OHENG_PRODUCES[e] == dEl) inEl = e;
            if (SajuConstants.OHENG_OVERCOMES[e] == dEl) gwanEl = e;
        }
        int sikEl = SajuConstants.OHENG_PRODUCES[dEl];
        int jaeEl = SajuConstants.OHENG_OVERCOMES[dEl];

        double total = 0;
        for (double v : energy) total += v;
        double support = energy[dEl] + W_INSEONG_DISCOUNT * energy[inEl];
        double ratio = total > 0 ? support / total : 0.5;
        String label = ratio < RATIO_WEAK ? "신약 후보" : ratio > RATIO_STRONG ? "신강 후보" : "중화(판단 유보)";

        // ── 2) 보완 오행 후보 ──
        List<Integer> helpIdx = new ArrayList<>();
        if ("신약 후보".equals(label)) {
            helpIdx.add(inEl); helpIdx.add(dEl);
        } else if ("신강 후보".equals(label)) {
            helpIdx.addAll(List.of(sikEl, jaeEl, gwanEl));
        }
        helpIdx.sort(Comparator.comparingDouble(i -> energy[i]));
        if ("신강 후보".equals(label) && helpIdx.size() > 2) helpIdx = new ArrayList<>(helpIdx.subList(0, 2));
        List<String> helpNames = new ArrayList<>();
        for (int i : helpIdx) helpNames.add(EL[i]);

        DecisionFacts f = new DecisionFacts(label, ratio, helpNames);

        // ── 3) 원국 사실 ──
        StringBuilder pil = new StringBuilder("년주 " + yp.getFullName() + " · 월주 " + mp.getFullName() + " · 일주 " + dp.getFullName());
        if (hp != null) pil.append(" · 시주 ").append(hp.getFullName()); else pil.append(" · 시주 미상");
        f.addFact("NATAL:PILLARS", "네 기둥: " + pil + " (일간 " + dp.getStemName() + "·" + EL[dEl] + ")");

        StringBuilder en = new StringBuilder("가중 오행 분포(지장간·월령 반영): ");
        for (int e = 0; e < 5; e++) en.append(EL[e]).append(String.format("%.1f", energy[e])).append(e < 4 ? " " : "");
        f.addFact("NATAL:ELEMENTS", en.toString());

        f.addFact("NATAL:STRENGTH", String.format(
            "일간 지지 비율 %.0f%% → %s (비겁+인성×0.8 기준, 조후·통근·종격 미반영이라 확정이 아니라 추정)",
            ratio * 100, label));
        if (!helpNames.isEmpty()) {
            f.addFact("NATAL:HELPFUL", "보완 오행 후보: " + String.join("·", helpNames) + " (추정)");
        }

        List<SajuInteraction> inter = SajuCalculator.calculateInteractions(yp, mp, dp, hp);
        int ii = 0;
        for (SajuInteraction it : inter) {
            ii++;
            String where = it.getPillar1() + "·" + it.getPillar2() + (it.getPillar3() != null ? "·" + it.getPillar3() : "");
            boolean spouse = "일주".equals(it.getPillar1()) || "일주".equals(it.getPillar2()) || "일주".equals(it.getPillar3());
            f.addFact("NATAL:INT:" + ii, "원국 " + it.getDescription() + " (" + where + ")"
                + (spouse ? " — 일지(배우자궁)와 관련" : ""));
        }

        // ── 4) 대운·세운 ──
        List<DaeunInfo> daeunList = SajuCalculator.calculateDaeun(birth, yp.getStemIndex(), mp, isMale, dayStem);
        DaeunInfo cur = daeunList.stream().filter(DaeunInfo::isCurrent).findFirst().orElse(null);
        Natal natal = new Natal(yp.getBranchIndex(), mp.getBranchIndex(), dp.getBranchIndex(),
            hp != null ? hp.getBranchIndex() : -1);
        if (cur != null) {
            f.addFact("DAEUN:BASE", "현재 대운: " + cur.getStartAge() + "~" + cur.getEndAge() + "세 " + cur.getFullName()
                + " — 십성 " + cur.getSipsung() + ", 12운성 " + cur.getTwelveStage());
            addTransitRelations(f, "DAEUN", "대운 " + cur.getFullName(), cur.getBranchIndex(), natal, null);
        }
        SajuPillar seun = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(today));
        f.addFact("SEUN:BASE", today.getYear() + "년 세운 " + seun.getFullName() + " — 십성 "
            + SajuCalculator.getSipsungName(dayStem, seun.getStemIndex()));
        addTransitRelations(f, "SEUN", "세운 " + seun.getFullName(), seun.getBranchIndex(), natal, null);

        // ── 5) 향후 6개월 월운 + 월 등급 ──
        for (int i = 0; i < 6; i++) {
            LocalDate mid = today.plusMonths(i).withDayOfMonth(15);
            String ym = mid.getYear() + "-" + String.format("%02d", mid.getMonthValue());
            SajuPillar yPil = SajuCalculator.calculateYearPillar(SajuCalculator.getSajuYear(mid));
            SajuPillar mPil = SajuCalculator.calculateMonthPillar(mid, yPil.getStemIndex());
            String sip = SajuCalculator.getSipsungName(dayStem, mPil.getStemIndex());
            int st = SajuCalculator.calculateTwelveStage(dayStem, mPil.getBranchIndex());
            String stName = SajuConstants.TWELVE_STAGES[st];

            List<String> ids = new ArrayList<>();
            List<String> why = new ArrayList<>();
            double score = 0;

            String baseId = "WOLUN:" + ym + ":BASE";
            f.addFact(baseId, ym + " 월운 " + mPil.getFullName() + "월 — 십성 " + sip + ", 12운성 " + stName);

            // 12운성 기세
            if (st == 0 || st == 2 || st == 3 || st == 4) { score += 1; ids.add(baseId); why.add("기세 강함(" + stName + ")"); }
            else if (st >= 6 && st <= 9) { score -= 1; ids.add(baseId); why.add("기세 약함(" + stName + ")"); }

            // 월지 vs 원국 지지
            double[] rs = new double[1];
            addTransitRelations(f, "WOLUN:" + ym, ym + " 월운 " + mPil.getFullName(), mPil.getBranchIndex(), natal,
                (id, desc, delta) -> { ids.add(id); why.add(desc); rs[0] += delta; });
            score += rs[0];

            // 월간 오행이 보완/부담
            int stemEl = SajuConstants.CHEONGAN_OHENG[mPil.getStemIndex()];
            if (helpNames.contains(EL[stemEl])) {
                String id = "WOLUN:" + ym + ":ELEM:HELP";
                f.addFact(id, ym + " 월운 천간 " + mPil.getStemName() + "(" + EL[stemEl] + ")이 보완 오행 후보와 일치");
                ids.add(id); why.add("보완 오행(" + EL[stemEl] + ") 유입"); score += 1.5;
            } else if (("신강 후보".equals(label) && (stemEl == dEl || stemEl == inEl))
                    || ("신약 후보".equals(label) && (stemEl == sikEl || stemEl == jaeEl || stemEl == gwanEl))) {
                String id = "WOLUN:" + ym + ":ELEM:BURDEN";
                f.addFact(id, ym + " 월운 천간 " + mPil.getStemName() + "(" + EL[stemEl] + ")이 " + label + " 사주에 부담을 더하는 오행");
                ids.add(id); why.add("부담 오행(" + EL[stemEl] + ")"); score -= 1.0;
            }

            String grade = score >= GRADE_GOOD ? "유리" : score <= GRADE_BAD ? "주의" : "보통";
            String summary = why.isEmpty() ? "특이 사항 없음" : String.join(" · ", why);
            f.addMonth(new DecisionFacts.MonthTiming(ym, mid.getMonthValue(), mPil.getFullName(), grade,
                Math.round(score * 10) / 10.0, ids, summary));
        }
        return f;
    }

    // ───────────────────────── 내부 도구 ─────────────────────────

    private record Natal(int year, int month, int day, int hour) {}

    @FunctionalInterface
    private interface RelSink { void accept(String factId, String desc, double delta); }

    private static void addHidden(double[] energy, int branch, double weight) {
        int[] h = SajuConstants.JIJANGGAN[branch];
        double[] ratios = h.length == 3 ? new double[]{0.1, 0.3, 0.6}
                        : h.length == 2 ? new double[]{0.3, 0.7}
                        : new double[]{1.0};
        for (int k = 0; k < h.length; k++) {
            energy[SajuConstants.CHEONGAN_OHENG[h[k]]] += weight * ratios[k];
        }
    }

    /** 지지 b 가 원국 각 지지와 맺는 충·합·형·해 를 사실로 등록(+ 점수 콜백). */
    private static void addTransitRelations(DecisionFacts f, String prefix, String who, int b, Natal n, RelSink sink) {
        String[][] targets = {
            {"YEAR", "년지"}, {"MONTH", "월지"}, {"DAY", "일지(배우자궁)"}, {"HOUR", "시지"}
        };
        int[] nb = {n.year(), n.month(), n.day(), n.hour()};
        for (int t = 0; t < 4; t++) {
            if (nb[t] < 0) continue;
            boolean day = t == 2;
            for (String rel : relations(b, nb[t])) {
                double delta = switch (rel) {
                    case "충" -> day ? -3.0 : -1.0;
                    case "형" -> day ? -2.0 : -0.5;
                    case "해" -> day ? -1.0 : -0.3;
                    default -> day ? 2.0 : 1.0;   // 육합
                };
                String id = prefix + ":" + targets[t][0] + ":" + relKey(rel);
                String desc = who + "의 지지 " + SajuConstants.JIJI[b] + " ↔ " + targets[t][1] + " "
                    + SajuConstants.JIJI[nb[t]] + " : " + rel;
                f.addFact(id, desc);
                if (sink != null) sink.accept(id, targets[t][1] + " " + rel, delta);
            }
        }
    }

    private static String relKey(String rel) {
        return switch (rel) { case "충" -> "CHUNG"; case "형" -> "HYUNG"; case "해" -> "HAE"; default -> "YUKHAP"; };
    }

    /** 두 지지 사이의 관계 (육합·충·형·해). */
    static List<String> relations(int a, int b) {
        List<String> r = new ArrayList<>();
        for (int[] y : SajuConstants.YUKAP) {
            if ((a == y[0] && b == y[1]) || (a == y[1] && b == y[0])) r.add("육합");
        }
        if (Math.floorMod(a - b, 12) == 6) r.add("충");
        boolean hyung = false;
        int[] mr = SajuConstants.MURYEHYUNG;
        if ((a == mr[0] && b == mr[1]) || (a == mr[1] && b == mr[0])) hyung = true;
        for (int[] sh : SajuConstants.SAMHYUNG) {
            // 삼형의 부분(두 지지만 만나도 형의 기운으로 본다)
            for (int i = 0; i < 3; i++) for (int j = i + 1; j < 3; j++) {
                if ((a == sh[i] && b == sh[j]) || (a == sh[j] && b == sh[i])) hyung = true;
            }
        }
        if (a == b) for (int jh : SajuConstants.JAHYUNG) if (a == jh) hyung = true;
        if (hyung) r.add("형");
        for (int[] h : SajuConstants.HAE) {
            if ((a == h[0] && b == h[1]) || (a == h[1] && b == h[0])) r.add("해");
        }
        return r;
    }
}
