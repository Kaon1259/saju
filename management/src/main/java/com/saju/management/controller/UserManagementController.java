package com.saju.management.controller;

import com.saju.management.entity.HeartPointLog;
import com.saju.management.entity.User;
import com.saju.management.service.AdminAuthService;
import com.saju.management.service.HeartPointManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class UserManagementController {

    private final HeartPointManagementService heartPointService;
    private final AdminAuthService adminAuthService;

    @GetMapping("/users")
    public String userList(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Model model) {
        Page<User> users = heartPointService.getUsers(
                search, PageRequest.of(page, size, Sort.by("id").descending()));
        model.addAttribute("users", users);
        model.addAttribute("search", search);
        return "users";
    }

    @GetMapping("/users/{id}")
    public String userDetail(@PathVariable Long id, Model model) {
        User user = heartPointService.getUserDetail(id);
        List<HeartPointLog> recentLogs = heartPointService.getRecentLogs(id);
        boolean isAdmin = adminAuthService.isAdmin(user.getPhone());
        model.addAttribute("user", user);
        model.addAttribute("logs", recentLogs);
        model.addAttribute("isAdmin", isAdmin);
        return "user-detail";
    }

    @PostMapping("/users/{id}/grant-admin")
    public String grantAdmin(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            User user = heartPointService.getUserDetail(id);
            if (user.getPhone() == null || user.getPhone().isBlank()) {
                redirectAttributes.addFlashAttribute("error", "전화번호가 없는 유저는 관리자 권한을 부여할 수 없습니다.");
                return "redirect:/users/" + id;
            }
            adminAuthService.grantAdmin(user.getPhone(), user.getName());
            redirectAttributes.addFlashAttribute("success", user.getName() + "님에게 관리자 권한을 부여했습니다.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/users/" + id;
    }

    @PostMapping("/users/{id}/revoke-admin")
    public String revokeAdmin(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            User user = heartPointService.getUserDetail(id);
            adminAuthService.revokeAdmin(user.getPhone());
            redirectAttributes.addFlashAttribute("success", user.getName() + "님의 관리자 권한을 해제했습니다.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/users/" + id;
    }
}
