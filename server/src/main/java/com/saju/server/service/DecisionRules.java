package com.saju.server.service;

import java.util.*;

/**
 * 결정 상담 "행동 적합성" 판정 — 사용자가 입력한 현실 요인만으로 서버가 결정한다(LLM 관여 없음).
 * 명리(타이밍)는 별도 축(DecisionFacts 월별 등급)으로 다루며 이 판정을 바꾸지 않는다.
 *
 * ⚠️ 점수 배분·임계값은 검증 전 초기값이다(골든 케이스로 조정할 것).
 */
public final class DecisionRules {

    private DecisionRules() {}

    /** 규칙 버전 — 규칙/문구를 바꾸면 올려서 캐시를 무효화한다. */
    public static final String RULES_VERSION = "r1";

    public record Ruling(String safety, String verdict, String verdictLabel, String evidence,
                         List<String> reasons, String safetyMessage) {
        public boolean isSafety() { return safety != null; }
    }

    private static final String CRISIS_MSG =
        "지금 많이 힘든 상황으로 보여요. 운세보다 먼저, 혼자 견디지 말고 도움을 받아 주세요.\n"
        + "• 자살예방 상담전화 109 (24시간)\n• 정신건강 위기상담 1577-0199\n• 긴급한 위험이 있다면 112";
    private static final String VIOLENCE_MSG =
        "폭력·위협·스토킹이 있었다면 이 상담보다 안전이 가장 중요해요. 연락이나 재회, 결혼 같은 결정을 운세로 판단하지 마세요.\n"
        + "• 여성긴급전화 1366 (24시간)\n• 긴급 신고 112\n• 안전한 사람에게 지금 상황을 알려 주세요";

    public static Ruling decide(String category, Map<String, String> a, String freeText1, String freeText2) {
        String safety = DecisionIntake.detectSafety(a, freeText1, freeText2);
        if (safety != null) {
            return new Ruling(safety, "safety", "안전이 먼저예요", "해당 없음", List.of(),
                "crisis".equals(safety) ? CRISIS_MSG : VIOLENCE_MSG);
        }

        String evidence = evidenceLevel(category, a);
        Result r = switch (category) {
            case "reunion" -> reunion(a);
            case "breakup" -> breakup(a);
            case "confess" -> confess(a);
            case "marriage" -> marriage(a);
            default -> new Result("wait", "조금만 더 기다려", List.of("지원하지 않는 상담 유형이에요"), true);
        };

        String verdict = r.verdict;
        String label = r.label;
        List<String> reasons = new ArrayList<>(r.reasons);
        // 근거가 부족하면 단정하지 않는다(하드 NO 는 유지).
        if ("부족".equals(evidence) && !r.hard) {
            verdict = "wait";
            label = "정보가 더 필요해";
            reasons.add(0, "핵심 질문에 답이 부족해서 단정하지 않고 보류했어요");
        }
        return new Ruling(null, verdict, label, evidence, reasons, null);
    }

    // ───────────── 근거 충분도 ─────────────
    static String evidenceLevel(String category, Map<String, String> a) {
        int req = 0, got = 0;
        for (DecisionIntake.Question q : DecisionIntake.questions(category)) {
            if (!q.required()) continue;
            req++;
            if (a.containsKey(q.key())) got++;
        }
        int missing = req - got;
        return missing == 0 ? "충분" : missing == 1 ? "일부 부족" : "부족";
    }

    private record Result(String verdict, String label, List<String> reasons, boolean hard) {}

    private static String grade(int score, int yes, int wait) {
        return score >= yes ? "yes" : score >= wait ? "wait" : "no";
    }

    // ───────────── 카테고리별 규칙 ─────────────

