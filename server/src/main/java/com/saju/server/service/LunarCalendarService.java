package com.saju.server.service;

import com.github.usingsky.calendar.KoreanLunarCalendar;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class LunarCalendarService {

    /**
     * 음력 날짜를 양력으로 변환
     * @param lunarDate 음력 날짜 (yyyy-MM-dd 형식의 LocalDate)
     * @return 양력 LocalDate
     */
    public LocalDate lunarToSolar(LocalDate lunarDate) {
        KoreanLunarCalendar calendar = KoreanLunarCalendar.getInstance();
        boolean success = calendar.setLunarDate(
            lunarDate.getYear(),
            lunarDate.getMonthValue(),
            lunarDate.getDayOfMonth(),
            false // 윤달 아님
        );

        if (!success) {
            throw new IllegalArgumentException("유효하지 않은 음력 날짜입니다: " + lunarDate);
        }

        return LocalDate.of(
            calendar.getSolarYear(),
            calendar.getSolarMonth(),
            calendar.getSolarDay()
        );
    }

    /**
     * 양력 날짜를 음력으로 변환
     */
    public LocalDate solarToLunar(LocalDate solarDate) {
        KoreanLunarCalendar calendar = KoreanLunarCalendar.getInstance();
        calendar.setSolarDate(
            solarDate.getYear(),
            solarDate.getMonthValue(),
            solarDate.getDayOfMonth()
        );

        return LocalDate.of(
            calendar.getLunarYear(),
            calendar.getLunarMonth(),
            calendar.getLunarDay()
        );
    }
}
