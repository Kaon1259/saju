package com.saju.server.service;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class DecisionRulesTest {

    private static Map<String, String> a(String... kv) {
        Map<String, String> m = new java.util.TreeMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put(kv[i], kv[i + 1]);
        return m;
    }

    @Test
    void explicitRefusalIsHardNoEvenWithEverythingElsePositive() {
        var r = DecisionRules.decide("reunion",
            a("theirSignal", "refuse", "contactNow", "active", "cause", "fixable", "since", "m1_3"), "", "");
        assertEquals("no", r.verdict());
        assertFalse(r.isSafety());
    }

    @Test
    void sameSituationSameVerdict_differentSituationDifferentVerdict() {
        var positive = a("theirSignal", "positive", "contactNow", "active", "cause", "fixable", "since", "m1_3");
        var cold = a("theirSignal", "cold", "contactNow", "onesided", "cause", "betrayal", "since", "gt6");
        var r1 = DecisionRules.decide("reunion", positive, "", "");
        var r2 = DecisionRules.decide("reunion", positive, "", "");
        var r3 = DecisionRules.decide("reunion", cold, "", "");
        assertEquals(r1, r2, "같은 입력은 같은 판정이어야 한다");
        assertEquals("yes", r1.verdict());
        assertEquals("no", r3.verdict());
        assertEquals("충분", r1.evidence());
    }

    @Test
    void insufficientEvidenceWaits() {
        var r = DecisionRules.decide("reunion", a("theirSignal", "positive"), "", "");
        assertEquals("wait", r.verdict());
        assertEquals("부족", r.evidence());
    }

    @Test
    void onesidedContactCapsYesToWait() {
        var r = DecisionRules.decide("reunion",
            a("theirSignal", "positive", "contactNow", "onesided", "cause", "fixable", "since", "m1_3", "initiator", "me"), "", "");
        assertNotEquals("yes", r.verdict());
    }

    @Test
    void safetyAnswerAndKeywordsOverrideEverything() {
        var full = a("theirSignal", "positive", "contactNow", "active", "cause", "fixable", "since", "m1_3");
        var byAnswer = DecisionRules.decide("reunion",
            a("theirSignal", "positive", "contactNow", "active", "cause", "fixable", "since", "m1_3", "safety", "violence"), "", "");
        assertEquals("violence", byAnswer.safety());
        assertNotNull(byAnswer.safetyMessage());

        var byText = DecisionRules.decide("reunion", full, "그 사람이 나를 때렸어", "");
        assertEquals("violence", byText.safety());

        var crisis = DecisionRules.decide("breakup", a(), "요즘 죽고 싶다는 생각만 들어", "");
        assertEquals("crisis", crisis.safety());
        assertTrue(crisis.safetyMessage().contains("109"));
    }

    @Test
    void ordinaryPhrasesDoNotTriggerSafety() {
        var r = DecisionRules.decide("confess",
            a("theirSignal", "positive", "relation", "close", "freq", "daily", "partner", "single"),
            "우리는 성격이 잘 맞았고 취향도 잘 맞고 있어요. 관계를 끝내고 싶지는 않아요", "");
        assertFalse(r.isSafety());
    }

    @Test
    void confessToPartneredPersonIsNo() {
        var r = DecisionRules.decide("confess",
            a("theirSignal", "positive", "relation", "close", "freq", "daily", "partner", "partner"), "", "");
        assertEquals("no", r.verdict());
    }

    @Test
    void breakupNeedsEffortAndCertaintyForYes() {
        var noEffort = DecisionRules.decide("breakup",
            a("pain", "core", "tried", "none", "theirEffort", "unwilling", "certainty", "sure"), "", "");
        assertNotEquals("yes", noEffort.verdict());
        var ready = DecisionRules.decide("breakup",
            a("pain", "core", "tried", "much", "theirEffort", "unwilling", "certainty", "sure"), "", "");
        assertEquals("yes", ready.verdict());
    }

    @Test
    void marriageYesRequiresMutualAgreementAndNoMajorValueGap() {
        var r1 = DecisionRules.decide("marriage",
            a("agreement", "me", "values", "aligned", "family", "ok", "duration", "gt3"), "", "");
        assertNotEquals("yes", r1.verdict());
        var r2 = DecisionRules.decide("marriage",
            a("agreement", "both", "values", "aligned", "family", "ok", "duration", "gt3"), "", "");
        assertEquals("yes", r2.verdict());
    }

    @Test
    void parseAnswersDropsUnknownKeysAndValues() {
        var m = DecisionIntake.parseAnswers("reunion",
            "theirSignal:positive;evil:1;contactNow:hack;cause:fixable;since:m1_3");
        assertEquals(Set.of("theirSignal", "cause", "since"), m.keySet());
    }

    @Test
    void sanitizeRemovesDisallowedMonthsAndSpecificDates() {
        Set<Integer> allowed = Set.of(11, 12, 1);
        int[] dropped = {0};
        String out = DecisionService.sanitize(
            "12월이 가장 좋아요. 3월에 만나면 좋겠어요. 12월 25일에 연락해 보세요. 6개월 뒤에 다시 생각해 봐요.", allowed, dropped);
        assertTrue(out.contains("12월이 가장 좋아요."));
        assertFalse(out.contains("3월에"));
        assertFalse(out.contains("25일"));
        assertTrue(out.contains("6개월"), "'6개월'은 월 언급이 아니다");
        assertEquals(2, dropped[0]);
        // 11월 vs 1월 경계: 11월 안의 '1월'을 별개로 잡으면 안 된다
        assertFalse(DecisionService.violates("11월 중순이 좋아요", Set.of(11)));
        assertTrue(DecisionService.violates("1월 중순이 좋아요", Set.of(11)));
    }
}
