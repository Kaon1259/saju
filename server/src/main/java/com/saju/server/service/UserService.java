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
    private final HeartPointService heartPointService;

    @PersistenceContext
    private EntityManager em;

    private static final String[] ZODIAC_ANIMALS = {
            "원숭이", "닭", "개", "돼지", "쥐", "소",
            "호랑이", "토끼", "용", "뱀", "말", "양"
    };

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

        // 프로필 완성 보너스 — 생년월일+성별이 처음 채워지면 1회 +30 (PROFILE_COMPLETE).
        // 카카오 가입 직후엔 name 만 있고 birthDate/gender 가 NULL → ProfileEdit 완료 시점에만 지급.
        // 진성 유저는 가입40 + 완성30 = 70 / 봇·일회용 계정은 가입40만 → 어뷰징 적립 억제.
        boolean grantProfileBonus = !Boolean.TRUE.equals(user.getProfileBonusClaimed())
                && user.getBirthDate() != null && user.getGender() != null;
        if (grantProfileBonus) {
            user.setProfileBonusClaimed(true);
        }

        User saved = userRepository.save(user);

        if (grantProfileBonus) {
            // grantBonus 는 같은 트랜잭션·영속성 컨텍스트에서 동일 user 인스턴스의 heartPoints 를
            // 갱신하므로, 아래 UserResponse.from(saved) 는 갱신된 잔액을 그대로 반영한다.
            int bonus = heartPointService.grantBonus(saved.getId(), "PROFILE_COMPLETE", "프로필 완성 보너스");
            log.info("프로필 완성 보너스 지급: userId={}, bonus={}", saved.getId(), bonus);
        }

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
