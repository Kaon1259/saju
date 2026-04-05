package com.saju.server.service;

import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuConstants;
import com.saju.server.saju.SajuPillar;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * AI 프롬프트 빌더
 * 오늘의 천간지지, 오행, 계절 기운을 반영한 운세 프롬프트 생성
 */
@Component
public class FortunePromptBuilder {

    private static final String[] SEASON = {"겨울", "겨울", "봄", "봄", "봄", "여름", "여름", "여름", "가을", "가을", "가을", "겨울"};
    private static final String[] SEASON_ENERGY = {
        "수(水)의 저장 기운", "수(水)의 저장 기운",
        "목(木)의 생장 기운", "목(木)의 생장 기운", "목(木)의 생장 기운",
        "화(火)의 확산 기운", "화(火)의 확산 기운", "화(火)의 확산 기운",
        "금(金)의 수렴 기운", "금(金)의 수렴 기운", "금(金)의 수렴 기운",
        "수(水)의 저장 기운"
    };

    private static final String[] ELEMENT_NATURE = {"성장·창의·인자", "열정·활력·표현", "안정·중재·신뢰", "결단·정의·강인", "지혜·적응·소통"};

    /**
     * 오늘의 천기(天氣) 정보 문자열 생성
     */
    public String buildTodayContext(LocalDate date) {
        int sajuYear = SajuCalculator.getSajuYear(date);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        SajuPillar monthPillar = SajuCalculator.calculateMonthPillar(date, yearPillar.getStemIndex());
        SajuPillar dayPillar = SajuCalculator.calculateDayPillar(date);

        int dayStemEl = SajuConstants.CHEONGAN_OHENG[dayPillar.getStemIndex()];
        int dayBranchEl = SajuConstants.JIJI_OHENG[dayPillar.getBranchIndex()];
        boolean dayYang = SajuConstants.CHEONGAN_YINYANG[dayPillar.getStemIndex()] == 0;

        int month = date.getMonthValue();
        String season = SEASON[month - 1];
        String seasonEnergy = SEASON_ENERGY[month - 1];

        StringBuilder sb = new StringBuilder();
        sb.append("【오늘의 천기(天氣)】\n");
        sb.append("양력: ").append(date.format(DateTimeFormatter.ofPattern("yyyy년 M월 d일"))).append("\n");
        sb.append("년주: ").append(yearPillar.getFullHanja()).append("(").append(yearPillar.getFullName()).append("년) — ").append(yearPillar.getAnimal()).append("띠 해\n");
        sb.append("월주: ").append(monthPillar.getFullHanja()).append("(").append(monthPillar.getFullName()).append("월)\n");
        sb.append("일주: ").append(dayPillar.getFullHanja()).append("(").append(dayPillar.getFullName()).append("일)\n");
        sb.append("일간 오행: ").append(SajuConstants.OHENG[dayStemEl]).append("(").append(SajuConstants.OHENG_HANJA[dayStemEl]).append(") — ").append(dayYang ? "양" : "음").append("\n");
        sb.append("일간 성질: ").append(ELEMENT_NATURE[dayStemEl]).append("\n");
        sb.append("일지 오행: ").append(SajuConstants.OHENG[dayBranchEl]).append("(").append(SajuConstants.OHENG_HANJA[dayBranchEl]).append(")\n");
        sb.append("계절: ").append(season).append(" — ").append(seasonEnergy).append("\n");

        // 오행 상생상극 관계
        int producedBy = SajuConstants.OHENG_PRODUCES[dayStemEl]; // 일간이 생하는 오행
        int overcoming = SajuConstants.OHENG_OVERCOMES[dayStemEl]; // 일간이 극하는 오행
        sb.append("일간 상생: ").append(SajuConstants.OHENG[dayStemEl]).append(" → ").append(SajuConstants.OHENG[producedBy]).append(" (에너지가 흐르는 방향)\n");
        sb.append("일간 상극: ").append(SajuConstants.OHENG[dayStemEl]).append(" → ").append(SajuConstants.OHENG[overcoming]).append(" (제어하는 방향)\n");

        return sb.toString();
    }

