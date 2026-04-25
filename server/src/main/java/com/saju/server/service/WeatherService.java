package com.saju.server.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OpenWeather Current Weather API 프록시.
 * - 키는 환경변수(OPENWEATHER_API_KEY)에서 주입.
 * - 좌표 기반 30분 인메모리 캐싱 (월 호출량 절약 + 권장 갱신 주기).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherService {

    @Value("${openweather.api.key:}")
    private String apiKey;

    private static final String API_BASE = "https://api.openweathermap.org/data/2.5/weather";
    private static final String FORECAST_BASE = "https://api.openweathermap.org/data/2.5/forecast";
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, CachedWeather> cache = new ConcurrentHashMap<>();

    private record CachedWeather(Map<String, Object> data, Instant fetchedAt) {}

    public Map<String, Object> getCurrentWeather(double lat, double lon) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OPENWEATHER_API_KEY not configured");
            throw new IllegalStateException("Weather API key is not configured");
        }

        // 좌표를 0.01° (~1km) 정밀도로 반올림 → 캐시 키 (인접 사용자끼리 공유)
        String cacheKey = String.format("%.2f,%.2f", lat, lon);
        CachedWeather cached = cache.get(cacheKey);
        if (cached != null && Duration.between(cached.fetchedAt(), Instant.now()).compareTo(CACHE_TTL) < 0) {
            return cached.data();
        }

        String url = UriComponentsBuilder.fromHttpUrl(API_BASE)
                .queryParam("lat", lat)
                .queryParam("lon", lon)
                .queryParam("appid", apiKey)
                .queryParam("units", "metric")
                .queryParam("lang", "kr")
                .toUriString();

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = resp.getBody();
            if (body == null) throw new RuntimeException("OpenWeather returned empty body");

            Map<String, Object> result = simplify(body);
            // 진짜 오늘 일일 최고/최저는 forecast 엔드포인트에서 계산해 덮어쓴다
            try {
                Map<String, Integer> dailyHL = fetchDailyHighLow(lat, lon);
                if (dailyHL != null) {
                    if (dailyHL.get("high") != null) result.put("high", dailyHL.get("high"));
                    if (dailyHL.get("low")  != null) result.put("low",  dailyHL.get("low"));
                }
            } catch (Exception fe) {
                log.warn("Forecast high/low fetch failed (using current's values): {}", fe.getMessage());
            }
            cache.put(cacheKey, new CachedWeather(result, Instant.now()));
            return result;
        } catch (Exception e) {
            log.error("OpenWeather call failed lat={} lon={}: {}", lat, lon, e.getMessage());
            // 실패 시 마지막 캐시라도 반환
            if (cached != null) return cached.data();
            throw new RuntimeException("Weather lookup failed", e);
        }
    }

    /**
     * 5일/3시간 forecast 에서 오늘(KST) 슬롯들의 최고/최저 기온을 추출.
     * /data/2.5/weather 의 temp_max/min 은 도시 내 관측소 편차일 뿐 일일 최고/최저가 아니므로 별도 호출.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Integer> fetchDailyHighLow(double lat, double lon) {
        String url = UriComponentsBuilder.fromHttpUrl(FORECAST_BASE)
                .queryParam("lat", lat)
                .queryParam("lon", lon)
                .queryParam("appid", apiKey)
                .queryParam("units", "metric")
                .toUriString();
        ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = resp.getBody();
        if (body == null) return null;

        Object listObj = body.get("list");
        if (!(listObj instanceof List<?>)) return null;
        List<?> list = (List<?>) listObj;

        LocalDate today = LocalDate.now(KST);
        Double maxToday = null, minToday = null;
        Double max24 = null, min24 = null;
        long nowSec = Instant.now().getEpochSecond();
        long until24h = nowSec + 24 * 3600;
        int todayCount = 0;

        for (Object entry : list) {
            if (!(entry instanceof Map)) continue;
            Map<String, Object> m = (Map<String, Object>) entry;
            Object dtObj = m.get("dt");
            if (!(dtObj instanceof Number)) continue;
            long dt = ((Number) dtObj).longValue();

            Map<String, Object> main = (Map<String, Object>) m.getOrDefault("main", null);
            if (main == null) continue;
            Object tempObj = main.get("temp");
            if (!(tempObj instanceof Number)) continue;
            double t = ((Number) tempObj).doubleValue();

            LocalDate slotDate = Instant.ofEpochSecond(dt).atZone(KST).toLocalDate();
            if (slotDate.equals(today)) {
                if (maxToday == null || t > maxToday) maxToday = t;
                if (minToday == null || t < minToday) minToday = t;
                todayCount++;
            }
            if (dt >= nowSec && dt <= until24h) {
                if (max24 == null || t > max24) max24 = t;
                if (min24 == null || t < min24) min24 = t;
            }
        }

        // 오늘 슬롯이 4개 이상(=12시간 이상 커버) 일 때만 today 범위 사용,
        // 그 외(저녁/밤이라 today 슬롯이 적은 경우)엔 next 24h 범위 사용 → 항상 의미있는 폭의 max/min
        Double finalMax, finalMin;
        if (todayCount >= 4 && maxToday != null && minToday != null) {
            finalMax = maxToday;
            finalMin = minToday;
        } else {
            finalMax = max24;
            finalMin = min24;
        }
        if (finalMax == null && finalMin == null) return null;

        Map<String, Integer> out = new HashMap<>();
        out.put("high", finalMax != null ? (int) Math.round(finalMax) : null);
        out.put("low",  finalMin != null ? (int) Math.round(finalMin) : null);
        return out;
    }

    /** OpenWeather 원본 응답을 프론트가 바로 쓰기 좋게 평탄화. */
    @SuppressWarnings("unchecked")
    private Map<String, Object> simplify(Map<String, Object> raw) {
        Map<String, Object> main = (Map<String, Object>) raw.getOrDefault("main", new HashMap<>());
        Object weatherArr = raw.get("weather");
        Map<String, Object> weather0 = new HashMap<>();
        if (weatherArr instanceof Iterable<?> iter && iter.iterator().hasNext()) {
            Object first = iter.iterator().next();
            if (first instanceof Map) weather0 = (Map<String, Object>) first;
        }
        Map<String, Object> sys = (Map<String, Object>) raw.getOrDefault("sys", new HashMap<>());

        Map<String, Object> out = new HashMap<>();
        out.put("city", raw.getOrDefault("name", ""));
        out.put("country", sys.getOrDefault("country", ""));
        out.put("temp", roundDouble(main.get("temp")));
        out.put("feelsLike", roundDouble(main.get("feels_like")));
        out.put("high", roundDouble(main.get("temp_max")));
        out.put("low", roundDouble(main.get("temp_min")));
        out.put("humidity", main.get("humidity"));
        out.put("condition", weather0.getOrDefault("main", ""));        // e.g. "Clear"
        out.put("description", weather0.getOrDefault("description", "")); // e.g. "맑음"
        out.put("iconCode", weather0.getOrDefault("icon", ""));         // e.g. "01d"
        out.put("fetchedAt", Instant.now().toString());
        return out;
    }

    private Integer roundDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return (int) Math.round(n.doubleValue());
        return null;
    }
}
