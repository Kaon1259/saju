package com.saju.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KakaoAuthService {

    @Value("${kakao.rest-api-key:}")
    private String restApiKey;

    @Value("${kakao.client-secret:}")
    private String clientSecret;

    @Value("${kakao.redirect-uri:}")
    private String redirectUri;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 인가 코드로 카카오 액세스 토큰 요청
     */
    public String getAccessToken(String code, String clientRedirectUri) {
        String tokenUrl = "https://kauth.kakao.com/oauth/token";
        String effectiveRedirectUri = (clientRedirectUri != null && !clientRedirectUri.isBlank())
                ? clientRedirectUri : redirectUri;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", restApiKey);
        params.add("redirect_uri", effectiveRedirectUri);
        params.add("code", code);
        if (clientSecret != null && !clientSecret.isBlank()) {
            params.add("client_secret", clientSecret);
        }

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        log.info("카카오 토큰 요청 - client_id: {}..., redirect_uri: {}, client_secret 존재: {}",
                restApiKey.substring(0, Math.min(8, restApiKey.length())), effectiveRedirectUri, !clientSecret.isBlank());

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(tokenUrl, request, String.class);
            JsonNode json = objectMapper.readTree(response.getBody());
            return json.get("access_token").asText();
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("카카오 토큰 요청 실패 - status: {}, body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("카카오 토큰 요청에 실패했습니다: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("카카오 토큰 요청 실패: {}", e.getMessage());
            throw new RuntimeException("카카오 토큰 요청에 실패했습니다.");
        }
    }

    /**
     * 액세스 토큰으로 카카오 사용자 정보 조회
     */
    public Map<String, Object> getUserInfo(String accessToken) {
        String userInfoUrl = "https://kapi.kakao.com/v2/user/me";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    userInfoUrl, HttpMethod.GET, request, String.class);
            JsonNode json = objectMapper.readTree(response.getBody());

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("kakaoId", json.get("id").asText());

            JsonNode kakaoAccount = json.get("kakao_account");
            if (kakaoAccount != null) {
                JsonNode profile = kakaoAccount.get("profile");
                if (profile != null) {
                    if (profile.has("nickname")) {
                        userInfo.put("nickname", profile.get("nickname").asText());
                    }
                    if (profile.has("profile_image_url")) {
                        userInfo.put("profileImage", profile.get("profile_image_url").asText());
                    }
                }
                if (kakaoAccount.has("email")) {
                    userInfo.put("email", kakaoAccount.get("email").asText());
                }
                if (kakaoAccount.has("gender")) {
                    String gender = kakaoAccount.get("gender").asText();
                    userInfo.put("gender", "male".equals(gender) ? "M" : "F");
                }
                if (kakaoAccount.has("birthday")) {
                    userInfo.put("birthday", kakaoAccount.get("birthday").asText()); // MMDD
                }
                if (kakaoAccount.has("birthyear")) {
                    userInfo.put("birthyear", kakaoAccount.get("birthyear").asText()); // YYYY
                }
            }

            return userInfo;
        } catch (Exception e) {
            log.error("카카오 사용자 정보 조회 실패: {}", e.getMessage());
            throw new RuntimeException("카카오 사용자 정보를 가져올 수 없습니다.");
        }
    }
}
