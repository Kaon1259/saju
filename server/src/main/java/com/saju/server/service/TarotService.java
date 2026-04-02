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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TarotService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ═══════════════════════════════════════════════════
    // 메이저 아르카나 22장 정의
    // ═══════════════════════════════════════════════════

    public static final String[][] MAJOR_ARCANA = {
        // {id, 영문명, 한글명, 키워드, 정방향 의미, 역방향 의미, 원소, 행성/별자리}
        {"0",  "The Fool",            "광대",         "새로운 시작,모험,순수,자유",
            "새로운 여정이 시작됩니다. 두려움 없이 한 발을 내딛으세요. 순수한 마음이 행운을 부릅니다.",
            "무모한 결정을 조심하세요. 준비 없는 도전은 위험할 수 있습니다. 현실을 직시하세요.",
            "바람(風)", "천왕성"},
        {"1",  "The Magician",        "마법사",       "의지력,창조,기술,자신감",
            "당신에게는 원하는 것을 현실로 만들 힘이 있습니다. 자원을 적극 활용하세요.",
            "재능을 낭비하고 있습니다. 속임수나 조작에 주의하세요. 집중력이 필요합니다.",
            "바람(風)", "수성"},
        {"2",  "The High Priestess",  "여사제",       "직관,신비,잠재의식,지혜",
            "내면의 목소리에 귀 기울이세요. 숨겨진 진실이 곧 드러납니다. 직관을 믿으세요.",
            "직관을 무시하고 있습니다. 비밀이 밝혀질 수 있으니 조심하세요. 내면의 불안에 주목하세요.",
            "물(水)", "달"},
        {"3",  "The Empress",         "여황제",       "풍요,모성,자연,아름다움",
            "풍요와 번영의 기운이 감돕니다. 창조적 에너지가 넘치는 시기입니다. 사랑이 꽃핍니다.",
            "과잉보호나 집착을 주의하세요. 창조적 막힘이 올 수 있습니다. 자기 관리가 필요합니다.",
            "땅(土)", "금성"},
        {"4",  "The Emperor",         "황제",         "권위,구조,안정,리더십",
            "질서와 구조를 세울 때입니다. 리더십을 발휘하세요. 계획대로 진행됩니다.",
            "지나친 통제욕을 내려놓으세요. 융통성이 필요합니다. 권위적 태도가 문제를 만듭니다.",
            "불(火)", "양자리"},
        {"5",  "The Hierophant",      "교황",         "전통,가르침,신앙,규범",
            "전통과 규범 안에서 답을 찾으세요. 좋은 멘토를 만나게 됩니다. 배움의 시기입니다.",
            "형식에 얽매이지 마세요. 자신만의 길을 찾을 때입니다. 권위에 의문을 제기하세요.",
            "땅(土)", "황소자리"},
        {"6",  "The Lovers",          "연인",         "사랑,조화,선택,관계",
            "중요한 선택의 기로에 섰습니다. 마음이 이끄는 방향을 따르세요. 깊은 유대감이 형성됩니다.",
            "관계의 불화가 예상됩니다. 가치관의 충돌이 있을 수 있습니다. 신중한 선택이 필요합니다.",
            "바람(風)", "쌍둥이자리"},
        {"7",  "The Chariot",         "전차",         "승리,의지,전진,결단",
            "강한 의지로 전진하세요. 장애물을 극복하고 승리할 때입니다. 자신감이 성공을 이끕니다.",
            "방향을 잃었습니다. 내면의 갈등이 전진을 막고 있습니다. 목표를 재설정하세요.",
            "물(水)", "게자리"},
        {"8",  "Strength",            "힘",           "용기,인내,내면의 힘,자비",
            "부드러운 힘이 강한 힘을 이깁니다. 인내심으로 상황을 제어하세요. 내면의 강인함을 믿으세요.",
            "자신감이 흔들리고 있습니다. 감정에 휩쓸리지 마세요. 내면의 두려움과 마주하세요.",
            "불(火)", "사자자리"},
        {"9",  "The Hermit",          "은둔자",       "성찰,고독,지혜,탐구",
            "혼자만의 시간이 필요합니다. 내면을 탐구하면 답을 찾게 됩니다. 조용한 지혜가 빛납니다.",
            "고립이 길어지고 있습니다. 세상과 소통하세요. 외로움에 갇히지 마세요.",
            "땅(土)", "처녀자리"},
        {"10", "Wheel of Fortune",    "운명의 수레바퀴", "변화,운명,전환점,순환",
            "운명의 전환점에 섰습니다. 좋은 기운이 돌아옵니다. 변화를 받아들이세요.",
            "불운한 시기가 올 수 있습니다. 하지만 이것도 지나갑니다. 인내하며 기다리세요.",
            "불(火)", "목성"},
        {"11", "Justice",             "정의",         "공정,균형,진실,책임",
            "정당한 결과를 받게 됩니다. 진실이 밝혀집니다. 공정하게 행동하세요.",
            "불공정한 대우를 받을 수 있습니다. 편견을 버리세요. 책임을 회피하지 마세요.",
            "바람(風)", "천칭자리"},
        {"12", "The Hanged Man",      "매달린 사람",   "희생,새로운 시각,멈춤,깨달음",
            "잠시 멈추고 다른 관점에서 바라보세요. 포기가 아닌 전략적 기다림입니다. 새로운 깨달음이 옵니다.",
            "무의미한 희생을 그만두세요. 결정을 미루지 마세요. 정체에서 벗어나세요.",
            "물(水)", "해왕성"},
        {"13", "Death",               "죽음",         "변환,끝과 시작,재탄생,해방",
            "하나의 장이 끝나고 새로운 장이 열립니다. 집착을 내려놓으세요. 변화가 성장을 가져옵니다.",
            "변화에 저항하고 있습니다. 과거에 매달리면 성장할 수 없습니다. 놓아주세요.",
            "물(水)", "전갈자리"},
        {"14", "Temperance",          "절제",         "균형,조화,인내,중용",
            "균형과 조화를 유지하세요. 극단을 피하고 중용의 길을 걸으세요. 인내가 보상받습니다.",
            "균형이 무너졌습니다. 과도함을 줄이세요. 조급함이 일을 그르칩니다.",
            "불(火)", "사수자리"},
        {"15", "The Devil",           "악마",         "유혹,집착,속박,물질",
            "물질적 유혹에 주의하세요. 스스로를 속박하는 것이 무엇인지 직시하세요. 중독에서 벗어나세요.",
            "속박에서 해방되기 시작합니다. 나쁜 습관을 끊을 용기가 생깁니다. 자유를 되찾으세요.",
            "땅(土)", "염소자리"},
        {"16", "The Tower",           "탑",           "급변,파괴,깨달음,해방",
            "예상치 못한 변화가 찾아옵니다. 하지만 파괴 후에 재건이 옵니다. 진실을 마주하세요.",
            "최악의 상황은 피할 수 있습니다. 변화를 서서히 받아들이세요. 내면의 변화가 먼저입니다.",
            "불(火)", "화성"},
        {"17", "The Star",            "별",           "희망,영감,치유,평화",
            "희망의 빛이 비칩니다. 치유와 회복의 시간입니다. 꿈을 향해 나아가세요.",
            "희망을 잃지 마세요. 자신에 대한 믿음이 흔들리고 있습니다. 작은 빛을 찾으세요.",
            "바람(風)", "물병자리"},
        {"18", "The Moon",            "달",           "불안,환상,잠재의식,비밀",
            "직감을 믿되 환상에 빠지지 마세요. 숨겨진 것들이 드러나는 시기입니다. 꿈에 주목하세요.",
            "혼란에서 벗어나기 시작합니다. 두려움을 직시하세요. 진실이 드러나고 있습니다.",
            "물(水)", "물고기자리"},
        {"19", "The Sun",             "태양",         "성공,기쁨,활력,긍정",
            "밝은 에너지가 당신을 감쌉니다. 성공과 기쁨의 시기입니다. 자신감을 갖고 빛나세요.",
            "에너지가 과잉되었습니다. 낙관에 빠져 현실을 놓치지 마세요. 겸손함이 필요합니다.",
            "불(火)", "태양"},
        {"20", "Judgement",           "심판",         "각성,재생,소명,용서",
            "과거를 돌아보고 새롭게 시작할 때입니다. 내면의 소명을 따르세요. 용서와 해방이 찾아옵니다.",
            "과거에 대한 후회가 발목을 잡습니다. 자기 비판을 멈추세요. 새로운 시각이 필요합니다.",
            "불(火)", "명왕성"},
        {"21", "The World",           "세계",         "완성,성취,통합,여행",
            "하나의 순환이 완성됩니다. 목표를 달성하고 새로운 차원으로 나아갑니다. 축하합니다!",
            "완성에 가깝지만 마지막 조각이 부족합니다. 마무리를 짓지 못하고 있습니다. 끝까지 가세요.",
            "땅(土)", "토성"}
    };

    // 카테고리별 한글명
    private static final Map<String, String> CATEGORY_KR = Map.ofEntries(
        Map.entry("general", "종합운"),
        Map.entry("relationship", "연애운"),
        Map.entry("crush", "짝사랑운"),
        Map.entry("blind_date", "소개팅운"),
        Map.entry("meeting_timing", "만남의 시기"),
        Map.entry("ideal_type", "이상형 분석"),
        Map.entry("confession_timing", "고백 타이밍"),
        Map.entry("mind_reading", "속마음 읽기"),
        Map.entry("couple_fortune", "커플 운세"),
        Map.entry("marriage", "결혼운"),
        Map.entry("remarriage", "재혼운"),
        Map.entry("reunion", "재회운"),
        Map.entry("past_life", "전생 인연"),
        Map.entry("money", "재물운"),
        Map.entry("career", "직업운"),
        Map.entry("health", "건강운")
    );

    // 스프레드별 포지션 이름
    private static final Map<String, String[]> SPREAD_POSITIONS = Map.of(
        "one", new String[]{"현재의 메시지"},
        "three", new String[]{"과거", "현재", "미래"},
        "five", new String[]{"현재 상황", "장애물", "잠재의식", "조언", "결과"}
    );

    /**
     * 22장 전체 카드 정보
     */
    public List<Map<String, Object>> getAllCards() {
        List<Map<String, Object>> cards = new ArrayList<>();
        for (String[] card : MAJOR_ARCANA) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", Integer.parseInt(card[0]));
            m.put("nameEn", card[1]);
            m.put("nameKr", card[2]);
            m.put("keywords", card[3]);
            m.put("element", card[6]);
            m.put("planet", card[7]);
            cards.add(m);
        }
        return cards;
    }

    /**
     * 카드 뽑기 (셔플 후 랜덤)
     */
    public List<Map<String, Object>> drawCards(int count) {
        count = Math.min(Math.max(count, 1), 10);
        List<Integer> indices = new ArrayList<>();
        for (int i = 0; i < 22; i++) indices.add(i);
        Collections.shuffle(indices);

        List<Map<String, Object>> drawn = new ArrayList<>();
        Random random = new Random();
        for (int i = 0; i < count; i++) {
            int idx = indices.get(i);
            String[] card = MAJOR_ARCANA[idx];
            boolean reversed = random.nextBoolean();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", Integer.parseInt(card[0]));
            m.put("nameEn", card[1]);
            m.put("nameKr", card[2]);
            m.put("keywords", card[3]);
            m.put("reversed", reversed);
            m.put("element", card[6]);
            m.put("planet", card[7]);
            drawn.add(m);
        }
        return drawn;
    }

    /**
     * 타로 리딩 - AI 해석 + 폴백
     */
    @Transactional
    public Map<String, Object> getReading(String cardIds, String reversals,
                                           String spread, String category, String question) {
        // 캐시 체크
        String cacheKey = buildCacheKey(cardIds, reversals, spread, category, question);
        Map<String, Object> cached = getFromCache("tarot", cacheKey);
        if (cached != null) return cached;
        // 카드 파싱
        int[] ids = Arrays.stream(cardIds.split(","))
            .mapToInt(s -> Integer.parseInt(s.trim()))
            .toArray();
        String[] revParts = reversals.split(",");
        boolean[] reversed = new boolean[ids.length];
        for (int i = 0; i < ids.length; i++) {
            if (i < revParts.length) {
                String v = revParts[i].trim();
                reversed[i] = "1".equals(v) || "true".equals(v);
            }
        }

        String[] positions = SPREAD_POSITIONS.getOrDefault(spread, SPREAD_POSITIONS.get("three"));
        String categoryKr = CATEGORY_KR.getOrDefault(category, "종합운");

        // 카드 정보 구성
        List<Map<String, Object>> cardDetails = new ArrayList<>();
        for (int i = 0; i < ids.length; i++) {
            int id = Math.min(Math.max(ids[i], 0), 21);
            String[] card = MAJOR_ARCANA[id];
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("id", id);
            detail.put("position", i < positions.length ? positions[i] : "추가 카드");
            detail.put("nameEn", card[1]);
            detail.put("nameKr", card[2]);
            detail.put("keywords", card[3]);
            detail.put("reversed", reversed[i]);
            detail.put("meaning", reversed[i] ? card[5] : card[4]);
            detail.put("element", card[6]);
            detail.put("planet", card[7]);
            cardDetails.add(detail);
        }

        // AI 해석 시도
        String aiInterpretation = generateAIReading(cardDetails, spread, categoryKr, question);

        // 결과 구성
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("spread", spread);
        result.put("category", category);
        result.put("categoryKr", categoryKr);
        result.put("question", question);
        result.put("cards", cardDetails);
        result.put("interpretation", aiInterpretation != null ? aiInterpretation : generateFallbackReading(cardDetails, categoryKr));
        result.put("overallMessage", generateOverallMessage(cardDetails));
        result.put("advice", generateAdvice(cardDetails, category));
        result.put("luckyElement", determineLuckyElement(cardDetails));
        result.put("date", LocalDate.now().toString());
        saveToCache("tarot", cacheKey, result);
        return result;
    }

    /**
     * AI 기반 타로 해석
     */
    private String generateAIReading(List<Map<String, Object>> cards,
                                      String spread, String categoryKr, String question) {
        if (!claudeApiService.isAvailable()) return null;
        try {
            String systemPrompt = promptBuilder.tarotSystemPrompt();
            String userPrompt = promptBuilder.tarotUserPrompt(cards, spread, categoryKr, question, LocalDate.now());
            String response = claudeApiService.generate(systemPrompt, userPrompt, 1200);
            if (response != null && !response.isBlank()) {
                return response.trim();
            }
            return null;
        } catch (Exception e) {
            log.warn("AI tarot reading failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 폴백 리딩 생성
     */
    private String generateFallbackReading(List<Map<String, Object>> cards, String categoryKr) {
        StringBuilder sb = new StringBuilder();
        sb.append("【").append(categoryKr).append(" 타로 리딩】\n\n");

        for (Map<String, Object> card : cards) {
            String position = (String) card.get("position");
            String nameKr = (String) card.get("nameKr");
            boolean reversed = (Boolean) card.get("reversed");
            String meaning = (String) card.get("meaning");

            sb.append("▸ ").append(position).append(" — ")
              .append(nameKr).append(reversed ? " (역방향)" : " (정방향)").append("\n");
            sb.append(meaning).append("\n\n");
        }

        // 종합 메시지
        sb.append("【종합 해석】\n");
        if (cards.size() == 1) {
            sb.append("이 카드는 지금 당신에게 가장 필요한 메시지를 담고 있습니다. ");
            sb.append("카드의 의미를 마음에 새기고 오늘 하루를 보내세요.");
        } else if (cards.size() == 3) {
            sb.append("과거의 경험이 현재를 만들었고, 현재의 선택이 미래를 결정합니다. ");
            sb.append("세 장의 카드가 보여주는 흐름을 참고하여 현명한 선택을 하세요.");
        } else {
            sb.append("다섯 장의 카드가 당신의 상황을 다각도로 비춰주고 있습니다. ");
            sb.append("장애물을 인식하고, 잠재의식의 메시지를 받아들이며, 조언을 실천하세요.");
        }
        return sb.toString();
    }

    /**
     * 전체 메시지 생성
     */
    private String generateOverallMessage(List<Map<String, Object>> cards) {
        // 정방향/역방향 비율로 전체 기운 판단
        long uprightCount = cards.stream().filter(c -> !(Boolean) c.get("reversed")).count();
        double ratio = (double) uprightCount / cards.size();

        if (ratio >= 0.8) return "매우 긍정적인 기운이 감돕니다. 자신감을 가지고 나아가세요!";
        if (ratio >= 0.6) return "전반적으로 좋은 흐름입니다. 작은 주의사항만 신경 쓰면 됩니다.";
        if (ratio >= 0.4) return "빛과 그림자가 공존합니다. 균형을 찾는 것이 핵심입니다.";
        if (ratio >= 0.2) return "도전적인 시기이지만, 역경 속에서 성장의 기회가 있습니다.";
        return "깊은 성찰이 필요한 시기입니다. 내면의 목소리에 귀 기울이세요.";
    }

    /**
     * 카테고리별 조언
     */
    private String generateAdvice(List<Map<String, Object>> cards, String category) {
        String firstCardName = (String) cards.get(0).get("nameKr");
        boolean firstReversed = (Boolean) cards.get(0).get("reversed");

        return switch (category) {
            case "relationship" -> firstReversed
                ? "관계에서 한 발 물러나 상대방의 시각으로 바라보는 시간이 필요합니다."
                : "진심을 표현하세요. " + firstCardName + "의 기운이 당신의 사랑을 응원합니다.";
            case "crush" -> firstReversed
                ? "지금은 거리를 두고 지켜보세요. 서두르면 오히려 멀어질 수 있어요."
                : "용기를 내세요! " + firstCardName + "이(가) 당신의 마음이 닿을 거라 말하고 있어요.";
            case "blind_date" -> firstReversed
                ? "너무 기대하지 말고 자연스럽게 다가가세요. 힘을 빼면 오히려 좋은 인연이 와요."
                : "좋은 만남의 기운이 보여요! 밝은 에너지로 나가면 좋은 결과가 있을 거예요.";
            case "meeting_timing" -> firstReversed
                ? "아직은 때가 아닐 수 있어요. 자신을 가꾸는 시간을 가져보세요."
                : "인연이 가까이 다가오고 있어요. 새로운 만남에 마음을 열어보세요.";
            case "ideal_type" -> firstReversed
                ? "외면보다 내면의 끌림에 집중해보세요. 진짜 인연은 예상과 다를 수 있어요."
                : firstCardName + "이(가) 당신의 이상형에 대한 힌트를 주고 있어요.";
            case "confession_timing" -> firstReversed
                ? "타이밍을 조금 더 기다려보세요. 준비가 덜 된 고백은 후회를 남겨요."
                : "지금이 바로 그때예요! 솔직한 마음을 전하면 좋은 결과가 기다리고 있어요.";
            case "mind_reading" -> firstReversed
                ? "상대방도 혼란스러운 시기일 수 있어요. 조급해하지 말고 지켜봐주세요."
                : "상대방의 마음에 당신이 자리잡고 있어요. 자신감을 가져도 좋아요!";
            case "couple_fortune" -> firstReversed
                ? "작은 오해가 쌓이고 있어요. 대화로 풀어야 할 시간입니다."
                : "둘의 사랑이 더 깊어지는 시기예요. 함께하는 시간을 소중히 하세요.";
            case "marriage" -> firstReversed
                ? "결혼에 대한 고민이 있다면, 서두르지 말고 천천히 준비하세요."
                : "좋은 인연의 기운이 무르익고 있어요. 운명의 파트너가 다가오고 있어요.";
            case "remarriage" -> firstReversed
                ? "과거의 상처를 완전히 치유한 후에 새 시작��� 준비하세요."
                : "새로운 사랑의 문이 열리고 있어요. 두려워하지 말고 한 걸음 내딛어보세요.";
            case "reunion" -> firstReversed
                ? "아직은 상처가 아물지 않았어요. 자기 자신을 먼저 돌봐주세요."
                : "새로운 시작의 기운이 보여요. 과거를 놓아주면 더 좋은 인연이 찾아와요.";
            case "past_life" -> firstReversed
                ? "전생의 인연에 너무 집착하지 마세요. 현재의 만남이 더 소중해요."
                : "깊은 인연의 끈이 느껴져요. 운명적인 만남을 믿어보세요.";
            case "money" -> firstReversed
                ? "지출을 점검하고 불필요한 소비를 줄이세요. 절약이 곧 수입입니다."
                : "재물의 흐름이 좋습니다. 적극적인 투자보다 안정적인 관리를 추천합니다.";
            case "career" -> firstReversed
                ? "현재 방향을 재점검할 때입니다. 새로운 가능성에 마음을 여세요."
                : "능력을 펼칠 기회가 다가옵니다. 준비된 자에게 기회가 옵니다.";
            case "health" -> firstReversed
                ? "무리하지 마세요. 충분한 휴식과 규칙적인 생활이 최우선입니다."
                : "건강 에너지가 충만합니다. 새로운 운동이나 건강 습관을 시작하기 좋은 때입니다.";
            default -> firstReversed
                ? firstCardName + "이(가) 내면의 성찰을 권하고 있습니다. 잠시 멈추고 돌아보세요."
                : firstCardName + "의 긍정적 기운을 받아 오늘도 힘차게 나아가세요!";
        };
    }

    /**
     * 행운의 원소 결정
     */
    private String determineLuckyElement(List<Map<String, Object>> cards) {
        Map<String, Integer> elementCount = new LinkedHashMap<>();
        for (Map<String, Object> card : cards) {
            String element = (String) card.get("element");
            elementCount.merge(element, 1, Integer::sum);
        }
        return elementCount.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("불(火)");
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
