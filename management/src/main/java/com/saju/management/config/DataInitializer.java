package com.saju.management.config;

import com.saju.management.service.AdminAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdminAuthService adminAuthService;

    @Override
    public void run(String... args) {
        adminAuthService.initDefaultAdmin();
    }
}
