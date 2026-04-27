package com.saju.server.service;

import com.saju.server.entity.ZodiacFortune;
import com.saju.server.repository.ZodiacFortuneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZodiacFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final ZodiacFortuneRepository repository;

    // {동물명, 한자, 시간대, 오행, 이모지, 지지(地支)}
    private static final String[][] ANIMALS = {
        {"쥐",     "子", "23-01시", "수", "🐭", "자"},
        {"소",     "丑", "01-03시", "토", "🐮", "축"},
        {"호랑이", "寅", "03-05시", "목", "🐯", "인"},
        {"토끼",   "卯", "05-07시", "목", "🐰", "묘"},
        {"용",     "辰", "07-09시", "토", "🐲", "진"},
        {"뱀",     "巳", "09-11시", "화", "🐍", "사"},
        {"말",     "午", "11-13시", "화", "🐴", "오"},
        {"양",     "未", "13-15시", "토", "🐑", "미"},
        {"원숭이", "申", "15-17시", "금", "🐵", "신"},
        {"닭",     "酉", "17-19시", "금", "🐓", "유"},
        {"개",     "戌", "19-21시", "토", "🐶", "술"},
        {"돼지",   "亥", "21-23시", "수", "🐷", "해"},
    };

    // 출생연도 → 동물 인덱스: ANIMALS_BY_YEAR_MOD[year % 12]
    // 2020 = 쥐 → 2020 % 12 = 4 → ANIMALS_BY_YEAR_MOD[4]="쥐"
    private static final String[] ANIMALS_BY_YEAR_MOD = {
        "원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"
    };

    private static final Map<String, String> PERSONALITY = new LinkedHashMap<>();
    static {
        PERSONALITY.put("쥐",     "기민하고 영리한 전략가. 위기 감지가 빠르고 자원 활용에 능합니다. 사교성이 좋고 기회를 포착하는 직관이 탁월하며, 환경에 빠르게 적응합니다.");
        PERSONALITY.put("소",     "성실하고 인내심 강한 실천가. 한 번 시작한 일은 끝까지 해내는 끈기가 있고 신뢰할 수 있습니다. 감정을 안으로 삭이며 묵묵히 노력하는 타입입니다.");
        PERSONALITY.put("호랑이", "용감하고 카리스마 넘치는 리더. 정의감이 강하고 약자를 보호하려는 본능이 있습니다. 결단력 있고 모험을 두려워하지 않으며 자존심이 강합니다.");
        PERSONALITY.put("토끼",   "온화하고 감수성 풍부한 평화주의자. 미적 감각이 뛰어나고 분위기를 잘 살피며 갈등을 피합니다. 섬세한 직관과 다정한 매력으로 사람을 끌어당깁니다.");
        PERSONALITY.put("용",     "기품 있고 야심찬 비전가. 카리스마와 창의력이 풍부하며 큰 그림을 그리는 능력이 탁월합니다. 자존심이 높고 평범함을 거부하는 특별한 존재감을 가집니다.");
        PERSONALITY.put("뱀",     "지혜롭고 통찰력 깊은 분석가. 신중하고 비밀스러운 매력이 있으며 본질을 꿰뚫는 안목이 있습니다. 한번 빠지면 끝까지 파고드는 집중력이 강점입니다.");
        PERSONALITY.put("말",     "자유롭고 열정적인 모험가. 활동적이고 솔직하며 한 곳에 머무르기보다 새로운 경험을 추구합니다. 사교적이고 에너지가 넘치는 분위기 메이커입니다.");
        PERSONALITY.put("양",     "다정하고 예술적 감각이 풍부한 공감자. 평화를 사랑하고 타인을 배려하는 마음이 깊습니다. 창의력과 섬세함을 갖추었으며 미적 감각이 뛰어납니다.");
        PERSONALITY.put("원숭이", "재치 있고 창의적인 만능 엔터테이너. 두뇌 회전이 빠르고 문제 해결력이 탁월합니다. 호기심이 왕성하고 유머러스하며 변화에 능숙합니다.");
        PERSONALITY.put("닭",     "꼼꼼하고 정직한 완벽주의자. 시간 약속을 잘 지키고 책임감이 강합니다. 외모와 자기 관리에 신경 쓰며 성실한 태도로 신뢰를 얻는 타입입니다.");
        PERSONALITY.put("개",     "충실하고 의리 있는 수호자. 정의감이 강하고 한번 신뢰하면 끝까지 함께합니다. 진실되고 따뜻한 마음으로 주변 사람들에게 든든한 버팀목이 됩니다.");
        PERSONALITY.put("돼지",   "관대하고 낙천적인 풍요의 상징. 마음이 넓고 베푸는 것을 좋아하며 진실된 정을 나눕니다. 솔직하고 인정 많아 인복과 재복이 따르는 타입입니다.");
    }

    // 폴백 템플릿 (AI 실패 시)
    private static final String[][] FB = {
        {"기회를 포착하는 안목이 빛나는 날입니다. 작은 신호도 놓치지 마세요.", "사교 활동에서 행운이 찾아옵니다.", "정보를 빠르게 흡수하면 의외의 길이 열립니다."},
        {"성실함이 보상받는 안정적인 하루입니다.", "꾸준한 노력이 결실을 맺기 시작합니다.", "신뢰가 쌓인 관계에서 든든한 도움이 옵니다."},
        {"강한 추진력으로 돌파구를 만드는 날!", "용기 있는 행동이 큰 성과로 이어집니다.", "리더로서 빛날 기회가 찾아옵니다."},
        {"부드러운 매력이 사람을 끌어당기는 하루.", "감각적인 선택이 행운을 부릅니다.", "조화로운 관계 속에서 마음의 평화를 얻습니다."},
        {"카리스마와 비전이 빛나는 특별한 하루!", "큰 무대에서 자신을 드러낼 기회가 옵니다.", "야심찬 계획이 현실화되는 흐름입니다."},
        {"깊은 통찰력으로 핵심을 꿰뚫는 날입니다.", "비밀스러운 매력이 상대를 끌어당깁니다.", "조용히 준비한 일이 빛을 보기 시작합니다."},
        {"자유로운 에너지가 넘치는 활동적 하루!", "새로운 만남이 행운을 가져옵니다.", "솔직한 표현이 관계를 진전시킵니다."},
        {"예술적 감성이 극대화되는 창의적 하루.", "공감 능력으로 사람들의 마음을 얻습니다.", "평화로운 시간 속에서 영감이 떠오릅니다."},
        {"재치와 유머가 분위기를 밝히는 날!", "문제 해결력이 빛나며 인정받는 흐름.", "다재다능함이 다양한 기회를 만듭니다."},
        {"꼼꼼함이 큰 성과로 이어지는 하루.", "약속을 지키는 모습이 신뢰를 얻습니다.", "외모·이미지 관리에 좋은 결과가 따릅니다."},
        {"의리와 진심이 통하는 따뜻한 하루.", "정직한 태도가 든든한 인연을 만듭니다.", "약자를 도우면 큰 복으로 돌아옵니다."},
        {"풍요롭고 너그러운 마음이 복을 부르는 날.", "베풀수록 더 큰 것이 돌아옵니다.", "솔직한 정이 깊은 인연을 만듭니다."},
    };

    /**
     * 출생연도 → 띠 동물 (간단 계산, 양력 1월 1일 기준)
     * 정확하려면 음력 설(2월 초)까지의 출생자는 전년도 띠로 분류해야 하지만,
     * 일단 양력 연도 기준으로 계산. (필요 시 향후 개선)
     */
    public String getAnimalFromBirthYear(int year) {
        return ANIMALS_BY_YEAR_MOD[((year % 12) + 12) % 12];
    }

    public String getAnimalFromBirthDate(LocalDate date) {
        return getAnimalFromBirthYear(date.getYear());
    }

    @Transactional
    public Map<String, Object> getTodayFortune(String animal) {
        LocalDate today = LocalDate.now();
        int idx = getAnimalIndex(animal);

        Optional<ZodiacFortune> cached = repository.findByAnimalAndFortuneDate(animal, today);
        if (cached.isPresent()) {
            return toMap(cached.get(), idx);
        }

        ZodiacFortune fortune = generateWithAI(animal, idx, today);
        if (fortune == null) {
            fortune = generateFallback(animal, idx, today);
        }

        repository.save(fortune);
        return toMap(fortune, idx);
    }

    private static final String ZODIAC_JSON_TEMPLATE =
        "{\"summary\":\"오늘의 한 줄 슬로건 (15자 이내)\"," +
        "\"overall\":\"총운 (시간대별 기운 변화 포함, 4-5문장)\"," +
        "\"love\":\"애정운 (구체적 행동 조언, 3-4문장)\"," +
        "\"money\":\"재물운 (금전 방향·시기별 조언, 3-4문장)\"," +
        "\"work\":\"직업운/사회운 (업무·대인관계 조언, 3-4문장)\"," +
        "\"health\":\"건강운 (주의 부위·운동·식이 조언, 3문장)\"," +
        "\"elementInfluence\":\"띠의 오행과 오늘 일진 오행의 상호작용 (2-3문장)\"," +
        "\"emotionalTip\":\"오늘의 감정·심리 케어 팁 (2-3문장)\"," +
        "\"timeAdvice\":\"시간대별 행운 조언 (오전/오후/저녁 각 한마디, 3문장)\"," +
        "\"advice\":\"오늘의 핵심 행동 조언 (3-4문장)\"," +
        "\"score\":점수(50-95),\"luckyNumber\":숫자,\"luckyColor\":\"색상\"}";

    private static final String ZODIAC_SYSTEM_PROMPT =
        FortunePromptBuilder.COMMON_TONE_RULES + "\n" +
        "카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 띠 운세 전문가야! " +
        "12지신(쥐·소·호랑이·토끼·용·뱀·말·양·원숭이·닭·개·돼지)의 동양 역학을 바탕으로 " +
        "각 띠의 지지(地支)와 오행이 오늘 일진의 오행과 어떻게 상호작용하는지 알려줘. " +
        "반드시 JSON만 응답. 각 카테고리는 충분한 분량으로 상세하게 작성해.";

    private ZodiacFortune generateWithAI(String animal, int idx, LocalDate date) {
        if (!claudeApiService.isAvailable()) return null;
        try {
            String todayCtx = promptBuilder.buildTodayContext(date);
            String prompt = todayCtx + "\n【친구의 띠】" + animal + "띠 (" + ANIMALS[idx][1] + ", " + ANIMALS[idx][3] + " 오행, " + ANIMALS[idx][2] + ")\n" +
                "성격: " + PERSONALITY.get(animal) + "\n\n" +
                "위 천기(일진 오행)와 띠의 지지·오행 특성을 종합하여 오늘의 운세를 작성하세요.\n" +
                "반드시 JSON만: " + ZODIAC_JSON_TEMPLATE;
            String resp = claudeApiService.generate(ZODIAC_SYSTEM_PROMPT, prompt, 2500);

            String json = ClaudeApiService.extractJson(resp);
            if (json == null) return null;
            return parseToEntity(animal, date, json);
        } catch (Exception e) {
            log.warn("AI zodiac fortune failed for {}: {}", animal, e.getMessage());
            return null;
        }
    }

    private ZodiacFortune parseToEntity(String animal, LocalDate date, String json) throws Exception {
        var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
        long seed = animal.hashCode() + date.hashCode();
        Random r = new Random(seed);
        String[] colors = {"빨강","파랑","노랑","초록","보라","흰색","분홍","금색","하늘색","민트"};

        return ZodiacFortune.builder()
            .animal(animal)
            .fortuneDate(date)
            .overall(node.path("overall").asText(""))
            .love(node.path("love").asText(""))
            .money(node.path("money").asText(""))
            .health(node.path("health").asText(""))
            .work(node.path("work").asText(""))
            .advice(node.path("advice").asText(""))
            .summary(node.path("summary").asText(""))
            .elementInfluence(node.path("elementInfluence").asText(""))
            .emotionalTip(node.path("emotionalTip").asText(""))
            .timeAdvice(node.path("timeAdvice").asText(""))
            .score(node.path("score").asInt(70))
            .luckyNumber(node.path("luckyNumber").asInt(r.nextInt(99) + 1))
            .luckyColor(node.path("luckyColor").asText(colors[r.nextInt(colors.length)]))
            .build();
    }

    private ZodiacFortune generateFallback(String animal, int idx, LocalDate date) {
        long seed = animal.hashCode() + date.hashCode();
        Random r = new Random(seed);
        String[] colors = {"빨강","파랑","노랑","초록","보라","흰색","분홍","금색","하늘색","민트"};

        return ZodiacFortune.builder()
            .animal(animal)
            .fortuneDate(date)
            .overall(FB[idx][r.nextInt(3)])
            .love("사랑에 있어 " + (r.nextBoolean() ? "솔직한 표현이 통하는 날입니다." : "상대의 마음을 세심하게 살펴보세요."))
            .money(r.nextBoolean() ? "안정적인 재정 흐름. 계획 소비가 답입니다." : "뜻밖의 금전적 기회가 찾아올 수 있습니다.")
            .health(r.nextBoolean() ? "활력 있는 하루. 가벼운 운동을 추천합니다." : "충분한 휴식이 필요한 시기. 무리는 금물.")
            .score(r.nextInt(36) + 60)
            .luckyNumber(r.nextInt(99) + 1)
            .luckyColor(colors[r.nextInt(colors.length)])
            .build();
    }

    private Map<String, Object> toMap(ZodiacFortune f, int idx) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("animal", f.getAnimal());
        result.put("hanja", ANIMALS[idx][1]);
        result.put("emoji", ANIMALS[idx][4]);
        result.put("element", ANIMALS[idx][3]);
        result.put("hour", ANIMALS[idx][2]);
        result.put("branch", ANIMALS[idx][5]);
        result.put("personality", PERSONALITY.getOrDefault(f.getAnimal(), ""));
        result.put("date", f.getFortuneDate().toString());
        result.put("summary", f.getSummary());
        result.put("overall", f.getOverall());
        result.put("love", f.getLove());
        result.put("money", f.getMoney());
        result.put("work", f.getWork());
        result.put("health", f.getHealth());
        result.put("elementInfluence", f.getElementInfluence());
        result.put("emotionalTip", f.getEmotionalTip());
        result.put("timeAdvice", f.getTimeAdvice());
        result.put("advice", f.getAdvice());
        result.put("score", f.getScore());
        result.put("luckyNumber", f.getLuckyNumber());
        result.put("luckyColor", f.getLuckyColor());
        return result;
    }

    public List<Map<String, Object>> getAllAnimals() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < ANIMALS.length; i++) {
            String[] a = ANIMALS[i];
            long seed = a[0].hashCode() + today.hashCode();
            Random r = new Random(seed);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("animal", a[0]);
            item.put("hanja", a[1]);
            item.put("emoji", a[4]);
            item.put("element", a[3]);
            item.put("hour", a[2]);
            item.put("branch", a[5]);
            item.put("score", r.nextInt(36) + 60);
            list.add(item);
        }
        return list;
    }

    private int getAnimalIndex(String animal) {
        for (int i = 0; i < ANIMALS.length; i++) {
            if (ANIMALS[i][0].equals(animal)) return i;
        }
        return 0;
    }

    public Map<String, Object> getCachedFortune(String animal) {
        LocalDate today = LocalDate.now();
        Optional<ZodiacFortune> cached = repository.findByAnimalAndFortuneDate(animal, today);
        if (cached.isPresent()) {
            return toMap(cached.get(), getAnimalIndex(animal));
        }
        return null;
    }

    public SseEmitter streamFortune(String animal, String birthDate, String gender, String targetType, String targetName, Runnable onSuccess) {
        return doStreamFortune(animal, birthDate, gender, targetType, targetName, onSuccess);
    }

    private SseEmitter doStreamFortune(String animal, String birthDate, String gender, String targetType, String targetName, Runnable onSuccess) {
        LocalDate today = LocalDate.now();
        int idx = getAnimalIndex(animal);

        String systemPrompt = ZODIAC_SYSTEM_PROMPT + "\n" + FortunePromptBuilder.TARGET_AWARE_RULES;

        String todayCtx = promptBuilder.buildTodayContext(today);
        String userPrompt = todayCtx + "\n【친구의 띠】" + animal + "띠 (" + ANIMALS[idx][1] + ", " + ANIMALS[idx][3] + " 오행, " + ANIMALS[idx][2] + ")\n" +
            "성격: " + PERSONALITY.get(animal) + "\n\n" +
            "위 천기(일진 오행)와 띠의 지지·오행 특성을 종합하여 오늘의 운세를 작성하세요.\n" +
            "반드시 JSON만: " + ZODIAC_JSON_TEMPLATE
            + promptBuilder.buildPersonContext(birthDate, gender)
            + promptBuilder.buildTargetContext(targetType, targetName);

        return claudeApiService.generateStream(systemPrompt, userPrompt, 2500,
                ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json == null) return;
                ZodiacFortune fortune = parseToEntity(animal, today, json);
                repository.save(fortune);
            } catch (Exception e) {
                log.warn("zodiac stream cache save failed for {}: {}", animal, e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
    }
}
