package com.saju.server.controller;

import com.saju.server.entity.User;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.repository.UserRepository;
import com.saju.server.service.HeartPointService;
import com.saju.server.service.TarotService;
import com.saju.server.util.SseEmitterUtils;
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
    private final HeartPointService heartPointService;
    private final UserRepository userRepository;

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
            @RequestParam(required = false) String question,
            @RequestParam(required = false) Long userId) {
        // spread 파라미터에 따라 하트 카테고리 결정
        String heartCategory = switch (spread) {
            case "one"   -> "TAROT_ONE";
            case "three" -> "TAROT_THREE";
            case "five", "celtic" -> "TAROT_FIVE";
            default      -> "TAROT";
        };

        // 하트 잔액 확인 (차감은 AI 완료 후)
        if (userId != null) {
            try {
                heartPointService.checkPoints(userId, heartCategory);
            } catch (InsufficientHeartsException e) {
                return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
            }
        }
        // 유저 프로필에서 나이/성별 가져오기
        String birthDate = null;
        String gender = null;
        if (userId != null) {
            try {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    if (user.getBirthDate() != null) birthDate = user.getBirthDate().toString();
                    gender = user.getGender();
                }
            } catch (Exception ignored) {}
        }

        final Long uid = userId;
        final String finalHeartCategory = heartCategory;
        final String finalBirthDate = birthDate;
        final String finalGender = gender;
        return tarotService.streamReading(cardIds, reversals, spread, category, question, finalBirthDate, finalGender, uid, () -> {
            if (uid != null) heartPointService.deductPoints(uid, finalHeartCategory, "타로");
        });
    }
}
