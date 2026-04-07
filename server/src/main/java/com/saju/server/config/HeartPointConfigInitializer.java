package com.saju.server.config;

import com.saju.server.entity.HeartPointConfig;
import com.saju.server.repository.HeartPointConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class HeartPointConfigInitializer implements CommandLineRunner {

    private final HeartPointConfigRepository configRepository;

    @Override
    public void run(String... args) {
        // ── 기본 운세 ──
        init("TODAY_FORTUNE",        5,  "기본운세",    "오늘의 운세");
        init("SAJU_ANALYSIS",       5,  "기본운세",    "사주분석");

        // ── 1:1연애운 (13개 서브타입) ──
        init("LOVE_RELATIONSHIP",    5,  "1:1연애운",   "연애운");
        init("LOVE_CRUSH",           5,  "1:1연애운",   "짝사랑");
        init("LOVE_SOME_CHECK",      5,  "1:1연애운",   "썸진단");
        init("LOVE_BLIND_DATE",      5,  "1:1연애운",   "소개팅운");
        init("LOVE_COUPLE",          5,  "1:1연애운",   "데이트운");
        init("LOVE_CONFESSION",      5,  "1:1연애운",   "고백운");
        init("LOVE_IDEAL_TYPE",      5,  "1:1연애운",   "이상형분석");
        init("LOVE_REUNION",         5,  "1:1연애운",   "재회운");
        init("LOVE_REMARRIAGE",      5,  "1:1연애운",   "재혼운");
        init("LOVE_MARRIAGE",        5,  "1:1연애운",   "결혼운");
        init("LOVE_PAST_LIFE",       5,  "1:1연애운",   "전생인연");
        init("LOVE_MEETING_TIMING",  5,  "1:1연애운",   "만남시기");
        init("LOVE_CONTACT",         5,  "1:1연애운",   "연락운");

        // ── 궁합 ──
        init("COMPATIBILITY",        5,  "궁합",       "사주궁합");
        init("CELEB_COMPAT",         3,  "궁합",       "최애스타궁합");

        init("MANSERYEOK",          5,  "기본운세",    "만세력 AI해석");

        // ── 특수분석 ──
        init("TAROT",                5,  "특수분석",    "타로");
        init("DREAM",                5,  "특수분석",    "꿈해몽");
        init("FACE_READING",         5,  "특수분석",    "관상분석");
        init("PSYCH_TEST",           5,  "특수분석",    "심리테스트");

        // ── 운세종합 ──
        init("BLOOD_TYPE",           3,  "운세종합",    "혈액형 운세");
        init("MBTI",                 3,  "운세종합",    "MBTI 운세");
        init("CONSTELLATION",        3,  "운세종합",    "별자리 운세");

        // ── 기간별 운세 ──
        init("YEAR_FORTUNE",         5,  "기간별운세",  "신년운세");
        init("MONTHLY_FORTUNE",      5,  "기간별운세",  "월간운세");
        init("WEEKLY_FORTUNE",       5,  "기간별운세",  "주간운세");
        init("TOJEONG",              5,  "기간별운세",  "토정비결");

        // ── 심화분석 (12개 서브타입) ──
        init("DEEP_TODAY",          15,  "심화분석",    "심화 - 오늘의 운세");
        init("DEEP_LOVE",           15,  "심화분석",    "심화 - 연애운");
        init("DEEP_REUNION",        15,  "심화분석",    "심화 - 재회운");
        init("DEEP_REMARRIAGE",     15,  "심화분석",    "심화 - 재혼운");
        init("DEEP_BLIND_DATE",     15,  "심화분석",    "심화 - 소개팅운");
        init("DEEP_YEARLY",         15,  "심화분석",    "심화 - 신년운세");
        init("DEEP_MONTHLY",        15,  "심화분석",    "심화 - 월간운세");
        init("DEEP_WEEKLY",         15,  "심화분석",    "심화 - 주간운세");
        init("DEEP_BLOODTYPE",      15,  "심화분석",    "심화 - 혈액형");
        init("DEEP_MBTI",           15,  "심화분석",    "심화 - MBTI");
        init("DEEP_CONSTELLATION",  15,  "심화분석",    "심화 - 별자리");
        init("DEEP_TOJEONG",        15,  "심화분석",    "심화 - 토정비결");

        // ── 시스템 ──
        init("SIGNUP_BONUS",       500,  "시스템",      "회원가입 보너스");
    }

    private void init(String category, int cost, String group, String description) {
        if (configRepository.findByAnalysisCategory(category).isEmpty()) {
            configRepository.save(HeartPointConfig.builder()
                    .analysisCategory(category)
                    .cost(cost)
                    .menuGroup(group)
                    .description(description)
                    .build());
            log.info("하트 설정 초기화: [{}] {} = {}", group, category, cost);
        }
    }
}
