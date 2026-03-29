package com.saju.server.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeepAnalysisService {

    private final ClaudeApiService claudeApiService;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> analyze(String type, String birthDate, String birthTime, String gender, String calendarType, String extra) {
        String fortuneType = "deep-" + type;
        String cacheKey = buildCacheKey(type, birthDate, birthTime, gender, calendarType, extra);

        // DB 캐시 확인
        Map<String, Object> cached = getFromCache(fortuneType, cacheKey);
        if (cached != null) return cached;

        // 프롬프트 빌드
        String systemPrompt = buildSystemPrompt(type);
        String userPrompt = buildUserPrompt(type, birthDate, birthTime, gender, calendarType, extra);

        // AI 호출
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", type);
        result.put("birthDate", birthDate);
        result.put("analysisDate", LocalDate.now().toString());

        try {
            String response = claudeApiService.generate(systemPrompt, userPrompt, 4000);
            String json = ClaudeApiService.extractJson(response);
            if (json != null) {
                Map<String, Object> aiResult = objectMapper.readValue(json, new TypeReference<>() {});
                result.putAll(aiResult);
            } else {
                result.put("analysis", response);
            }
        } catch (Exception e) {
            log.warn("심화분석 AI 호출 실패: {}", e.getMessage());
            result.put("analysis", buildFallback(type));
        }

        // DB 캐시 저장
        saveToCache(fortuneType, cacheKey, result);
        return result;
    }

    private String buildSystemPrompt(String type) {
        String base = """
            당신은 '천명(天命) 선생'이라 불리는 40년 경력의 사주명리학 대가이자, 동양 역학 박사 학위를 보유한 최고 권위자입니다.
            수만 명의 상담 경험을 바탕으로 유료 프리미엄 심화 분석을 제공합니다.

            [분석 원칙]
            1. 모든 분석은 천간지지·오행·십성·12운성의 이론적 근거를 반드시 제시합니다
            2. 추상적 표현 금지 — 구체적 시기, 방위, 색상, 숫자, 행동을 명시합니다
            3. 각 항목은 충분히 길고 상세하게 작성합니다 (최소 5문장 이상)
            4. 전문 역술인이 1:1 대면 상담하는 수준의 깊이와 구체성을 유지합니다
            5. 긍정적 조언과 현실적 주의사항을 균형 있게 제시합니다
            6. 반드시 JSON 형식으로만 응답하세요 (마크다운 코드블록 사용 가능)
            """;

        return switch (type) {
            case "today" -> base + """
                [오늘의 운세 프리미엄 심화분석]
                - 2시간 단위 시간대별 운세 (새벽/오전/점심/오후/저녁/밤 6구간)
                - 오행 기반 방위·음식·색상·향기·활동 추천 (각각 구체적 이유 포함)
                - 오늘의 감정/심리 깊이 분석 — 무의식 패턴, 대처법, 명상 키워드
                - 대인관계별 조언 (직장 상사, 동료, 연인, 가족, 친구 각각)
                - 재물 에너지 흐름 — 소비/투자/저축 각각의 적합도
                - 건강 주의 부위와 오행 기반 보양법
                - 오늘 피해야 할 행동/장소/사람 유형 상세
                """;
            case "love" -> base + """
                [연애운 프리미엄 심화분석]
                - 현재 연애 에너지 진단 (도화살·홍염살·천을귀인 분석)
                - 이상적 파트너의 사주적 특성 (오행, 띠, 성격, 직업군)
                - 만남의 최적 시기 (월/주/요일 구체적)
                - 만남 장소·방위·상황 추천
                - 연애 심리 패턴 분석 — 무의식적 끌림/회피 패턴
                - 관계 발전 단계별 전략 (첫 만남→호감→고백→연인)
                - 연애 중 주의해야 할 감정 함정과 대처법
                - 장기적 관계 전망과 결혼 가능성
                """;
            case "reunion" -> base + """
                [재회운 프리미엄 심화분석]
                - 재회 가능성 점수와 근거 (오행 상생/상극 분석)
                - 상대방의 현재 심리 상태와 나에 대한 감정 추정
                - 재회 최적 시기 (월/주 단위) 및 최적 접근법
                - 재회 성공을 위한 단계별 전략 (5단계)
                - 재회 후 관계 지속 가능성과 변화 포인트
                - 재회하면 안 되는 경우의 판단 기준
                - 미련과 집착의 구분 — 심리적 자가진단
                - 새로운 인연 vs 재회: 에너지 비교 분석
                """;
            case "remarriage" -> base + """
                [재혼운 프리미엄 심화분석]
                - 재혼 적기 분석 (대운·세운 흐름 기반)
                - 이상적 재혼 파트너의 사주적 특성
                - 과거 결혼의 사주적 원인 분석과 교훈
                - 재혼 성공을 위한 핵심 조건 5가지
                - 자녀/가족 관계 재구성 조언
                - 재혼 후 안정기까지의 타임라인
                - 법적·재정적 준비사항과 시기
                """;
            case "blind_date" -> base + """
                [소개팅운 프리미엄 심화분석]
                - 소개팅 최적 시기와 요일/시간대
                - 첫인상 전략 (오행 기반 패션·색상·향수 추천)
                - 대화 전략 (상대 오행 유형별 접근법)
                - 호감 신호 vs 거절 신호 판단 가이드
                - 2차·3차 데이트 전략과 고백 타이밍
                - 소개팅 상대 사주 유형별 궁합 예측
                - 소개팅 후 연락 전략과 관계 발전 로드맵
                """;
            case "yearly" -> base + """
                [신년운세 프리미엄 심화분석]
                - 월별 상세 운세 (12개월 각 5문장 이상)
                - 분기별 핵심 테마와 전략
                - 재물운 월별 등급과 투자/소비 전략
                - 건강운 — 계절별 주의 질환, 오행 부위별 관리법
                - 대인관계 — 귀인이 나타나는 시기와 특성
                - 직업/사업운 — 이직/창업/승진 최적 시기
                - 올해 3대 전환점과 대응 전략
                - 올해 피해야 할 3가지 함정
                - 올해 행운을 극대화하는 생활 습관 7가지
                """;
            case "monthly" -> base + """
                [월별 운세 프리미엄 심화분석]
                - 주차별 상세 운세 (4주 각 5문장 이상)
                - 이 달의 길일/흉일 날짜 명시 (최소 5개)
                - 재물운 — 수입/지출/투자 각각의 시기와 전략
                - 건강운 — 주의 부위, 식이요법, 운동 추천
                - 대인관계 — 갈등 시기와 해결 전략, 새 인연 시기
                - 직장운 — 주차별 업무 흐름, 중요 미팅 시기
                - 이 달의 방위별 길흉 (동서남북 + 중앙)
                - 이 달의 행운 음식·색상·숫자·활동 총정리
                """;
            case "weekly" -> base + """
                [주간 운세 프리미엄 심화분석]
                - 요일별 상세 운세 (7일 각 4문장 이상)
                - 요일별 오행 에너지와 행운 시간대 (구체적 시각)
                - 요일별 행운 색상·방위·숫자
                - 이번 주 대인관계 전략 — 만나면 좋은/피할 사람 유형
                - 감정/심리 리듬 — 에너지 상승기/하강기
                - 이번 주 재물 흐름과 소비 가이드
                - 건강 관리 — 요일별 추천 활동과 식단
                - 이번 주 핵심 키워드 3개와 실천 방법
                """;
            case "bloodtype" -> base + """
                [혈액형 운세 프리미엄 심화분석]
                - 혈액형 기질 × 오행 깊이 분석 (A=목음, B=화양, O=금양, AB=수음)
                - 오늘 일진과 혈액형 기질의 상호작용 상세
                - 혈액형별 대인관계 패턴 — 각 혈액형과의 관계 전략
                - 스트레스 유형과 해소법 (오행 기반)
                - 건강 취약점과 보양법 — 오행 부위별 상세
                - 재물 운용 스타일과 오늘의 투자/소비 조언
                - 연애/결혼 패턴 깊이 분석
                - 오행 보충 총정리 (음식·색상·방위·활동·향기)
                """;
            case "mbti" -> base + """
                [MBTI 운세 프리미엄 심화분석]
                - 인지기능 스택 × 오행 깊이 분석 (주기능·보조기능·3차·열등기능)
                - 오늘 일진과 인지기능 활성도 상세 (각 기능별 점수와 근거)
                - MBTI 유형별 대인관계 전략 — 16유형 중 오늘 잘 맞는/주의할 유형
                - 업무/학습 스타일과 오늘의 최적 활동
                - 스트레스 트리거와 회복 전략 (열등기능 관리법)
                - 성장 포인트 — 오늘 발전시킬 수 있는 인지기능
                - 에너지 관리 — I/E별 충전 방법, 시간대별 에너지 배분
                - 오행 보충 총정리 (음식·색상·방위·활동)
                """;
            case "constellation" -> base + """
                [별자리 운세 프리미엄 심화분석]
                - 수호 행성과 오늘 행성 에너지 상세 분석
                - 원소(불/물/공기/흙) 에너지와 오행의 교차 분석
                - 별자리 고유 특성 × 오늘 일진의 상호작용
                - 12궁도 영역별 분석 (사랑·재물·건강·직업·가정·자아)
                - 같은 원소 별자리와의 시너지, 반대 원소와의 긴장
                - 오늘 별자리에 숨겨진 우주적 메시지
                - 별자리별 명상/힐링 키워드와 방법
                - 행운 보석·꽃·아로마 추천
                """;
            case "tojeong" -> base + """
                [토정비결 프리미엄 심화분석]
                - 괘의 역학적 상징 깊이 해석 (주역 연계)
                - 올해 3대 핵심 전환기와 대응 전략
                - 월별 재물 에너지 등급표 (투자/사업/절약 각각)
                - 월별 건강 주의사항과 오행 보양법
                - 월별 인연·대인관계 변화 예측
                - 올해 귀인의 특성과 만나는 시기
                - 올해 피해야 할 방위·날짜·행동 총정리
                - 올해 행운 극대화 실천 가이드 (월별 행동 계획)
                """;
            default -> base + "\n종합 프리미엄 심화 분석을 제공합니다. 모든 항목을 최대한 상세하고 구체적으로 분석해주세요.";
        };
    }

    private String buildUserPrompt(String type, String birthDate, String birthTime, String gender, String calendarType, String extra) {
        StringBuilder sb = new StringBuilder();
        sb.append("생년월일: ").append(birthDate);
        if (birthTime != null && !birthTime.isEmpty()) sb.append(", 태어난 시간: ").append(birthTime);
        if (gender != null && !gender.isEmpty()) sb.append(", 성별: ").append("M".equals(gender) ? "남성" : "여성");
        if (calendarType != null) sb.append(", 달력: ").append("LUNAR".equals(calendarType) ? "음력" : "양력");
        if (extra != null && !extra.isEmpty()) sb.append(", 추가정보: ").append(extra);
        sb.append(", 오늘 날짜: ").append(LocalDate.now());

        sb.append("\n\n[중요] 유료 프리미엄 분석입니다. 각 항목을 최대한 길고 구체적으로 작성해주세요. 추상적 표현은 금지합니다.\n다음 JSON 형식으로 응답하세요:\n");

        String jsonTemplate = switch (type) {
            case "today" -> """
                {
                  "deepSummary": "프리미엄 심화 분석 핵심 메시지 (2문장)",
                  "timeAnalysis": {
                    "dawn": "새벽 01~06시 운세 (3문장, 구체적 행동 포함)",
                    "morning": "오전 06~12시 운세 (5문장, 업무/학습/대인관계 구체적)",
                    "afternoon": "오후 12~18시 운세 (5문장, 재물/미팅/활동 구체적)",
                    "evening": "저녁 18~24시 운세 (5문장, 휴식/연애/자기계발 구체적)"
                  },
                  "elementAdvice": {
                    "direction": "길한 방위 + 이유 + 구체적 활용법 (3문장)",
                    "food": "추천 음식 5가지 (각각 오행 근거와 효능 설명)",
                    "color": "행운 색상 3가지 (각각 의미와 활용법)",
                    "aroma": "추천 향기/아로마 (오행 근거)",
                    "activity": "추천 활동 3가지 (시간대별)"
                  },
                  "emotionAnalysis": "오늘의 감정/심리 상태 심층 분석 — 무의식 패턴, 감정 트리거, 대처법, 명상 키워드 (8문장 이상)",
                  "relationshipAdvice": {
                    "boss": "직장 상사와의 관계 (3문장)",
                    "colleague": "동료와의 관계 (3문장)",
                    "lover": "연인/배우자 관계 (3문장)",
                    "family": "가족 관계 (3문장)",
                    "friend": "친구 관계 (3문장)"
                  },
                  "wealthFlow": "오늘의 재물 에너지 흐름 — 소비/투자/저축 각각의 적합도와 구체적 조언 (5문장)",
                  "healthGuide": "건강 주의 부위와 오행 기반 보양법 (5문장)",
                  "actionGuide": ["구체적 행동 지침 1 (시간+장소+행동)", "행동 지침 2", "행동 지침 3", "행동 지침 4", "행동 지침 5"],
                  "avoidList": ["피해야 할 것 1 (구체적 이유 포함)", "피해야 할 것 2", "피해야 할 것 3"],
                  "hiddenMessage": "오늘 숨겨진 우주의 메시지 — 천기누설 (4문장)"
                }""";
            case "love", "reunion", "remarriage", "blind_date" -> """
                {
                  "deepSummary": "프리미엄 심화 분석 핵심 메시지 (2문장)",
                  "energyDiagnosis": "현재 연애/인연 에너지 진단 — 도화살·홍염살·천을귀인 분석 (6문장 이상)",
                  "timingAnalysis": "최적 시기 분석 — 월/주/요일/시간대 구체적 명시, 왜 그 시기인지 오행 근거 (6문장 이상)",
                  "partnerProfile": "이상적 파트너 상세 프로필 — 띠, 오행 유형, 성격, 직업군, 외형 특성, 만날 수 있는 장소 (8문장 이상)",
                  "psychAnalysis": "심리/감정 패턴 심층 분석 — 무의식적 끌림/회피 패턴, 애착 유형, 연애 방어기제 (6문장 이상)",
                  "strategy": ["구체적 행동 전략 1 (시기+방법+주의점)", "전략 2", "전략 3", "전략 4", "전략 5"],
                  "stageGuide": {
                    "stage1": "1단계: 관심 표현 (3문장)",
                    "stage2": "2단계: 호감 확인 (3문장)",
                    "stage3": "3단계: 관계 발전 (3문장)",
                    "stage4": "4단계: 관계 안정화 (3문장)"
                  },
                  "caution": ["주의사항 1 (구체적 상황과 대처법)", "주의사항 2", "주의사항 3"],
                  "forecast": "향후 6개월 관계 전망 (6문장 이상)",
                  "hiddenMessage": "숨겨진 인연의 천기누설 (4문장)"
                }""";
            case "yearly" -> """
                {
                  "deepSummary": "프리미엄 심화 분석 핵심 메시지 (2문장)",
                  "quarterAnalysis": {
                    "q1": "1-3월 상세 분석 — 재물/건강/인연/직업 각각 (8문장 이상)",
                    "q2": "4-6월 상세 분석 (8문장 이상)",
                    "q3": "7-9월 상세 분석 (8문장 이상)",
                    "q4": "10-12월 상세 분석 (8문장 이상)"
                  },
                  "monthlyWealth": "월별 재물운 등급표와 투자/사업 전략 (12개월 각 2문장)",
                  "monthlyHealth": "월별 건강 주의사항과 오행 보양법 (12개월 각 1문장)",
                  "turningPoints": ["전환점 1 (구체적 시기+내용+대응법)", "전환점 2", "전환점 3"],
                  "noblePersons": "올해 귀인의 특성과 만나는 시기 (5문장)",
                  "careerAdvice": "직업/사업운 — 이직/창업/승진 최적 시기와 전략 (6문장)",
                  "wealthTiming": "재물운 핵심 시기와 전략 — 월별 등급, 투자 적기 (6문장)",
                  "healthWarning": "건강 주의 — 계절별 질환, 오행 부위별 관리법 (6문장)",
                  "relationshipFlow": "대인관계 연간 흐름 — 갈등 시기, 귀인 시기 (6문장)",
                  "yearStrategy": ["올해 핵심 전략 1", "전략 2", "전략 3", "전략 4", "전략 5"],
                  "avoidList": ["올해 피해야 할 함정 1", "함정 2", "함정 3"],
                  "lifestyleGuide": ["행운 극대화 생활 습관 1", "습관 2", "습관 3", "습관 4", "습관 5"],
                  "hiddenMessage": "올해 천기누설 (4문장)"
                }""";
            case "monthly" -> """
                {
                  "deepSummary": "프리미엄 심화 분석 핵심 메시지 (2문장)",
                  "weeklyFlow": {
                    "week1": "1주차 상세 — 재물/건강/인간관계/업무 (6문장 이상)",
                    "week2": "2주차 상세 (6문장 이상)",
                    "week3": "3주차 상세 (6문장 이상)",
                    "week4": "4주차 상세 (6문장 이상)"
                  },
                  "keyDates": ["길일: O일 — 이유와 활용법", "길일: O일", "흉일: O일 — 이유와 주의법", "흉일: O일", "특별일: O일 — 이유"],
                  "wealthAdvice": "이 달 재물운 심층 분석 — 수입/지출/투자 시기별 전략 (6문장 이상)",
                  "healthAdvice": "이 달 건강운 — 주의 부위, 식이요법, 운동 구체적 추천 (6문장 이상)",
                  "socialAdvice": "이 달 대인관계 — 갈등 시기, 새 인연 시기, 관계 전략 (6문장 이상)",
                  "careerAdvice": "이 달 직장/업무운 — 주차별 흐름, 중요 미팅 시기 (5문장)",
                  "directionAdvice": "이 달 방위별 길흉 (동서남북+중앙 각각 2문장)",
                  "monthStrategy": ["핵심 전략 1", "전략 2", "전략 3", "전략 4"],
                  "luckyItems": {"food": "행운 음식 3가지", "color": "행운 색상", "number": "행운 숫자", "activity": "행운 활동"},
                  "hiddenMessage": "이 달의 천기누설 (3문장)"
                }""";
            case "weekly" -> """
                {
                  "deepSummary": "프리미엄 심화 분석 핵심 메시지 (2문장)",
                  "dailyEnergy": {
                    "mon": "월요일 — 오행 에너지, 행운 시간대, 색상, 조언 (5문장)",
                    "tue": "화요일 상세 (5문장)",
                    "wed": "수요일 상세 (5문장)",
                    "thu": "목요일 상세 (5문장)",
                    "fri": "금요일 상세 (5문장)",
                    "sat": "토요일 상세 (5문장)",
                    "sun": "일요일 상세 (5문장)"
                  },
                  "peakTime": "이번 주 최고 행운 시점 — 요일+시간+활동 (3문장)",
                  "socialStrategy": "대인관계 전략 — 만나면 좋은/피할 사람 유형, 갈등 예방법 (6문장)",
                  "emotionalRhythm": "감정 리듬 분석 — 에너지 상승기/하강기, 감정 관리법 (6문장)",
                  "wealthFlow": "이번 주 재물 흐름과 소비 가이드 (5문장)",
                  "healthGuide": "요일별 건강 관리 — 추천 활동과 식단 (5문장)",
                  "weekStrategy": ["핵심 전략 1", "전략 2", "전략 3"],
                  "hiddenMessage": "이번 주 천기누설 (3문장)"
                }""";
            default -> """
                {
                  "deepSummary": "프리미엄 심화 분석 핵심 메시지 (2문장)",
                  "detailAnalysis": "상세 분석 (10문장 이상, 오행 근거 필수)",
                  "elementAdvice": {"direction": "방위 (3문장)", "food": "음식 5가지", "color": "색상 3가지", "activity": "활동 3가지"},
                  "psychAnalysis": "심리/감정 심층 분석 (6문장 이상)",
                  "actionGuide": ["행동 지침 1", "행동 지침 2", "행동 지침 3", "행동 지침 4", "행동 지침 5"],
                  "caution": ["주의사항 1", "주의사항 2", "주의사항 3"],
                  "hiddenMessage": "천기누설 (4문장)"
                }""";
        };

        sb.append(jsonTemplate);
        return sb.toString();
    }

    private String buildFallback(String type) {
        return "오행의 기운이 복잡하게 얽혀 있어 심층 분석이 필요합니다. 전반적으로 긍정적인 흐름이 감지되며, 자신의 직감을 신뢰하시기 바랍니다.";
    }

    // 캐싱 헬퍼 메서드들
    private String buildCacheKey(String... parts) {
        String raw = String.join("|", java.util.Arrays.stream(parts).map(p -> p != null ? p : "").toArray(String[]::new));
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++) sb.append(String.format("%02x", digest[i]));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(raw.hashCode());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String type, String cacheKey) {
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(type, cacheKey, LocalDate.now());
            if (cached.isPresent()) return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<>() {});
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    private void saveToCache(String type, String cacheKey, Map<String, Object> result) {
        try {
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(type).cacheKey(cacheKey).fortuneDate(LocalDate.now())
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) { /* ignore duplicate */ }
    }
}
