package com.saju.server.saju;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SajuInteraction {
    private String type;        // "합", "충", "형", "해"
    private String subType;     // "육합", "삼합", "방합", "삼형", "무례형", "자형"
    private String pillar1;     // "년주", "월주", "일주", "시주"
    private String pillar2;     // "년주", "월주", "일주", "시주"
    private String pillar3;     // nullable (삼합/삼형)
    private String branch1;     // "자", "인" etc
    private String branch2;
    private String branch3;     // nullable
    private String resultElement; // nullable, 합의 결과 오행
    private String description;
}
