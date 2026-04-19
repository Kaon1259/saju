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
    private Integer score;

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
                .score(fortune.getScore())
                .build();
    }
}
