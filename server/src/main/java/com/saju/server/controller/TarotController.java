package com.saju.server.controller;

import com.saju.server.service.TarotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tarot")
@RequiredArgsConstructor
public class TarotController {

    private final TarotService tarotService;

    /**
     * 메이저 아르카나 22장 카드 정보
     */
    @GetMapping("/cards")
    public ResponseEntity<List<Map<String, Object>>> getAllCards() {
        return ResponseEntity.ok(tarotService.getAllCards());
    }

    /**
     * 타로 카드 뽑기 (셔플 후 랜덤 선택)
     * @param count 뽑을 카드 수 (1, 3, 5)
     */
    @GetMapping("/draw")
    public ResponseEntity<List<Map<String, Object>>> drawCards(
            @RequestParam(defaultValue = "3") int count) {
        return ResponseEntity.ok(tarotService.drawCards(count));
    }

    /**
     * 타로 리딩 (AI 해석)
     */
    @GetMapping("/reading")
    public ResponseEntity<Map<String, Object>> getReading(
            @RequestParam String cardIds,
            @RequestParam String reversals,
            @RequestParam(defaultValue = "three") String spread,
            @RequestParam(defaultValue = "general") String category,
            @RequestParam(required = false) String question) {
        return ResponseEntity.ok(
            tarotService.getReading(cardIds, reversals, spread, category, question)
        );
    }

    /**
     * 타로 리딩 스트리밍 엔드포인트
     * 캐시 있으면 cached 이벤트로 즉시 응답, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    @GetMapping(value = "/reading/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamReading(
            @RequestParam String cardIds,
            @RequestParam String reversals,
            @RequestParam(defaultValue = "three") String spread,
            @RequestParam(defaultValue = "general") String category,
            @RequestParam(required = false) String question) {
        return tarotService.streamReading(cardIds, reversals, spread, category, question);
    }
}
