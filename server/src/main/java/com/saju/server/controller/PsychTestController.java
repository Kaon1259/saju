package com.saju.server.controller;

import com.saju.server.service.PsychTestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
     * 심리테스트 분석 요청 (기존 동기 방식)
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeTest(
            @RequestParam String testId,
            @RequestParam String answers,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(psychTestService.analyzeTest(testId, answers, birthDate, gender));
    }

    /**
     * 심리테스트 분석 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/analyze/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAnalyze(
            @RequestParam String testId,
            @RequestParam String answers,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return psychTestService.streamAnalyze(testId, answers, birthDate, gender);
    }
}
