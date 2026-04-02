package com.saju.server.controller;

import com.saju.server.service.YouTubeShortsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shorts")
@RequiredArgsConstructor
public class YouTubeShortsController {

    private final YouTubeShortsService youTubeShortsService;

    @GetMapping
    public ResponseEntity<Map<String, List<Map<String, String>>>> getTodayShorts(
            @RequestParam(required = false) String context) {
        return ResponseEntity.ok(youTubeShortsService.getShorts(context));
    }
}
