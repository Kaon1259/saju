package com.saju.server.controller;

import com.saju.server.service.BiorhythmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/biorhythm")
@RequiredArgsConstructor
public class BiorhythmController {

    private final BiorhythmService biorhythmService;

    /**
     * 바이오리듬 조회
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getBiorhythm(
            @RequestParam String birthDate) {
        return ResponseEntity.ok(biorhythmService.getBiorhythm(birthDate));
    }
}
