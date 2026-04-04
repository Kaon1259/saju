package com.saju.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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
    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();

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
     * Claude API 스트리밍 호출 - SSE로 텍스트 청크 전달
     */
    public SseEmitter generateStream(String systemPrompt, String userPrompt, int maxTokens) {
        return generateStream(systemPrompt, userPrompt, maxTokens, null);
    }

    /**
     * Claude API 스트리밍 호출 + 완료 콜백 (캐시 저장 등)
     */
    public SseEmitter generateStream(String systemPrompt, String userPrompt, int maxTokens, java.util.function.Consumer<String> onComplete) {
        SseEmitter emitter = new SseEmitter(180000L); // 3분 타임아웃

        if (!isAvailable()) {
            streamExecutor.execute(() -> {
                try {
                    emitter.send(SseEmitter.event().name("error").data("API key not configured"));
                    emitter.complete();
                } catch (Exception ignored) {}
            });
            return emitter;
        }

        streamExecutor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Map<String, Object> body = Map.of(
                    "model", model,
                    "max_tokens", maxTokens,
                    "stream", true,
                    "system", systemPrompt,
                    "messages", List.of(Map.of("role", "user", "content", userPrompt))
                );
                String jsonBody = objectMapper.writeValueAsString(body);

                conn = (HttpURLConnection) new URL(API_URL).openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("x-api-key", apiKey);
                conn.setRequestProperty("anthropic-version", "2023-06-01");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(180000);

                conn.getOutputStream().write(jsonBody.getBytes(StandardCharsets.UTF_8));
                conn.getOutputStream().flush();

                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));

                StringBuilder fullText = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!line.startsWith("data: ")) continue;
                    String data = line.substring(6).trim();
                    if (data.equals("[DONE]")) break;

                    try {
                        JsonNode event = objectMapper.readTree(data);
                        String eventType = event.path("type").asText();

                        if ("content_block_delta".equals(eventType)) {
                            String text = event.path("delta").path("text").asText("");
                            if (!text.isEmpty()) {
                                fullText.append(text);
                                emitter.send(SseEmitter.event().name("chunk").data(text));
                            }
                        } else if ("message_stop".equals(eventType)) {
                            break;
                        }
                    } catch (Exception ignored) {}
                }

                String fullResult = fullText.toString();
                emitter.send(SseEmitter.event().name("done").data(fullResult));
                emitter.complete();
                reader.close();
                // 완료 콜백 (캐시 저장 등)
                if (onComplete != null) {
                    try { onComplete.accept(fullResult); } catch (Exception ignored) {}
                }

            } catch (Exception e) {
                log.error("스트리밍 실패: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event().name("error").data(e.getMessage()));
                    emitter.complete();
                } catch (Exception ignored) {}
            } finally {
                if (conn != null) conn.disconnect();
            }
        });

        return emitter;
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
        String systemPrompt = "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 운세를 알려주는 사주 전문가.\n"
            + "분석 보고서가 아니라 대화하는 느낌으로. 딱딱한 표현, 고전적 표현 절대 금지.\n"
            + "JSON 응답. 각 카테고리 2-3문장:\n"
            + "overall/love/money/health/work + score(30-100), luckyNumber(1-99), luckyColor(한국어),\n"
            + "summary(15자이내), timeAdvice(오전/오후/저녁), direction(방위), food(추천음식), avoid(피할것), emotion(2문장)\n"
            + "{\"overall\":\"\",\"love\":\"\",\"money\":\"\",\"health\":\"\",\"work\":\"\",\"score\":75,\"luckyNumber\":7,\"luckyColor\":\"파랑\",\"summary\":\"\",\"timeAdvice\":\"\",\"direction\":\"\",\"food\":\"\",\"avoid\":\"\",\"emotion\":\"\"}";

        String userPrompt = "사주 정보로 오늘 운세 JSON 작성:\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 1200);
    }

    /**
     * 사주 기반 성격 분석 생성
     */
    public String generatePersonalityReading(String sajuSummary) {
        String systemPrompt = "카페에서 친구한테 성격 얘기해주듯 자연스럽게 분석하는 사주 전문가.\n"
            + "대화하는 느낌의 반말, 딱딱한 분석 보고서 톤 금지. 고전적 표현 금지.\n"
            + "일반 텍스트 응답 (JSON 아님). 6-8문장으로:\n"
            + "1. 핵심 성격 (장점2+단점2)\n"
            + "2. 대인관계 스타일\n"
            + "3. 적합 직업 2-3개\n"
            + "4. 연애 스타일+이상형\n"
            + "5. 건강 취약 부위(오행 기반)";

        String userPrompt = "성격 분석:\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 800);
    }

    /**
     * 사주 기반 년운 분석 생성
     */
    public String generateYearFortune(String sajuSummary, int year) {
        String systemPrompt = "친구한테 올해 운세 알려주듯 자연스럽게 말하는 사주 전문가.\n"
            + "대화하듯 편하게 반말로. 딱딱하거나 고전적인 표현 절대 금지.\n"
            + "일반 텍스트 응답. 8-10문장:\n"
            + "1. 올해 핵심 키워드 3개 + 전체 기조\n"
            + "2. 상반기(좋은 달) / 하반기(좋은 달)\n"
            + "3. 주의할 월 + 대처법\n"
            + "4. 재물운 + 건강운 + 대인관계";

        String userPrompt = year + "년 운세:\n" + sajuSummary;

        return generate(systemPrompt, userPrompt, 900);
    }
}
