package com.saju.server.dto;

import com.saju.server.entity.DailyFortune;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FortuneResponse {

    private Long id;
    private String zodiacAnimal;
    private LocalDate fortuneDate;
    private String overall;
    private String love;
    private String money;
    private String health;
    private String work;
    private String hourlyFortuneJson;
    private Integer luckyNumber;
    private String luckyColor;
    private String luckyDirection;
    private String luckyFood;
    private String luckyFashion;
    private String luckyItem;
    private String academicFortune;
    private String luckyPerson;
    private Integer score;
    // 카테고리별 점수 (홈 운세 요약 카드용)
    private Integer loveScore;
    private Integer moneyScore;
    private Integer healthScore;
    private Integer workScore;

    public static FortuneResponse from(DailyFortune fortune) {
        return FortuneResponse.builder()
                .id(fortune.getId())
                .zodiacAnimal(fortune.getZodiacAnimal())
                .fortuneDate(fortune.getFortuneDate())
                .overall(fortune.getOverall())
                .love(fortune.getLove())
                .money(fortune.getMoney())
                .health(fortune.getHealth())
                .work(fortune.getWork())
                .hourlyFortuneJson(fortune.getHourlyFortuneJson())
                .luckyNumber(fortune.getLuckyNumber())
                .luckyColor(fortune.getLuckyColor())
                .luckyDirection(fortune.getLuckyDirection())
                .luckyFood(fortune.getLuckyFood())
                .luckyFashion(fortune.getLuckyFashion())
                .luckyItem(fortune.getLuckyItem())
                .academicFortune(fortune.getAcademicFortune())
                .luckyPerson(fortune.getLuckyPerson())
                .score(fortune.getScore())
                .loveScore(fortune.getLoveScore())
                .moneyScore(fortune.getMoneyScore())
                .healthScore(fortune.getHealthScore())
                .workScore(fortune.getWorkScore())
                .build();
    }
}
