package com.saju.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ClaudeApiService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";

    @Value("${claude.api-key:}")
    private String apiKey;

    @Value("${claude.model:claude-haiku-4-5-20251001}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Claude API가 사용 가능한지 확인
     */
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Claude API를 호출하여 텍스트 생성
     * @param systemPrompt 시스템 프롬프트
     * @param userPrompt 사용자 프롬프트
     * @param maxTokens 최대 토큰 수
     * @return 생성된 텍스트, 실패 시 null
     */
    public String generate(String systemPrompt, String userPrompt, int maxTokens) {
        if (!isAvailable()) {
            log.warn("Claude API key is not configured");
            return null;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", maxTokens,
                "system", systemPrompt,
                "messages", List.of(
                    Map.of("role", "user", "content", userPrompt)
                )
            );

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                API_URL, HttpMethod.POST, request, String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode content = root.path("content");
                if (content.isArray() && content.size() > 0) {
                    return content.get(0).path("text").asText();
                }
                log.warn("Claude API: content array empty or missing. Response: {}",
                    response.getBody().substring(0, Math.min(500, response.getBody().length())));
            } else {
                log.warn("Claude API: status={}, body={}", response.getStatusCode(),
                    response.getBody() != null ? response.getBody().substring(0, Math.min(500, response.getBody().length())) : "null");
            }
            return null;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Claude API HTTP error: status={}, body={}", e.getStatusCode(),
                e.getResponseBodyAsString().substring(0, Math.min(500, e.getResponseBodyAsString().length())));
            return null;
        } catch (Exception e) {
            log.error("Claude API call failed: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return null;
        }
    }

    /**
     * Claude 응답에서 JSON 추출 (마크다운 코드블록 처리)
     */
    public static String extractJson(String response) {
        if (response == null) return null;

        String cleaned = response.trim();

        // 마크다운 코드블록 제거: ```json ... ``` 또는 ``` ... ```
        if (cleaned.contains("```")) {
            int start = cleaned.indexOf("```");
            int end = cleaned.lastIndexOf("```");
            int afterStart = cleaned.indexOf("\n", start);

            if (start != end && afterStart > 0 && afterStart < end) {
                // 정상: 여는 ``` 와 닫는 ``` 모두 존재
                cleaned = cleaned.substring(afterStart + 1, end).trim();
            } else if (afterStart > 0) {
                // 잘림: 여는 ```만 있음 (max_tokens로 응답 잘린 경우)
                cleaned = cleaned.substring(afterStart + 1).trim();
            }
        }

        // 가장 바깥쪽 { ... } 추출
        int braceStart = cleaned.indexOf("{");
        int braceEnd = cleaned.lastIndexOf("}");
        if (braceStart >= 0 && braceEnd > braceStart) {
            return cleaned.substring(braceStart, braceEnd + 1);
        }

        return null;
    }

    /**
     * 사주 기반 개인 맞춤 운세 생성
     */
    public String generateSajuFortune(String sajuSummary) {
        String systemPrompt = """
            당신은 20대 초반 여자 친구처럼 편하게 상담해주는 사주 전문가야.
            사주 분석 데이터를 기반으로 오늘의 운세를 친근하고 재밌는 한국어로 작성해줘!
            오행의 상생상극, 십성 관계, 12운성, 일진과 사주의 상호작용을 종합적으로 분석해.

            【말투 규칙】
            - 10대 후반~20대 초반 여성 친구에게 말하듯 친근한 반말 구어체
            - "~거든!", "~인 거야", "~해봐!", "~느낌이야" 같은 표현 사용
            - 공감과 응원이 담긴 톤
            - "~하옵소서", "~이로다" 같은 고전적/격식체 표현 절대 금지

            규칙:
            - 반드시 JSON 형식으로 응답해
            - 각 카테고리(overall, love, money, health, work)는 반드시 3-4문장으로 구체적으로 작성
            - overall: 오늘 하루 전체 흐름, 핵심 기운, 주의점을 상세히
            - love: 연인/배우자와의 관계, 싱글이라면 인연의 기운, 대인관계 포함
            - money: 재물의 흐름, 투자/지출 조언, 횡재수나 손재수 여부
            - health: 오행 기반 취약 부위(목-간담, 화-심장, 토-비위, 금-폐, 수-신장), 구체적 건강 관리법
            - work: 업무 흐름, 상사/동료 관계, 중요 의사결정 타이밍
            - score는 30~100 사이 정수
            - luckyNumber는 1~99 사이 정수
            - luckyColor는 한국어 색상명
            - summary: 오늘의 핵심 메시지를 한 줄 슬로건으로 (15자 이내)
            - timeAdvice: "오전에는 ~, 오후에는 ~, 저녁에는 ~" 형식으로 시간대별 구체적 조언
            - direction: 오행 기반으로 오늘 길한 방위 (동/서/남/북/중앙)
            - food: 오행 보충을 위한 추천 음식이나 차 (예: "수 기운 보충을 위한 검은콩차")
            - avoid: 오늘 특히 피해야 할 행동이나 장소
            - emotion: 오늘의 감정/심리 상태 진단과 마음 관리 조언 (2문장)
            - 구체적이고 실질적인 조언을 포함
            - 일진의 천간/지지와 사주 일간의 관계를 반드시 반영

            응답 형식:
            {"overall":"총운","love":"애정운","money":"재물운","health":"건강운","work":"직장운","score":75,"luckyNumber":7,"luckyColor":"파랑","summary":"한줄메시지","timeAdvice":"시간대별조언","direction":"방위","food":"추천음식","avoid":"피해야할것","emotion":"감정조언"}
            """;

        String userPrompt = "다음 사주 정보를 바탕으로 오늘의 운세를 JSON으로 작성해주세요.\n"
            + "일진과 사주 일간의 오행 상생상극 관계를 중심으로, 각 카테고리는 반드시 3-4문장으로 깊이 있게 분석해주세요.\n"
            + "새로 추가된 필드(summary, timeAdvice, direction, food, avoid, emotion)도 반드시 포함해주세요.\n\n"
            + sajuSummary;

        return generate(systemPrompt, userPrompt, 1500);
    }

    /**
     * 사주 기반 성격 분석 생성
     */
    public String generatePersonalityReading(String sajuSummary) {
        String systemPrompt = """
            당신은 20대 초반 여자 친구처럼 편하게 상담해주는 사주 전문가야.
            사주 분석 데이터를 기반으로 성격과 운명을 친근하게 해석해줘!
            일간, 오행 분포, 격국, 12운성, 신살을 종합적으로 고려해서 분석해.

            【말투 규칙】
            - 10대 후반~20대 초반 여성 친구에게 말하듯 친근한 반말 구어체
            - "~거든!", "~인 거야", "~해봐!", "~느낌이야" 같은 표현 사용
            - 공감과 응원이 담긴 톤
            - "~하옵소서", "~이로다" 같은 고전적/격식체 표현 절대 금지

            규칙:
            - 자연스러운 한국어 반말로 성격을 상세히 분석 (8-12문장)
            - JSON이 아닌 일반 텍스트로 응답
            - 긍정적이고 공감 가는 어조

            반드시 아래 항목을 모두 포함하세요:

            1. 일간(日干)의 핵심 성격 특성
               - 장점 3가지 (구체적 상황 예시와 함께)
               - 단점 3가지 (극복 방법과 함께)

            2. 대인관계 스타일
               - 친구/동료와의 관계 패턴
               - 갈등 해결 방식

            3. 직업/적성 분야 추천
               - 오행과 격국에 기반한 적합 직업군 3개 이상
               - 피해야 할 직업 유형

            4. 연애/결혼 스타일
               - 이상형의 특징
               - 연애 시 주의할 점
               - 궁합이 좋은 일간 타입

            5. 건강 취약 부위 (오행 기반)
               - 목(木)→간담, 화(火)→심장/소장, 토(土)→비위/소화기, 금(金)→폐/대장, 수(水)→신장/방광
               - 약한 오행에 해당하는 부위를 중심으로 건강 관리 조언
               - 보양 음식이나 생활습관 추천
            """;

        String userPrompt = "다음 사주 정보를 바탕으로 깊이 있는 성격 분석을 작성해주세요.\n"
            + "일간의 장단점, 대인관계, 직업적성, 연애스타일, 건강취약부위를 모두 포함해주세요.\n\n"
            + sajuSummary;

        return generate(systemPrompt, userPrompt, 1000);
    }

    /**
     * 사주 기반 년운 분석 생성
     */
    public String generateYearFortune(String sajuSummary, int year) {
        String systemPrompt = """
            당신은 20대 초반 여자 친구처럼 편하게 상담해주는 사주 전문가야.
            사주와 올해 간지의 관계를 분석해서 년운을 친근하게 해석해줘!
            십성 관계, 오행 상생상극, 대운과의 조합을 종합적으로 분석해.

            【말투 규칙】
            - 10대 후반~20대 초반 여성 친구에게 말하듯 친근한 반말 구어체
            - "~거든!", "~인 거야", "~해봐!", "~느낌이야" 같은 표현 사용
            - 공감과 응원이 담긴 톤
            - "~하옵소서", "~이로다" 같은 고전적/격식체 표현 절대 금지

            규칙:
            - 자연스러운 한국어 반말로 올해 운세를 상세히 작성 (10-15문장)
            - JSON이 아닌 일반 텍스트로 응답
            - 긍정적이고 공감 가는 어조

            반드시 아래 항목을 모두 포함하세요:

            1. 올해의 전체 기조
               - 올해 간지와 사주 일간의 십성 관계 해석
               - 올해를 관통하는 핵심 키워드 3개 제시 (예: "도전, 성장, 인내")

            2. 상반기 운세 (1~6월)
               - 주요 기회와 흐름
               - 특히 좋은 달과 이유

            3. 하반기 운세 (7~12월)
               - 주요 기회와 흐름
               - 특히 좋은 달과 이유

            4. 주의해야 할 시기
               - 특히 조심해야 할 월 (구체적으로 몇 월인지 명시)
               - 주의 사항과 대처법

            5. 재물운 상세
               - 수입/지출 흐름
               - 투자에 유리한 시기와 불리한 시기
               - 지출 조심 시기
               - 재물 관리 핵심 조언

            6. 건강운
               - 오행 기반 취약 부위 (목→간담, 화→심장, 토→비위, 금→폐, 수→신장)
               - 계절별 건강 주의사항
               - 보양 방법 추천

            7. 대인관계/직장운
               - 직장에서의 기회와 도전
               - 인간관계에서 주의할 점
               - 귀인이 나타나기 쉬운 시기
            """;

        String userPrompt = year + "년 운세를 깊이 있게 분석해주세요.\n"
            + "상반기/하반기 구분, 주의할 달, 재물운 시기, 건강운, 대인관계 조언을 모두 포함하고,\n"
            + "올해 핵심 키워드 3개를 반드시 제시해주세요.\n\n사주 정보:\n\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 1200);
    }
}