    private static Result reunion(Map<String, String> a) {
        List<String> why = new ArrayList<>();
        String sig = a.getOrDefault("theirSignal", "");
        if ("refuse".equals(sig)) {
            return new Result("no", "상대의 거절을 존중해 멈춰",
                List.of("상대가 연락·재회를 분명히 거절했어요. 이 의사를 존중하는 게 먼저예요."), true);
        }
        int s = 0;
        switch (sig) {
            case "positive" -> { s += 35; why.add("상대가 먼저 반응을 보여요"); }
            case "neutral" -> { s += 15; why.add("상대 반응이 미지근해요"); }
            case "cold" -> why.add("상대가 거리를 두고 있어요");
            default -> {}
        }
        String c = a.getOrDefault("contactNow", "");
        switch (c) {
            case "active" -> { s += 20; why.add("서로 연락이 닿고 있어요"); }
            case "none" -> s += 8;
            case "onesided" -> why.add("일방적인 연락 상태예요");
            default -> {}
        }
        switch (a.getOrDefault("cause", "")) {
            case "fixable" -> { s += 20; why.add("이별 원인이 풀 수 있는 쪽이에요"); }
            case "unsure" -> s += 10;
            case "values" -> { s += 5; why.add("가치관 차이는 다시 만나도 반복되기 쉬워요"); }
            case "betrayal" -> why.add("신뢰가 깨진 경우는 회복에 시간이 오래 걸려요");
            default -> {}
        }
        switch (a.getOrDefault("since", "")) {
            case "m1_3", "m3_6" -> s += 10;
            case "lt1", "gt6" -> s += 5;
            default -> {}
        }
        if (!"they".equals(a.get("initiator")) && a.containsKey("initiator")) s += 5;

        String v = grade(s, 60, 35);
        if ("onesided".equals(c) && "yes".equals(v)) {
            v = "wait";
            why.add("일방적으로 연락하는 상태에서는 먼저 상대의 반응을 확인해야 해요");
        }
        String label = switch (v) {
            case "yes" -> "조심스럽게 연락해 볼 만해";
            case "wait" -> "조금만 더 기다려";
            default -> "지금은 멈추는 게 좋아";
        };
        return new Result(v, label, why, false);
    }

    private static Result breakup(Map<String, String> a) {
        List<String> why = new ArrayList<>();
        int s = 0;
        switch (a.getOrDefault("pain", "")) {
            case "betrayal" -> { s += 30; why.add("신뢰가 깨진 상황이에요"); }
            case "core" -> { s += 30; why.add("핵심 가치가 안 맞는 건 노력만으로 바뀌기 어려워요"); }
            case "burnout" -> { s += 10; why.add("지침은 휴식과 대화로 달라질 수 있어요"); }
            case "temp" -> why.add("일시적 갈등은 시간이 지나면 달라지기도 해요");
            default -> {}
        }
        String tried = a.getOrDefault("tried", "");
        switch (tried) {
            case "much" -> { s += 25; why.add("충분히 노력해 본 상태예요"); }
            case "some" -> s += 12;
            case "none" -> why.add("아직 대화·노력을 해보지 않았어요");
            default -> {}
        }
        switch (a.getOrDefault("theirEffort", "")) {
            case "unwilling" -> { s += 25; why.add("상대가 바뀔 의지가 없어 보여요"); }
            case "unsure" -> s += 10;
            case "willing" -> why.add("상대도 노력할 의지가 있어요");
            default -> {}
        }
        String cert = a.getOrDefault("certainty", "");
        if ("sure".equals(cert)) { s += 15; why.add("마음이 어느 정도 정해졌어요"); }

        String v = grade(s, 65, 35);
        if ("yes".equals(v) && "none".equals(tried)) { v = "wait"; why.add("대화·노력을 해보기 전에는 끝내는 결정을 권하지 않아요"); }
        if ("yes".equals(v) && !"sure".equals(cert)) { v = "wait"; why.add("마음이 흔들리는 동안은 결정을 서두르지 않는 게 좋아요"); }
        String label = switch (v) {
            case "yes" -> "이별을 진지하게 결정해도 돼";
            case "wait" -> "조금 더 시간을 갖고 생각해";
            default -> "서두르지 말고 먼저 노력해 봐";
        };
        return new Result(v, label, why, false);
    }

