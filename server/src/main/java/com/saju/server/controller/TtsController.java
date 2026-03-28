package com.saju.server.controller;

import com.saju.server.service.TtsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tts")
@RequiredArgsConstructor
public class TtsController {

    private final TtsService ttsService;

    /**
     * TTS 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
            "available", ttsService.isAvailable(),
            "engine", ttsService.isAvailable() ? "clova" : "browser"
        ));
    }

    /**
     * 텍스트 → MP3 음성 변환
     */
    @PostMapping("/speak")
    public ResponseEntity<byte[]> speak(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        byte[] audio = ttsService.generateSpeech(text);
        if (audio == null) {
            return ResponseEntity.status(503).build(); // Clova 불가 → 프론트에서 브라우저 TTS 폴백
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.valueOf("audio/mpeg"));
        headers.setContentLength(audio.length);
        headers.setCacheControl(CacheControl.maxAge(java.time.Duration.ofHours(24)));
        return new ResponseEntity<>(audio, headers, HttpStatus.OK);
    }
}
