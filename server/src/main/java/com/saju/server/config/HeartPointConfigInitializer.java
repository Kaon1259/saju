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
        // ════════════════════════════════════════════════════════════
        // 하트 1개당 가치: 약 5원 (충전 1000원 = 200하트 기준)
        // 마진 목표: AI 토큰 비용 ÷ 하트 가격 ≤ 30% (마진 70%+)
        //
        // 모델별 토큰 단가 참고
        //  - Haiku 4.5  : $0.80 input / $4.00 output per 1M
        //  - Sonnet 4.6 : $3.00 input / $15.00 output per 1M
        //
        // 일반 = Haiku (3000~7000 토큰 범위), 심화·타로·12시진 = Sonnet
        // ════════════════════════════════════════════════════════════

        // ── 룰 기반 (AI 거의 없음) ──
        init("CONSTELLATION",        1,  "운세종합",    "별자리 운세");
        init("ZODIAC",               1,  "운세종합",    "띠 운세");

        // ── 짧은 AI (~1000 토큰) ──
        init("BLOOD_TYPE",           3,  "운세종합",    "혈액형 운세");
        init("MBTI",                 3,  "운세종합",    "MBTI 운세");
        init("BIORHYTHM",            3,  "운세종합",    "바이오리듬");
        init("WEATHER_COMPAT",       3,  "운세종합",    "날씨 궁합");
        init("MBTI_COMPAT",          3,  "궁합",       "MBTI 궁합");
        init("BLOODTYPE_COMPAT",     3,  "궁합",       "혈액형 궁합");
        init("CELEB_COMPAT",         3,  "궁합",       "최애스타궁합");
        init("CELEB_FORTUNE",        3,  "스타운세",    "스타 오늘의 운세");
        init("GROUP_FORTUNE",        3,  "스타운세",    "그룹 운세");
        init("GROUP_COMPAT",         3,  "스타운세",    "그룹 궁합");
        init("CELEB_MATCH",          3,  "스타운세",    "나와 궁합 맞는 스타");

        // ── 기본 사주 운세 (Haiku ~3000 토큰) ──
        init("TODAY_FORTUNE",        5,  "기본운세",    "오늘의 운세");
        init("SAJU_ANALYSIS",        5,  "기본운세",    "사주분석");
        init("MANSERYEOK",           5,  "기본운세",    "만세력 AI해석");
        init("DAILY_TAROT",          5,  "특수분석",    "오늘의 타로 한 장");

        // ── 1:1연애운 13종 (Haiku ~3000 토큰) ──
        init("LOVE_RELATIONSHIP",    5,  "1:1연애운",   "연애운");
        init("LOVE_CRUSH",           5,  "1:1연애운",   "짝사랑");
        init("LOVE_SOME_CHECK",      5,  "1:1연애운",   "썸진단");
        init("LOVE_BLIND_DATE",      5,  "1:1연애운",   "소개팅운");
        init("LOVE_COUPLE",          5,  "1:1연애운",   "데이트운");
        init("LOVE_CONFESSION",      5,  "1:1연애운",   "고백운");
        init("LOVE_IDEAL_TYPE",      5,  "1:1연애운",   "이상형분석");
        init("LOVE_REUNION",         5,  "1:1연애운",   "재회운");
        init("LOVE_REMARRIAGE",      5,  "1:1연애운",   "재혼운");
        init("LOVE_RECOVERY",        5,  "1:1연애운",   "이별회복운");
        init("LOVE_MARRIAGE",        5,  "1:1연애운",   "결혼운");
        init("LOVE_PAST_LIFE",       5,  "1:1연애운",   "전생인연");
        init("LOVE_MEETING_TIMING",  5,  "1:1연애운",   "만남시기");
        init("LOVE_CONTACT",         5,  "1:1연애운",   "연락운");

        // ── 일반 분석 (Haiku ~3000~5000 토큰) ──
        init("DREAM",                5,  "특수분석",    "꿈해몽");
        init("FACE_READING",         5,  "특수분석",    "관상분석");
        init("PSYCH_TEST",           5,  "특수분석",    "심리테스트");
        init("COMPATIBILITY",        8,  "궁합",       "사주궁합");        // 두 명 데이터, 토큰 ↑

        // ── 기간 운세 (Haiku ~5000~7000 토큰) ──
        init("YEAR_FORTUNE",         8,  "기간별운세",  "신년운세");        // 5 → 8
        init("MONTHLY_FORTUNE",      8,  "기간별운세",  "월간운세");        // 5 → 8
        init("WEEKLY_FORTUNE",       8,  "기간별운세",  "주간운세");        // 5 → 8
        init("TOJEONG",              8,  "기간별운세",  "토정비결");        // 5 → 8
        init("DAILY_FORTUNE_EXTRA",  8,  "기본운세",    "일운 더보기");     // 10 → 8 (소폭 하향)
        init("MONTHLY_FORTUNE_EXTRA", 8, "기간별운세",  "월간운세 더보기"); // 5 → 8

        // ── 타로 (Sonnet — AI 호출 비중 높음) ──
        // 기존 가격 역전 (타로 100 vs 심화 15) 해소
        init("TAROT",                10, "특수분석",    "타로");           // 20 → 10 (심화보다 가벼움)
        init("TAROT_ONE",            10, "특수분석",    "타로 원카드");    // 20 → 10
        init("TAROT_THREE",          25, "특수분석",    "타로 쓰리카드"); // 50 → 25
        init("TAROT_FIVE",           50, "특수분석",    "타로 켈틱크로스"); // 100 → 50

        // ── 심화 일반 (Sonnet ~5500 토큰) ──
        // 15 → 30 (Sonnet 가격 반영, 마진 확보)
        init("DEEP_TODAY",          30,  "심화분석",    "심화 - 오늘의 운세");
        init("DEEP_LOVE",           30,  "심화분석",    "심화 - 연애운");
        init("DEEP_REUNION",        30,  "심화분석",    "심화 - 재회운");
        init("DEEP_REMARRIAGE",     30,  "심화분석",    "심화 - 재혼운");
        init("DEEP_BLIND_DATE",     30,  "심화분석",    "심화 - 소개팅운");
        init("DEEP_YEARLY",         30,  "심화분석",    "심화 - 신년운세");
        init("DEEP_MONTHLY",        30,  "심화분석",    "심화 - 월간운세");
        init("DEEP_WEEKLY",         30,  "심화분석",    "심화 - 주간운세");
        init("DEEP_BLOODTYPE",      30,  "심화분석",    "심화 - 혈액형");
        init("DEEP_MBTI",           30,  "심화분석",    "심화 - MBTI");
        init("DEEP_CONSTELLATION",  30,  "심화분석",    "심화 - 별자리");
        init("DEEP_TOJEONG",        30,  "심화분석",    "심화 - 토정비결");

        // ── 심화 프리미엄 (Sonnet ~6500 토큰) ──
        // 200은 사용 차단 수준 → 80으로 하향, 3종 모두 통일
        init("DEEP_COMPATIBILITY",  80,  "심화분석",    "심화 - 정통궁합");      // 200 → 80
        init("DEEP_MARRIAGE_COMPAT", 80, "심화분석",   "심화 - 결혼궁합");       // 200 → 80
        init("DEEP_TAROT",          80,  "심화분석",    "심화 - 타로 리딩");     // 200 → 80

        // ── 결정 상담 (간판 유료 상품 — Sonnet ~4500 토큰) ──
        // 4가지 카테고리(재회/이별/고백/결혼) 공통 가격.
        // 일반 운세보다 비싸야 함 — 인생 결정 수준의 분석 + 사용자 가이드 답변 반영.
        init("DECISION_CONSULT",    80,  "결정상담",    "결정 상담 (연애 결정)");

        // ── 시스템 (보너스/지급) ──
        // BM 확정 (2026-05-25): 가입 30 박하게 — 결제/광고 동기 강화. 무료 적립 전반 하향.
        // 신규 가입은 30 + 프로필 완성 30 = 진성 유저 60 / 어뷰징 계정 30.
        init("SIGNUP_BONUS",        30,  "시스템",      "회원가입 보너스");      // 40 → 30 (BM 박하게)
        init("PROFILE_COMPLETE",    30,  "시스템",      "프로필 완성 보너스");   // 양질 데이터 유도 — UserService 연동
        init("DAILY_ATTENDANCE",     2,  "시스템",      "일일 출석 보너스");     // 3 → 2 (BM 박하게)
        init("ATTENDANCE_7DAY",     10,  "시스템",      "7일 연속 출석 보너스"); // 15 → 10
        init("ATTENDANCE_14DAY",    20,  "시스템",      "14일 연속 출석 보너스"); // 30 → 20
        init("ATTENDANCE_30DAY",    40,  "시스템",      "30일 연속 출석 보너스"); // 60 → 40

        // ── 리워드 광고 (BM ② — 1회 5하트, 하루 5회 한도는 컨트롤러 AD_REWARD_DAILY_LIMIT) ──
        init("REWARD_AD",            5,  "시스템",      "리워드 광고 보상 (1회)");

        // ── 친구 초대 / 평점 (양방향 보너스) ──
        init("INVITE_INVITER",      20,  "시스템",      "친구 초대 보너스 (초대자)");   // 30 → 20 (BM 박하게)
        init("INVITE_INVITEE",      20,  "시스템",      "친구 초대 보너스 (피초대자)"); // 30 → 20
        init("RATING_REWARD",       30,  "시스템",      "Play Store 평점 보너스 (1회)"); // 50 → 30
    }

    private void init(String category, int cost, String group, String description) {
        var existing = configRepository.findByAnalysisCategory(category);
        if (existing.isEmpty()) {
            configRepository.save(HeartPointConfig.builder()
                    .analysisCategory(category)
                    .cost(cost)
                    .menuGroup(group)
                    .description(description)
                    .build());
            log.info("하트 설정 초기화: [{}] {} = {}", group, category, cost);
        } else {
            HeartPointConfig config = existing.get();
            if (config.getCost() != cost) {
                int oldCost = config.getCost();
                config.setCost(cost);
                configRepository.save(config);
                log.info("하트 설정 업데이트: [{}] {} = {} → {}", group, category, oldCost, cost);
            }
        }
    }
}
