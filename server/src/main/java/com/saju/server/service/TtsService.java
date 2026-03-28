package com.saju.server.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.HexFormat;

/**
 * Naver Clova TTS + 파일 캐싱
 * 같은 텍스트는 캐시에서 바로 반환 → API 비용 절감
 */
@Service
@Slf4j
public class TtsService {

    private static final String API_URL = "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts";

    @Value("${clova.tts.client-id:}")
    private String clientId;

    @Value("${clova.tts.client-secret:}")
    private String clientSecret;

    @Value("${clova.tts.speaker:vdain}")
    private String speaker;

    @Value("${clova.tts.cache-dir:./tts-cache}")
    private String cacheDir;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Path.of(cacheDir));
            // 어제 이전 캐시 정리 (일일 운세는 매일 바뀌므로)
            cleanOldCache();
        } catch (Exception e) {
            log.warn("TTS cache dir 생성 실패: {}", e.getMessage());
        }
    }

    public boolean isAvailable() {
        return clientId != null && !clientId.isBlank()
            && !clientId.equals("YOUR_CLOVA_CLIENT_ID");
    }

    /**
     * TTS 생성 (캐시 우선)
     * @return MP3 바이트 배열 또는 null
     */
    public byte[] generateSpeech(String text) {
        if (!isAvailable() || text == null || text.isBlank()) return null;

        // 텍스트 정리 (2000자 제한)
        String cleaned = cleanText(text);
        if (cleaned.length() > 2000) {
            cleaned = cleaned.substring(0, 2000);
        }

        // 캐시 키 생성
        String cacheKey = hash(cleaned + "|" + speaker);
        String today = LocalDate.now().toString();
        Path cachePath = Path.of(cacheDir, today + "_" + cacheKey + ".mp3");

        // 캐시 히트
        if (Files.exists(cachePath)) {
            try {
                log.debug("TTS 캐시 히트: {}", cacheKey);
                return Files.readAllBytes(cachePath);
            } catch (IOException e) {
                log.warn("캐시 읽기 실패: {}", e.getMessage());
            }
        }

        // API 호출
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("X-NCP-APIGW-API-KEY-ID", clientId);
            headers.set("X-NCP-APIGW-API-KEY", clientSecret);

            String body = "speaker=" + speaker
                + "&text=" + java.net.URLEncoder.encode(cleaned, "UTF-8")
                + "&volume=0"
                + "&speed=-1"
                + "&pitch=0"
                + "&format=mp3";

            HttpEntity<String> request = new HttpEntity<>(body, headers);
            ResponseEntity<byte[]> response = restTemplate.exchange(
                API_URL, HttpMethod.POST, request, byte[].class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                byte[] audio = response.getBody();
                // 캐시 저장
                try {
                    Files.write(cachePath, audio);
                    log.info("TTS 생성 + 캐시 저장: {} ({}bytes)", cacheKey, audio.length);
                } catch (IOException e) {
                    log.warn("캐시 저장 실패: {}", e.getMessage());
                }
                return audio;
            }
            return null;
        } catch (Exception e) {
            log.error("Clova TTS API 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    private String cleanText(String text) {
        return text
            .replaceAll("[#*─═▸•●■□◆◇★☆✦✧🌟💕💰💪💼☯️🩸🧬💡📅🔮⭐💚📚🎴🃏✨💭]", "")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private String hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes("UTF-8"));
            return HexFormat.of().formatHex(digest).substring(0, 16);
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }

    private void cleanOldCache() {
        try {
            String today = LocalDate.now().toString();
            Files.list(Path.of(cacheDir))
                .filter(p -> p.getFileName().toString().endsWith(".mp3"))
                .filter(p -> !p.getFileName().toString().startsWith(today))
                .forEach(p -> {
                    try { Files.delete(p); } catch (IOException ignored) {}
                });
        } catch (Exception e) {
            log.debug("캐시 정리 중 오류: {}", e.getMessage());
        }
    }
}
