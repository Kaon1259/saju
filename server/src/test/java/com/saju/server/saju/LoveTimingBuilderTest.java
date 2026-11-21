package com.saju.server.saju;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class LoveTimingBuilderTest {
    @SuppressWarnings("unchecked")
    @Test
    void buildsTwelveMonthsWithValidGrades() {
        for (boolean male : new boolean[]{true, false}) {
            Map<String, Object> r = LoveTimingBuilder.build(LocalDate.of(1995, 3, 10), male, LocalDate.of(2026, 11, 21));
            List<Map<String, Object>> months = (List<Map<String, Object>>) r.get("months");
            assertEquals(12, months.size());
            assertEquals("2026-11", months.get(0).get("ym"));
            assertEquals("2027-10", months.get(11).get("ym"));
            for (Map<String, Object> m : months) {
                assertTrue(List.of("유리", "보통", "주의").contains(m.get("grade")));
                assertNotNull(m.get("keyword"));
            }
            System.out.println((male ? "M " : "F ") + r.get("dayMaster") + "/" + r.get("spouseBranch") + " best=" + r.get("bestIndex"));
            months.forEach(m -> System.out.println("  " + m.get("ym") + " " + m.get("ganji") + " " + m.get("sipsung") + " " + m.get("grade") + " " + m.get("score") + " " + m.get("keyword")));
        }
    }
}
