package com.saju.server.service;

import java.util.*;

/**
 * 결정 상담 구조화 입력 — 질문/선택지 스키마(단일 출처) + 답변 파싱 + 위기 문구 감지.
 * 클라이언트는 GET /api/decision/schema 로 이 스키마를 받아 그대로 렌더링한다.
 */
public final class DecisionIntake {

    private DecisionIntake() {}

    public record Option(String code, String label) {}
    public record Question(String key, String label, boolean required, List<Option> options) {}

    private static Option o(String c, String l) { return new Option(c, l); }

    private static final Question SAFETY = new Question("safety",
        "혹시 상대에게 두렵거나 위협을 느낀 적이 있나요?", false, List.of(
            o("none", "아니요"),
            o("threat", "네, 위협·통제를 느낀 적 있어요"),
            o("violence", "네, 폭력·스토킹 등을 겪었어요")));

    private static final Map<String, List<Question>> SCHEMA = new LinkedHashMap<>();
    static {
        SCHEMA.put("reunion", List.of(
            new Question("theirSignal", "상대는 지금 어떤 반응이에요?", true, List.of(
                o("positive", "먼저 연락하거나 호감을 보여요"),
                o("neutral", "연락은 받지만 미지근해요"),
                o("cold", "답장이 없거나 피하는 느낌이에요"),
                o("refuse", "연락·재회를 분명히 거절했어요"))),
            new Question("contactNow", "지금 연락 상태는요?", true, List.of(
                o("active", "서로 연락하고 있어요"),
                o("onesided", "제가 일방적으로 연락해요"),
                o("none", "연락이 끊겼어요"))),
            new Question("cause", "헤어진 가장 큰 이유는요?", true, List.of(
                o("fixable", "오해·상황 때문이었어요"),
                o("values", "가치관·성향 차이였어요"),
                o("betrayal", "신뢰가 깨졌어요 (외도·거짓말 등)"),
                o("unsure", "잘 모르겠어요"))),
            new Question("since", "헤어진 지 얼마나 됐나요?", true, List.of(
                o("lt1", "1개월 미만"), o("m1_3", "1~3개월"), o("m3_6", "3~6개월"), o("gt6", "6개월 이상"))),
            new Question("initiator", "누가 먼저 헤어지자고 했나요?", false, List.of(
                o("me", "제가요"), o("they", "상대가요"), o("mutual", "서로 합의했어요"))),
            SAFETY));
        SCHEMA.put("breakup", List.of(
            new Question("pain", "관계에서 가장 힘든 점은요?", true, List.of(
                o("temp", "일시적인 갈등·권태 같아요"),
                o("burnout", "오래 지치고 힘들어요"),
                o("core", "핵심 가치가 안 맞아요"),
                o("betrayal", "신뢰가 깨졌어요"))),
            new Question("tried", "관계를 위해 노력해 본 적 있어요?", true, List.of(
                o("none", "아직 대화·노력을 안 해봤어요"),
                o("some", "몇 번 대화해 봤어요"),
                o("much", "충분히 노력해 봤어요"))),
            new Question("theirEffort", "상대는 어떤가요?", true, List.of(
                o("willing", "상대도 바꾸려 노력해요"),
                o("unsure", "잘 모르겠어요"),
                o("unwilling", "상대는 바뀔 생각이 없어 보여요"))),
            new Question("certainty", "지금 내 마음은요?", true, List.of(
                o("sure", "마음이 거의 정해졌어요"),
                o("unsure", "아직 마음이 흔들려요"))),
            SAFETY));
        SCHEMA.put("confess", List.of(
            new Question("theirSignal", "상대는 나에게 어떤 반응이에요?", true, List.of(
                o("positive", "호감을 보이는 것 같아요"),
                o("neutral", "잘 모르겠어요 / 평범해요"),
                o("cold", "거리를 두는 느낌이에요"),
                o("refuse", "이미 거절하거나 선을 그었어요"))),
            new Question("relation", "상대와는 어떤 사이예요?", true, List.of(
                o("close", "친한 사이"), o("acquaint", "알고 지내는 사이"),
                o("colleague", "직장·학교에서 자주 봐요"), o("stranger", "거의 모르는 사이"))),
            new Question("freq", "얼마나 자주 연락하거나 만나요?", true, List.of(
                o("daily", "거의 매일"), o("weekly", "일주일에 몇 번"), o("rare", "거의 안 해요"))),
            new Question("partner", "상대에게 연인이 있나요?", true, List.of(
                o("single", "솔로인 것 같아요"), o("partner", "연인이 있어요"), o("unknown", "잘 몰라요"))),
            SAFETY));
        SCHEMA.put("marriage", List.of(
            new Question("agreement", "결혼에 대한 두 사람의 생각은요?", true, List.of(
                o("both", "둘 다 결혼 의사를 확인했어요"),
                o("me", "저만 결혼 의사가 있어요"),
                o("they", "상대만 결혼 의사가 있어요"),
                o("none", "아직 이야기한 적 없어요"))),
            new Question("values", "가치관(재정·자녀·거주 등)은요?", true, List.of(
                o("aligned", "대체로 잘 맞아요"), o("minor", "작은 차이가 있어요"), o("major", "큰 차이가 있어요"))),
            new Question("family", "양가 분위기는요?", true, List.of(
                o("ok", "좋아요"), o("concern", "걱정되는 점이 있어요"), o("conflict", "갈등이 있어요"))),
            new Question("duration", "만난 기간은요?", true, List.of(
                o("lt1", "1년 미만"), o("y1_3", "1~3년"), o("gt3", "3년 이상"))),
            SAFETY));
    }

