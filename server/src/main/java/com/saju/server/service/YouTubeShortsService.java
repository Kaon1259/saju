package com.saju.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class YouTubeShortsService {

    private static final String SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

    @Value("${youtube.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 캐시: key = "context|날짜"
    private final Map<String, Map<String, List<Map<String, String>>>> cache = new ConcurrentHashMap<>();

    // 로그인 사용자용: 운세 카테고리별 키워드
    private static final Map<String, String[]> USER_KEYWORDS = new LinkedHashMap<>();
    static {
        USER_KEYWORDS.put("love", new String[]{"연애운 타로", "사랑운세 오늘"});
        USER_KEYWORDS.put("money", new String[]{"재물운 운세", "금전운 타로"});
        USER_KEYWORDS.put("health", new String[]{"건강운 운세", "건강 사주"});
        USER_KEYWORDS.put("work", new String[]{"직장운 타로", "취업운 사주"});
        USER_KEYWORDS.put("overall", new String[]{"오늘의 운세", "사주 운세"});
    }

    // 오행별 키워드
    private static final Map<String, String[]> ELEMENT_KEYWORDS = new LinkedHashMap<>();
    static {
        ELEMENT_KEYWORDS.put("목", new String[]{"목 오행 운세", "봄 운세 타로"});
        ELEMENT_KEYWORDS.put("화", new String[]{"화 오행 운세", "열정 타로 리딩"});
        ELEMENT_KEYWORDS.put("토", new String[]{"토 오행 운세", "안정 운세 타로"});
        ELEMENT_KEYWORDS.put("금", new String[]{"금 오행 운세", "결단 타로 리딩"});
        ELEMENT_KEYWORDS.put("수", new String[]{"수 오행 운세", "지혜 타로 리딩"});
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * context 기반 Shorts 반환
     * - null/empty: 기본 (오늘의 운세)
     * - "element:목" : 오행 기반 (비로그인)
     * - "fortune:love,money" : 약한 운세 기반 (로그인)
     */
    public Map<String, List<Map<String, String>>> getShorts(String context) {
        if (!isAvailable()) return Collections.emptyMap();

        String today = LocalDate.now().toString();
        String cacheKey = (context != null ? context : "default") + "|" + today;

        if (cache.containsKey(cacheKey)) {
            return cache.get(cacheKey);
        }

        Map<String, List<Map<String, String>>> result = new LinkedHashMap<>();

        try {
            if (context != null && context.startsWith("keyword:")) {
                String keyword = context.substring(8).trim();
                List<Map<String, String>> videos = searchShorts(keyword, 5);
                if (!videos.isEmpty()) result.put("matched", videos);
                List<Map<String, String>> extra = searchShorts("자연 풍경 힐링 영상", 3);
                if (!extra.isEmpty()) result.put("nature", extra);
            } else {
                List<Map<String, String>> videos = searchShorts("자연 풍경 힐링", 4);
                if (!videos.isEmpty()) result.put("today", videos);
                List<Map<String, String>> extra = searchShorts("바다 노을 풍경", 4);
                if (!extra.isEmpty()) result.put("nature", extra);
            }
        } catch (Exception e) {
            log.warn("Shorts 검색 실패: {}", e.getMessage());
        }

        if (!result.isEmpty()) {
            cache.put(cacheKey, result);
        }
        return result;
    }

    public List<Map<String, String>> searchShorts(String keyword, int maxResults) {
        if (!isAvailable()) return Collections.emptyList();

        try {
            String url = SEARCH_URL + "?part=snippet"
                + "&q=" + java.net.URLEncoder.encode(keyword + " #shorts", "UTF-8")
                + "&type=video&videoDuration=short&order=date&maxResults=" + maxResults
                + "&regionCode=KR&relevanceLanguage=ko&key=" + apiKey;

            String response = restTemplate.getForObject(java.net.URI.create(url), String.class);
            JsonNode root = objectMapper.readTree(response);
            JsonNode items = root.path("items");

            List<Map<String, String>> results = new ArrayList<>();
            if (items.isArray()) {
                for (JsonNode item : items) {
                    Map<String, String> video = new LinkedHashMap<>();
                    video.put("videoId", item.path("id").path("videoId").asText());
                    video.put("title", item.path("snippet").path("title").asText());
                    video.put("thumbnail", item.path("snippet").path("thumbnails").path("medium").path("url").asText());
                    video.put("channelTitle", item.path("snippet").path("channelTitle").asText());
                    results.add(video);
                }
            }
            return results;
        } catch (Exception e) {
            log.error("YouTube API 호출 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