    /**
     * 오늘의 운세 스트리밍 시스템 프롬프트
     */
    public String fortuneStreamSystemPrompt() {
        return """
카페에서 친한 친구한테 오늘 운세 봐주듯이 자연스럽게 대화하는 사주 전문가야.
오늘의 일진(天干地支)과 띠의 기운을 결합해서 현실적이고 따뜻하게 해석해줘!

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지
- '너 오늘~', '이거 진짜~' 같은 자연스러운 대화체 OK

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. 각 항목은 3-4문장, 구체적 시간/행동/색상 포함
3. 오늘 일진의 오행과 띠의 기운의 상생/상극 관계를 반영
4. 계절의 기운을 반영
5. 대화하듯 자연스러운 반말 구어체 사용
6. 점수는 일진과 띠 기운의 조화도에 따라 45-98 사이로 책정
7. 총운에 오전/오후/저녁 시간대별 기운 변화 포함""";
    }

    /**
     * 오늘의 운세 스트리밍 유저 프롬프트
     */
    public String fortuneStreamUserPrompt(String zodiacAnimal, LocalDate date) {
        return fortuneStreamUserPrompt(zodiacAnimal, date, null);
    }

    public String fortuneStreamUserPrompt(String zodiacAnimal, LocalDate date, String relationshipStatus) {
        String todayCtx = buildTodayContext(date);
        String relCtx = buildRelationshipContext(relationshipStatus);
        return todayCtx + "\n" +
            "【의뢰인】" + zodiacAnimal + "띠" + relCtx + "\n\n" +
            "위 천기 정보와 의뢰인의 띠를 종합 분석하여 오늘의 운세를 작성하세요.\n" +
            "각 항목은 3-4문장으로 상세하게 작성하세요.\n" +
            "반드시 아래 JSON 형식으로만 응답:\n" +
            """
{"overall":"총운 (오전/오후/저녁 시간대별 기운 변화 포함, 4-5문장)",\
"love":"애정운 (구체적 행동 조언, 3-4문장)",\
"money":"재물운 (금전 방향·조언, 3-4문장)",\
"health":"건강운 (주의 부위·음식·운동 조언, 3-4문장)",\
"work":"직장운 (업무 전략·대인관계 조언, 3-4문장)",\
"score":점수(45-98),\
"luckyNumber":행운숫자(1-99),\
"luckyColor":"행운색상"}""";
    }

    /**
     * 혈액형 운세용 시스템 프롬프트
     */
    public String bloodTypeSystemPrompt() {
        return """
카페에서 친한 친구한테 수다 떨듯이 자연스럽게 운세를 봐주는 사주 전문가야.
동양 역학(오행·천간지지)과 서양 혈액형 기질론을 융합해서 해석해줘.

【역할】
- 오늘의 일진(日辰)의 기운이 각 혈액형 기질과 어떻게 상호작용하는지 분석해
- 단순한 격려가 아닌, 시간대·방위·행동에 대한 구체적 조언을 해줘
- 오행 기반 음식/방위/색상을 구체적으로 추천해줘
- 시간대별(오전/오후/저녁) 행운 조언을 줘
- 감정/심리 상태에 대한 조언도 함께 해줘

【혈액형 기질 체계】
- A형: 목(木)·음 기질 — 신중, 계획적, 세심, 내면 깊음, 스트레스에 민감
- B형: 화(火)·양 기질 — 자유, 창의, 직관, 열정적, 변화 추구
- O형: 금(金)·양 기질 — 리더십, 추진력, 대범, 목표지향, 승부욕
- AB형: 수(水)·음 기질 — 분석, 독창, 이중성, 천재형, 내면 복잡

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로 써줘
- 딱딱한 문장, 고전적 표현(~하옵소서, ~이로다), 격식체 절대 금지
- '너 오늘~', '이거 진짜~', '아 근데~' 같은 자연스러운 대화체 OK

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. 각 항목은 3-4문장, 구체적 시간/방위/색상/행동 포함
3. 오늘 일진의 오행과 혈액형 기질의 상생/상극 관계를 반영
4. 계절의 기운을 반영
5. 대화하듯 자연스러운 반말 구어체 사용
6. 점수는 일진과 기질의 조화도에 따라 45-98 사이로 책정
7. dayAnalysis는 일진과 혈액형 오행의 구체적 상호작용을 3-4문장으로 상세 분석
8. 오행 기반 추천 음식, 행운 방위, 시간대별 조언을 반드시 포함""";
    }

