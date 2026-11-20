package com.saju.server.saju;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class DecisionFactsBuilderTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 20);

    @Test
    void buildsSixMonthsAndConsistentFactIds() {
        DecisionFacts f = DecisionFactsBuilder.build(LocalDate.of(1990, 5, 15), null, true, TODAY);
        assertEquals(6, f.getMonths().size());
        assertEquals(Set.of(11, 12, 1, 2, 3, 4), f.allowedMonths());

        Set<String> ids = f.factIds();
        assertEquals(ids.size(), f.getFacts().size(), "factId 는 중복이 없어야 한다");
        for (DecisionFacts.MonthTiming m : f.getMonths()) {
            for (String id : m.factIds()) assertTrue(ids.contains(id), "월 등급 근거가 사실 목록에 있어야 한다: " + id);
            assertTrue(List.of("유리", "보통", "주의").contains(m.grade()));
        }
        assertNotNull(f.getStrengthLabel());
        assertTrue(ids.contains("NATAL:PILLARS"));
        assertTrue(ids.contains("NATAL:STRENGTH"));
        assertTrue(ids.contains("SEUN:BASE"));
    }

    @Test
    void deterministicForSameInput() {
        DecisionFacts a = DecisionFactsBuilder.build(LocalDate.of(1995, 3, 2), "오시", false, TODAY);
        DecisionFacts b = DecisionFactsBuilder.build(LocalDate.of(1995, 3, 2), "오시", false, TODAY);
        assertEquals(a.getStrengthLabel(), b.getStrengthLabel());
        assertEquals(a.getFacts(), b.getFacts());
        assertEquals(a.getMonths(), b.getMonths());
    }

    @Test
    void hourPillarChangesFactsButNotCrash() {
        DecisionFacts noHour = DecisionFactsBuilder.build(LocalDate.of(1988, 8, 8), "", true, TODAY);
        DecisionFacts withHour = DecisionFactsBuilder.build(LocalDate.of(1988, 8, 8), "자시", true, TODAY);
        assertTrue(noHour.find("NATAL:PILLARS").get().text().contains("시주 미상"));
        assertFalse(withHour.find("NATAL:PILLARS").get().text().contains("시주 미상"));
    }

    /** 임계값이 한쪽으로 쏠리지 않는지(전부 신강/전부 신약) 분포 점검. */
    @Test
    void strengthDistributionIsNotDegenerate() {
        Map<String, Integer> dist = new TreeMap<>();
        int total = 0;
        for (LocalDate d = LocalDate.of(1960, 1, 1); d.isBefore(LocalDate.of(2006, 1, 1)); d = d.plusDays(9)) {
            DecisionFacts f = DecisionFactsBuilder.build(d, "오시", true, TODAY);
            dist.merge(f.getStrengthLabel(), 1, Integer::sum);
            total++;
            assertTrue(f.getStrengthRatio() >= 0 && f.getStrengthRatio() <= 1.0);
        }
        System.out.println("[strength-dist] total=" + total + " " + dist.toString().replaceAll("[^\\x00-\\x7F]", "?"));
        System.out.println("[strength-dist-raw] " + dist.values());
        for (var e : dist.entrySet()) {
            double share = e.getValue() / (double) total;
            assertTrue(share < 0.75, e.getKey() + " 쏠림: " + share);
        }
        assertTrue(dist.size() >= 2, "라벨이 최소 2종류는 나와야 한다: " + dist);
    }

    @Test
    void branchRelations() {
        assertTrue(DecisionFactsBuilder.relations(0, 6).contains("충"));      // 자오충
        assertTrue(DecisionFactsBuilder.relations(0, 1).contains("육합"));    // 자축합
        assertTrue(DecisionFactsBuilder.relations(2, 5).contains("형"));      // 인사형
        assertTrue(DecisionFactsBuilder.relations(2, 5).contains("해"));      // 인사해
        assertTrue(DecisionFactsBuilder.relations(0, 3).contains("형"));      // 자묘 무례지형
        assertTrue(DecisionFactsBuilder.relations(6, 6).contains("형"));      // 오오 자형
        assertTrue(DecisionFactsBuilder.relations(0, 0).isEmpty());           // 자자 (자형 아님)
        assertTrue(DecisionFactsBuilder.relations(0, 4).isEmpty());           // 자진 (삼합의 일부, 쌍 관계 없음)
    }

    @Test
    void monthGradeReactsToSpouseBranchClash() {
        // 월운 지지가 일지와 충이면 점수에 반영되어 있어야 한다 — 어떤 달이든 근거 id 가 사실 목록에 존재
        for (LocalDate d = LocalDate.of(1985, 1, 1); d.isBefore(LocalDate.of(2000, 1, 1)); d = d.plusDays(37)) {
            DecisionFacts f = DecisionFactsBuilder.build(d, "", false, TODAY);
            for (DecisionFacts.MonthTiming m : f.getMonths()) {
                boolean clashDay = m.factIds().stream().anyMatch(id -> id.endsWith(":DAY:CHUNG"));
                // 일지 충(-3) 대비 가능한 최대 가산(기세 +1, 보완오행 +1.5, 육합 최대 +2) = 4.5 → 합계 ≤ 1.5 < 유리 임계(2.0)
                if (clashDay) assertNotEquals("유리", m.grade(), "일지 충이 있는 달은 '유리'일 수 없다: " + m);
            }
        }
    }
}
