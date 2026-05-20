package com.saju.server.service;

import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuPillar;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;

/**
 * 결정 상담(Decision Counseling) — 앱의 간판 유료 상품.
 * "오늘의 운세"가 아닌, 사용자가 지금 직면한 결정의 순간을 정조준.
 *
 * 4가지 카테고리(2026-05-19 A안 — 브랜드 유지, 연애 결정):
 *   reunion    : 재회할까 / 헤어진 사람과 다시 만나야 할까
 *   breakup    : 헤어질까 / 이 관계를 끝내야 할까
 *   confess    : 고백할까 / 이 마음을 전해야 할까
 *   marriage   : 결혼할까 / 이 사람과 평생을 약속해야 할까
 *
 * 출력 3원칙:
 *   1. 두루뭉술 금지 — 타이밍("언제가 유리한가") 중심
 *   2. 정직함 — 운세의 관점임을 분명히, 본인 판단 함께 권유
 *   3. yes/no 단정보다 "어떤 조건에서, 언제, 어떻게"
 *
 * 캐시: SpecialFortune 영속 캐시 재활용 (fortuneType="decision_{cat}")
 *       — 같은 입력 = 같은 결과 (사용자 답변 해시로 키 구성)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DecisionService {

    private final ClaudeApiService claudeApiService;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final LocalDate CACHE_ANCHOR = LocalDate.of(2000, 1, 1);

    private static final Map<String, String> CATEGORY_KR = Map.of(
        "reunion", "재회 결정 상담",
        "breakup", "이별 결정 상담",
        "confess", "고백 결정 상담",
        "marriage", "결혼 결정 상담"
    );

    public String getCategoryKr(String category) {
        return CATEGORY_KR.getOrDefault(category, "결정 상담");
    }

    /**
     * 캐시 조회 — 캐시 키는 birthDate + gender + category + 답변 해시.
     */
    public Map<String, Object> getCachedDecision(String category, String birthDate, String gender,
                                                  String partnerInfo, String situation, String history) {
        String cacheKey = buildCacheKey(birthDate, gender, category, partnerInfo, situation, history);
        return getFromCache("decision_" + category, cacheKey);
    }

    /**
     * 스트리밍 프롬프트 빌드 — system, user 2개 반환.
     */
    public String[] buildStreamPrompts(String category, String birthDate, String birthTime, String gender,
                                        String partnerInfo, String situation, String history) {
        String system = buildSystemPrompt(category, gender);
        String user = buildUserPrompt(category, birthDate, birthTime, gender, partnerInfo, situation, history);
        return new String[] { system, user };
    }

    /**
     * 스트리밍 완료 후 결과 파싱 + 영속 캐시 저장.
     */
    public boolean parseAndSaveStreamResult(String category, String birthDate, String gender,
                                            String partnerInfo, String situation, String history,
                                            String fullText) {
        try {
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) {
                log.warn("결정 상담 JSON 추출 실패: category={}", category);
                return false;
            }
            JsonNode node = objectMapper.readTree(json);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("category", category);
            result.put("categoryKr", getCategoryKr(category));
            result.put("birthDate", birthDate);
            result.put("verdict", node.path("verdict").asText("")); // yes/no/wait 3택
            result.put("verdictLabel", node.path("verdictLabel").asText(""));
            result.put("confidence", node.path("confidence").asInt(60)); // 0-100
            result.put("headline", node.path("headline").asText("")); // 한 줄 요지
            result.put("overall", node.path("overall").asText("")); // 종합 분석 5-7문장
            result.put("timing", node.path("timing").asText("")); // 타이밍 분석 4-5문장
            result.put("bestPeriod", node.path("bestPeriod").asText("")); // 최적 시기
            result.put("worstPeriod", node.path("worstPeriod").asText("")); // 피할 시기
            result.put("actionPlan", node.path("actionPlan").asText("")); // 행동 로드맵 3-4문장
            result.put("conditions", node.path("conditions").asText("")); // "이런 조건이면 yes/no" 2-3문장
            result.put("redFlags", node.path("redFlags").asText("")); // 경고 신호 2문장
            result.put("ownerNote", node.path("ownerNote").asText("")); // 본인 판단 권유 (정직함)
            result.put("closing", node.path("closing").asText("")); // 따뜻한 마무리 한 마디

            String cacheKey = buildCacheKey(birthDate, gender, category, partnerInfo, situation, history);
            saveToCache("decision_" + category, cacheKey, result);
            log.info("결정 상담 캐시 저장 완료: category={}, key={}", category, cacheKey);
            return true;
        } catch (Exception e) {
            log.warn("결정 상담 파싱/저장 실패: {}", e.getMessage());
            return false;
        }
    }

    private String buildSystemPrompt(String category, String gender) {
        boolean isMale = "M".equals(gender);
        String persona = isMale
            ? "카페에서 다정한 여사친이 연애 결정 상담해주는 사주 전문가야. 남자 친구에게 옆에서 진지하게 조언하듯 따뜻하고 차분하게 말해줘."
            : "카페에서 든든한 남사친이 연애 결정 상담해주는 사주 전문가야. 여자 친구에게 옆에서 진지하게 조언하듯 따뜻하고 차분하게 말해줘.";

        String catSpecific = switch (category) {
            case "reunion" -> """
【재회 결정 상담 프레임워크】
- 사용자는 지금 헤어진 사람과 재회를 진지하게 고민 중. yes/no를 묻는 게 아니라
  "지금 다시 만나는 게 너에게 유리한지" 사주 흐름으로 판단.
- 이별 원인의 오행 분석: 너 일간 기질에서 비롯된 갈등 vs 외부 요인
- 헤어진 시기와 지금의 천기 비교 → 두 사람의 운기가 회복기인지 충돌기인지 판단
- 재회 가능 시기 구체적으로: 향후 3~6개월 중 어느 월/주가 유리한지
- 재회가 무리한 경우의 신호 3가지도 솔직히 (절대 무조건 yes 권유 금지)
- 행동 로드맵: 1주차 / 2~4주차 / 1~3개월 단계별 권장 행동
- "이런 변화가 있으면 yes, 이런 신호가 보이면 no" 조건 명시
""";
            case "breakup" -> """
【이별 결정 상담 프레임워크】
- 사용자는 지금 관계를 끝내야 할지 진지하게 고민 중. 끊을지 버틸지의 갈림길.
- 절대 가볍게 헤어짐을 권하지 말 것 — 갈등의 본질이 사주 상극인지, 시기적 충돌인지 구분
- 너 일간과 상대의 일간(있다면) 오행 관계로 갈등의 구조적 원인 분석
- 권태기/일시적 충돌 vs 본질적 부조화 판단
- 헤어져야 할 신호 3가지 vs 더 노력해볼 신호 3가지 명확히
- 만약 이별이 필요하다면: 정리하기 좋은 시기와 회복 타임라인
- 만약 더 노력할 만하다면: 관계 회복 행동 로드맵
- 본인 마음의 무게(지금 얼마나 지쳤는지)에 따른 판단 가이드 — 운세는 보조 도구
""";
            case "confess" -> """
【고백 결정 상담 프레임워크】
- 사용자는 지금 좋아하는 사람에게 마음을 전해야 할지 고민 중.
- 너 일간과 일진의 관계로 고백 에너지가 강한지 약한지 판단
- 상대의 사주가 있다면: 상대가 마음을 받을 준비가 되어 있는 시기인지 분석
- 고백 최적 타이밍: 향후 4주 중 가장 좋은 날짜 + 시간대 구체적으로
- 피해야 할 날짜 + 그 이유 (충/형 관계 등)
- 고백 방법: 너 일간 기질에 맞는 방식 (편지/직접/카톡/이벤트 등)
- 성공 확률을 높이는 사전 준비 3가지
- 거절당해도 너에게 남는 것이 있도록 마음을 다지는 조언
- 고백을 보류해야 하는 신호 (이별의 천기 등) 솔직히
""";
            case "marriage" -> """
【결혼 결정 상담 프레임워크】
- 사용자는 지금 만나는 사람과의 결혼을 진지하게 고민 중. 인생 결정.
- 절대 가볍게 단정하지 말 것 — 결혼은 사주만으로 결정될 일이 아님을 분명히
- 너 일간과 상대 일간(있다면) 오행 조합으로 결혼 적합도 분석
- 정재/정관 십성 흐름으로 결혼 기운이 강한 시기 판단
- 결혼 시기 추천: 향후 1~2년 중 길한 월 + 피할 월
- 결혼 전 점검 사항 3가지 (재정/가족/가치관 등)
- 결혼하면 빛날 조합 vs 갈등이 잦을 조합 솔직히
- 결혼 후 일어날 갈등 패턴 예측 + 극복 방법
- 본인의 마음의 확신이 가장 중요함을 반드시 강조 (운세는 보조)
""";
            default -> "결정 상담을 진행합니다.";
        };

        return persona + "\n\n" + catSpecific + """

【결정 상담 작성 3원칙 (반드시 지킬 것)】
1. 두루뭉술 금지 — 구체적 타이밍, 구체적 행동, 구체적 조건 명시
2. 단정 금지 — yes/no 한 단어보다 "어떤 조건에서 / 언제 / 어떻게" 답
3. 정직함 — 운세의 관점임을 분명히, 본인 판단 함께 권유

【작성 규칙】
- 반드시 JSON만 응답 (설명 텍스트, 코드블록 금지)
- 카페에서 친구한테 진지하게 조언하듯 자연스러운 대화체 반말
- 사주 용어는 쉬운 일상어로 풀어서 (한자/사자성어 금지)
- 따뜻한 톤이지만 진지함 유지 — 결정의 무게를 존중
- 이모지는 0~2개만 절제하여 사용
""";
    }

    private String buildUserPrompt(String category, String birthDate, String birthTime, String gender,
                                    String partnerInfo, String situation, String history) {
        LocalDate date = LocalDate.parse(birthDate);
        LocalDate today = LocalDate.now();
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);
        SajuPillar todayPillar = SajuCalculator.calculateDayPillar(today);

        StringBuilder sb = new StringBuilder();
        sb.append("【오늘】").append(today).append(" (").append(todayPillar.getFullName()).append("일)\n");
        sb.append("【상담 카테고리】").append(getCategoryKr(category)).append("\n");
        sb.append("【친구】").append(yearPillar.getAnimal()).append("띠 / 일간: ").append(dayPillar.getFullName());
        if (gender != null) sb.append(" / 성별: ").append("M".equals(gender) ? "남" : "여");
        if (birthTime != null && !birthTime.isBlank()) sb.append(" / 태어난 시간: ").append(birthTime);
        sb.append("\n");

        if (partnerInfo != null && !partnerInfo.isBlank()) {
            sb.append("【상대방 정보】").append(partnerInfo).append("\n");
        }
        if (situation != null && !situation.isBlank()) {
            sb.append("【현재 상황】").append(situation).append("\n");
        }
        if (history != null && !history.isBlank()) {
            sb.append("【관계의 흐름】").append(history).append("\n");
        }

        sb.append("\n위 정보를 바탕으로 '").append(getCategoryKr(category)).append("' 분석을 진행하세요.\n");
        sb.append("반드시 아래 JSON 형식으로만 응답:\n");
        sb.append("""
{
  "verdict": "yes / no / wait 중 하나",
  "verdictLabel": "한 줄 결정 라벨 (예: '신중히 yes', '조심스러운 no', '한 달 더 기다려')",
  "confidence": 0-100 (운세 흐름으로 본 확신도),
  "headline": "한 줄 핵심 요지 (15자 내외)",
  "overall": "종합 분석 5-7문장 (사주 흐름 + 상황 종합)",
  "timing": "타이밍 분석 4-5문장 (지금이 어떤 시기인지)",
  "bestPeriod": "가장 유리한 시기 구체적으로 (월/주, 1-2문장)",
  "worstPeriod": "피해야 할 시기 구체적으로 (월/주, 1-2문장)",
  "actionPlan": "행동 로드맵 1주차/1개월/3개월 단계별 3-4문장",
  "conditions": "yes로 가는 조건 vs no로 가는 조건 2-3문장",
  "redFlags": "주의해야 할 신호 2문장",
  "ownerNote": "운세는 참고일 뿐 본인 판단이 가장 중요하다는 따뜻한 권유 1-2문장",
  "closing": "따뜻한 마무리 한 마디 (20자 내외, 이모지 1개 허용)"
}
""");
        return sb.toString();
    }

    // ═══ 캐시 헬퍼 ═══

    private String buildCacheKey(String... parts) {
        String raw = String.join("|", Arrays.stream(parts).map(p -> p != null ? p : "").toArray(String[]::new));
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
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, CACHE_ANCHOR);
            if (cached.isPresent()) {
                log.debug("결정 상담 캐시 히트: {} / {}", type, cacheKey);
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            log.warn("결정 상담 캐시 읽기 실패: {}", e.getMessage());
        }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result) {
        try {
            var existing = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, CACHE_ANCHOR);
            if (existing.isPresent()) {
                log.info("결정 상담 캐시 이미 존재: {} / {}", type, cacheKey);
                return;
            }
            String json = objectMapper.writeValueAsString(result);
            SpecialFortune entity = SpecialFortune.builder()
                .fortuneType(type)
                .cacheKey(cacheKey)
                .fortuneDate(CACHE_ANCHOR)
                .resultJson(json)
                .build();
            specialFortuneRepository.save(entity);
            log.info("결정 상담 캐시 저장: {} / {}", type, cacheKey);
        } catch (Exception e) {
            log.warn("결정 상담 캐시 저장 실패: {}", e.getMessage());
        }
    }
}