    /**
     * 혈액형 운세 유저 프롬프트
     */
    public String bloodTypeUserPrompt(String bloodType, String zodiacAnimal, LocalDate date) {
        String todayCtx = buildTodayContext(date);
        return todayCtx + "\n" +
            "【의뢰인】" + bloodType + "형 / " + zodiacAnimal + "띠\n\n" +
            "위 천기 정보와 의뢰인의 혈액형 기질·띠를 종합 분석하여 오늘의 운세를 작성하세요.\n" +
            "각 항목은 3-4문장으로 상세하게 작성하세요.\n" +
            "반드시 아래 JSON 형식으로만 응답:\n" +
            """
{"overall":"총운 (오전/오후/저녁 시간대별 기운 변화 포함, 4-5문장)",\
"love":"애정운 (구체적 행동 조언과 시간대, 3-4문장)",\
"money":"재물운 (금전 방향·시간대·투자 조언, 3-4문장)",\
"health":"건강운 (주의 부위·음식·운동·수면 조언, 3-4문장)",\
"work":"직장운 (업무 전략·대인관계·시간 관리 조언, 3-4문장)",\
"score":점수(45-98),\
"luckyNumber":행운숫자(1-99),\
"luckyColor":"행운색상",\
"summary":"오늘의 한 줄 슬로건 (15자 이내)",\
"dayAnalysis":"오늘 일진과 혈액형 기질의 오행 상호작용 상세 분석 (3-4문장, 상생/상극 관계와 그 영향)",\
"timeAdvice":"시간대별 행운 조언 (오전/오후/저녁 각각 한마디씩, 3문장)",\
"food":"오행 기반 오늘의 추천 음식 (2가지 이상)",\
"direction":"오늘의 행운 방위와 그 이유 (1문장)"}""";
    }

    /**
     * MBTI 운세용 시스템 프롬프트
     */
    public String mbtiSystemPrompt() {
        return """
카페에서 친한 친구한테 MBTI 운세 봐주듯이 자연스럽게 대화하는 전문가야.
16가지 유형의 인지기능 스택을 사주 오행과 결합해서 재밌고 친근하게 해석해줘!

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지

【16유형 주기능 × 오행 매핑】
- INTJ(Ni-Te): 수+금 — 미래 통찰 + 전략 실행
- INTP(Ti-Ne): 금+목 — 논리 분석 + 가능성 탐색
- ENTJ(Te-Ni): 금+수 — 체계적 리더십 + 직관적 판단
- ENTP(Ne-Ti): 목+금 — 혁신 아이디어 + 논리 검증
- INFJ(Ni-Fe): 수+화 — 깊은 통찰 + 조화로운 공감
- INFP(Fi-Ne): 화+목 — 내면 가치 + 창의적 탐색
- ENFJ(Fe-Ni): 화+수 — 타인 이끔 + 미래 비전
- ENFP(Ne-Fi): 목+화 — 영감 넘침 + 가치 추구
- ISTJ(Si-Te): 토+금 — 경험 기반 + 실무 효율
- ISFJ(Si-Fe): 토+화 — 헌신적 보살핌 + 전통 존중
- ESTJ(Te-Si): 금+토 — 조직 관리 + 체계 구축
- ESFJ(Fe-Si): 화+토 — 사교적 돌봄 + 안정 추구
- ISTP(Ti-Se): 금+화 — 냉정한 분석 + 즉각 행동
- ISFP(Fi-Se): 화+화 — 감성 표현 + 현재 만끽
- ESTP(Se-Ti): 화+금 — 과감한 행동 + 논리적 판단
- ESFP(Se-Fi): 화+화 — 에너지 넘침 + 진정성

【분석 방법】
1. 의뢰인 MBTI의 주기능+보조기능 오행을 오늘 일진 오행과 대조
2. 상생 관계면: 인지기능이 활성화 → 해당 능력 발휘 최적
3. 상극 관계면: 인지기능에 저항 → 열등기능 주의보
4. 비화(같은 오행)면: 에너지 증폭 → 과도 사용 주의
5. 인지기능 스택의 심층 상호작용 분석 (주기능-열등기능 축)
6. 대인관계에서의 인지기능 활용 전략 도출

【작성 규칙】
1. 반드시 JSON만 응답
2. overall에 주기능과 일진 오행의 구체적 상호작용 설명 (4-5문장)
3. love에 해당 유형의 연애 패턴(주기능 기반) + 오늘 주의점 (3-4문장)
4. work에 주기능 활용 전략 + 열등기능 관리법 (3-4문장)
5. tip은 그 유형의 열등기능을 보완하는 오늘의 맞춤 한마디
6. 점수는 45-98 사이
7. 대인관계 구체적 조언과 스트레스 관리법을 반드시 포함
8. 각 카테고리는 3-4문장으로 상세하게 작성
9. 대화하듯 자연스러운 반말 구어체 사용""";
    }

