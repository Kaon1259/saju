package com.saju.server.controller;

import com.saju.server.service.ClaudeApiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/celeb")
@RequiredArgsConstructor
public class CelebController {

    private final ClaudeApiService claudeApiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/search")
    public ResponseEntity<?> searchCeleb(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "이름을 입력해주세요"));
        }

        if (!claudeApiService.isAvailable()) {
            return ResponseEntity.ok(Map.of("found", false, "message", "AI 검색을 사용할 수 없습니다"));
        }

        try {
            String system = "당신은 한국 연예인 정보 전문가입니다. 사용자가 연예인 이름을 입력하면 정확한 정보를 JSON으로 응답하세요.\n\n" +
                "【규칙】\n" +
                "1. 반드시 JSON만 응답\n" +
                "2. 실제 존재하는 연예인만 응답 (가상 인물 X)\n" +
                "3. 생년월일은 양력 YYYY-MM-DD 형식\n" +
                "4. 찾을 수 없으면 {\"found\":false}\n\n" +
                "응답 형식:\n" +
                "{\"found\":true,\"name\":\"정확한 활동명\",\"realName\":\"본명(있으면)\",\"birth\":\"YYYY-MM-DD\",\"gender\":\"M 또는 F\",\"category\":\"idol/actor/singer/entertainer\",\"group\":\"소속그룹(있으면, 없으면 null)\",\"info\":\"간단한 소개 한 줄\"}";

            String user = "'" + name + "' 연예인의 정보를 알려주세요.";
            String response = claudeApiService.generate(system, user, 300);
            String json = ClaudeApiService.extractJson(response);

            if (json != null) {
                JsonNode root = objectMapper.readTree(json);
                if (root.path("found").asBoolean(false)) {
                    return ResponseEntity.ok(Map.of(
                        "found", true,
                        "name", root.path("name").asText(name),
                        "realName", root.path("realName").asText(""),
                        "birth", root.path("birth").asText(""),
                        "gender", root.path("gender").asText(""),
                        "category", root.path("category").asText(""),
                        "group", root.path("group").asText(""),
                        "info", root.path("info").asText("")
                    ));
                }
            }
            return ResponseEntity.ok(Map.of("found", false, "message", "해당 연예인을 찾을 수 없습니다"));
        } catch (Exception e) {
            log.warn("AI celeb search failed: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("found", false, "message", "검색 중 오류가 발생했습니다"));
        }
    }
}