    private static Result confess(Map<String, String> a) {
        List<String> why = new ArrayList<>();
        String sig = a.getOrDefault("theirSignal", "");
        if ("refuse".equals(sig)) {
            return new Result("no", "상대의 뜻을 존중해 멈춰",
                List.of("상대가 이미 거절하거나 선을 그었어요. 그 의사를 존중하는 게 먼저예요."), true);
        }
        if ("partner".equals(a.get("partner"))) {
            return new Result("no", "지금은 멈추는 게 좋아",
                List.of("상대에게 연인이 있는 상황이에요. 고백은 상대와 주변 모두에게 부담이 될 수 있어요."), true);
        }
        int s = 0;
        switch (sig) {
            case "positive" -> { s += 40; why.add("상대가 호감 신호를 보내요"); }
            case "neutral" -> { s += 20; why.add("상대 마음을 아직 알 수 없어요"); }
            case "cold" -> why.add("상대가 거리를 두는 느낌이에요");
            default -> {}
        }
        switch (a.getOrDefault("relation", "")) {
            case "close" -> s += 20;
            case "acquaint" -> s += 12;
            case "colleague" -> s += 8;
            default -> {}
        }
        switch (a.getOrDefault("freq", "")) {
            case "daily" -> { s += 20; why.add("자주 연락하고 만나는 사이예요"); }
            case "weekly" -> s += 12;
            case "rare" -> why.add("접점이 적어서 마음을 전하기 전에 가까워질 시간이 필요해요");
            default -> {}
        }
        if ("single".equals(a.get("partner"))) s += 10;

        String v = grade(s, 65, 35);
        String label = switch (v) {
            case "yes" -> "마음을 전해도 좋아";
            case "wait" -> "조금 더 가까워진 뒤에 전해";
            default -> "지금은 멈추는 게 좋아";
        };
        return new Result(v, label, why, false);
    }

    private static Result marriage(Map<String, String> a) {
        List<String> why = new ArrayList<>();
        int s = 0;
        String agree = a.getOrDefault("agreement", "");
        switch (agree) {
            case "both" -> { s += 35; why.add("두 사람 모두 결혼 의사를 확인했어요"); }
            case "me", "they" -> { s += 10; why.add("한쪽만 결혼 의사가 있어요. 둘의 합의가 먼저예요"); }
            case "none" -> why.add("결혼에 대한 대화를 아직 하지 않았어요");
            default -> {}
        }
        String values = a.getOrDefault("values", "");
        switch (values) {
            case "aligned" -> { s += 25; why.add("가치관이 대체로 맞아요"); }
            case "minor" -> s += 12;
            case "major" -> why.add("재정·자녀·거주 같은 큰 가치관 차이가 있어요");
            default -> {}
        }
        switch (a.getOrDefault("family", "")) {
            case "ok" -> s += 15;
            case "concern" -> { s += 8; why.add("양가 관련 걱정거리가 있어요"); }
            case "conflict" -> why.add("양가 갈등은 결혼 후에도 이어지기 쉬워요");
            default -> {}
        }
        switch (a.getOrDefault("duration", "")) {
            case "gt3" -> s += 15;
            case "y1_3" -> s += 10;
            case "lt1" -> { s += 3; why.add("만난 기간이 아직 짧아요"); }
            default -> {}
        }

        String v = grade(s, 65, 40);
        if ("yes".equals(v) && !"both".equals(agree)) { v = "wait"; why.add("두 사람의 합의 없이는 진행을 권하지 않아요"); }
        if ("yes".equals(v) && "major".equals(values)) { v = "wait"; why.add("큰 가치관 차이를 풀기 전에는 보류가 좋아요"); }
        String label = switch (v) {
            case "yes" -> "결혼을 진지하게 진행해도 좋아";
            case "wait" -> "조금 더 대화를 쌓고 결정해";
            default -> "지금은 결혼 결정을 미루는 게 좋아";
        };
        return new Result(v, label, why, false);
    }
}