    /**
     * MBTI 운세 유저 프롬프트
     */
    public String mbtiUserPrompt(String mbtiType, String zodiacAnimal, LocalDate date) {
        String todayCtx = buildTodayContext(date);
        return todayCtx + "\n" +
            "【의뢰인】MBTI " + mbtiType + " / " + zodiacAnimal + "띠\n\n" +
            "위 천기 정보와 의뢰인의 MBTI 유형·띠를 종합 분석하여 오늘의 운세를 작성하세요.\n" +
            "각 항목은 3-4문장으로 상세하게 작성하세요.\n" +
            "반드시 아래 JSON 형식으로만 응답:\n" +
            """
{"overall":"총운 (인지기능과 일진의 상호작용 심화 해석, 4-5문장, 시간대별 기운 변화 포함)",\
"love":"애정운 (유형별 연애 패턴 반영, 구체적 행동 조언, 3-4문장)",\
"money":"재물운 (소비/투자/수입 관련 구체적 분석, 3-4문장)",\
"health":"건강운 (신체/정신 건강 관련 주의사항과 조언, 3-4문장)",\
"work":"직장운 (인지기능 활용 전략과 열등기능 관리, 3-4문장)",\
"tip":"오늘의 맞춤 한마디 (1문장, 임팩트 있게)",\
"summary":"오늘의 한 줄 슬로건 (15자 이내)",\
"socialAdvice":"대인관계 구체적 조언 (2-3문장, 어떤 유형과 잘 맞는지, 주의할 상호작용)",\
"stressManagement":"스트레스 관리법 (2문장, MBTI 유형 맞춤 이완/충전 방법)",\
"score":점수(45-98),\
"luckyNumber":행운숫자(1-99),\
"luckyColor":"행운색상"}""";
    }

    /**
     * 타로 리딩 시스템 프롬프트
     */
    public String tarotSystemPrompt() {
        return """
카페에서 친한 친구한테 타로 봐주듯이 자연스럽게 대화하는 타로 전문가야.
서양 타로와 동양 역학(사주, 오행)을 융합해서 친근하게 해석해줘!

【역할】
- 메이저 아르카나 22장의 상징과 원형(archetype)을 깊이 이해하고 있어
- 카드의 정방향/역방향에 따른 섬세한 차이를 해석해줘
- 스프레드 내 카드 간의 관계와 흐름을 읽어 종합적 스토리를 엮어줘
- 오늘의 천기(일진)를 반영해서 더 정확한 해석을 해줘

【타로 × 오행 매핑】
- 바람(風) 카드: 목(木) — 지적 활동, 소통, 판단
- 물(水) 카드: 수(水) — 감정, 직관, 잠재의식
- 불(火) 카드: 화(火) — 열정, 행동, 변화, 영적 성장
- 땅(土) 카드: 토(土)/금(金) — 물질, 현실, 안정, 건강

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지

【해석 규칙】
1. 각 카드를 포지션(위치)에 맞게 해석
2. 카드 간의 상호작용과 흐름 분석 (상생/상극)
3. 대화하듯 자연스러운 반말 구어체 사용
4. 구체적 시간, 방향, 행동 조언 포함
5. 카드의 상징(숫자, 색상, 인물)을 활용한 깊이 있는 해석
6. 마지막에 따뜻한 격려와 실천 가능한 조언으로 마무리
7. 한국어로 자연스럽고 친근하게 작성 (약 500-800자)""";
    }

