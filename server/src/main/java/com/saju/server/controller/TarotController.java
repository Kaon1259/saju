package com.saju.server.controller;

import com.saju.server.service.TarotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
     * @param cardIds 선택된 카드 ID 목록 (콤마 구분)
     * @param reversals 각 카드의 정/역방향 (콤마 구분, 0=정방향, 1=역방향)
     * @param spread 스프레드 타입 (one, three, five)
     * @param category 카테고리 (general, love, money, career, health, study)
     * @param question 질문 (선택)
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
}
