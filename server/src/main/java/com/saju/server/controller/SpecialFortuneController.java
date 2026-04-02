package com.saju.server.controller;

import com.saju.server.service.SpecialFortuneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/special")
@RequiredArgsConstructor
public class SpecialFortuneController {

    private final SpecialFortuneService specialFortuneService;

    /**
     * 오늘의 연애 온도 (만20세 기준, 로그인 불필요)
     */
    @GetMapping("/love-temperature")
    public ResponseEntity<Map<String, Object>> getLoveTemperature(
            @RequestParam(required = false) Long userId) {
        if (userId != null) {
            return ResponseEntity.ok(specialFortuneService.getUserLoveTemperature(userId));
        }
        return ResponseEntity.ok(specialFortuneService.getLoveTemperature());
    }

    /**
     * 특수 운세 (연애운, 재회운, 재혼운, 소개팅운)
     */
    @GetMapping("/love")
    public ResponseEntity<Map<String, Object>> getLoveFortune(
            @RequestParam String type,
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType,
            @RequestParam(required = false) String partnerDate,
            @RequestParam(required = false) String partnerGender,
            @RequestParam(required = false) String breakupDate,
            @RequestParam(required = false) String meetDate,
            @RequestParam(required = false) String relationshipStatus) {
        return ResponseEntity.ok(
            specialFortuneService.getLoveFortune(type, birthDate, birthTime, gender, calendarType,
                partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus)
        );
    }

    /**
     * 아침/점심/저녁 운세 (3블록)
     */
    @GetMapping("/timeblock")
    public ResponseEntity<Map<String, Object>> getTimeblockFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(
            specialFortuneService.getTimeblockFortune(birthDate, birthTime, gender, calendarType)
        );
    }

    /**
     * 시간대별 운세 (12시진)
     */
    @GetMapping("/hourly")
    public ResponseEntity<Map<String, Object>> getHourlyFortune(
            @RequestParam String birthDate,
            @RequestParam(required = false) String birthTime,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String calendarType) {
        return ResponseEntity.ok(
            specialFortuneService.getHourlyFortune(birthDate, birthTime, gender, calendarType)
        );
    }
}
