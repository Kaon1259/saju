package com.saju.management.controller;

import com.saju.management.entity.HeartPointConfig;
import com.saju.management.entity.HeartPointLog;
import com.saju.management.service.HeartPointManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class HeartPointManagementController {

    private final HeartPointManagementService heartPointService;

    @PostMapping("/hearts/adjust")
    public String adjustHearts(
            @RequestParam Long userId,
            @RequestParam int amount,
            @RequestParam(defaultValue = "관리자 조정") String description,
            RedirectAttributes redirectAttributes) {
        try {
            heartPointService.adjustHeartPoints(userId, amount, description);
            redirectAttributes.addFlashAttribute("success",
                    "하트 " + (amount >= 0 ? "지급" : "차감") + " 완료: " + Math.abs(amount) + "개");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/users/" + userId;
    }

    @PostMapping("/hearts/bulk-grant")
    public String bulkGrant(
            @RequestParam int amount,
            @RequestParam(defaultValue = "전체 일괄 지급") String description,
            RedirectAttributes redirectAttributes) {
        try {
            int count = heartPointService.bulkGrantHearts(amount, description);
            redirectAttributes.addFlashAttribute("success",
                    "전체 " + count + "명에게 " + amount + "하트 일괄 지급 완료");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/dashboard";
    }

    @GetMapping("/hearts/config")
    public String configPage(Model model) {
        model.addAttribute("configGroups", heartPointService.getConfigsByGroup());
        model.addAttribute("aiModelMap", heartPointService.getAiModelMap());
        return "heart-config";
    }

    @PostMapping("/hearts/config/update")
    public String updateConfig(
            @RequestParam Long id,
            @RequestParam int cost,
            @RequestParam(required = false) String description,
            RedirectAttributes redirectAttributes) {
        try {
            heartPointService.updateConfig(id, cost, description);
            redirectAttributes.addFlashAttribute("success", "설정이 변경되었습니다.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/hearts/config";
    }

    @GetMapping("/hearts/logs")
    public String logsPage(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Model model) {
        Page<HeartPointLog> logs;
        if (userId != null) {
            logs = heartPointService.getUserLogs(userId, PageRequest.of(page, size));
            model.addAttribute("filterUserId", userId);
        } else {
            logs = heartPointService.getAllLogs(PageRequest.of(page, size));
        }
        model.addAttribute("logs", logs);
        return "heart-logs";
    }
}
