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
     * 20대 친화 톤 공통 규칙 — 모든 시스템 프롬프트에 포함
     */
    public static final String COMMON_TONE_RULES = """
【공통 톤 규칙 (20대 타겟, 반드시 지킬 것)】
- 20대가 SNS에서 친구랑 얘기하듯 편하고 쉬운 반말 (친근하고 다정하게)
- 어려운 한자어, 사자성어, 고사성어 절대 금지
  ❌ 금상첨화 / 일사천리 / 유비무환 / 전화위복 / 대기만성 / 호사다마
  ❌ 기복 / 쇠퇴 / 융성 / 창달 / 도모 / 영위 / 귀인 → ✅ '좋은 일' / '잘 풀려' / '도와주는 사람'
- 한자 병기 금지 (天干, 日辰, 命理 같은 표현 금지 — 그냥 '오늘 기운'으로)
- 고전적 어미 절대 금지 (~하옵소서, ~이로다, ~을지니, ~할지어다, ~이리라)
- '의뢰인', '내담자', '귀하' 같은 호칭 금지 — 그냥 '너'
- 격식체/보고서 말투 금지 — 자연스러운 대화체로
- 쉬운 단어 선호: '기운' → '분위기/느낌' / '관재' → '법적 문제' / '구설' → '괜한 소문' / '행보' → '움직임'
- 일상에서 쓰는 표현으로: '데이트', '카페', '썸', '텐션', '에너지', '멘탈', '분위기'
- 이모지는 1-2개만 자연스럽게 (과하게 쓰지 말 것)
""";

    /**
     * 날짜 라벨 생성 — "오늘", "내일", "모레", 또는 "2026년 4월 20일 (월)"
     */
    public String dateLabel(LocalDate date) {
        if (date == null) return "오늘";
        LocalDate today = LocalDate.now();
        long diff = java.time.temporal.ChronoUnit.DAYS.between(today, date);
        if (diff == 0) return "오늘";
        if (diff == 1) return "내일";
        if (diff == 2) return "모레";
        if (diff == -1) return "어제";
        return date.format(DateTimeFormatter.ofPattern("M월 d일"));
    }

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
     * 운세 스트리밍 시스템 프롬프트 (날짜 라벨 반영)
     */
    public String fortuneStreamSystemPrompt() {
        return fortuneStreamSystemPrompt("오늘");
    }

    public String fortuneStreamSystemPrompt(String dateLabel) {
        return "카페에서 친한 친구한테 " + dateLabel + " 운세 봐주듯이 자연스럽게 얘기하는 사주 전문가야.\n" +
            dateLabel + "의 기운(일진)과 띠를 결합해서 20대가 이해하기 쉽게 풀어줘!\n\n" +
            COMMON_TONE_RULES + "\n" +
            "【날짜 규칙 ★중요★】\n" +
            "- 분석 대상 날짜는 반드시 '" + dateLabel + "'임. '오늘/내일/모레' 혼동 절대 금지.\n" +
            "- 모든 시간 표현(오전/오후/저녁)은 '" + dateLabel + "'의 시간대를 말함.\n" +
            "- 절대로 '오늘은 ~하지만 내일은 ~' 같은 다른 날 얘기 섞지 말 것.\n\n" +
            "【작성 규칙】\n" +
            "1. 반드시 JSON만 응답 (설명 텍스트 없이)\n" +
            "2. 각 항목은 3-4문장, 구체적 시간/행동/색상 포함\n" +
            "3. " + dateLabel + " 일진의 오행과 띠 기운의 상생/상극 관계를 자연스럽게 반영 (단, '상생/상극' 같은 한자 표현은 풀어서)\n" +
            "4. 계절의 분위기를 반영\n" +
            "5. 점수는 일진과 띠 기운의 조화도에 따라 45-98 사이로 책정\n" +
            "6. 총운에 오전/오후/저녁 시간대별 분위기 변화 포함";
    }

    /**
     * 운세 스트리밍 유저 프롬프트 (날짜 라벨 반영)
     */
    public String fortuneStreamUserPrompt(String zodiacAnimal, LocalDate date) {
        return fortuneStreamUserPrompt(zodiacAnimal, date, null);
    }

    public String fortuneStreamUserPrompt(String zodiacAnimal, LocalDate date, String relationshipStatus) {
        String todayCtx = buildTodayContext(date);
        String relCtx = buildRelationshipContext(relationshipStatus);
        String label = dateLabel(date);
        return todayCtx + "\n" +
            "【분석 대상 날짜】 " + label + " (" + date.format(DateTimeFormatter.ofPattern("yyyy년 M월 d일")) + ")\n" +
            "【친구】" + zodiacAnimal + "띠" + relCtx + "\n\n" +
            "위 기운 정보와 " + zodiacAnimal + "띠를 결합해서 " + label + "의 운세를 작성해줘.\n" +
            "각 항목은 3-4문장으로, 20대가 친근하게 읽을 수 있게 대화체로 써줘.\n" +
            "⚠️ 사자성어, 한자 병기, 고전적 표현은 절대 금지. 쉬운 일상어로만!\n" +
            "반드시 아래 JSON 형식으로만 응답:\n" +
            """
{"overall":"총운 (오전/오후/저녁 시간대별 분위기 변화 포함, 4-5문장)",\
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
        return "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 운세를 봐주는 사주 전문가야.\n" +
            "오행하고 혈액형 기질을 융합해서 20대가 이해하기 쉽게 풀어줘.\n\n" +
            COMMON_TONE_RULES + "\n" +
            "【혈액형 기질 참고 (내부용 — 이 한자 표현 자체는 출력하지 말고 의미만 반영)】\n" +
            "- A형: 신중·계획적·세심, 스트레스에 민감\n" +
            "- B형: 자유·창의·직관, 열정적, 변화 좋아함\n" +
            "- O형: 리더십·추진력, 대범, 목표지향\n" +
            "- AB형: 분석·독창, 이중성, 내면 복잡\n\n" +
            "【작성 규칙】\n" +
            "1. 반드시 JSON만 응답 (설명 텍스트 없이)\n" +
            "2. 각 항목은 3-4문장, 구체적 시간/방향/색상/행동 포함\n" +
            "3. 오늘 기운과 혈액형 기질을 자연스럽게 엮어서 설명 (오행·일진·상생상극 같은 한자 용어는 쓰지 말 것)\n" +
            "4. 계절 분위기를 자연스럽게 반영\n" +
            "5. 점수는 45-98 사이로 책정\n" +
            "6. dayAnalysis는 오늘 기운과 혈액형의 궁합을 쉽게 풀어서 3-4문장\n" +
            "7. 추천 음식, 행운 방향, 시간대별 조언 반드시 포함";
    }

    /**
     * 혈액형 운세 유저 프롬프트
     */
    public String bloodTypeUserPrompt(String bloodType, String zodiacAnimal, LocalDate date) {
        String todayCtx = buildTodayContext(date);
        return todayCtx + "\n" +
            "【친구】" + bloodType + "형 / " + zodiacAnimal + "띠\n\n" +
            "위 기운 정보와 혈액형·띠를 엮어서 오늘의 운세를 작성해줘.\n" +
            "각 항목은 3-4문장, 20대가 친구한테 듣듯이 편안한 반말로.\n" +
            "⚠️ 사자성어, 한자 병기, 고전적 표현, '의뢰인' 같은 격식체 단어 절대 금지!\n" +
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
        return "카페에서 친한 친구한테 MBTI 운세 봐주듯이 자연스럽게 얘기하는 전문가야.\n" +
            "16가지 유형의 특성을 오늘 기운과 엮어서 20대가 재밌게 읽을 수 있게 풀어줘!\n\n" +
            COMMON_TONE_RULES + "\n" +
            "【16유형 특성 참고 (내부용 — 인지기능 이름이나 오행 한자 그대로 출력 금지)】\n" +
            "- INTJ/INTP/ENTJ/ENTP: 분석적·전략적·논리파\n" +
            "- INFJ/INFP/ENFJ/ENFP: 감성적·공감적·아이디어파\n" +
            "- ISTJ/ISFJ/ESTJ/ESFJ: 현실적·성실파·책임감\n" +
            "- ISTP/ISFP/ESTP/ESFP: 자유로운 행동파·즉흥·감각형\n\n" +
            "【작성 규칙】\n" +
            "1. 반드시 JSON만 응답\n" +
            "2. overall: 해당 유형 특성과 오늘 분위기의 어울림을 쉽게 풀어서 (4-5문장)\n" +
            "3. love: 그 유형다운 연애 패턴과 오늘 연애 팁 (3-4문장)\n" +
            "4. work: 오늘 업무/학교에서 강점 활용법 (3-4문장)\n" +
            "5. tip: 오늘 그 유형이 듣고 싶은 한마디\n" +
            "6. 점수는 45-98 사이\n" +
            "7. ⚠️ '주기능/열등기능/인지기능/오행/일진' 같은 용어 절대 쓰지 말 것. 의미만 풀어쓰기";
    }

    /**
     * MBTI 운세 유저 프롬프트
     */
    public String mbtiUserPrompt(String mbtiType, String zodiacAnimal, LocalDate date) {
        String todayCtx = buildTodayContext(date);
        return todayCtx + "\n" +
            "【친구】MBTI " + mbtiType + " / " + zodiacAnimal + "띠\n\n" +
            "위 기운 정보와 MBTI·띠를 엮어서 오늘의 운세를 써줘.\n" +
            "각 항목은 3-4문장, 20대가 친구한테 듣듯이 편한 반말로.\n" +
            "⚠️ '주기능/인지기능/오행/일진/상생' 같은 용어 출력 금지. 사자성어, 한자 병기, 격식체 절대 금지!\n" +
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
        return COMMON_TONE_RULES + "\n" + """
카페에서 친한 친구한테 타로 봐주듯이 자연스럽게 대화하는 타로 전문가야.
서양 타로와 동양 역학(사주, 오행)을 융합해서 친근하게 해석해줘!

【역할】
- 메이저 아르카나 22장의 상징과 원형(archetype)을 깊이 이해하고 있어
- 카드의 정방향/역방향에 따른 섬세한 차이를 해석해줘
- 스프레드 내 카드 간의 관계와 흐름을 읽어 종합적 스토리를 엮어줘
- 오늘의 천기를 반영해서 더 정확한 해석을 해줘

【타로 × 오행 매핑】
- 바람 카드: 목 — 지적 활동, 소통, 판단
- 물 카드: 수 — 감정, 직관, 잠재의식
- 불 카드: 화 — 열정, 행동, 변화, 영적 성장
- 땅 카드: 토/금 — 물질, 현실, 안정, 건강

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
        return tarotUserPrompt(cards, spread, categoryKr, question, date, null, null);
    }

    public String tarotUserPrompt(java.util.List<java.util.Map<String, Object>> cards,
                                   String spread, String categoryKr,
                                   String question, LocalDate date,
                                   String birthDate, String gender) {
        String todayCtx = buildTodayContext(date);
        StringBuilder sb = new StringBuilder();
        sb.append(todayCtx).append("\n");
        sb.append("【타로 리딩 요청】\n");
        sb.append("카테고리: ").append(categoryKr).append("\n");

        // 나이/성별 반영
        if (birthDate != null && !birthDate.isBlank()) {
            try {
                LocalDate bd = LocalDate.parse(birthDate);
                int age = java.time.Period.between(bd, date).getYears();
                sb.append("너: ").append(age).append("세");
                if (gender != null) sb.append(gender.equals("F") ? " 여성" : " 남성");
                sb.append("\n");
                sb.append("※ 나이와 성별에 맞는 현실적이고 공감 가는 해석을 해주세요.\n");
            } catch (Exception ignored) {}
        }

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
