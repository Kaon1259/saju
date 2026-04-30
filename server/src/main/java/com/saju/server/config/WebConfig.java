package com.saju.server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** Railway env CORS_EXTRA_ORIGINS 콤마 구분 — 신규 도메인 추가 시 코드 수정 없이 운영 가능. */
    @Value("${cors.extra-origins:}")
    private String extraOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = new ArrayList<>(List.of(
            "http://localhost:*",        // 로컬 개발
            "https://localhost",          // Capacitor 모바일 WebView (androidScheme: https)
            "https://*.vercel.app",       // Vercel 웹 프론트 (preview 포함)
            "https://www.recipepig.kr",   // 운영툴
            "https://recipepig.kr"        // 운영툴
        ));
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            for (String o : extraOrigins.split(",")) {
                String trimmed = o.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }
        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
