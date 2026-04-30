package com.saju.server.service;

import com.saju.server.dto.UserRequest;
import com.saju.server.dto.UserResponse;
import com.saju.server.entity.User;
import com.saju.server.repository.FortuneHistoryRepository;
import com.saju.server.repository.HeartPointLogRepository;
import com.saju.server.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final FortuneHistoryRepository fortuneHistoryRepository;
    private final HeartPointLogRepository heartPointLogRepository;

    @PersistenceContext
    private EntityManager em;

    private static final String[] ZODIAC_ANIMALS = {
            "원숭이", "닭", "개", "돼지", "쥐", "소",
            "호랑이", "토끼", "용", "뱀", "말", "양"
    };

    @Transactional
    public UserResponse register(UserRequest request) {
        // 이미 등록된 번호인지 확인
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String normalizedPhone = request.getPhone().replaceAll("[^0-9]", "");
            userRepository.findByPhone(normalizedPhone).ifPresent(u -> {
                throw new RuntimeException("이미 등록된 전화번호입니다. 로그인해주세요.");
            });
        }

        String zodiacAnimal = calculateZodiac(request.getBirthDate().getYear());

        User user = User.builder()
                .phone(request.getPhone() != null ? request.getPhone().replaceAll("[^0-9]", "") : null)
                .name(request.getName())
                .birthDate(request.getBirthDate())
                .calendarType(request.getCalendarType())
                .birthTime(request.getBirthTime())
                .gender(request.getGender())
                .zodiacAnimal(zodiacAnimal)
                .bloodType(request.getBloodType())
                .mbtiType(request.getMbtiType())
                .relationshipStatus(request.getRelationshipStatus())
                .partnerBirthDate(request.getPartnerBirthDate())
                .partnerBirthTime(request.getPartnerBirthTime())
                .partnerCalendarType(request.getPartnerCalendarType())
                .partnerBloodType(request.getPartnerBloodType())
                .partnerMbtiType(request.getPartnerMbtiType())
                .build();

        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public UserResponse login(String phone) {
        String normalizedPhone = phone.replaceAll("[^0-9]", "");
        User user = userRepository.findByPhone(normalizedPhone)
                .orElseThrow(() -> new RuntimeException("등록되지 않은 전화번호입니다."));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (request.getName() != null) user.setName(request.getName());
        if (request.getBirthDate() != null) {
            user.setBirthDate(request.getBirthDate());
            user.setZodiacAnimal(calculateZodiac(request.getBirthDate().getYear()));
        }
        if (request.getCalendarType() != null) user.setCalendarType(request.getCalendarType());
        if (request.getGender() != null) user.setGender(request.getGender());
        user.setBirthTime(request.getBirthTime());
        user.setBloodType(request.getBloodType());
        user.setMbtiType(request.getMbtiType());
        user.setRelationshipStatus(request.getRelationshipStatus());
        user.setPartnerBirthDate(request.getPartnerBirthDate());
        user.setPartnerBirthTime(request.getPartnerBirthTime());
        user.setPartnerCalendarType(request.getPartnerCalendarType());
        user.setPartnerBloodType(request.getPartnerBloodType());
        user.setPartnerMbtiType(request.getPartnerMbtiType());

        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다. ID: " + id));
        return UserResponse.from(user);
    }

    public String calculateZodiac(int year) {
        int index = year % 12;
        return ZODIAC_ANIMALS[index];
    }

    /**
     * 회원 탈퇴 — Play Store 정책상 계정 삭제 기능 필수.
     * 사용자 본인 식별 데이터(프로필, 하트 로그, 운세 히스토리)를 hard delete.
     * SpecialFortune 캐시는 birthDate 해시 기반 공유 캐시라 사용자 식별 정보 없음 → 보존.
     */
    @Transactional
    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("사용자를 찾을 수 없습니다.");
        }
        // 1) 본인 운세 히스토리
        em.createQuery("DELETE FROM FortuneHistory h WHERE h.userId = :uid")
            .setParameter("uid", userId)
            .executeUpdate();
        // 2) 하트 포인트 로그
        em.createQuery("DELETE FROM HeartPointLog l WHERE l.userId = :uid")
            .setParameter("uid", userId)
            .executeUpdate();
        // 3) 사용자 자체
        userRepository.deleteById(userId);
        log.info("[USER_DELETE] uid={} 영구 삭제 완료", userId);
    }
}
