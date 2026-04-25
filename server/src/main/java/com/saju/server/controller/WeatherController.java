package com.saju.server.controller;

import com.saju.server.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    /**
     * 좌표 기반 현재 날씨 조회 (OpenWeather 프록시).
     * 키는 서버에만 보관, 클라이언트엔 평탄화된 응답만 반환.
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrent(@RequestParam double lat, @RequestParam double lon) {
        try {
            Map<String, Object> data = weatherService.getCurrentWeather(lat, lon);
            return ResponseEntity.ok(data);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("error", "weather_not_configured"));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "weather_unavailable", "message", e.getMessage()));
        }
    }
}