    public static boolean isValidCategory(String category) { return SCHEMA.containsKey(category); }

    public static List<Question> questions(String category) {
        return SCHEMA.getOrDefault(category, List.of());
    }

    /** 클라이언트 전달용 스키마(JSON 직렬화 가능한 Map). */
    public static Map<String, Object> schemaForClient() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (var e : SCHEMA.entrySet()) {
            List<Map<String, Object>> qs = new ArrayList<>();
            for (Question q : e.getValue()) {
                Map<String, Object> qm = new LinkedHashMap<>();
                qm.put("key", q.key());
                qm.put("label", q.label());
                qm.put("required", q.required());
                List<Map<String, String>> opts = new ArrayList<>();
                for (Option op : q.options()) opts.add(Map.of("code", op.code(), "label", op.label()));
                qm.put("options", opts);
                qs.add(qm);
            }
            out.put(e.getKey(), qs);
        }
        return out;
    }

    /**
     * "k:v;k:v" 형식 답변 파싱. 스키마에 없는 키·값은 버린다(주입 방어). 키 정렬(TreeMap) → 캐시 키 안정.
     */
    public static Map<String, String> parseAnswers(String category, String raw) {
        Map<String, String> out = new TreeMap<>();
        if (raw == null || raw.isBlank()) return out;
        Map<String, Set<String>> allowed = new HashMap<>();
        for (Question q : questions(category)) {
            Set<String> codes = new HashSet<>();
            for (Option op : q.options()) codes.add(op.code());
            allowed.put(q.key(), codes);
        }
        for (String pair : raw.split(";")) {
            int i = pair.indexOf(':');
            if (i <= 0) continue;
            String k = pair.substring(0, i).trim();
            String v = pair.substring(i + 1).trim();
            Set<String> codes = allowed.get(k);
            if (codes != null && codes.contains(v)) out.put(k, v);
        }
        return out;
    }

    // ── 위기 감지 (자유 텍스트) ──
    private static final String[] CRISIS_WORDS = {"자살", "죽고 싶", "죽고싶", "자해", "목숨을 끊", "사라지고 싶", "죽어버리"};
    // "맞았/맞고"는 "잘 맞았다" 같은 일상 표현과 겹쳐 오탐이 커서 제외한다.
    private static final String[] VIOLENCE_WORDS = {"폭행", "폭력", "때렸", "때리", "스토킹", "스토커",
        "협박", "감금", "불법촬영", "몰카", "리벤지", "죽이겠", "죽여버"};

    /** @return "crisis" | "violence" | null */
    public static String detectSafety(Map<String, String> answers, String... freeTexts) {
        StringBuilder sb = new StringBuilder();
        for (String t : freeTexts) if (t != null) sb.append(t).append(' ');
        String text = sb.toString();
        for (String w : CRISIS_WORDS) if (text.contains(w)) return "crisis";
        String s = answers.get("safety");
        if ("threat".equals(s) || "violence".equals(s)) return "violence";
        for (String w : VIOLENCE_WORDS) if (text.contains(w)) return "violence";
        return null;
    }

    /** 자유 텍스트 정규화 — 공백 정리 + 길이 제한 (캐시 키·프롬프트 공용). */
    public static String normalizeText(String t, int max) {
        if (t == null) return "";
        String n = t.replaceAll("\\s+", " ").trim();
        return n.length() > max ? n.substring(0, max) : n;
    }
}
