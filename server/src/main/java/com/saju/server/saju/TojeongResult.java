package com.saju.server.saju;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TojeongResult {
    private int sangsu;        // 상수 (태세수)
    private int jungsu;        // 중수 (월건수)
    private int hasu;          // 하수 (일진수)
    private int totalGwae;     // 총 괘 번호
    private String gwaeName;   // 괘 이름
    private String yearSummary;      // 올해 총평
    private List<MonthlyFortune> monthlyFortunes; // 월별 운세

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyFortune {
        private int month;       // 1~12
        private String fortune;  // 운세 내용
        private String rating;   // "대길", "길", "보통", "흉", "대흉"
    }
}
