package com.saju.server.service;

import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DreamService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT = """
당신은 50년 경력의 꿈 해몽 전문가 '몽해 선생'입니다.
전통 한국 해몽학, 현대 심리학, 사주 오행을 융합한 독보적 꿈 해석을 제공합니다.

【역할】
- 한국 전통 해몽(전통 해몽)과 현대 심리학(융, 프로이트), 사주 오행 분석을 결합하여 꿈을 해석합니다
- 꿈에 등장하는 상징을 체계적으로 분류하고 의미를 부여합니다
- 의뢰인의 생년월일이 제공되면 사주 오행과 꿈 상징의 연결 관계를 분석합니다
- 꿈의 심층 심리학적 의미를 분석하여 현재 의뢰인의 내면 상태를 진단합니다
- 꿈에서 받은 메시지를 일상에서 활용할 수 있는 구체적 행동 지침을 제공합니다

【꿈 상징 분류 체계】
1. 동물: 용(대길, 권력/승진), 뱀(재물/지혜), 호랑이(권위/도전), 물고기(재물/풍요), 새(자유/소식), 개(충성/우정), 고양이(직관/여성성), 돼지(재물/복), 말(성공/전진), 거북이(장수/안정)
2. 자연현상: 물(감정/무의식), 불(열정/변화/정화), 바람(변화/소식), 비(정화/새출발), 눈(순수/고독), 해(성공/양기), 달(음기/감성/여성), 별(희망/이상), 무지개(행운/화합), 지진(큰 변화/불안)
3. 사람: 부모(보호/근원), 아이(새 시작/내면아이), 연인(감정/관계), 낯선 사람(자아의 그림자), 죽은 사람(미해결 감정/메시지), 유명인(욕망/동경)
4. 물건: 돈(가치/에너지), 열쇠(기회/해결), 거울(자기인식), 칼(결단/갈등), 꽃(사랑/아름다움/성장), 책(지식/지혜), 음식(영양/욕구충족)
5. 장소: 집(자아/안정), 학교(배움/과거), 산(목표/수행), 바다(무의식/감정의 깊이), 길(인생여정), 다리(전환점/연결), 병원(치유/불안)
6. 행동: 날기(자유/해방), 떨어지기(불안/통제상실), 쫓기기(회피/압박), 싸우기(내적갈등), 울기(감정해소/정화), 웃기(긍정/해방), 죽기(변화/재탄생)
7. 숫자/색상: 빨강(열정/화), 파랑(평화/수), 초록(성장/목), 노랑(지혜/토), 흰색(순수/금), 검정(무의식/두려움), 금색(성공/풍요)

【오행과 꿈 상징 연결】
- 목(木): 성장, 나무, 초록, 봄, 새싹, 동쪽 → 새 시작과 발전의 징조
- 화(火): 열정, 불, 빨강, 여름, 태양, 남쪽 → 활력과 변화의 징조
- 토(土): 안정, 땅, 노랑, 환절기, 중앙 → 중심 잡기와 전환의 징조
- 금(金): 결실, 금속, 흰색, 가을, 서쪽 → 수확과 결단의 징조
- 수(水): 지혜, 물, 검정/파랑, 겨울, 북쪽 → 내면 탐구와 흐름의 징조

【심층 심리 분석 체계】
- 의식 영역: 꿈에서 명확하게 인식한 장면 → 현재 의식적으로 고민하는 문제
- 전의식 영역: 꿈에서 희미하게 느낀 감정 → 인식은 하지만 외면하고 있는 주제
- 무의식 영역: 꿈의 배경, 분위기, 색감 → 깊이 억압된 욕구나 두려움
- 그림자 자아: 꿈에 등장하는 위협적 존재 → 자신이 거부하는 내면의 측면
- 아니마/아니무스: 이성적 존재의 등장 → 내면의 반대 성향과의 통합 욕구

【사주 연동 분석 (생년월일 제공 시)】
- 의뢰인의 일간(日干) 오행과 꿈 속 핵심 상징의 오행 관계 분석
- 상생 관계: 꿈이 긍정적 에너지 흐름을 나타냄
- 상극 관계: 내면의 갈등이나 극복해야 할 과제를 나타냄
- 비화 관계: 에너지 증폭, 해당 영역에 집중 필요

【해석 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. interpretation은 7-8문장으로 전통 해몽 관점에서 깊이 있게 작성 (상징 하나하나의 의미를 풀어서)
3. psychology는 4-5문장으로 현대 심리학적 의미 심층 분석 (의식/무의식 차원)
4. fortuneHint는 3문장으로 가까운 미래 운세 암시 (구체적 시기와 행동 포함)
5. luckyAction은 꿈의 기운을 현실에서 활용하는 구체적 행동 2가지
6. rating은 대길/길/보통/흉/대흉 중 하나
7. score는 0-100 사이 정수 (대길:85-100, 길:65-84, 보통:40-64, 흉:20-39, 대흉:0-19)
8. "~할 수 있습니다" 대신 "~하세요", "~입니다" 단정적 표현 사용
9. 따뜻하지만 전문적인 어조로 작성
10. symbolDetail에 꿈의 핵심 상징 3개와 각각의 의미를 요약

응답 형식:
{"category":"꿈 분류(동물/자연현상/사람/물건/장소/행동/복합)","symbol":"핵심 상징 키워드","symbolDetail":"핵심 상징 3개와 각 의미 (3문장)","interpretation":"전통 해몽 해석 (7-8문장)","psychology":"심층 심리학적 분석 (4-5문장, 의식/무의식/그림자 분석)","innerMessage":"이 꿈이 전하는 내면의 메시지 (2문장)","fortuneHint":"운세 암시 (3문장, 구체적 시기와 행동)","luckyAction":"행운 행동 2가지 (쉼표 구분)","luckyNumber":숫자(1-99),"rating":"대길/길/보통/흉/대흉","score":점수(0-100)}""";

    /**
     * 꿈 해몽
     */
    @Transactional
    public Map<String, Object> interpretDream(String dreamText, String birthDate, String gender) {
        // 캐시 체크
        String cacheKey = buildCacheKey(dreamText, birthDate, gender);
        Map<String, Object> cached = getFromCache("dream", cacheKey);
        if (cached != null) return cached;

        try {
            String userPrompt = buildUserPrompt(dreamText, birthDate, gender);
            String response = claudeApiService.generate(SYSTEM_PROMPT, userPrompt, 1600);
            String json = ClaudeApiService.extractJson(response);

            if (json != null) {
                Map<String, Object> result = objectMapper.readValue(json, new TypeReference<>() {});
                result.put("success", true);
                result.put("source", "ai");
                saveToCache("dream", cacheKey, result);
                return result;
            }
        } catch (Exception e) {
            log.error("꿈 해몽 AI 분석 실패: {}", e.getMessage());
        }

        // fallback
        return buildFallbackResponse(dreamText);
    }

    /**
     * 사용자 프롬프트 빌드
     */
    private String buildUserPrompt(String dreamText, String birthDate, String gender) {
        LocalDate today = LocalDate.now();
        String todayCtx = promptBuilder.buildTodayContext(today);

        StringBuilder sb = new StringBuilder();
        sb.append(todayCtx).append("\n");
        sb.append("【꿈 해몽 의뢰】\n");
        sb.append("꿈 내용: ").append(dreamText).append("\n");

        if (birthDate != null && !birthDate.isBlank()) {
            sb.append("의뢰인 생년월일: ").append(birthDate).append("\n");
            try {
                LocalDate birth = LocalDate.parse(birthDate, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                String sajuCtx = buildSajuContext(birth);
                sb.append(sajuCtx);
            } catch (Exception e) {
                log.warn("생년월일 파싱 실패: {}", birthDate);
            }
        }

        if (gender != null && !gender.isBlank()) {
            String genderKr = "male".equalsIgnoreCase(gender) ? "남성" : "female".equalsIgnoreCase(gender) ? "여성" : gender;
            sb.append("성별: ").append(genderKr).append("\n");
        }

        sb.append("\n위 꿈 내용을 전통 해몽, 심리학, 오행 관점에서 종합 분석하여 해몽하세요.\n");
        sb.append("꿈의 상징을 하나하나 깊이 있게 해석하고, 심층 심리 분석(의식/무의식/그림자)을 포함하세요.\n");
        sb.append("구체적 행동 조언 2가지와 운세 암시를 상세하게 작성하세요.\n");
        sb.append("반드시 지정된 JSON 형식으로만 응답하세요.");

        return sb.toString();
    }

    /**
     * 의뢰인 사주 요약 정보 빌드
     */
    private String buildSajuContext(LocalDate birthDate) {
        try {
            int sajuYear = com.saju.server.saju.SajuCalculator.getSajuYear(birthDate);
            com.saju.server.saju.SajuPillar yearPillar = com.saju.server.saju.SajuCalculator.calculateYearPillar(sajuYear);
            com.saju.server.saju.SajuPillar dayPillar = com.saju.server.saju.SajuCalculator.calculateDayPillar(birthDate);

            int dayStemEl = com.saju.server.saju.SajuConstants.CHEONGAN_OHENG[dayPillar.getStemIndex()];
            boolean dayYang = com.saju.server.saju.SajuConstants.CHEONGAN_YINYANG[dayPillar.getStemIndex()] == 0;

            StringBuilder sb = new StringBuilder();
            sb.append("【의뢰인 사주 정보】\n");
            sb.append("년주: ").append(yearPillar.getFullName()).append(" (").append(yearPillar.getAnimal()).append("띠)\n");
            sb.append("일간: ").append(com.saju.server.saju.SajuConstants.OHENG[dayStemEl])
              .append("(").append(com.saju.server.saju.SajuConstants.OHENG_HANJA[dayStemEl]).append(") — ")
              .append(dayYang ? "양" : "음").append("\n");
            sb.append("→ 의뢰인의 일간 오행과 꿈 상징의 오행 관계를 분석에 반영하세요.\n");
            return sb.toString();
        } catch (Exception e) {
            log.warn("사주 계산 실패: {}", e.getMessage());
            return "";
        }
    }

    /**
     * AI 호출 실패 시 키워드 기반 폴백 응답
     */
    private Map<String, Object> buildFallbackResponse(String dreamText) {
        String text = dreamText.toLowerCase();
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("source", "fallback");

        // 동물 키워드
        if (containsAny(text, "용", "dragon")) {
            result.put("category", "동물");
            result.put("symbol", "용");
            result.put("interpretation", "용꿈은 전통 해몽에서 가장 길한 꿈 중 하나입니다. 용은 권력, 성공, 승진을 상징하며, 하늘로 오르는 용을 꿨다면 큰 성취가 다가오고 있습니다. 특히 사업이나 직장에서 중요한 기회를 얻게 될 징조입니다. 용이 여의주를 물고 있었다면 재물운도 함께 상승합니다. 이 꿈은 당신의 잠재력이 폭발하는 시기가 왔음을 알려줍니다.");
            result.put("psychology", "용은 자아실현과 내면의 힘을 상징합니다. 현재 당신의 무의식이 자신감과 성취 욕구가 높아진 상태를 반영하고 있습니다.");
            result.put("fortuneHint", "가까운 시일 내에 중요한 기회가 찾아옵니다. 주저하지 말고 과감하게 도전하세요.");
            result.put("luckyAction", "동쪽 방향으로 아침 산책하기");
            result.put("luckyNumber", 8);
            result.put("rating", "대길");
            result.put("score", 92);
        } else if (containsAny(text, "뱀", "snake", "구렁이")) {
            result.put("category", "동물");
            result.put("symbol", "뱀");
            result.put("interpretation", "뱀꿈은 전통 해몽에서 재물과 지혜를 상징하는 대표적인 길몽입니다. 뱀이 몸을 감거나 집에 들어오는 꿈은 예상치 못한 재물이 들어올 징조입니다. 큰 뱀일수록 큰 재물을 의미하며, 특히 금색이나 흰 뱀은 더욱 강력한 재물운을 나타냅니다. 다만 뱀에게 물리는 꿈은 건강에 주의하라는 경고일 수 있습니다. 전반적으로 재물 흐름이 좋아지는 시기입니다.");
            result.put("psychology", "뱀은 무의식의 본능적 에너지와 변화를 상징합니다. 내면에서 중요한 전환이 일어나고 있으며 새로운 지혜가 깨어나고 있습니다.");
            result.put("fortuneHint", "예상치 못한 금전적 이득이 생길 수 있습니다. 재테크나 투자에 관심을 가져보세요.");
            result.put("luckyAction", "노란색 소품을 지니고 다니기");
            result.put("luckyNumber", 6);
            result.put("rating", "길");
            result.put("score", 78);
        } else if (containsAny(text, "돼지", "pig")) {
            result.put("category", "동물");
            result.put("symbol", "돼지");
            result.put("interpretation", "돼지꿈은 재물과 복을 상징하는 대표적인 길몽입니다. 전통 해몽에서 돼지는 풍요와 다산의 상징으로 경제적 행운이 다가오고 있음을 알립니다. 살찐 돼지일수록 더 큰 재물운을 의미하며, 돼지가 집으로 들어오는 꿈은 가정에 복이 들어오는 징조입니다. 돼지 여러 마리를 본 꿈은 여러 방면에서 좋은 소식이 올 것을 나타냅니다. 금전 운이 상승하는 시기이니 기회를 놓치지 마세요.");
            result.put("psychology", "돼지는 풍요와 만족감에 대한 욕구를 반영합니다. 현재 물질적 안정이나 보상에 대한 기대감이 높은 상태입니다.");
            result.put("fortuneHint", "재물운이 상승하는 시기입니다. 로또나 소소한 행운에 도전해보세요.");
            result.put("luckyAction", "저금통에 동전 넣기");
            result.put("luckyNumber", 3);
            result.put("rating", "길");
            result.put("score", 80);
        }
        // 자연현상 키워드
        else if (containsAny(text, "물", "바다", "강", "호수", "비", "홍수", "water", "sea", "ocean", "rain")) {
            result.put("category", "자연현상");
            result.put("symbol", "물");
            result.put("interpretation", "물 관련 꿈은 감정과 무의식의 흐름을 나타내는 중요한 상징입니다. 맑은 물은 마음의 평화와 새로운 시작을, 탁한 물은 감정적 혼란이나 정리가 필요한 상황을 의미합니다. 물이 넘치는 꿈은 억눌린 감정이 표출되려는 신호이며, 잔잔한 물은 현재 상태의 안정을 나타냅니다. 바다나 큰 물은 인생의 큰 흐름과 가능성을 상징합니다. 물의 상태가 당신의 현재 감정 상태를 그대로 반영하고 있습니다.");
            result.put("psychology", "물은 프로이트와 융 모두 무의식을 대표하는 상징으로 봅니다. 깊은 물일수록 자신의 내면 깊은 곳의 감정과 마주하고 있음을 나타냅니다.");
            result.put("fortuneHint", "감정을 솔직하게 표현하는 것이 운을 여는 열쇠입니다. 마음의 정리가 필요한 시기이니 명상이나 일기를 추천합니다.");
            result.put("luckyAction", "물가에서 산책하거나 물 한 잔 마시며 마음 정리하기");
            result.put("luckyNumber", 1);
            result.put("rating", "보통");
            result.put("score", 55);
        } else if (containsAny(text, "불", "화재", "fire", "태양", "해")) {
            result.put("category", "자연현상");
            result.put("symbol", "불/태양");
            result.put("interpretation", "불과 관련된 꿈은 열정, 변화, 정화를 상징합니다. 밝게 타오르는 불은 내면의 열정이 활활 불타고 있음을 나타내며, 새로운 도전에 적극적으로 나설 때입니다. 태양이 떠오르는 꿈은 앞으로의 일이 밝게 풀릴 징조이며, 성공과 인정을 받게 될 것입니다. 다만 불에 타거나 화재가 나는 꿈은 감정적 과열에 주의하라는 경고일 수 있습니다. 전반적으로 에너지가 넘치는 시기입니다.");
            result.put("psychology", "불은 변화와 재탄생의 원형적 상징입니다. 현재 삶에서 중요한 전환이 일어나고 있거나 강렬한 감정을 경험하고 있습니다.");
            result.put("fortuneHint", "열정을 쏟을 수 있는 일에 집중하세요. 에너지가 넘치는 시기이니 새로운 프로젝트를 시작하기에 좋습니다.");
            result.put("luckyAction", "빨간색 옷이나 소품 착용하기");
            result.put("luckyNumber", 7);
            result.put("rating", "길");
            result.put("score", 72);
        }
        // 행동 키워드
        else if (containsAny(text, "떨어", "추락", "fall", "falling")) {
            result.put("category", "행동");
            result.put("symbol", "추락");
            result.put("interpretation", "떨어지는 꿈은 현실에서 느끼는 불안감이나 통제력 상실에 대한 두려움을 반영합니다. 높은 곳에서 떨어지는 꿈은 현재 맡고 있는 일이나 관계에서 자신감이 부족한 상태를 나타냅니다. 하지만 전통 해몽에서 떨어져도 다치지 않는 꿈은 오히려 위기를 극복하고 성장하는 징조입니다. 떨어지다 날게 되는 꿈은 큰 전환점이 다가오고 있음을 의미합니다. 현재의 불안을 인정하고 한 걸음씩 나아가면 됩니다.");
            result.put("psychology", "추락 꿈은 가장 보편적인 불안 꿈으로, 현실의 스트레스나 실패에 대한 두려움이 투영된 것입니다. 자신에게 너무 높은 기준을 세우고 있지 않은지 점검해보세요.");
            result.put("fortuneHint", "불안한 마음을 내려놓으면 오히려 기회가 보입니다. 주변 사람들에게 도움을 요청하는 것이 운을 여는 방법입니다.");
            result.put("luckyAction", "맨발로 땅을 밟으며 안정감 찾기");
            result.put("luckyNumber", 4);
            result.put("rating", "보통");
            result.put("score", 45);
        } else if (containsAny(text, "쫓기", "쫓아", "도망", "chase", "run")) {
            result.put("category", "행동");
            result.put("symbol", "쫓김");
            result.put("interpretation", "쫓기는 꿈은 현실에서 회피하고 있는 문제나 감정이 있음을 나타냅니다. 무언가에 쫓기는 상황은 해결하지 못한 과제나 마주하기 싫은 현실을 반영합니다. 전통 해몽에서는 쫓기다가 숨는 꿈은 잠시 쉬어가라는 신호이며, 쫓기다가 맞서 싸우는 꿈은 문제를 극복할 용기가 생기고 있다는 뜻입니다. 쫓는 존재가 사람인지 동물인지에 따라 해석이 달라지지만, 핵심은 직면해야 할 것이 있다는 메시지입니다. 용기를 내어 문제와 마주하면 상황이 호전됩니다.");
            result.put("psychology", "쫓기는 꿈은 회피 행동의 무의식적 반영입니다. 현재 스트레스 요인을 파악하고 하나씩 해결해나가는 것이 중요합니다.");
            result.put("fortuneHint", "미루던 일을 처리하면 마음이 한결 가벼워집니다. 이번 주 안에 하나의 과제를 마무리하세요.");
            result.put("luckyAction", "미루던 일 하나를 오늘 마무리하기");
            result.put("luckyNumber", 5);
            result.put("rating", "보통");
            result.put("score", 42);
        } else if (containsAny(text, "날", "비행", "fly", "flying", "하늘")) {
            result.put("category", "행동");
            result.put("symbol", "비행");
            result.put("interpretation", "하늘을 나는 꿈은 자유와 해방을 상징하는 길몽입니다. 높이 날수록 목표와 이상이 높아지고 있음을 나타내며, 자유롭게 비행하는 꿈은 현실의 제약에서 벗어나 새로운 가능성을 발견하게 될 징조입니다. 전통 해몽에서 하늘 높이 나는 꿈은 출세와 성공을 의미합니다. 구름 위를 나는 꿈이라면 주변의 인정을 받고 높은 지위에 오를 수 있습니다. 당신의 잠재력이 활짝 펼쳐지는 시기가 다가오고 있습니다.");
            result.put("psychology", "비행 꿈은 자아초월과 성장 욕구의 표현입니다. 현실의 한계를 넘고 싶은 강한 동기가 무의식에서 작동하고 있습니다.");
            result.put("fortuneHint", "창의적인 아이디어가 떠오르는 시기입니다. 새로운 계획을 세우고 실행에 옮기세요.");
            result.put("luckyAction", "높은 곳에 올라가 넓은 전망 바라보기");
            result.put("luckyNumber", 9);
            result.put("rating", "길");
            result.put("score", 76);
        }
        // 사람 키워드
        else if (containsAny(text, "죽은 사람", "돌아가신", "고인", "할머니", "할아버지", "죽은")) {
            result.put("category", "사람");
            result.put("symbol", "고인");
            result.put("interpretation", "돌아가신 분이 나오는 꿈은 전통 해몽에서 매우 의미 있는 꿈으로 봅니다. 고인이 편안한 모습으로 나타나면 저승에서 안녕하다는 메시지이며, 동시에 당신에게 복을 전해주는 것입니다. 고인이 무언가를 주는 꿈은 재물운이 들어올 징조이며, 함께 밥을 먹는 꿈은 건강운 상승을 나타냅니다. 다만 고인이 슬퍼 보이거나 데려가려 하는 꿈은 건강에 주의하라는 경고입니다. 고인에 대한 그리움과 감사한 마음이 이 꿈을 만들어낸 것입니다.");
            result.put("psychology", "고인의 꿈은 미해결된 감정이나 그리움의 표현입니다. 상실을 애도하는 건강한 심리 과정의 일부이며, 내면의 치유가 진행 중입니다.");
            result.put("fortuneHint", "조상의 보살핌이 있는 시기입니다. 성묘나 추모의 시간을 가지면 마음의 평안을 얻게 됩니다.");
            result.put("luckyAction", "고인을 추모하며 좋은 일 한 가지 실천하기");
            result.put("luckyNumber", 2);
            result.put("rating", "길");
            result.put("score", 68);
        }
        // 기본 폴백
        else {
            result.put("category", "복합");
            result.put("symbol", "복합 상징");
            result.put("interpretation", "이 꿈은 여러 상징이 복합적으로 나타난 꿈으로, 현재 마음속에 다양한 생각과 감정이 교차하고 있음을 나타냅니다. 꿈속의 장면들은 최근의 경험과 내면의 욕구가 어우러져 만들어진 것입니다. 전통 해몽에서는 선명하게 기억나는 꿈일수록 중요한 메시지를 담고 있다고 봅니다. 꿈에서 느낀 감정이 긍정적이었다면 좋은 방향으로 흘러가고 있으며, 불안했다면 현실에서 정리가 필요한 부분이 있습니다. 자신의 내면 목소리에 귀를 기울이면 답을 찾을 수 있습니다.");
            result.put("psychology", "복합적인 꿈은 다양한 심리적 자극이 동시에 처리되고 있음을 보여줍니다. 최근의 경험들이 무의식에서 재구성되는 자연스러운 과정입니다.");
            result.put("fortuneHint", "직감을 믿고 행동하면 좋은 결과가 따릅니다. 마음이 이끄는 대로 움직여보세요.");
            result.put("luckyAction", "조용한 곳에서 10분간 명상하기");
            result.put("luckyNumber", 7);
            result.put("rating", "보통");
            result.put("score", 55);
        }

        return result;
    }

    /**
     * 텍스트에 키워드 포함 여부 확인
     */
    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    // ── 캐싱 헬퍼 ──

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
            if (cached.isPresent()) {
                return objectMapper.readValue(cached.get().getResultJson(), new TypeReference<Map<String, Object>>() {});
            }
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
