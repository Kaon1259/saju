package com.saju.server.controller;

import com.saju.server.service.DreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dream")
@RequiredArgsConstructor
public class DreamController {

    private final DreamService dreamService;

    /**
     * 꿈 해몽 API
     * @param dreamText 꿈 내용 (필수)
     * @param birthDate 생년월일 (선택, yyyy-MM-dd)
     * @param gender 성별 (선택, male/female)
     */
    @PostMapping("/interpret")
    public ResponseEntity<Map<String, Object>> interpretDream(
            @RequestParam String dreamText,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(dreamService.interpretDream(dreamText, birthDate, gender));
    }
}
