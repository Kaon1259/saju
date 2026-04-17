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
}
