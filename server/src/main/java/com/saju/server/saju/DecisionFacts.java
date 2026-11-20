package com.saju.server.saju;

import java.util.*;

/**
 * 결정 상담용 명리 "사실(fact)" 묶음 — 서버가 계산한 값만 담는다.
 * LLM 은 여기 있는 factId 만 인용할 수 있고, 여기 없는 합충·십성·시기를 지어내면 서버가 걸러낸다.
 */
public class DecisionFacts {

    /** 사실 1건. id 는 LLM 이 인용하는 키. */
    public record Fact(String id, String text) {}

    /** 월별 타이밍 1건 (서버가 등급까지 확정). */
    public record MonthTiming(String ym, int month, String pillar, String grade, double score,
                              List<String> factIds, String summary) {}

    private final String strengthLabel;       // 신강 후보 / 신약 후보 / 중화(판단 유보)
    private final double strengthRatio;       // 0~1
    private final List<String> helpfulElements;  // 보완 오행 후보
    private final List<Fact> facts = new ArrayList<>();
    private final List<MonthTiming> months = new ArrayList<>();

    public DecisionFacts(String strengthLabel, double strengthRatio, List<String> helpfulElements) {
        this.strengthLabel = strengthLabel;
        this.strengthRatio = strengthRatio;
        this.helpfulElements = helpfulElements;
    }

    public void addFact(String id, String text) { facts.add(new Fact(id, text)); }
    public void addMonth(MonthTiming m) { months.add(m); }

    public String getStrengthLabel() { return strengthLabel; }
    public double getStrengthRatio() { return strengthRatio; }
    public List<String> getHelpfulElements() { return helpfulElements; }
    public List<Fact> getFacts() { return facts; }
    public List<MonthTiming> getMonths() { return months; }

    public Set<String> factIds() {
        Set<String> s = new LinkedHashSet<>();
        for (Fact f : facts) s.add(f.id());
        return s;
    }

    public Optional<Fact> find(String id) {
        return facts.stream().filter(f -> f.id().equals(id)).findFirst();
    }

    /** 허용된 월(1~12) 집합 — 이 밖의 "N월" 언급은 환각으로 본다. */
    public Set<Integer> allowedMonths() {
        Set<Integer> s = new LinkedHashSet<>();
        for (MonthTiming m : months) s.add(m.month());
        return s;
    }

    /** 가장 유리한 달 (유리 등급 중 최고 점수). 없으면 null. */
    public MonthTiming bestMonth() {
        return months.stream().filter(m -> "유리".equals(m.grade()))
            .max(Comparator.comparingDouble(MonthTiming::score)).orElse(null);
    }

    /** 가장 주의할 달 (주의 등급 중 최저 점수). 없으면 null. */
    public MonthTiming worstMonth() {
        return months.stream().filter(m -> "주의".equals(m.grade()))
            .min(Comparator.comparingDouble(MonthTiming::score)).orElse(null);
    }
}
