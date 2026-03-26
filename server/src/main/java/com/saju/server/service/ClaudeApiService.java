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
            }
            return null;
        } catch (Exception e) {
            log.error("Claude API call failed: {}", e.getMessage());
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
            당신은 한국 전통 사주팔자(四柱八字) 전문 역술가입니다.
            사주 분석 데이터를 기반으로 오늘의 운세를 자연스럽고 따뜻한 한국어로 작성합니다.

            규칙:
            - 반드시 JSON 형식으로 응답하세요
            - 각 카테고리(overall, love, money, health, work)는 2-3문장
            - score는 30~100 사이 정수
            - luckyNumber는 1~99 사이 정수
            - luckyColor는 한국어 색상명
            - 전문적이지만 친근한 어조로 작성
            - 구체적이고 실질적인 조언을 포함

            응답 형식:
            {"overall":"총운 내용","love":"애정운 내용","money":"재물운 내용","health":"건강운 내용","work":"직장운 내용","score":75,"luckyNumber":7,"luckyColor":"파랑"}
            """;

        String userPrompt = "다음 사주 정보를 바탕으로 오늘의 운세를 JSON으로 작성해주세요:\n\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 800);
    }

    /**
     * 사주 기반 성격 분석 생성
     */
    public String generatePersonalityReading(String sajuSummary) {
        String systemPrompt = """
            당신은 한국 전통 사주팔자 전문 역술가입니다.
            사주 분석 데이터를 기반으로 성격과 운명을 해석합니다.

            규칙:
            - 4-5문장의 자연스러운 한국어로 성격을 분석
            - 일간(日干)의 특성을 중심으로 설명
            - 오행 균형을 고려한 조언 포함
            - 긍정적이고 건설적인 어조
            - JSON이 아닌 일반 텍스트로 응답
            """;

        String userPrompt = "다음 사주 정보를 바탕으로 성격 분석을 작성해주세요:\n\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 500);
    }

    /**
     * 사주 기반 년운 분석 생성
     */
    public String generateYearFortune(String sajuSummary, int year) {
        String systemPrompt = """
            당신은 한국 전통 사주팔자 전문 역술가입니다.
            사주와 올해 간지의 관계를 분석하여 년운을 해석합니다.

            규칙:
            - 5-6문장의 자연스러운 한국어로 올해 운세를 작성
            - 십성(十星) 관계를 기반으로 분석
            - 구체적인 시기별 조언 포함 (상반기/하반기)
            - 주의사항과 기회 모두 언급
            - JSON이 아닌 일반 텍스트로 응답
            """;

        String userPrompt = year + "년 운세를 분석해주세요. 사주 정보:\n\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 600);
    }
}
