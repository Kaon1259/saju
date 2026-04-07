package com.saju.server.service;

import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FaceReadingService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT = """
당신은 관상 분석에 빠삭한 운세 전문가야!
동양 관상학이랑 서양 인상학을 융합해서 재밌고 알기 쉽게 풀어주는 게 특기거든.

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로 써줘
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지
- "~하옵소서", "~이로다", "~하시오" 같은 고전적/격식체 표현 절대 금지

【관상 분석 체계】

1. 얼굴형
- 둥근형(원형): 토 기운 — 원만, 사교적, 재물복, 인복 풍부
- 긴형(장형): 목 기운 — 학문적, 예술적, 깊은 사고
- 각진형(방형): 금 기운 — 의지력, 리더십, 추진력, 결단력
- 역삼각형: 화 기운 — 창의적, 민첩, 영감이 뛰어남
- 타원형(난형): 수 기운 — 적응력, 다재다능, 유연함

2. 눈
- 큰 눈: 감성 풍부, 사교적, 연애운 강
- 작은 눈: 집중력, 관찰력, 분석적 — 재물 모으는 능력
- 긴 눈: 지혜롭고 관대 — 귀인의 상
- 둥근 눈: 순수하고 직관적 — 예술적 재능
- 날카로운 눈: 결단력, 카리스마 — 리더의 상

3. 코 (재물궁)
- 높은 코: 자존심, 야망 — 사업운 강
- 넓은 코: 안정적, 신뢰 — 재물 보관 능력
- 오뚝한 코: 추진력, 독립심 — 자수성가
- 둥근 코: 원만, 인복 — 재물이 모이는 상
- 작은 코: 섬세, 겸손 — 꾸준한 재물 축적

4. 입
- 큰 입: 활발, 대범 — 식복, 사업운
- 작은 입: 섬세, 절제 — 학문, 예술
- 두꺼운 입술: 정 많고 인복 — 사랑운 강
- 얇은 입술: 논리적, 언변 — 전문직 적성
- 입꼬리 올라감: 낙천적, 긍정 — 만년복

5. 이마
- 넓은 이마: 지적 능력, 조기 성공 — 관운/학업운
- 좁은 이마: 실무적, 꼼꼼 — 기술직 적성
- 볼록한 이마: 창의력, 상상력 — 예술/발명
- 평평한 이마: 현실적, 안정 지향 — 실무 능력
- 높은 이마: 리더십, 통찰력 — 대인 운세

【종합 분석 방법】
- 오관의 오행 배합으로 전체 운세 흐름 파악
- 상생 조합이 많으면 조화로운 인생, 상극이 많으면 변화와 도전이 많은 인생
- 오늘의 일진 오행과 관상 오행의 상호작용 분석
- 사주가 있으면 관상과 사주의 일치/보완 관계 분석

【작성 규칙】
1. 반드시 JSON만 응답
2. 각 부위 분석 후 종합 성격/운세 도출
3. 재물운, 연애운, 직업운, 건강운 각각 구체적 조언
4. 관상을 보완하는 행동/색상/방위 조언
5. 긍정적 관점 우선, 주의점은 개선 방향과 함께 제시""";

    /**
     * 관상 분석 스트리밍
     * 캐시 있으면 cached 이벤트로 즉시 반환, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    public SseEmitter streamFace(String faceShape, String eyeShape, String noseShape,
                                  String mouthShape, String foreheadShape,
                                  String birthDate, String gender, Runnable onSuccess) {
        return doStreamFace(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender, onSuccess);
    }

    public SseEmitter streamFace(String faceShape, String eyeShape, String noseShape,
                                  String mouthShape, String foreheadShape,
                                  String birthDate, String gender) {
        return doStreamFace(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender, null);
    }

    private SseEmitter doStreamFace(String faceShape, String eyeShape, String noseShape,
                                  String mouthShape, String foreheadShape,
                                  String birthDate, String gender, Runnable onSuccess) {
        String cacheKey = buildCacheKey(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender);
        Map<String, Object> cached = getFromCache("face-reading", cacheKey);
        if (cached != null) {
            SseEmitter emitter = new SseEmitter(30000L);
            try {
                String json = objectMapper.writeValueAsString(cached);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 프롬프트 빌드
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append(promptBuilder.buildTodayContext(LocalDate.now())).append("\n");
        userPrompt.append("【의뢰인 관상 정보】\n");
        userPrompt.append("얼굴형: ").append(faceShape).append("\n");
        userPrompt.append("눈: ").append(eyeShape).append("\n");
        userPrompt.append("코: ").append(noseShape).append("\n");
        userPrompt.append("입: ").append(mouthShape).append("\n");
        userPrompt.append("이마: ").append(foreheadShape).append("\n");
        if (gender != null) userPrompt.append("성별: ").append("M".equals(gender) ? "남성" : "여성").append("\n");
        if (birthDate != null && !birthDate.isBlank()) {
            userPrompt.append("생년월일: ").append(birthDate).append(" (사주와 관상의 일치도도 분석)\n");
        }
        userPrompt.append("\n\n위 관상 정보를 분석하세요. 반드시 아래 JSON 형식으로만 응답:\n")
            .append("{\"faceElement\":\"얼굴 오행\",\"overallType\":\"관상 유형명 (4글자 이내)\",\"overallEmoji\":\"대표 이모지\",")
            .append("\"personality\":\"종합 성격 분석 (5-6문장)\",\"moneyFortune\":\"재물운 (3문장)\",\"loveFortune\":\"연애운 (3문장)\",")
            .append("\"careerFortune\":\"직업운 (적합 직업 3개 + 조언 2문장)\",\"healthFortune\":\"건강운 (주의 부위 + 조언 2문장)\",")
            .append("\"luckyColor\":\"행운 색상\",\"luckyDirection\":\"행운 방위\",\"luckyNumber\":숫자,")
            .append("\"strengths\":[\"강점1\",\"강점2\",\"강점3\"],\"improvements\":[\"개선점1\",\"개선점2\"],")
            .append("\"score\":종합점수(0-100),\"grade\":\"등급(대길/길/보통/소흉)\"}");

        final String finalCacheKey = cacheKey;
        final String finalFaceShape = faceShape;
        final String finalEyeShape = eyeShape;

        return claudeApiService.generateStream(SYSTEM_PROMPT, userPrompt.toString(), 1000, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json != null) {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("faceShape", finalFaceShape);
                    result.put("eyeShape", finalEyeShape);
                    result.put("noseShape", noseShape);
                    result.put("mouthShape", mouthShape);
                    result.put("foreheadShape", foreheadShape);
                    result.put("date", LocalDate.now().toString());
                    JsonNode node = objectMapper.readTree(json);
                    node.fields().forEachRemaining(e -> {
                        if (e.getValue().isArray()) {
                            List<String> list = new ArrayList<>();
                            e.getValue().forEach(v -> list.add(v.asText()));
                            result.put(e.getKey(), list);
                        } else if (e.getValue().isNumber()) {
                            result.put(e.getKey(), e.getValue().asInt());
                        } else {
                            result.put(e.getKey(), e.getValue().asText());
                        }
                    });
                    saveToCache("face-reading", finalCacheKey, result);
                }
            } catch (Exception e) {
                log.warn("관상 스트림 캐시 저장 실패: {}", e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
    }

    @Transactional
    public Map<String, Object> analyzeFace(String faceShape, String eyeShape, String noseShape,
                                            String mouthShape, String foreheadShape,
                                            String birthDate, String gender) {
        // 캐시 체크
        String cacheKey = buildCacheKey(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender);
        Map<String, Object> cached = getFromCache("face-reading", cacheKey);
        if (cached != null) return cached;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("faceShape", faceShape);
        result.put("eyeShape", eyeShape);
        result.put("noseShape", noseShape);
        result.put("mouthShape", mouthShape);
        result.put("foreheadShape", foreheadShape);
        result.put("date", LocalDate.now().toString());

        if (claudeApiService.isAvailable()) {
            try {
                StringBuilder userPrompt = new StringBuilder();
                userPrompt.append(promptBuilder.buildTodayContext(LocalDate.now())).append("\n");
                userPrompt.append("【의뢰인 관상 정보】\n");
                userPrompt.append("얼굴형: ").append(faceShape).append("\n");
                userPrompt.append("눈: ").append(eyeShape).append("\n");
                userPrompt.append("코: ").append(noseShape).append("\n");
                userPrompt.append("입: ").append(mouthShape).append("\n");
                userPrompt.append("이마: ").append(foreheadShape).append("\n");
                if (gender != null) userPrompt.append("성별: ").append("M".equals(gender) ? "남성" : "여성").append("\n");
                if (birthDate != null && !birthDate.isBlank()) {
                    userPrompt.append("생년월일: ").append(birthDate).append(" (사주와 관상의 일치도도 분석)\n");
                }

                userPrompt.append("\n\n위 관상 정보를 분석하세요. 반드시 아래 JSON 형식으로만 응답:\n")
                    .append("{\"faceElement\":\"얼굴 오행\",\"overallType\":\"관상 유형명 (4글자 이내)\",\"overallEmoji\":\"대표 이모지\",")
                    .append("\"personality\":\"종합 성격 분석 (5-6문장)\",\"moneyFortune\":\"재물운 (3문장)\",\"loveFortune\":\"연애운 (3문장)\",")
                    .append("\"careerFortune\":\"직업운 (적합 직업 3개 + 조언 2문장)\",\"healthFortune\":\"건강운 (주의 부위 + 조언 2문장)\",")
                    .append("\"luckyColor\":\"행운 색상\",\"luckyDirection\":\"행운 방위\",\"luckyNumber\":숫자,")
                    .append("\"strengths\":[\"강점1\",\"강점2\",\"강점3\"],\"improvements\":[\"개선점1\",\"개선점2\"],")
                    .append("\"score\":종합점수(0-100),\"grade\":\"등급(대길/길/보통/소흉)\"}");

                String response = claudeApiService.generate(SYSTEM_PROMPT, userPrompt.toString(), 1000);
                String json = ClaudeApiService.extractJson(response);
                if (json != null) {
                    JsonNode node = objectMapper.readTree(json);
                    node.fields().forEachRemaining(e -> {
                        if (e.getValue().isArray()) {
                            List<String> list = new ArrayList<>();
                            e.getValue().forEach(v -> list.add(v.asText()));
                            result.put(e.getKey(), list);
                        } else if (e.getValue().isNumber()) {
                            result.put(e.getKey(), e.getValue().asInt());
                        } else {
                            result.put(e.getKey(), e.getValue().asText());
                        }
                    });
                    saveToCache("face-reading", cacheKey, result);
                    return result;
                }
            } catch (Exception e) {
                log.warn("AI 관상 분석 실패: {}", e.getMessage());
            }
        }

        // 폴백
        result.putAll(generateFallback(faceShape, eyeShape));
        return result;
    }

    private Map<String, Object> generateFallback(String faceShape, String eyeShape) {
        Map<String, Object> m = new LinkedHashMap<>();
        String element = switch (faceShape) {
            case "둥근형" -> "토(土)";
            case "긴형" -> "목(木)";
            case "각진형" -> "금(金)";
            case "역삼각형" -> "화(火)";
            default -> "수(水)";
        };
        m.put("faceElement", element);
        m.put("overallType", "조화로운 상");
        m.put("overallEmoji", "✨");
        m.put("personality", "당신의 관상은 " + element + " 기운이 주를 이루며, 균형 잡힌 성격의 소유자입니다. 대인관계가 원만하고 주변 사람들에게 신뢰를 줍니다. 내면의 강한 의지와 외면의 부드러움이 조화를 이루는 상입니다.");
        m.put("moneyFortune", "재물운이 안정적입니다. 꾸준한 노력이 결실을 맺는 시기입니다. 무리한 투자보다 차분한 저축이 유리합니다.");
        m.put("loveFortune", "인연의 기운이 감돕니다. 자연스러운 만남에서 좋은 인연이 올 수 있습니다. 진심을 담은 소통이 관계 발전의 열쇠입니다.");
        m.put("careerFortune", "꾸준함과 성실함이 인정받는 시기입니다. 팀워크를 중시하면 좋은 결과를 얻습니다.");
        m.put("healthFortune", "전반적으로 양호하나 스트레스 관리에 신경 쓰세요. 규칙적인 생활이 중요합니다.");
        m.put("luckyColor", "파란색");
        m.put("luckyDirection", "동쪽");
        m.put("luckyNumber", 7);
        m.put("strengths", List.of("안정감", "신뢰감", "인내력"));
        m.put("improvements", List.of("과감한 도전", "자기표현 강화"));
        m.put("score", 72);
        m.put("grade", "길");
        return m;
    }

    // ── 캐싱 헬퍼 ──

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
