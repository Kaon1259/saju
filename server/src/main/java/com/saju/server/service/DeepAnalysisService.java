package com.saju.server.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.saju.server.service.ClaudeApiService;
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
        return analyze(type, birthDate, birthTime, gender, calendarType, extra, null);
    }

    @Transactional
    public Map<String, Object> analyze(String type, String birthDate, String birthTime, String gender, String calendarType, String extra, String context) {
        String fortuneType = "deep-" + type;
        String cacheKey = buildCacheKey(type, birthDate, birthTime, gender, calendarType, extra);

        // DB 캐시 확인
        Map<String, Object> cached = getFromCache(fortuneType, cacheKey);
        if (cached != null) return cached;

        // 프롬프트 빌드
        String systemPrompt = buildSystemPrompt(type);
        String userPrompt = buildUserPrompt(type, birthDate, birthTime, gender, calendarType, extra, context);

        // AI 호출
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", type);
        result.put("birthDate", birthDate);
        result.put("analysisDate", LocalDate.now().toString());

        boolean aiSuccess = false;
        try {
            log.info("심화분석 AI 호출 시작: type={}, birthDate={}, promptLen=sys:{}/user:{}", type, birthDate, systemPrompt.length(), userPrompt.length());
            String response = claudeApiService.generate(systemPrompt, userPrompt, 4000);
            log.info("심화분석 AI 응답 길이: {}", response != null ? response.length() : "null");
            String json = ClaudeApiService.extractJson(response);
            if (json == null && response != null) {
                json = response.replaceAll("```json|```", "").trim();
            }
            if (json != null) {
                // 잘린 JSON 복구 시도
                json = repairJson(json);
                try {
                    Map<String, Object> aiResult = objectMapper.readValue(json, new TypeReference<>() {});
                    result.putAll(aiResult);
                    aiSuccess = true;
                } catch (Exception parseErr) {
                    log.warn("심화분석 JSON 파싱 실패: {}", parseErr.getMessage());
                    extractPartialJson(json, result);
                    aiSuccess = result.size() > 3; // 메타 필드 외에 뭔가 있으면 성공
                }
            } else {
                log.warn("심화분석 AI 응답 null 또는 JSON 추출 실패");
                result.put("detailAnalysis", buildFallback(type));
                result.put("_debug", "AI response was null - API key available: " + claudeApiService.isAvailable());
            }
        } catch (Exception e) {
            log.error("심화분석 AI 호출 실패: {}", e.getMessage(), e);
            result.put("detailAnalysis", buildFallback(type));
            result.put("_debug", "Exception: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }

        // 성공한 경우에만 DB 캐시 저장 (실패 결과는 캐시하지 않음)
        if (aiSuccess) {
            saveToCache(fortuneType, cacheKey, result);
        }
        return result;
    }

    /** 캐시 조회 (스트리밍 엔드포인트용) */
    public Map<String, Object> getCached(String type, String birthDate, String birthTime, String gender, String calendarType, String extra) {
        String fortuneType = "deep-" + type;
        String cacheKey = buildCacheKey(type, birthDate, birthTime, gender, calendarType, extra);
        return getFromCache(fortuneType, cacheKey);
    }

    /** 시스템 프롬프트 외부 접근 */
    public String getSystemPrompt(String type) {
        return buildSystemPrompt(type);
    }

    /** 사용자 프롬프트 외부 접근 */
    public String getUserPrompt(String type, String birthDate, String birthTime, String gender, String calendarType, String extra) {
        return buildUserPrompt(type, birthDate, birthTime, gender, calendarType, extra, null);
    }

    public String getUserPrompt(String type, String birthDate, String birthTime, String gender, String calendarType, String extra, String context) {
        return buildUserPrompt(type, birthDate, birthTime, gender, calendarType, extra, context);
    }

    private String buildSystemPrompt(String type) {
        String base = FortunePromptBuilder.COMMON_TONE_RULES + "\n" + """
            당신은 사주명리학과 동양 역학에 빠삭한 심화 분석 전문가야!
            프리미엄 심화 분석을 친근하고 알기 쉽게 풀어주는 게 특기거든.

            [핵심 역할]
            사용자가 이미 기본 분석(운세)을 받은 상태야.
            만약 [기존 분석 결과]가 제공되면, 그 분석을 기반으로 더 깊이 파고들어야 해.
            - 기본 분석에서 언급된 키워드(오행, 기운, 조언 등)를 구체적으로 확장해줘
            - 기본 분석이 "좋다/나쁘다"로 요약한 부분을 "왜 그런지, 어떻게 활용/대처할지"로 심화해줘
            - 기본 분석과 모순되면 절대 안 돼
            - 기본 분석을 그대로 반복하지 마 — 새로운 깊이의 인사이트를 줘

            [분석 원칙]
            1. 모든 분석은 오행·십성의 이론적 근거를 제시해
            2. 추상적 표현 금지 — 구체적 시기, 방위, 색상, 숫자, 행동을 명시해
            3. 각 항목은 핵심만 간결하게 작성해 (2-3문장)
            4. 긍정적 조언과 현실적 주의사항을 균형 있게 제시해
            5. 반드시 JSON 형식으로만 응답해 (마크다운 코드블록 사용 가능)
            """;

        return switch (type) {
            case "today" -> base + """
                [오늘의 운세 프리미엄 심화분석]
                이미 제공된 기본 운세(총운/애정운/재물운/직장운/건강운)를 같은 항목 구조로 더 깊게 확장하는 것이 핵심이야.
                - 총운 심화: 기본 총운의 오행 근거를 밝히고, 시간대별 구체 행동 지침 추가
                - 애정운 심화: 도화살·홍염살 관점 추가, 만남 시기/장소/행동 전략
                - 재물운 심화: 돈이 들어오는 방위·시간, 투자/소비/저축 구체적 수치·행동
                - 직장운 심화: 상사/동료 관계별 전략, 회의·보고 최적 시간
                - 건강운 심화: 오행 기반 장기 분석, 보양 음식·운동·색상 처방
                - 행동 지침: 기본 분석의 조언을 실행 가능한 구체적 행동으로
                - 천기누설: 기본 분석에서 드러나지 않은 숨은 기운
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

    private String buildUserPrompt(String type, String birthDate, String birthTime, String gender, String calendarType, String extra, String context) {
        StringBuilder sb = new StringBuilder();
        sb.append("생년월일: ").append(birthDate);
        if (birthTime != null && !birthTime.isEmpty()) sb.append(", 태어난 시간: ").append(birthTime);
        if (gender != null && !gender.isEmpty()) sb.append(", 성별: ").append("M".equals(gender) ? "남성" : "여성");
        if (calendarType != null) sb.append(", 달력: ").append("LUNAR".equals(calendarType) ? "음력" : "양력");
        // extra에 날짜(yyyy-MM-dd)가 들어오면 분석 대상 날짜로 사용
        LocalDate targetDate = LocalDate.now();
        if (extra != null && !extra.isEmpty()) {
            try { targetDate = LocalDate.parse(extra); } catch (Exception e) { sb.append(", 추가정보: ").append(extra); }
        }
        sb.append(", 분석 대상 날짜: ").append(targetDate);

        // 기존 분석 결과가 있으면 심화의 기반으로 포함
        if (context != null && !context.isEmpty()) {
            sb.append("\n\n═══ [기존 분석 결과 — 심화분석의 기반] ═══\n");
            sb.append("아래는 사용자가 이미 받은 기본 분석이야. 심화분석은 반드시 이 내용을 기반으로 더 깊이 파고들어야 해!\n\n");
            sb.append(context);
            sb.append("\n\n═══ [심화분석 지침] ═══\n");
            sb.append("1. 위 기본 분석에서 언급된 오행·기운·키워드를 반드시 참조해서 더 구체적으로 풀어줘\n");
            sb.append("2. 기본 분석이 '좋다/나쁘다'로만 말한 부분 → 왜 그런지 사주학적 근거와 실전 행동 지침으로 확장해줘\n");
            sb.append("3. 기본 분석과 모순되는 내용은 절대 쓰지 마\n");
            sb.append("4. 기본 분석을 그대로 반복하지 마 — 새로운 인사이트와 실행 가능한 조언을 줘\n");
        }

        sb.append("\n\n[중요] 프리미엄 분석입니다. 각 항목을 간결하되 구체적으로 작성하세요. 추상적 표현 금지.\n다음 JSON 형식으로 응답하세요:\n");

        String jsonTemplate = switch (type) {
            case "today" -> """
                {
                  "deepSummary": "기본 분석의 핵심을 한 단계 더 깊게 해석한 메시지 (2문장)",
                  "overallDeep": "총운 심화 — 기본 총운에서 언급된 기운을 사주학적으로 왜 그런지 근거를 밝히고, 시간대별(오전/오후/저녁) 구체적 행동 지침 (5문장)",
                  "loveDeep": "애정운 심화 — 기본 애정운을 더 깊게, 도화살·홍염살 관점, 구체적 만남 시기/장소/행동 전략 (5문장)",
                  "moneyDeep": "재물운 심화 — 기본 재물운을 확장, 오행 기반 돈이 들어오는 방위·시간·행동, 투자/소비/저축 각각 구체적 조언 (5문장)",
                  "careerDeep": "직장운 심화 — 기본 직장운을 확장, 상사/동료/부하 관계별 전략, 회의·보고·결정 최적 시간 (5문장)",
                  "healthDeep": "건강운 심화 — 기본 건강운을 확장, 오행 기반 주의 장기/부위, 보양 음식·운동·색상 구체적 처방 (4문장)",
                  "actionGuide": "오늘 꼭 해야 할 행동 3가지 (기본 분석의 조언을 실행 가능하게 구체화)",
                  "avoidList": "오늘 피해야 할 것 2가지 (기본 분석에서 주의라고 한 부분의 구체적 상황)",
                  "hiddenMessage": "천기누설 — 기본 분석에서 드러나지 않은 숨은 기운 (2문장)"
                }""";
            case "love", "reunion", "remarriage", "blind_date" -> """
                {
                  "deepSummary": "핵심 메시지 1-2문장",
                  "energyDiagnosis": "연애 에너지 진단 — 도화살·홍염살 분석 (3문장)",
                  "timingAnalysis": "최적 시기 — 월/주/요일 구체적 (3문장)",
                  "partnerProfile": "이상적 파트너 — 띠, 성격, 직업군 (3문장)",
                  "psychAnalysis": "심리 패턴 — 끌림/회피 패턴 (3문장)",
                  "strategy": "행동 전략 3가지",
                  "forecast": "향후 전망 (3문장)",
                  "caution": "주의사항 2가지",
                  "hiddenMessage": "천기누설 메시지 (2문장)"
                }""";
            case "yearly" -> """
                {
                  "deepSummary": "핵심 메시지 1-2문장",
                  "q1Analysis": "1-3월 — 재물/건강/인연/직업 (3문장)",
                  "q2Analysis": "4-6월 (3문장)",
                  "q3Analysis": "7-9월 (3문장)",
                  "q4Analysis": "10-12월 (3문장)",
                  "wealthTiming": "재물운 핵심 시기와 전략 (3문장)",
                  "healthWarning": "건강 — 계절별 주의사항 (3문장)",
                  "careerAdvice": "직업운 — 이직/승진 시기 (3문장)",
                  "relationshipFlow": "대인관계 — 귀인/갈등 시기 (3문장)",
                  "yearStrategy": "올해 핵심 전략 3가지",
                  "hiddenMessage": "천기누설 (2문장)"
                }""";
            case "monthly" -> """
                {
                  "deepSummary": "핵심 메시지 1-2문장",
                  "week1": "1주차 — 재물/건강/관계/업무 (3문장)",
                  "week2": "2주차 (3문장)",
                  "week3": "3주차 (3문장)",
                  "week4": "4주차 (3문장)",
                  "wealthAdvice": "재물운 — 수입/지출/투자 (3문장)",
                  "healthAdvice": "건강운 — 주의 부위, 운동 (3문장)",
                  "socialAdvice": "대인관계 — 핵심 조언 (3문장)",
                  "directionAdvice": "행운 방위/음식/색상/숫자 (2문장)",
                  "hiddenMessage": "천기누설 (2문장)"
                }""";
            case "weekly" -> """
                {
                  "deepSummary": "핵심 메시지 1-2문장",
                  "monTue": "월~화 운세 — 에너지, 행운시간 (3문장)",
                  "wedThu": "수~목 (3문장)",
                  "friSatSun": "금~일 (3문장)",
                  "peakTime": "이번 주 최고 행운 시점 (2문장)",
                  "socialStrategy": "대인관계 핵심 전략 (3문장)",
                  "emotionalRhythm": "감정 리듬과 에너지 관리 (3문장)",
                  "wealthFlow": "재물 흐름과 소비 가이드 (2문장)",
                  "healthGuide": "건강 — 추천 활동과 식단 (2문장)",
                  "hiddenMessage": "천기누설 (2문장)"
                }""";
            default -> """
                {
                  "deepSummary": "핵심 메시지 (1-2문장)",
                  "detailAnalysis": "상세 분석 (5문장, 오행 근거)",
                  "elementAdvice": "방위/음식/색상/활동 추천 (3문장)",
                  "psychAnalysis": "심리/감정 분석 (3문장)",
                  "actionGuide": "행동 지침 3가지",
                  "caution": "주의사항 2가지",
                  "hiddenMessage": "천기누설 (2문장)"
                }""";
        };

        sb.append(jsonTemplate);
        return sb.toString();
    }

    private String repairJson(String json) {
        // 잘린 JSON 복구: 열린 괄호/따옴표 닫기
        int braces = 0, brackets = 0;
        boolean inString = false;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '\\' && inString) { i++; continue; }
            if (c == '"') inString = !inString;
            if (!inString) {
                if (c == '{') braces++;
                if (c == '}') braces--;
                if (c == '[') brackets++;
                if (c == ']') brackets--;
            }
        }
        StringBuilder sb = new StringBuilder(json);
        if (inString) sb.append("\"");
        while (brackets > 0) { sb.append("]"); brackets--; }
        while (braces > 0) { sb.append("}"); braces--; }
        return sb.toString();
    }

    private void extractPartialJson(String json, Map<String, Object> result) {
        // 완전한 key-value 쌍을 정규식으로 추출
        try {
            var pattern = java.util.regex.Pattern.compile("\"(\\w+)\"\\s*:\\s*\"([^\"]+)\"");
            var matcher = pattern.matcher(json);
            while (matcher.find()) {
                String key = matcher.group(1);
                String value = matcher.group(2);
                if (!key.equals("type") && !key.equals("birthDate") && !key.equals("analysisDate")) {
                    result.put(key, value);
                }
            }
            if (result.size() <= 3) {
                result.put("detailAnalysis", json.replaceAll("[{}\"\\[\\]]", "").replaceAll("\\w+:", "\n").trim());
            }
        } catch (Exception e) {
            result.put("detailAnalysis", buildFallback(""));
        }
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

    /** 스트리밍 완료 후 캐시 저장 */
    public void saveStreamResult(String type, String birthDate, String birthTime, String gender, String calendarType, String extra, String fullText) {
        try {
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) return;
            Map<String, Object> parsed = objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            parsed.put("type", type);
            parsed.put("birthDate", birthDate);
            String fortuneType = "deep-" + type;
            String cacheKey = buildCacheKey(type, birthDate, birthTime, gender, calendarType, extra);
            saveToCache(fortuneType, cacheKey, parsed);
        } catch (Exception e) {
            // 파싱 실패 시 무시
        }
    }

    // ============================================================
    // ===== 궁합(두 사람) 심화분석 — 영속 캐시 =====
    // ============================================================

    /** 궁합 심화분석 캐시 anchor (생년월일 쌍 기반 영속 캐시) */
    private static final LocalDate COMPAT_CACHE_ANCHOR = LocalDate.of(2000, 1, 1);

    private String buildCompatCacheKey(String deepType, String bd1, String bt1, String g1, String bd2, String bt2, String g2) {
        return buildCacheKey(deepType, bd1, bt1, g1, bd2, bt2, g2);
    }

    /** 궁합 심화분석 캐시 조회 */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getCachedCompat(String deepType, String bd1, String bt1, String g1, String bd2, String bt2, String g2) {
        String fortuneType = "deep-" + deepType;
        String cacheKey = buildCompatCacheKey(deepType, bd1, bt1, g1, bd2, bt2, g2);
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(fortuneType, cacheKey, COMPAT_CACHE_ANCHOR);
            if (cached.isPresent()) return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<>() {});
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    /** 궁합 심화분석 영속 캐시 저장 */
    private void saveCompatCache(String deepType, String cacheKey, Map<String, Object> result) {
        String fortuneType = "deep-" + deepType;
        try {
            var existing = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(fortuneType, cacheKey, COMPAT_CACHE_ANCHOR);
            if (existing.isPresent()) return;
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType(fortuneType).cacheKey(cacheKey).fortuneDate(COMPAT_CACHE_ANCHOR)
                .resultJson(objectMapper.writeValueAsString(result)).build());
        } catch (Exception e) { /* ignore */ }
    }

    /** 궁합 심화분석 시스템 프롬프트 */
    public String getCompatSystemPrompt(String deepType) {
        String base = FortunePromptBuilder.COMMON_TONE_RULES + "\n" + """
            당신은 사주 궁합 심화 분석 전문가야!
            카페에서 친구 커플한테 궁합 봐주듯이 친근하게 풀어줘.
            '이 남자는~', '이 여자는~', '너네 둘이~' 자연스러운 호칭을 써.
            한자 용어(오행/일간/상생상극) 그대로 쓰지 말고 쉬운 말로 풀어서 설명해.

            [핵심 역할]
            사용자는 이미 기본 궁합 분석을 받은 상태야.
            [기존 분석 결과]가 제공되면 그 분석을 기반으로 더 깊이 파고들어줘.
            - 기본 분석에서 짚은 갈등 포인트·시너지를 구체적 행동 시나리오로 확장
            - "잘 맞다/안 맞다"로 끝낸 부분 → 왜 그런지 + 어떻게 더 좋게 만들지로 심화
            - 기본 분석과 모순 금지, 단순 반복 금지

            [분석 원칙]
            1. 두 사람의 사주적 근거(오행 관계·지지 합충·음양)를 구체적 시나리오로 풀어줘
            2. 추상적 표현 금지 — 구체적 시기·상황·말·행동 명시
            3. 각 항목은 JSON 템플릿이 요구하는 문장 수만큼 충분히 채워줘 (짧게 줄이지 말 것)
            4. 긍정/주의를 균형 있게
            5. 반드시 JSON 형식으로만 응답 (마크다운 코드블록 가능)
            """;

        return switch (deepType) {
            case "compatibility" -> base + """
                [정통 사주 궁합 프리미엄 심화분석 — 매우 풍부하게]
                ⚠️ 중요: 정통궁합은 두 사람의 평생 관계 흐름을 다루는 깊은 분석이야.
                각 항목 5~7문장으로 충분히 채우고, 반드시 아래 디테일을 포함시켜:
                - 실제 데이트·일상·갈등 상황 시나리오 1~2개 (예: "이 남자가 약속에 늦었을 때 이 여자가 ~하면" 같은 식)
                - 두 사람 사이 대화 예시 또는 행동 가이드 1개 이상
                - 구체적 시기·계절·요일·시간대 (예: "사귄 지 6개월 무렵 가을에", "주말 오후에" 등)
                - 사주적 근거 1줄 (오행 관계·일지 합충·음양으로 왜 그런지)

                [필드별 핵심]
                - conflictScenario: 갈등 시나리오 — 둘이 가장 자주 부딪히는 상황 2개 + 사주 근거 + 갈등 시 둘의 패턴 + 실제 대화 예시
                - synergyPoint: 시너지 포인트 — 서로 보완되는 영역 + 어떤 일을 함께하면 시너지 폭발하는지 + 사주 근거 + 활용 가이드 + 실제 사례
                - elementChemistry: 오행 케미 — 두 사람 일간 오행의 화학반응 / 끌림 메커니즘 / 끌림이 식는 시기 / 회복 방법 / 일상에서 느끼는 방식
                - timelineChange: 시기별 변화 — 만난 지 6개월·1년·3년·5년 시점 관계 변화 + 각 시기 위험 + 그 시기 둘이 해야 할 행동
                - crisisHandling: 위기 극복법 — 가장 위험한 시기·상황 + 위험 신호 3개 + 회복 전략 + 사주 근거 + 대화 예시
                - longTermStrategy: 지속 전략 — 관계 오래 가려면 둘이 매주/매월 해야 할 행동 + 피해야 할 함정 + 권태기 예방
                - hiddenMessage: 천기누설 — 사주에 숨은 둘만의 인연 포인트 1개 + 구체 실천법 1개
                """;
            case "marriage_compat" -> base + """
                [결혼 궁합 프리미엄 심화분석 — 평생 관계라 매우 풍부하게]
                ⚠️ 중요: 결혼은 평생 관계라 일반 궁합보다 훨씬 깊고 풍부하게 분석해야 해.
                ⚠️ 모든 필드는 '결혼해서 함께 사는 관계'에 특화 — 단순 연애 심화분석과 절대 같은 톤으로 답하지 마.
                각 항목 7~8문장으로 충분히 채우고, 반드시 아래 디테일을 포함시켜:
                - 구체적 연도·나이·계절·월 (예: "결혼 3년차 여름", "남편 35세 무렵")
                - 실제 결혼생활 시나리오 2개 (예: "남편이 야근 잦아질 때 아내가 ~하면", "시댁 명절 때 ~")
                - 부부 대화 예시 1개 이상 (따옴표로 직접 인용)
                - 사주적 근거 1줄 (오행/일지 관계로 왜 그런지)

                [필드별 핵심 — 모두 결혼 특화]
                - marriageTimingDeep: 결혼 시기 — 정확한 연도(예: 2027년 가을~2028년 봄)·나이대·근거 / 너무 이른/늦은 시기와 이유 / 상견례~예식까지 흐름
                - spouseRole: 결혼 후 부부 역할 — 누가 가정·돈·대외관계·자녀를 주도할지 + 갈등 영역 + 역할 재분배 가이드 + 실제 상황 2개
                - childRaisingDeep: 결혼 후 자녀 — 자녀 시기·수·기질 / 부부 양육관 차이 / 교육 우선순위 / 사춘기 갈등 예방 / 둘째 고민
                - inLawDeep: 결혼 후 시댁·처가 — 명절·경조사 갈등 시나리오 2개 / 거리 두기 vs 가까이 가기 구체 가이드 / 배우자 중재 역할
                - financeDesign: 신혼~중년 재정 — 통장 합칠지 분리할지 / 저축형 vs 투자형 차이 / 집 마련·큰돈 결정 / 경제 위기 대처
                - crisisManagement: 결혼 후 위기 — 위험 시기(2년차·7년차·10년차) 구체화 / 권태기·외도 위험 신호 / 회복 전략 / 부부 대화 예시
                - longTermVision: 10년·20년·30년 후 부부 모습 / 자녀 독립 후 관계 / 노후 라이프스타일 / 은퇴 후 함께할 일 / 손주 시대
                - hiddenMessage: 사주에 숨은 결혼 행복 비결 1개 + 구체 실천법 + 구체 시점
                """;
            default -> base + "\n프리미엄 심화 분석을 제공해줘.";
        };
    }

    /** 궁합 심화분석 사용자 프롬프트 */
    public String getCompatUserPrompt(String deepType, String bd1, String bt1, String g1, String bd2, String bt2, String g2, String context) {
        StringBuilder sb = new StringBuilder();
        sb.append("【").append("M".equalsIgnoreCase(g1) ? "남자" : "여자").append("】 생년월일: ").append(bd1);
        if (bt1 != null && !bt1.isEmpty()) sb.append(", 태어난 시간: ").append(bt1);
        sb.append("\n【").append("M".equalsIgnoreCase(g2) ? "남자" : "여자").append("】 생년월일: ").append(bd2);
        if (bt2 != null && !bt2.isEmpty()) sb.append(", 태어난 시간: ").append(bt2);

        if (context != null && !context.isEmpty()) {
            sb.append("\n\n═══ [기존 궁합 분석 결과 — 심화의 기반] ═══\n");
            sb.append(context);
            sb.append("\n\n═══ [심화 지침] ═══\n");
            sb.append("1. 위 기본 궁합 분석을 반드시 참조해서 더 구체적·실전적으로 확장\n");
            sb.append("2. '잘 맞다/안 맞다' 같은 추상 표현 금지 — 구체 시나리오로\n");
            sb.append("3. 기존 분석과 모순 없이, 새로운 깊이의 인사이트만\n");
        }

        sb.append("\n\n[중요] 프리미엄 분석. 다음 JSON 형식으로 응답:\n");
        sb.append(switch (deepType) {
            case "compatibility" -> """
                {
                  "deepSummary": "둘 관계의 핵심 메시지 2-3문장 (구체 키워드 포함, 두루뭉술 금지)",
                  "conflictScenario": "갈등 시나리오 — 자주 부딪히는 상황 2개 + 사주 근거 + 갈등 시 둘의 행동 패턴 + 실제 대화 예시 1개 (6-7문장)",
                  "synergyPoint": "시너지 포인트 — 보완 영역 + 함께 하면 폭발하는 일 + 사주 근거 + 활용 가이드 + 사례 (6-7문장)",
                  "elementChemistry": "오행 케미 — 두 사람 오행 화학반응 + 끌림 메커니즘 + 끌림 식는 시기 + 회복 방법 + 일상에서 느끼는 방식 (6-7문장)",
                  "timelineChange": "시기별 변화 — 만난 지 6개월·1년·3년·5년 시점별 관계 변화 + 각 시기 위험 + 그 시기 행동 가이드 (6-7문장)",
                  "crisisHandling": "위기 극복법 — 가장 위험한 시기·상황 + 위험 신호 3개 + 회복 전략 + 사주 근거 + 대화 예시 (5-6문장)",
                  "longTermStrategy": "지속 전략 — 매주/매월 해야 할 행동 + 피해야 할 함정 + 권태기 예방 가이드 (5-6문장)",
                  "hiddenMessage": "천기누설 — 사주에 숨은 둘만의 인연 포인트 1개 + 구체 실천법 1개 (3문장)"
                }""";
            case "marriage_compat" -> """
                {
                  "deepSummary": "결혼생활 핵심 메시지 3-4문장 (구체적 키워드 포함, 두루뭉술 금지, 결혼해서 함께 살 때 둘 관계의 본질 요약)",
                  "marriageTimingDeep": "결혼 시기 심화 — 구체 연도·계절·나이대 명시(예: '2027년 가을~2028년 봄, 남자 32세 여자 30세 무렵') + 사주 근거 + 너무 빠르면/늦으면 어떤 위험 + 상견례~예식까지 흐름 가이드 (7-8문장)",
                  "spouseRole": "결혼 후 부부 역할 — 누가 어떤 영역(돈·집안일·자녀·대외관계)을 주도할지 + 사주적 근거 + 갈등 영역 2개 + 재분배 가이드 + 실제 결혼생활 상황 예시 2개 (7-8문장)",
                  "childRaisingDeep": "결혼 후 자녀 양육 심화 — 자녀 가질 시기·수·기질 + 부부 양육관 차이 + 교육 우선순위 + 사춘기 갈등 예방 + 둘째 고민 + 구체 사례 1개 (7-8문장)",
                  "inLawDeep": "결혼 후 양가 관계 — 시댁/처가와의 거리감 + 명절·경조사 갈등 시나리오 2개 + 거리 두기 vs 가까이 가기 구체 가이드 + 배우자 중재 역할 + 대처 대화 예시 (7-8문장)",
                  "financeDesign": "신혼~중년 재정 설계 — 둘의 돈 스타일 차이(저축형 vs 투자형) + 통장 합칠지 분리할지 + 집 마련 + 큰돈 결정 룰 + 사주적 재물 흐름 + 경제 위기 대처 + 실제 재테크 가이드 (7-8문장)",
                  "crisisManagement": "결혼 후 위기 관리 — 위험 시기(2년차·7년차·10년차) 구체화 + 권태기·외도 위험 신호 + 위기 회복 전략 + 사주 근거 + 부부 대화 예시 직접 인용 (7-8문장)",
                  "longTermVision": "장기 비전 — 결혼 10년·20년·30년 후 부부 모습 + 자녀 독립 후 관계 + 노후 라이프스타일 + 은퇴 후 함께할 일 + 손주 시대 (7-8문장)",
                  "hiddenMessage": "천기누설 — 사주에 숨은 결혼 행복 비결 1개 + 구체 실천법 1개 + 구체 시점 (4-5문장)"
                }""";
            default -> """
                { "deepSummary": "1-2문장", "detailAnalysis": "5문장", "hiddenMessage": "2문장" }""";
        });
        return sb.toString();
    }

    /** 궁합 심화분석 스트리밍 완료 후 캐시 저장 */
    public void saveCompatStreamResult(String deepType, String bd1, String bt1, String g1, String bd2, String bt2, String g2, String fullText) {
        int rawLen = fullText != null ? fullText.length() : 0;
        try {
            String json = ClaudeApiService.extractJson(fullText);
            if (json == null) {
                log.warn("궁합 심화분석 JSON 추출 실패: type={}, rawLen={}", deepType, rawLen);
                return;
            }
            int rawJsonLen = json.length();
            String repaired = repairJson(json);
            boolean wasTruncated = !repaired.equals(json);
            Map<String, Object> parsed = objectMapper.readValue(repaired, new TypeReference<Map<String, Object>>() {});
            int fieldCount = parsed.size();
            // 각 필드 평균 길이 계산
            int totalCharLen = parsed.values().stream().filter(v -> v instanceof String).mapToInt(v -> ((String) v).length()).sum();
            parsed.put("type", deepType);
            parsed.put("analysisDate", LocalDate.now().toString());
            String cacheKey = buildCompatCacheKey(deepType, bd1, bt1, g1, bd2, bt2, g2);
            saveCompatCache(deepType, cacheKey, parsed);
            log.info("궁합 심화 캐시 저장: type={}, rawLen={}, jsonLen={}, repaired={}, fields={}, totalChars={} ({}자/필드)",
                deepType, rawLen, rawJsonLen, wasTruncated, fieldCount, totalCharLen, fieldCount > 0 ? totalCharLen / fieldCount : 0);
        } catch (Exception e) {
            log.warn("궁합 심화분석 캐시 저장 실패: type={}, rawLen={}, err={}", deepType, rawLen, e.getMessage());
        }
    }

    // ============================================================
    // ===== 타로 심화분석 =====
    // ============================================================

    /** 타로 심화 캐시 조회 (영속 — 같은 카드 조합은 한 번만 결제) */
    public Map<String, Object> getCachedTarot(String cardIds, String reversals, String spread, String category) {
        String cacheKey = buildTarotDeepCacheKey(cardIds, reversals, spread, category);
        try {
            var cached = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(
                "deep-tarot", cacheKey, COMPAT_CACHE_ANCHOR);
            if (cached.isPresent()) {
                return objectMapper.readValue(cached.get().getResultJson(),
                    new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) { /* ignore */ }
        return null;
    }

    /** 타로 심화 시스템 프롬프트 — Sonnet 4.6 기본값 사용 (200하트 프리미엄) */
    public String getTarotDeepSystemPrompt() {
        return FortunePromptBuilder.COMMON_TONE_RULES + "\n" + """
당신은 서양 타로와 동양 역학(사주·오행·수비학)을 깊이 통합한 타로 심층 해석 마스터야.
200 하트 프리미엄 심화 분석이니 기본 해석보다 훨씬 깊이 있고 풍부하게 풀어줘!

[심층 분석 포인트]
- 각 카드의 원형(archetype), 상징 체계, 수비학 의미 깊이 있게
- 카드 조합의 내러티브와 시너지 효과
- 오행 흐름과 동양 철학 관점에서 재해석
- 구체적 타임라인 조언 (단기 1주 / 중기 1개월 / 장기 3개월)
- 실천 가능한 액션 플랜

[톤]
친근한 반말 구어체. 친구한테 차 한 잔 하면서 깊은 이야기 나누듯이.

[출력 형식 — 평문, 섹션 제목은 【 】로 표시]
【카드별 심층 상징】 각 카드의 원형·상징·수비학 (카드당 3~4문장)
【카드 조합 시너지】 카드 간 상호작용과 전체 내러티브 (4~5문장)
【오행 & 동양 철학】 오행 흐름 + 사주 관점 재해석 (4~5문장)
【타임라인 조언】 단기/중기/장기 시점별 조언 (각 2~3문장)
【실천 가이드】 구체적 행동·시간·방향 (3~4문장)

총 분량 약 1000~1400자, 한국어 반말. 마크다운/코드블록 금지.""";
    }

    /** 타로 심화 사용자 프롬프트 */
    public String getTarotDeepUserPrompt(String cardsBlock, String spread, String categoryKr,
                                          String question, String basicInterpretation,
                                          String birthDate, String gender) {
        StringBuilder sb = new StringBuilder();
        sb.append("【기본 타로 리딩】\n");
        sb.append("스프레드: ").append(spread).append("\n");
        sb.append("카테고리: ").append(categoryKr).append("\n");
        if (question != null && !question.isBlank()) sb.append("질문: ").append(question).append("\n");
        sb.append("\n【뽑힌 카드】\n").append(cardsBlock).append("\n");
        if (birthDate != null && !birthDate.isBlank()) {
            sb.append("\n【의뢰자】 ").append(birthDate);
            if (gender != null) sb.append(" ").append("M".equalsIgnoreCase(gender) ? "남성" : "여성");
            sb.append("\n");
        }
        if (basicInterpretation != null && !basicInterpretation.isBlank()) {
            sb.append("\n【기본 해석 (참고 — 이보다 더 깊이 있게 확장)】\n").append(basicInterpretation).append("\n");
        }
        sb.append("\n위 정보로 타로 심화 분석을 작성해. 각 섹션 제목 【 】 포함, 총 1000~1400자 평문.");
        return sb.toString();
    }

    /** 타로 심화 스트림 완료 후 캐시 저장 */
    public void saveTarotDeepStreamResult(String cardIds, String reversals, String spread, String category,
                                           String fullText) {
        try {
            String cacheKey = buildTarotDeepCacheKey(cardIds, reversals, spread, category);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("detailAnalysis", fullText != null ? fullText.trim() : "");
            result.put("analysisDate", LocalDate.now().toString());
            var existing = specialFortuneRepository.findByFortuneTypeAndCacheKeyAndFortuneDate(
                "deep-tarot", cacheKey, COMPAT_CACHE_ANCHOR);
            if (existing.isPresent()) return;
            specialFortuneRepository.save(SpecialFortune.builder()
                .fortuneType("deep-tarot").cacheKey(cacheKey).fortuneDate(COMPAT_CACHE_ANCHOR)
                .resultJson(objectMapper.writeValueAsString(result)).build());
            log.info("타로 심화 캐시 저장: cacheKey={}, len={}", cacheKey,
                fullText != null ? fullText.length() : 0);
        } catch (Exception e) {
            log.warn("타로 심화 캐시 저장 실패: {}", e.getMessage());
        }
    }

    private String buildTarotDeepCacheKey(String cardIds, String reversals, String spread, String category) {
        String raw = (cardIds != null ? cardIds : "") + "|" + (reversals != null ? reversals : "")
            + "|" + (spread != null ? spread : "") + "|" + (category != null ? category : "");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(raw.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString().substring(0, 32);
        } catch (Exception e) {
            return String.valueOf(raw.hashCode());
        }
    }
}
