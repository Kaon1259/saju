package com.saju.server.saju;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DaeunInfo {
    private int startAge;
    private int endAge;
    private int stemIndex;
    private int branchIndex;
    private String stemName;      // "갑"
    private String branchName;    // "자"
    private String stemHanja;     // "甲"
    private String branchHanja;   // "子"
    private String fullName;      // "갑자"
    private String fullHanja;     // "甲子"
    private String stemElement;   // "목"
    private String branchElement; // "수"
    private String sipsung;       // "비견" etc
    private String twelveStage;   // 12운성
    private boolean current;      // is this the current 대운?
}