    /**
     * 타로 리딩 유저 프롬프트
     */
    public String tarotUserPrompt(java.util.List<java.util.Map<String, Object>> cards,
                                   String spread, String categoryKr,
                                   String question, LocalDate date) {
        String todayCtx = buildTodayContext(date);
        StringBuilder sb = new StringBuilder();
        sb.append(todayCtx).append("\n");
        sb.append("【타로 리딩 요청】\n");
        sb.append("카테고리: ").append(categoryKr).append("\n");

        String spreadName = switch (spread) {
            case "one" -> "원카드 (단일 메시지)";
            case "three" -> "쓰리카드 (과거-현재-미래)";
            case "five" -> "켈틱 스프레드 (상황-장애물-잠재의식-조언-결과)";
            default -> "쓰리카드";
        };
        sb.append("스프레드: ").append(spreadName).append("\n");

        if (question != null && !question.isBlank()) {
            sb.append("질문: ").append(question).append("\n");
        }

        sb.append("\n【뽑힌 카드】\n");
        for (java.util.Map<String, Object> card : cards) {
            sb.append("▸ ").append(card.get("position")).append(": ")
              .append(card.get("nameKr")).append(" (").append(card.get("nameEn")).append(")")
              .append((Boolean) card.get("reversed") ? " — 역방향 ↓" : " — 정방향 ↑")
              .append(" [").append(card.get("element")).append(", ").append(card.get("planet")).append("]")
              .append("\n  키워드: ").append(card.get("keywords"))
              .append("\n");
        }

        sb.append("\n위 카드들을 포지션별로 해석하고, 카드 간의 흐름과 오늘의 천기를 종합하여\n");
        sb.append("'").append(categoryKr).append("'에 초점을 맞춘 깊이 있는 타로 리딩을 작성하세요.\n");
        sb.append("각 카드 해석 + 종합 해석 + 구체적 조언으로 구성하세요.");

        return sb.toString();
    }

    /**
     * 궁합 분석용 프롬프트
     */
    public String compatibilityPrompt(String type, String val1, String val2, LocalDate date) {
        String todayCtx = buildTodayContext(date);
        if ("bloodtype".equals(type)) {
            return todayCtx + "\n" +
                val1 + "형과 " + val2 + "형의 혈액형 궁합을 오늘의 일진 기운을 반영하여 분석하세요.\n" +
                "각 혈액형의 오행 기질과 상생/상극 관계, 오늘 특히 주의할 점, 관계를 발전시키는 구체적 행동 조언을 포함하여 5줄 이내로 한국어로 답변하세요.";
        } else {
            return todayCtx + "\n" +
                val1 + "과 " + val2 + "의 MBTI 궁합을 오늘의 일진 기운을 반영하여 분석하세요.\n" +
                "두 유형의 인지기능 상호작용, 오행 기질 조화, 오늘 함께하면 좋은 활동, 주의점을 포함하여 5줄 이내로 한국어로 답변하세요.";
        }
    }

    /**
     * 연애 상태별 프롬프트 맥락 생성
     */
    public String buildRelationshipContext(String status) {
        if (status == null || status.isBlank()) return "";
        return switch (status) {
            case "SINGLE" -> " / 현재 솔로 (새로운 만남·인연 가능성에 초점)";
            case "SOME" -> " / 현재 썸 타는 중 (상대방과의 관계 발전에 초점)";
            case "IN_RELATIONSHIP" -> " / 현재 연애 중 (연인과의 관계·데이트에 초점)";
            case "MARRIED" -> " / 기혼 (부부 관계·가정 화목·가족운에 초점)";
            case "COMPLICATED" -> " / 복잡한 관계 (관계 정리·방향성에 초점)";
            default -> "";
        };
    }
}
