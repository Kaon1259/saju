package com.saju.server.controller;

import com.saju.server.entity.CelebCommunity;
import com.saju.server.repository.CelebCommunityRepository;
import com.saju.server.service.ClaudeApiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/celeb")
@RequiredArgsConstructor
public class CelebController {

    private final ClaudeApiService claudeApiService;
    private final CelebCommunityRepository communityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 연예인 검색.
     * 흐름:
     *  1) celeb_community DB 에서 이름 매칭 → 있으면 즉시 반환 (searchCount++).
     *  2) 없으면 Claude API 호출 → 결과를 community DB 에 자동 저장.
     *  3) 다음 검색부터 모든 사용자가 즉시 hit.
     */
    @PostMapping("/search")
    @Transactional
    public ResponseEntity<?> searchCeleb(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "이름을 입력해주세요"));
        }
        String trimmed = name.trim();

        // 1) Community DB 선조회 (이름만으로)
        var existing = communityRepository.findFirstByName(trimmed);
        if (existing.isPresent()) {
            CelebCommunity c = existing.get();
            communityRepository.incrementSearchCount(c.getId());
            log.info("[Celeb] Community DB hit: {} (count={})", trimmed, c.getSearchCount() + 1);
            return ResponseEntity.ok(buildResultFromEntity(c, true));
        }

        if (!claudeApiService.isAvailable()) {
            return ResponseEntity.ok(Map.of("found", false, "message", "AI 검색을 사용할 수 없습니다"));
        }

        // 2) Claude API 호출
        try {
            String system = "당신은 한국 연예인 정보 전문가입니다. 사용자가 연예인 이름을 입력하면 정확한 정보를 JSON으로 응답하세요.\n\n" +
                "【규칙】\n" +
                "1. 반드시 JSON만 응답\n" +
                "2. 실제 존재하는 연예인만 응답 (가상 인물 X)\n" +
                "3. 생년월일은 양력 YYYY-MM-DD 형식 (정확히 알아야만, 모르면 found:false)\n" +
                "4. category 는 정확히 다음 중 하나: idol / actor / singer / entertainer / athlete / model / influencer / trot\n" +
                "5. 찾을 수 없거나 정보가 불확실하면 {\"found\":false}\n\n" +
                "응답 형식:\n" +
                "{\"found\":true,\"name\":\"정확한 활동명\",\"realName\":\"본명(있으면, 없으면 빈 문자열)\",\"birth\":\"YYYY-MM-DD\",\"gender\":\"M 또는 F\",\"category\":\"위 8가지 중 하나\",\"group\":\"소속그룹(있으면, 없으면 null)\",\"info\":\"간단한 소개 한 줄\"}";

            String user = "'" + trimmed + "' 연예인의 정보를 알려주세요.";
            // 명시적 Haiku 사용 — 비용 정책상 검색=경량 + 기본 claude.model 설정 의존 회피(비스트림 generate가
            // 기본 모델로 실패하면 결과 비어버림). 스트리밍 기능들과 동일하게 known-good 모델 명시.
            String response = claudeApiService.generate(system, user, 400, ClaudeApiService.HAIKU_MODEL);
            String json = ClaudeApiService.extractJson(response);

            if (json != null) {
                JsonNode root = objectMapper.readTree(json);
                if (root.path("found").asBoolean(false)) {
                    String resolvedName = root.path("name").asText(trimmed);
                    String birth = root.path("birth").asText("");
                    String gender = root.path("gender").asText("");
                    String category = normalizeCategory(root.path("category").asText(""));
                    String group = root.path("group").asText("");
                    String realName = root.path("realName").asText("");
                    String info = root.path("info").asText("");

                    // 3) DB 자동 저장 (이름+생일 unique. 이미 있으면 skip)
                    if (!birth.isBlank() && !gender.isBlank()) {
                        try {
                            var dupe = communityRepository.findByNameAndBirth(resolvedName, birth);
                            if (dupe.isEmpty()) {
                                CelebCommunity saved = communityRepository.save(CelebCommunity.builder()
                                    .name(resolvedName)
                                    .realName(realName.isBlank() ? null : realName)
                                    .birth(birth)
                                    .gender(gender)
                                    .category(category)
                                    .groupName(group.isBlank() || "null".equalsIgnoreCase(group) ? null : group)
                                    .info(info.isBlank() ? null : info)
                                    .searchCount(1)
                                    .build());
                                log.info("[Celeb] Auto-saved to community DB: {} ({}, {})", resolvedName, category, birth);
                            } else {
                                communityRepository.incrementSearchCount(dupe.get().getId());
                            }
                        } catch (Exception saveErr) {
                            log.warn("[Celeb] community 저장 실패 (응답은 정상): {}", saveErr.getMessage());
                        }
                    }

                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("found", true);
                    out.put("name", resolvedName);
                    out.put("realName", realName);
                    out.put("birth", birth);
                    out.put("gender", gender);
                    out.put("category", category);
                    out.put("group", group);
                    out.put("info", info);
                    out.put("savedToCommunity", true);
                    return ResponseEntity.ok(out);
                }
            }
            return ResponseEntity.ok(Map.of("found", false, "message", "해당 연예인을 찾을 수 없습니다"));
        } catch (Exception e) {
            log.warn("AI celeb search failed: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("found", false, "message", "검색 중 오류가 발생했습니다"));
        }
    }

    /**
     * 연예인 리스트 검색 — 검색어에 해당/관련된 실제 연예인 여러 명을 후보로 반환.
     * 흐름: Claude 호출 → 후보 배열 → category 정규화 → community DB 자동 저장(dedupe) → results 반환.
     * (단일 /search 와 달리 사용자가 리스트에서 직접 고르도록 여러 후보 제공)
     */
    @PostMapping("/search-list")
    @Transactional
    public ResponseEntity<?> searchCelebList(@RequestBody Map<String, String> body) {
        String query = body.get("query");
        if (query == null || query.isBlank()) query = body.get("name");
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "검색어를 입력해주세요"));
        }
        String trimmed = query.trim();

        if (!claudeApiService.isAvailable()) {
            return ResponseEntity.ok(Map.of("results", List.of(), "message", "AI 검색을 사용할 수 없습니다"));
        }

        try {
            String system = "당신은 한국 연예인 정보 전문가입니다. 사용자의 검색어에 해당하거나 관련된 실제 한국 연예인을 최대 8명까지 JSON으로 응답하세요.\n\n" +
                "【규칙】\n" +
                "1. 반드시 JSON만 응답 (설명/마크다운 금지)\n" +
                "2. 실제 존재하는 연예인만 (가상 인물 X)\n" +
                "3. 생년월일은 양력 YYYY-MM-DD 형식. 정확히 아는 인물만 포함 (모르면 그 인물 제외)\n" +
                "4. category 는 정확히 다음 중 하나: idol / actor / singer / entertainer / athlete / model / influencer / trot\n" +
                "5. 검색어가 사람 이름이면 동명/유사 인물 포함, 그룹명이면 그 그룹 멤버들, 키워드(예: '트로트 여가수')면 대표 인물들을 인기순으로\n" +
                "6. 관련 인물이 없으면 results 를 빈 배열로\n\n" +
                "응답 형식:\n" +
                "{\"results\":[{\"name\":\"활동명\",\"realName\":\"본명(없으면 빈 문자열)\",\"birth\":\"YYYY-MM-DD\",\"gender\":\"M 또는 F\",\"category\":\"위 8가지 중 하나\",\"group\":\"소속그룹(없으면 null)\",\"info\":\"간단한 소개 한 줄\"}]}";

            String user = "'" + trimmed + "' 로 연예인을 검색해줘.";
            // 명시적 Haiku — 위 /search 와 동일 이유 (기본 claude.model 의존 회피, 비용 경량)
            String response = claudeApiService.generate(system, user, 1400, ClaudeApiService.HAIKU_MODEL);
            String json = ClaudeApiService.extractJson(response);

            List<Map<String, Object>> results = new java.util.ArrayList<>();
            if (json != null) {
                JsonNode root = objectMapper.readTree(json);
                JsonNode arr = root.path("results");
                if (arr.isArray()) {
                    java.util.Set<String> seen = new java.util.HashSet<>();
                    for (JsonNode node : arr) {
                        String resolvedName = node.path("name").asText("").trim();
                        String birth = node.path("birth").asText("").trim();
                        String gender = node.path("gender").asText("").trim();
                        if (resolvedName.isBlank() || birth.isBlank() || gender.isBlank()) continue;
                        if (!seen.add(resolvedName + "|" + birth)) continue;

                        String category = normalizeCategory(node.path("category").asText(""));
                        String group = node.path("group").asText("");
                        String realName = node.path("realName").asText("");
                        String info = node.path("info").asText("");
                        String groupName = (group.isBlank() || "null".equalsIgnoreCase(group)) ? null : group;

                        // community DB 자동 저장 (dedupe by name+birth)
                        try {
                            var dupe = communityRepository.findByNameAndBirth(resolvedName, birth);
                            if (dupe.isEmpty()) {
                                communityRepository.save(CelebCommunity.builder()
                                    .name(resolvedName)
                                    .realName(realName.isBlank() ? null : realName)
                                    .birth(birth)
                                    .gender(gender)
                                    .category(category)
                                    .groupName(groupName)
                                    .info(info.isBlank() ? null : info)
                                    .searchCount(1)
                                    .build());
                            } else {
                                communityRepository.incrementSearchCount(dupe.get().getId());
                            }
                        } catch (Exception saveErr) {
                            log.warn("[Celeb] search-list 저장 실패 (응답은 정상): {}", saveErr.getMessage());
                        }

                        Map<String, Object> out = new LinkedHashMap<>();
                        out.put("name", resolvedName);
                        out.put("realName", realName);
                        out.put("birth", birth);
                        out.put("gender", gender);
                        out.put("category", category);
                        out.put("group", groupName);
                        out.put("info", info);
                        results.add(out);
                    }
                }
            }
            log.info("[Celeb] search-list '{}' → {} results", trimmed, results.size());
            return ResponseEntity.ok(Map.of("results", results));
        } catch (Exception e) {
            log.warn("AI celeb list search failed: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("results", List.of(), "message", "검색 중 오류가 발생했습니다"));
        }
    }

    /**
     * 커뮤니티 DB 전체 목록 (모든 사용자가 발견한 연예인 풀).
     * 클라이언트 초기 로드 시 1회 가져와 내장 DB 와 머지.
     * category 파라미터 있으면 분류 필터.
     */
    /** [임시 진단] Anthropic 비스트림 호출 실제 응답/에러 노출 — 스타검색 0건 원인 식별용. 진단 후 제거. */
    @GetMapping("/_diag")
    public ResponseEntity<Map<String, Object>> diag() {
        return ResponseEntity.ok(claudeApiService.diagnose());
    }

    /** [임시 진단] search-list 파이프라인 각 단계 덤프 (raw AI → extractJson → array → filter). 진단 후 제거. */
    @GetMapping("/_diag-search")
    public ResponseEntity<Map<String, Object>> diagSearch(@RequestParam("q") String q) {
        Map<String, Object> out = new LinkedHashMap<>();
        String trimmed = q.trim();
        String system = "당신은 한국 연예인 정보 전문가입니다. 사용자의 검색어에 해당하거나 관련된 실제 한국 연예인을 최대 8명까지 JSON으로 응답하세요.\n\n" +
            "【규칙】\n" +
            "1. 반드시 JSON만 응답 (설명/마크다운 금지)\n" +
            "2. 실제 존재하는 연예인만 (가상 인물 X)\n" +
            "3. 생년월일은 양력 YYYY-MM-DD 형식. 정확히 아는 인물만 포함 (모르면 그 인물 제외)\n" +
            "4. category 는 정확히 다음 중 하나: idol / actor / singer / entertainer / athlete / model / influencer / trot\n" +
            "5. 검색어가 사람 이름이면 동명/유사 인물 포함, 그룹명이면 그 그룹 멤버들, 키워드(예: '트로트 여가수')면 대표 인물들을 인기순으로\n" +
            "6. 관련 인물이 없으면 results 를 빈 배열로\n\n" +
            "응답 형식:\n" +
            "{\"results\":[{\"name\":\"활동명\",\"realName\":\"본명(없으면 빈 문자열)\",\"birth\":\"YYYY-MM-DD\",\"gender\":\"M 또는 F\",\"category\":\"위 8가지 중 하나\",\"group\":\"소속그룹(없으면 null)\",\"info\":\"간단한 소개 한 줄\"}]}";
        String user = "'" + trimmed + "' 로 연예인을 검색해줘.";
        try {
            String response = claudeApiService.generate(system, user, 1400, ClaudeApiService.HAIKU_MODEL);
            out.put("rawLen", response == null ? -1 : response.length());
            out.put("rawSnippet", response == null ? null : response.substring(0, Math.min(900, response.length())));
            String json = ClaudeApiService.extractJson(response);
            out.put("extractedLen", json == null ? -1 : json.length());
            out.put("extractedSnippet", json == null ? null : json.substring(0, Math.min(700, json.length())));
            int rawCount = 0, kept = 0;
            List<String> dropped = new java.util.ArrayList<>();
            if (json != null) {
                JsonNode root = objectMapper.readTree(json);
                JsonNode arr = root.path("results");
                out.put("resultsIsArray", arr.isArray());
                if (arr.isArray()) {
                    rawCount = arr.size();
                    for (JsonNode node : arr) {
                        String name = node.path("name").asText("").trim();
                        String birth = node.path("birth").asText("").trim();
                        String gender = node.path("gender").asText("").trim();
                        if (name.isBlank() || birth.isBlank() || gender.isBlank()) {
                            dropped.add(name + "|birth=" + birth + "|gender=" + gender); continue;
                        }
                        kept++;
                    }
                }
            }
            out.put("rawCount", rawCount);
            out.put("kept", kept);
            out.put("dropped", dropped);
        } catch (Exception e) {
            out.put("exception", e.getClass().getName() + ": " + e.getMessage());
        }
        return ResponseEntity.ok(out);
    }

    @GetMapping("/community")
    public ResponseEntity<List<Map<String, Object>>> getCommunity(
            @RequestParam(value = "category", required = false) String category) {
        List<CelebCommunity> list = (category == null || category.isBlank() || "all".equalsIgnoreCase(category))
            ? communityRepository.findAllByOrderBySearchCountDescUpdatedAtDesc()
            : communityRepository.findByCategoryOrderBySearchCountDescUpdatedAtDesc(category);

        List<Map<String, Object>> out = list.stream()
            .map(c -> buildResultFromEntity(c, false))
            .toList();
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> buildResultFromEntity(CelebCommunity c, boolean withFoundFlag) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (withFoundFlag) m.put("found", true);
        m.put("name", c.getName());
        m.put("realName", c.getRealName() == null ? "" : c.getRealName());
        m.put("birth", c.getBirth());
        m.put("gender", c.getGender());
        m.put("category", c.getCategory() == null ? "custom" : c.getCategory());
        m.put("group", c.getGroupName());
        m.put("info", c.getInfo() == null ? "" : c.getInfo());
        m.put("searchCount", c.getSearchCount());
        m.put("source", "community");
        return m;
    }

    /**
     * Claude가 임의의 카테고리를 응답할 가능성 대비 — 화이트리스트 외에는 'custom' 으로 통일.
     */
    private String normalizeCategory(String raw) {
        if (raw == null || raw.isBlank()) return "custom";
        String c = raw.trim().toLowerCase();
        return switch (c) {
            case "idol", "actor", "singer", "entertainer", "athlete", "model", "influencer", "trot" -> c;
            default -> "custom";
        };
    }
}
