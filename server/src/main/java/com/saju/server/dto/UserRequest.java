package com.saju.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequest {

    private String phone;

    @NotBlank(message = "이름은 필수 입력값입니다.")
    private String name;

    @NotNull(message = "생년월일은 필수 입력값입니다.")
    private LocalDate birthDate;

    @NotBlank(message = "음력/양력 구분은 필수 입력값입니다.")
    @Pattern(regexp = "^(SOLAR|LUNAR)$", message = "SOLAR 또는 LUNAR만 가능합니다.")
    private String calendarType;

    private String birthTime;

    @NotBlank(message = "성별은 필수 입력값입니다.")
    @Pattern(regexp = "^[MF]$", message = "성별은 M 또는 F만 가능합니다.")
    private String gender;

    private String bloodType;  // A, B, O, AB (optional)
    private String mbtiType;   // ENFP, INTJ, etc. (optional)

    private String relationshipStatus; // IN_RELATIONSHIP, SOME, SINGLE
    private LocalDate partnerBirthDate;
    private String partnerBirthTime;
    private String partnerCalendarType;
    private String partnerBloodType;
    private String partnerMbtiType;
}
