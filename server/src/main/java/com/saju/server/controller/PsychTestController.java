package com.saju.server.controller;

import com.saju.server.service.PsychTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/psych")
@RequiredArgsConstructor
public class PsychTestController {

    private final PsychTestService psychTestService;

    /**
     * 사용 가능한 심리테스트 목록 조회
     */
    @GetMapping("/tests")
    public ResponseEntity<List<Map<String, Object>>> getTests() {
        return ResponseEntity.ok(psychTestService.getTests());
    }

    /**
     * 심리테스트 분석 요청
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeTest(
            @RequestParam String testId,
            @RequestParam String answers,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(psychTestService.analyzeTest(testId, answers, birthDate, gender));
    }
}
