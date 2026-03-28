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
    private String phone;
    private String name;
    private LocalDate birthDate;
    private String calendarType;
    private String birthTime;
    private String gender;
    private String zodiacAnimal;
    private String bloodType;
    private String mbtiType;
    private String relationshipStatus;
    private LocalDate partnerBirthDate;
    private String partnerBirthTime;
    private String partnerBloodType;
    private String partnerMbtiType;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .phone(user.getPhone())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .calendarType(user.getCalendarType())
                .birthTime(user.getBirthTime())
                .gender(user.getGender())
                .zodiacAnimal(user.getZodiacAnimal())
                .bloodType(user.getBloodType())
                .mbtiType(user.getMbtiType())
                .relationshipStatus(user.getRelationshipStatus())
                .partnerBirthDate(user.getPartnerBirthDate())
                .partnerBirthTime(user.getPartnerBirthTime())
                .partnerBloodType(user.getPartnerBloodType())
                .partnerMbtiType(user.getPartnerMbtiType())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
