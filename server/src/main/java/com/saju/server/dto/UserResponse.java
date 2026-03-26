package com.saju.server.dto;

import com.saju.server.entity.User;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String name;
    private LocalDate birthDate;
    private String calendarType;
    private String birthTime;
    private String gender;
    private String zodiacAnimal;
    private String bloodType;
    private String mbtiType;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .calendarType(user.getCalendarType())
                .birthTime(user.getBirthTime())
                .gender(user.getGender())
                .zodiacAnimal(user.getZodiacAnimal())
                .bloodType(user.getBloodType())
                .mbtiType(user.getMbtiType())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
