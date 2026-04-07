package com.saju.server.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BiorhythmService {

    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int PHYSICAL_CYCLE = 23;
    private static final int EMOTIONAL_CYCLE = 28;
    private static final int INTELLECTUAL_CYCLE = 33;
    private static final int INTUITION_CYCLE = 38;

    /**
     * 바이오리듬 전체 데이터 반환
     */
    public Map<String, Object> getBiorhythm(String birthDateStr) {
        LocalDate birthDate = LocalDate.parse(birthDateStr);
        LocalDate today = LocalDate.now();
        long daysSinceBirth = ChronoUnit.DAYS.between(birthDate, today);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("birthDate", birthDateStr);
        result.put("today", today.format(DateTimeFormatter.ISO_LOCAL_DATE));

        // 오늘의 바이오리듬 값
        Map<String, Object> cycles = new LinkedHashMap<>();
        cycles.put("physical", buildCycleInfo(daysSinceBirth, PHYSICAL_CYCLE, "신체"));
        cycles.put("emotional", buildCycleInfo(daysSinceBirth, EMOTIONAL_CYCLE, "감성"));
        cycles.put("intellectual", buildCycleInfo(daysSinceBirth, INTELLECTUAL_CYCLE, "지성"));
        cycles.put("intuition", buildCycleInfo(daysSinceBirth, INTUITION_CYCLE, "직감"));
        result.put("cycles", cycles);

        // 오늘의 조언
        result.put("todayAdvice", generateTodayAdvice(daysSinceBirth));

        // 위험한 날짜들 (앞뒤 15일 내에서 0을 지나는 날)
        result.put("criticalDays", findCriticalDays(birthDate, today));

        // 30일 차트 데이터 (today - 15 ~ today + 14)
        result.put("chart", buildChartData(birthDate, today));

        return result;
    }

    // ──────────────────────────────────────────────
    // 사이클 정보 생성
    // ──────────────────────────────────────────────

    private Map<String, Object> buildCycleInfo(long daysSinceBirth, int cycle, String label) {
        double value = Math.sin(2 * Math.PI * daysSinceBirth / cycle);
        int percentage = (int) Math.round(value * 100);
        String phase = determinePhase(daysSinceBirth, cycle);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("value", Math.round(value * 100.0) / 100.0);
        info.put("percentage", percentage);
        info.put("phase", phase);
        info.put("label", label);
        return info;
    }

    private String determinePhase(long daysSinceBirth, int cycle) {
        double position = (daysSinceBirth % cycle) / (double) cycle;
        double todayValue = Math.sin(2 * Math.PI * daysSinceBirth / cycle);
        double tomorrowValue = Math.sin(2 * Math.PI * (daysSinceBirth + 1) / cycle);

        // 0점 근처 (전환기)
        if (Math.abs(todayValue) < 0.1) {
            return "전환기";
        }
        // 상승 중
        if (tomorrowValue > todayValue) {
            if (todayValue > 0) return "상승기";
            else return "회복기";
        }
        // 하강 중
        else {
            if (todayValue > 0) return "하강기";
            else return "저조기";
        }
    }

    // ──────────────────────────────────────────────
    // 오늘의 조언 생성
    // ──────────────────────────────────────────────

    private String generateTodayAdvice(long daysSinceBirth) {
        double physical = Math.sin(2 * Math.PI * daysSinceBirth / PHYSICAL_CYCLE);
        double emotional = Math.sin(2 * Math.PI * daysSinceBirth / EMOTIONAL_CYCLE);
        double intellectual = Math.sin(2 * Math.PI * daysSinceBirth / INTELLECTUAL_CYCLE);
        double intuition = Math.sin(2 * Math.PI * daysSinceBirth / INTUITION_CYCLE);

        List<String> advices = new ArrayList<>();

        // 신체 리듬
        if (physical > 0.7) {
            advices.add("신체 리듬이 최고조입니다! 운동이나 야외 활동에 최적의 날입니다.");
        } else if (physical > 0.3) {
            advices.add("신체 에너지가 양호합니다. 적당한 운동으로 활력을 유지하세요.");
        } else if (physical > -0.3) {
            advices.add("신체 리듬이 전환기에 있습니다. 무리한 활동은 피하세요.");
        } else if (physical > -0.7) {
            advices.add("신체 에너지가 낮은 시기입니다. 충분한 휴식을 취하세요.");
        } else {
            advices.add("신체 리듬이 저조합니다. 오늘은 몸을 쉬게 해주는 것이 최선입니다.");
        }

        // 감성 리듬
        if (emotional > 0.7) {
            advices.add("감성이 풍부한 날입니다. 예술 활동이나 소중한 사람과의 대화가 좋습니다.");
        } else if (emotional > 0.3) {
            advices.add("감정이 안정적입니다. 인간관계에서 좋은 일이 생길 수 있습니다.");
        } else if (emotional > -0.3) {
            advices.add("감정 리듬이 전환 중입니다. 충동적인 결정은 피하세요.");
        } else if (emotional > -0.7) {
            advices.add("감정적으로 예민한 시기입니다. 스트레스 관리에 신경 쓰세요.");
        } else {
            advices.add("감성이 저조합니다. 혼자만의 시간으로 마음을 충전하세요.");
        }

        // 지성 리듬
        if (intellectual > 0.7) {
            advices.add("두뇌 활동이 최고조! 중요한 결정이나 학습에 최적입니다.");
        } else if (intellectual > 0.3) {
            advices.add("집중력이 좋은 편입니다. 업무나 공부에 효율적인 하루가 될 것입니다.");
        } else if (intellectual > -0.3) {
            advices.add("지성 리듬이 전환기에 있습니다. 단순 반복 작업이 적합합니다.");
        } else if (intellectual > -0.7) {
            advices.add("집중력이 떨어질 수 있습니다. 중요한 결정은 미루는 것이 좋습니다.");
        } else {
            advices.add("두뇌 활동이 저조합니다. 오늘은 가벼운 활동 위주로 보내세요.");
        }

        // 직감 리듬 (보너스)
        if (intuition > 0.5) {
            advices.add("직감이 빛나는 날! 느낌을 믿어도 좋습니다.");
        } else if (intuition < -0.5) {
            advices.add("직감이 흐린 날입니다. 데이터와 사실에 기반한 판단을 하세요.");
        }

        return String.join(" ", advices);
    }

    // ──────────────────────────────────────────────
    // 위험일(전환일) 탐색
    // ──────────────────────────────────────────────

    private List<String> findCriticalDays(LocalDate birthDate, LocalDate today) {
        List<String> criticalDays = new ArrayList<>();
        LocalDate start = today.minusDays(15);
        LocalDate end = today.plusDays(15);
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            long days = ChronoUnit.DAYS.between(birthDate, date);
            long nextDays = days + 1;

            boolean isCritical = false;

            // 각 사이클에서 부호가 바뀌는지 (0을 지나는지) 체크
            if (crossesZero(days, nextDays, PHYSICAL_CYCLE)) isCritical = true;
            if (crossesZero(days, nextDays, EMOTIONAL_CYCLE)) isCritical = true;
            if (crossesZero(days, nextDays, INTELLECTUAL_CYCLE)) isCritical = true;
            if (crossesZero(days, nextDays, INTUITION_CYCLE)) isCritical = true;

            if (isCritical) {
                criticalDays.add(date.format(fmt));
            }
        }
        return criticalDays;
    }

    private boolean crossesZero(long days, long nextDays, int cycle) {
        double val1 = Math.sin(2 * Math.PI * days / cycle);
        double val2 = Math.sin(2 * Math.PI * nextDays / cycle);
        // 부호가 다르면 0을 지남
        return (val1 > 0 && val2 < 0) || (val1 < 0 && val2 > 0);
    }

    // ──────────────────────────────────────────────
    // 30일 차트 데이터
    // ──────────────────────────────────────────────

    private List<Map<String, Object>> buildChartData(LocalDate birthDate, LocalDate today) {
        List<Map<String, Object>> chart = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;

        for (int offset = -15; offset <= 14; offset++) {
            LocalDate date = today.plusDays(offset);
            long days = ChronoUnit.DAYS.between(birthDate, date);

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", date.format(fmt));
            point.put("physical", (int) Math.round(Math.sin(2 * Math.PI * days / PHYSICAL_CYCLE) * 100));
            point.put("emotional", (int) Math.round(Math.sin(2 * Math.PI * days / EMOTIONAL_CYCLE) * 100));
            point.put("intellectual", (int) Math.round(Math.sin(2 * Math.PI * days / INTELLECTUAL_CYCLE) * 100));
            point.put("intuition", (int) Math.round(Math.sin(2 * Math.PI * days / INTUITION_CYCLE) * 100));
            chart.add(point);
        }
        return chart;
    }

    // ══════════════════════════════════════════════
    // AI 스트리밍 관련 메서드
    // ══════════════════════════════════════════════

    /**
     * 스트리밍용 컨텍스트 빌드
     * [0]=systemPrompt, [1]=userPrompt, [2]=cacheKey, [3]=cached(있으면)
     */
    public Object[] buildStreamContext(String birthDateStr) {
        LocalDate birthDate = LocalDate.parse(birthDateStr);
        LocalDate today = LocalDate.now();
        long daysSinceBirth = ChronoUnit.DAYS.between(birthDate, today);

        String dbCacheKey = buildCacheKey("biorhythm", birthDateStr, today.toString());
        Map<String, Object> dbCached = getFromCache("biorhythm", dbCacheKey);
        if (dbCached != null) {
            return new Object[]{ null, null, dbCacheKey, dbCached };
        }

        // 바이오리듬 수치 계산
        int physical = (int) Math.round(Math.sin(2 * Math.PI * daysSinceBirth / PHYSICAL_CYCLE) * 100);
        int emotional = (int) Math.round(Math.sin(2 * Math.PI * daysSinceBirth / EMOTIONAL_CYCLE) * 100);
        int intellectual = (int) Math.round(Math.sin(2 * Math.PI * daysSinceBirth / INTELLECTUAL_CYCLE) * 100);
        int intuition = (int) Math.round(Math.sin(2 * Math.PI * daysSinceBirth / INTUITION_CYCLE) * 100);

        String physicalPhase = determinePhase(daysSinceBirth, PHYSICAL_CYCLE);
        String emotionalPhase = determinePhase(daysSinceBirth, EMOTIONAL_CYCLE);
        String intellectualPhase = determinePhase(daysSinceBirth, INTELLECTUAL_CYCLE);
        String intuitionPhase = determinePhase(daysSinceBirth, INTUITION_CYCLE);

        String systemPrompt = "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 바이오리듬 전문가.\n"
            + "자연스러운 대화체 반말로 작성. 딱딱한 보고서 톤이나 격식체 절대 금지.\n"
            + "반드시 JSON으로만 응답.\n\n"
            + "【규칙】\n"
            + "1. overall: 오늘 바이오리듬 종합 해석 3-4문장\n"
            + "2. physical: 신체 리듬에 대한 구체적 조언 2-3문장\n"
            + "3. emotional: 감정 리듬에 대한 구체적 조언 2-3문장\n"
            + "4. intellectual: 지성 리듬에 대한 구체적 조언 2-3문장\n"
            + "5. intuition: 직관 리듬에 대한 구체적 조언 2-3문장\n"
            + "6. advice: 오늘 하루를 잘 보내기 위한 총평 조언 2-3문장\n"
            + "7. score: 오늘의 종합 컨디션 점수 (0-100)\n\n"
            + "응답 형식:\n"
            + "{\"overall\":\"종합 해석\",\"physical\":\"신체 조언\",\"emotional\":\"감정 조언\","
            + "\"intellectual\":\"지성 조언\",\"intuition\":\"직관 조언\",\"advice\":\"오늘의 총평 조언\",\"score\":75}";

        String userPrompt = String.format(
            "오늘의 바이오리듬 수치:\n"
            + "- 신체 리듬: %d%% (%s)\n"
            + "- 감정 리듬: %d%% (%s)\n"
            + "- 지성 리듬: %d%% (%s)\n"
            + "- 직관 리듬: %d%% (%s)\n\n"
            + "이 수치들을 종합 분석해서 오늘 하루 어떻게 보내면 좋을지 알려줘.",
            physical, physicalPhase,
            emotional, emotionalPhase,
            intellectual, intellectualPhase,
            intuition, intuitionPhase
        );

        return new Object[]{ systemPrompt, userPrompt, dbCacheKey, null };
    }

    /**
     * 스트리밍 완료 후 캐시 저장
     */
    @Transactional
    public void saveStreamResult(String birthDateStr, String fullText) {
        try {
            LocalDate today = LocalDate.now();
            String dbCacheKey = buildCacheKey("biorhythm", birthDateStr, today.toString());

            String cleanJson = ClaudeApiService.extractJson(fullText);
            if (cleanJson != null) {
                Map<String, Object> resultMap = objectMapper.readValue(cleanJson, new TypeReference<Map<String, Object>>() {});
                saveToCache("biorhythm", dbCacheKey, resultMap);
                log.info("Biorhythm AI result cached for birthDate={}", birthDateStr);
            }
        } catch (Exception e) {
            log.warn("Biorhythm stream cache save failed: {}", e.getMessage());
        }
    }

    // ===== DB 캐싱 헬퍼 메서드 =====

    private String buildCacheKey(String... parts) {
        String raw = String.join("|", java.util.Arrays.stream(parts).map(p -> p != null ? p : "").toArray(String[]::new));
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++) sb.append(String.format("%02x", digest[i]));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(raw.hashCode());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String type, String cacheKey) {
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, LocalDate.now());
            if (cached.isPresent()) {
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result) {
        try {
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(type).cacheKey(cacheKey).fortuneDate(LocalDate.now())
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) { /* ignore duplicate */ }
    }
}
