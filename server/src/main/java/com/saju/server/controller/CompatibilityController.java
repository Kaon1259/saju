package com.saju.server.controller;

import com.saju.server.service.CompatibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/compatibility")
@RequiredArgsConstructor
public class CompatibilityController {

    private final CompatibilityService compatibilityService;

    @GetMapping("/saju")
    public ResponseEntity<Map<String, Object>> analyzeSajuCompatibility(
            @RequestParam("birthDate1") String birthDate1Str,
            @RequestParam("birthDate2") String birthDate2Str,
            @RequestParam(value = "birthTime1", required = false) String birthTime1,
            @RequestParam(value = "birthTime2", required = false) String birthTime2) {
        LocalDate bd1 = LocalDate.parse(birthDate1Str);
        LocalDate bd2 = LocalDate.parse(birthDate2Str);
        return ResponseEntity.ok(compatibilityService.analyzeSaju(bd1, birthTime1, bd2, birthTime2));
    }
}
