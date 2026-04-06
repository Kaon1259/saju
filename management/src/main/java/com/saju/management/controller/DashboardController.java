package com.saju.management.controller;

import com.saju.management.service.HeartPointManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Map;

@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final HeartPointManagementService heartPointService;

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        Map<String, Object> stats = heartPointService.getDashboardStats();
        model.addAllAttributes(stats);
        return "dashboard";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/dashboard";
    }
}
