package com.saju.server.service;

import com.saju.server.dto.UserRequest;
import com.saju.server.dto.UserResponse;
import com.saju.server.entity.User;
import com.saju.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    private static final String[] ZODIAC_ANIMALS = {
            "원숭이", "닭", "개", "돼지", "쥐", "소",
            "호랑이", "토끼", "용", "뱀", "말", "양"
    };

    @Transactional
    public UserResponse register(UserRequest request) {
        String zodiacAnimal = calculateZodiac(request.getBirthDate().getYear());

        User user = User.builder()
                .name(request.getName())
                .birthDate(request.getBirthDate())
                .calendarType(request.getCalendarType())
                .birthTime(request.getBirthTime())
                .gender(request.getGender())
                .zodiacAnimal(zodiacAnimal)
                .bloodType(request.getBloodType())
                .mbtiType(request.getMbtiType())
                .build();

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
}
