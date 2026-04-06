package com.saju.management.service;

import com.saju.management.entity.AdminUser;
import com.saju.management.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;

    @Transactional
    public AdminUser login(String phone) {
        String normalized = phone.replaceAll("[^0-9]", "");
        AdminUser admin = adminUserRepository.findByPhone(normalized)
                .orElseThrow(() -> new RuntimeException("등록되지 않은 관리자 번호입니다."));
        admin.setLastLoginAt(LocalDateTime.now());
        return adminUserRepository.save(admin);
    }

    @Transactional
    public void initDefaultAdmin() {
        if (adminUserRepository.count() == 0) {
            adminUserRepository.save(AdminUser.builder()
                    .phone("01012345678")
                    .name("관리자")
                    .role("SUPER_ADMIN")
                    .build());
        }
    }

    public boolean isAdmin(String phone) {
        if (phone == null || phone.isBlank()) return false;
        return adminUserRepository.findByPhone(phone.replaceAll("[^0-9]", "")).isPresent();
    }

    @Transactional
    public void grantAdmin(String phone, String name) {
        String normalized = phone.replaceAll("[^0-9]", "");
        if (adminUserRepository.findByPhone(normalized).isPresent()) {
            throw new RuntimeException("이미 관리자 권한이 있습니다.");
        }
        adminUserRepository.save(AdminUser.builder()
                .phone(normalized)
                .name(name)
                .role("ADMIN")
                .build());
    }

    @Transactional
    public void revokeAdmin(String phone) {
        String normalized = phone.replaceAll("[^0-9]", "");
        AdminUser admin = adminUserRepository.findByPhone(normalized)
                .orElseThrow(() -> new RuntimeException("관리자 권한이 없는 유저입니다."));
        if ("SUPER_ADMIN".equals(admin.getRole())) {
            throw new RuntimeException("최고 관리자 권한은 해제할 수 없습니다.");
        }
        adminUserRepository.delete(admin);
    }
}
