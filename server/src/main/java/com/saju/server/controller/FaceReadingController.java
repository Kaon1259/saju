package com.saju.server.controller;

import com.saju.server.service.FaceReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/face-reading")
@RequiredArgsConstructor
public class FaceReadingController {

    private final FaceReadingService faceReadingService;

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam String faceShape,
            @RequestParam String eyeShape,
            @RequestParam String noseShape,
            @RequestParam String mouthShape,
            @RequestParam String foreheadShape,
            @RequestParam(required = false) String birthDate,
            @RequestParam(required = false) String gender) {
        return ResponseEntity.ok(
            faceReadingService.analyzeFace(faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender)
        );
    }
}
