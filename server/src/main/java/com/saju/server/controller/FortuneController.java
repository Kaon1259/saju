package com.saju.server.controller;

import com.saju.server.dto.FortuneResponse;
import com.saju.server.dto.UserResponse;
import com.saju.server.service.FortuneService;
import com.saju.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fortune")
@RequiredArgsConstructor
public class FortuneController {

    private final FortuneService fortuneService;
    private final UserService userService;

    @GetMapping("/today")
    public ResponseEntity<FortuneResponse> getTodayFortune(@RequestParam("zodiac") String zodiacAnimal) {
        FortuneResponse response = fortuneService.getTodayFortune(zodiacAnimal);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/today/all")
    public ResponseEntity<List<FortuneResponse>> getAllTodayFortunes() {
        List<FortuneResponse> responses = fortuneService.getAllTodayFortunes();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<FortuneResponse> getUserFortune(@PathVariable Long userId) {
        UserResponse user = userService.getUser(userId);
        FortuneResponse response = fortuneService.getTodayFortune(user.getZodiacAnimal());
        return ResponseEntity.ok(response);
    }
}
