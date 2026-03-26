package com.saju.server.saju;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SinsalInfo {
    private String name;          // "도화살", "역마살", "천을귀인" etc
    private boolean present;
    private String foundInPillar; // "년주", "월주", "일주", "시주" (nullable if not present)
    private String branchName;    // which branch matches
    private String description;   // Korean description of this sinsal
    private boolean positive;     // true=길신, false=흉살
}
