package com.saju.server.service;

import com.saju.server.entity.BloodTypeFortune;
import com.saju.server.repository.BloodTypeFortuneRepository;
import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuPillar;
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
public class BloodTypeFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final BloodTypeFortuneRepository repository;

    private static final String[] BLOOD_TYPES = {"A", "B", "O", "AB"};
    private static final String[] ZODIAC_ANIMALS = {"쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"};

    private static final Map<String, String> PERSONALITY = Map.of(
        "A", "꼼꼼하고 성실한 완벽주의자. 계획적이고 신중하며, 타인의 감정에 민감하게 반응합니다. 책임감이 강하고 규칙을 잘 따르지만, 때로는 걱정이 많고 스트레스에 취약할 수 있습니다.",
        "B", "자유롭고 창의적인 마이페이스. 호기심이 왕성하고 새로운 것에 도전하는 것을 좋아합니다. 솔직하고 직관적이며, 자신만의 세계관이 뚜렷합니다.",
        "O", "리더십이 강하고 사교적인 행동파. 목표 의식이 뚜렷하고 추진력이 있습니다. 넓은 인맥을 가지고 있으며 대범하고 낙천적입니다.",
        "AB", "이성적이면서도 감성적인 천재형. 분석력이 뛰어나고 독창적인 사고를 합니다. 합리적이면서도 예술적 감각이 있어 다재다능합니다."
    );

    // ─── 폴백 템플릿 ───
    private static final Map<String, String[]> FB_OVERALL = Map.of(
        "A", new String[]{"오늘은 세심한 관찰력이 빛나는 날입니다. 놓치기 쉬운 디테일에서 큰 기회를 발견할 수 있습니다. 오전 중에 중요한 결정을 내리세요.", "차분한 에너지가 당신을 감싸는 하루입니다. 급하게 서두르지 말고 평소의 루틴을 지키세요. 오후에 뜻밖의 좋은 소식이 올 수 있습니다.", "완벽을 추구하는 마음이 오히려 발목을 잡을 수 있습니다. 80점도 충분히 훌륭합니다. 마음의 짐을 내려놓으면 길이 보입니다."},
        "B", new String[]{"창의력이 폭발하는 날입니다! 떠오르는 아이디어를 바로 메모하세요. 오후 3시경 영감의 피크가 옵니다.", "자유로운 영혼이 날개를 펴는 하루. 틀에 박힌 방법 대신 나만의 방식을 시도하면 놀라운 결과가 나옵니다.", "호기심을 따라가되, 한 가지에 집중하세요. 여러 일을 동시에 벌리면 어느 것도 마무리하기 어렵습니다."},
        "O", new String[]{"리더십이 빛나는 날! 당신이 앞장서면 모두가 따릅니다. 오전에 중요한 미팅이나 프레젠테이션을 잡으세요.", "넓은 인맥이 행운을 가져다주는 하루. 오랜만에 연락 온 사람의 제안에 귀 기울여보세요.", "추진력이 넘치지만, 주변 사람의 의견도 경청하세요. 독단적인 결정은 오늘 뜻하지 않은 반발을 살 수 있습니다."},
        "AB", new String[]{"분석력이 극대화되는 날. 복잡하게 얽힌 문제도 한눈에 핵심을 꿰뚫을 수 있습니다. 직감을 믿으세요.", "이성과 감성이 절묘하게 균형을 이루는 하루. 논리적 판단과 마음의 소리가 같은 방향을 가리킵니다.", "혼자만의 시간이 보석같이 빛나는 날입니다. 조용한 공간에서 생각을 정리하면 큰 깨달음을 얻습니다."}
    );

    private static final Map<String, String[]> FB_LOVE = Map.of("A", new String[]{"진심 어린 작은 배려가 상대의 마음을 녹입니다.", "감정 표현에 용기를 내보세요. 오늘 전한 마음은 반드시 통합니다.", "상대의 말을 있는 그대로 받아들이세요."}, "B", new String[]{"솔직한 표현이 최고의 매력입니다.", "즉흥적인 데이트 제안이 큰 추억을 만듭니다.", "새로운 만남의 기운이 감돕니다."}, "O", new String[]{"당당한 고백이 통하는 날입니다.", "함께 활동적인 시간을 보내면 관계가 깊어집니다.", "상대를 믿어주는 것이 사랑의 시작입니다."}, "AB", new String[]{"깊은 대화가 사랑의 불꽃을 피웁니다.", "미스터리한 매력이 상대를 끌어당기는 날.", "작은 행동으로 진심을 보여주세요."});
    private static final Map<String, String[]> FB_MONEY = Map.of("A", new String[]{"계획적 소비가 빛을 발합니다.", "안전한 투자가 정답인 날.", "비교 쇼핑으로 의외의 절약 기회를 잡으세요."}, "B", new String[]{"충동구매 주의! 하루만 기다려보세요.", "취미가 수입이 되는 기회가 옵니다.", "소액의 뜻밖의 이득이 생깁니다."}, "O", new String[]{"대범한 판단이 좋은 결과를 가져옵니다.", "인맥이 곧 재테크인 날.", "가치 있는 곳에 쓰는 돈은 아깝지 않습니다."}, "AB", new String[]{"냉철한 분석이 투자 기회를 포착합니다.", "본업과 부업의 밸런스를 잡으세요.", "필요한 것과 원하는 것을 구분하는 날."});
    private static final Map<String, String[]> FB_HEALTH = Map.of("A", new String[]{"스트레스 관리가 최우선! 명상이 도움됩니다.", "위장 건강에 신경 쓰세요. 따뜻한 음식을 드세요.", "충분한 수면이 최고의 보약입니다."}, "B", new String[]{"활동적인 운동으로 에너지를 발산하세요.", "불규칙한 생활 패턴을 주의하세요.", "비타민을 챙기고 과일을 섭취하세요."}, "O", new String[]{"적절한 운동과 휴식의 밸런스가 중요합니다.", "단백질 섭취를 늘리면 좋겠습니다.", "햇볕을 쬐며 산책하면 기분이 좋아집니다."}, "AB", new String[]{"정신적 피로에 주의. 가벼운 산책이 처방입니다.", "호흡기 건강에 신경 쓰세요.", "규칙적인 수면이 건강의 비결입니다."});
    private static final Map<String, String[]> FB_WORK = Map.of("A", new String[]{"꼼꼼한 업무 처리가 신뢰를 얻습니다.", "팀 프로젝트에서 조율자 역할이 어울립니다.", "데이터 정리에서 빛나는 능력을 발휘하세요."}, "B", new String[]{"창의적 기획에서 핵심 아이디어를 내세요.", "새로운 프로젝트에 도전하면 성과를 냅니다.", "자유로운 환경에서 최고의 퍼포먼스를 냅니다."}, "O", new String[]{"프레젠테이션이나 회의에서 주도적으로 나서세요.", "네트워킹이 비즈니스 기회가 됩니다.", "결단력 있는 행동이 성공을 부릅니다."}, "AB", new String[]{"분석 보고서에서 탁월한 능력을 발휘합니다.", "혼자 집중하는 시간을 확보하세요.", "다양한 관점을 종합하는 능력이 빛납니다."});

    private static final String[] LUCKY_COLORS = {"빨강","파랑","노랑","초록","보라","흰색","분홍","주황","금색","하늘색","민트","라벤더"};

    // ─── 궁합 데이터 ───
    private static final Map<String, int[]> COMPAT_SCORE = new HashMap<>();
    private static final Map<String, String> COMPAT_DESC = new HashMap<>();
    static {
        COMPAT_SCORE.put("A", new int[]{75, 60, 90, 70});
        COMPAT_SCORE.put("B", new int[]{60, 80, 85, 88});
        COMPAT_SCORE.put("O", new int[]{90, 85, 78, 72});
        COMPAT_SCORE.put("AB", new int[]{70, 88, 72, 82});
        COMPAT_DESC.put("A+A", "서로의 세심함을 이해하는 안정적인 관계. 둘 다 소극적이라 표현 노력이 필요합니다.");
        COMPAT_DESC.put("A+B", "정반대의 매력으로 끌리지만 이해와 인내가 필요한 관계입니다.");
        COMPAT_DESC.put("A+O", "최고의 궁합! 세심함과 포용력이 완벽하게 조화됩니다.");
        COMPAT_DESC.put("A+AB", "지적인 대화가 잘 통하며 차분하고 안정적인 관계입니다.");
        COMPAT_DESC.put("B+B", "자유로운 영혼끼리의 즐거운 만남! 양보가 필요합니다.");
        COMPAT_DESC.put("B+O", "활기차고 역동적인 커플. 함께 있으면 언제나 즐겁습니다.");
        COMPAT_DESC.put("B+AB", "환상의 궁합! 이성과 감성이 절묘하게 보완됩니다.");
        COMPAT_DESC.put("O+O", "열정적이지만 주도권 다툼에 주의. 양보가 미덕입니다.");
        COMPAT_DESC.put("O+AB", "서로의 템포를 존중하면 좋은 관계가 됩니다.");
        COMPAT_DESC.put("AB+AB", "말 안 해도 통하는 영혼의 동반자. 표현 노력이 필요합니다.");
    }

    /**
     * 오늘의 혈액형 운세 (DB 캐싱 + AI 생성)
     */
    @Transactional
    public Map<String, Object> getTodayFortune(String bloodType, String zodiacAnimal) {
        if (zodiacAnimal == null || zodiacAnimal.isBlank()) zodiacAnimal = "용";
        LocalDate today = LocalDate.now();

        // 1. DB 캐시 확인
        Optional<BloodTypeFortune> cached = repository.findByBloodTypeAndZodiacAnimalAndFortuneDate(bloodType, zodiacAnimal, today);
        if (cached.isPresent()) {
            return toMap(cached.get());
        }

        // 2. AI 생성 시도
        BloodTypeFortune fortune = generateWithAI(bloodType, zodiacAnimal, today);
        if (fortune == null) {
            fortune = generateFallback(bloodType, zodiacAnimal, today);
        }

        // 3. DB 저장
        repository.save(fortune);
        return toMap(fortune);
    }

    /**
     * 간단 조회 (띠 정보 없이 - 기본 띠 사용)
     */
    @Transactional
    public Map<String, Object> getTodayFortune(String bloodType) {
        return getTodayFortune(bloodType, "용");
    }

    @Transactional
    public List<Map<String, Object>> getAllTodayFortunes() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (String bt : BLOOD_TYPES) list.add(getTodayFortune(bt));
        return list;
    }

    /**
     * AI로 점신급 운세 생성
     */
    private BloodTypeFortune generateWithAI(String bloodType, String zodiac, LocalDate date) {
        if (!claudeApiService.isAvailable()) return null;
        try {
            String system = promptBuilder.bloodTypeSystemPrompt();
            String user = promptBuilder.bloodTypeUserPrompt(bloodType, zodiac, date);
            String response = claudeApiService.generate(system, user, 2000);
            String json = ClaudeApiService.extractJson(response);
            if (json == null) {
                log.warn("Failed to extract JSON from Claude response for {}형/{}띠", bloodType, zodiac);
                return null;
            }

            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);

            return BloodTypeFortune.builder()
                .bloodType(bloodType)
                .zodiacAnimal(zodiac)
                .fortuneDate(date)
                .overall(node.path("overall").asText(""))
                .love(node.path("love").asText(""))
                .money(node.path("money").asText(""))
                .health(node.path("health").asText(""))
                .work(node.path("work").asText(""))
                .score(node.path("score").asInt(70))
                .luckyNumber(node.path("luckyNumber").asInt(7))
                .luckyColor(node.path("luckyColor").asText("파랑"))
                .personality(PERSONALITY.getOrDefault(bloodType, ""))
                .dayAnalysis(node.path("dayAnalysis").asText(""))
                .build();
        } catch (Exception e) {
            log.warn("AI blood type fortune generation failed for {}형/{}띠: {}", bloodType, zodiac, e.getMessage());
            return null;
        }
    }

    /**
     * 폴백 (템플릿 기반)
     */
    private BloodTypeFortune generateFallback(String bloodType, String zodiac, LocalDate date) {
        long seed = bloodType.hashCode() + zodiac.hashCode() + date.hashCode();
        Random r = new Random(seed);
        return BloodTypeFortune.builder()
            .bloodType(bloodType).zodiacAnimal(zodiac).fortuneDate(date)
            .overall(pick(r, FB_OVERALL, bloodType)).love(pick(r, FB_LOVE, bloodType))
            .money(pick(r, FB_MONEY, bloodType)).health(pick(r, FB_HEALTH, bloodType))
            .work(pick(r, FB_WORK, bloodType))
            .score(r.nextInt(41) + 55).luckyNumber(r.nextInt(99) + 1)
            .luckyColor(LUCKY_COLORS[r.nextInt(LUCKY_COLORS.length)])
            .personality(PERSONALITY.getOrDefault(bloodType, ""))
            .dayAnalysis("").build();
    }

    private String pick(Random r, Map<String, String[]> map, String key) {
        String[] arr = map.getOrDefault(key, map.get("A"));
        return arr[r.nextInt(arr.length)];
    }

    /**
     * 혈액형 궁합 — 기본(점수/등급/성격)만, AI 없음 (스트리밍 플로우용)
     */
    public Map<String, Object> getCompatibilityBasic(String type1, String type2) {
        int idx2 = Arrays.asList(BLOOD_TYPES).indexOf(type2);
        int score = COMPAT_SCORE.getOrDefault(type1, new int[]{70,70,70,70})[Math.max(idx2, 0)];
        String grade;
        if (score >= 85) grade = "천생연분 💕";
        else if (score >= 75) grade = "좋은 궁합 💛";
        else if (score >= 65) grade = "보통 궁합 💚";
        else grade = "노력 필요 💪";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type1", type1); result.put("type2", type2);
        result.put("score", score); result.put("grade", grade);
        result.put("personality1", PERSONALITY.getOrDefault(type1, ""));
        result.put("personality2", PERSONALITY.getOrDefault(type2, ""));
        return result;
    }

    /**
     * 혈액형 궁합 AI 스트리밍
     */
    public SseEmitter streamCompatibility(String type1, String type2) {
        String system = "카페에서 친한 친구한테 수다 떨듯이 자연스러운 대화체 반말로 혈액형 궁합을 상담해주는 전문가야. " +
            "오행과 혈액형 기질을 융합해서 분석하되, 딱딱한 보고서 톤이나 고전적 표현은 절대 금지. " +
            "반드시 아래 형식의 JSON만 출력해 (마크다운 코드블록 금지, 설명 금지): " +
            "{\"summary\":\"한 줄 요약 (30자 이내)\",\"overall\":\"종합 분석 (4~5문장)\",\"loveCompat\":\"연애 궁합 (3~4문장)\",\"advice\":\"관계 조언 (3문장)\",\"caution\":\"주의할 점 (2~3문장)\"}";
        String user = promptBuilder.compatibilityPrompt("bloodtype", type1, type2, LocalDate.now()) +
            "\n\n위 내용을 정확히 다음 JSON 형식으로만 답해: " +
            "{\"summary\":\"...\",\"overall\":\"...\",\"loveCompat\":\"...\",\"advice\":\"...\",\"caution\":\"...\"}";
        return claudeApiService.generateStream(system, user, 1200);
    }

    /**
     * 궁합
     */
    public Map<String, Object> getCompatibility(String type1, String type2) {
        String key1 = type1 + "+" + type2;
        String key2 = type2 + "+" + type1;
        int idx2 = Arrays.asList(BLOOD_TYPES).indexOf(type2);
        int score = COMPAT_SCORE.getOrDefault(type1, new int[]{70,70,70,70})[Math.max(idx2, 0)];
        String desc = COMPAT_DESC.getOrDefault(key1, COMPAT_DESC.getOrDefault(key2, "서로를 이해하고 존중하면 좋은 관계를 만들 수 있습니다."));

        // AI 궁합 분석
        if (claudeApiService.isAvailable()) {
            try {
                String prompt = promptBuilder.compatibilityPrompt("bloodtype", type1, type2, LocalDate.now());
                String aiDesc = claudeApiService.generate(FortunePromptBuilder.COMMON_TONE_RULES + "\n카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 혈액형 궁합 전문가야! 오행과 혈액형 기질을 융합해서 쉽게 풀어줘.", prompt, 400);
                if (aiDesc != null && !aiDesc.isBlank()) desc = aiDesc;
            } catch (Exception e) { log.warn("AI compat failed: {}", e.getMessage()); }
        }

        String grade;
        if (score >= 85) grade = "천생연분 💕";
        else if (score >= 75) grade = "좋은 궁합 💛";
        else if (score >= 65) grade = "보통 궁합 💚";
        else grade = "노력 필요 💪";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type1", type1); result.put("type2", type2);
        result.put("score", score); result.put("grade", grade); result.put("description", desc);
        result.put("personality1", PERSONALITY.getOrDefault(type1, ""));
        result.put("personality2", PERSONALITY.getOrDefault(type2, ""));
        return result;
    }

    private Map<String, Object> toMap(BloodTypeFortune f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bloodType", f.getBloodType()); m.put("zodiacAnimal", f.getZodiacAnimal());
        m.put("date", f.getFortuneDate().toString());
        m.put("personality", f.getPersonality()); m.put("dayAnalysis", f.getDayAnalysis());
        m.put("overall", f.getOverall()); m.put("love", f.getLove());
        m.put("money", f.getMoney()); m.put("health", f.getHealth()); m.put("work", f.getWork());
        m.put("score", f.getScore()); m.put("luckyNumber", f.getLuckyNumber()); m.put("luckyColor", f.getLuckyColor());
        return m;
    }

    /**
     * 캐시된 혈액형 운세 조회 (캐시 없으면 null 반환)
     */
    public Map<String, Object> getCachedFortune(String bloodType, String zodiacAnimal) {
        LocalDate today = LocalDate.now();
        Optional<BloodTypeFortune> cached = repository.findByBloodTypeAndZodiacAnimalAndFortuneDate(bloodType, zodiacAnimal, today);
        return cached.map(this::toMap).orElse(null);
    }

    /**
     * 혈액형 운세 스트리밍 (캐시 없을 때 호출, 완료 후 서버에서 DB 저장)
     */
    public SseEmitter streamFortune(String bloodType, String zodiacAnimal, String birthDate, String gender, String targetType, String targetName, Runnable onSuccess) {
        return doStreamFortune(bloodType, zodiacAnimal, birthDate, gender, targetType, targetName, onSuccess);
    }

    public SseEmitter streamFortune(String bloodType, String zodiacAnimal, Runnable onSuccess) {
        return doStreamFortune(bloodType, zodiacAnimal, null, null, null, null, onSuccess);
    }

    public SseEmitter streamFortune(String bloodType, String zodiacAnimal) {
        return doStreamFortune(bloodType, zodiacAnimal, null, null, null, null, null);
    }

    private SseEmitter doStreamFortune(String bloodType, String zodiacAnimal, String birthDate, String gender, String targetType, String targetName, Runnable onSuccess) {
        LocalDate today = LocalDate.now();
        String system = promptBuilder.bloodTypeSystemPrompt() + "\n" + FortunePromptBuilder.TARGET_AWARE_RULES;
        String user = promptBuilder.bloodTypeUserPrompt(bloodType, zodiacAnimal, today)
            + promptBuilder.buildPersonContext(birthDate, gender)
            + promptBuilder.buildTargetContext(targetType, targetName);

        return claudeApiService.generateStream(system, user, 2000, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json == null) return;
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);

                BloodTypeFortune fortune = BloodTypeFortune.builder()
                    .bloodType(bloodType)
                    .zodiacAnimal(zodiacAnimal)
                    .fortuneDate(today)
                    .overall(node.path("overall").asText(""))
                    .love(node.path("love").asText(""))
                    .money(node.path("money").asText(""))
                    .health(node.path("health").asText(""))
                    .work(node.path("work").asText(""))
                    .score(node.path("score").asInt(70))
                    .luckyNumber(node.path("luckyNumber").asInt(7))
                    .luckyColor(node.path("luckyColor").asText("파랑"))
                    .personality(PERSONALITY.getOrDefault(bloodType, ""))
                    .dayAnalysis(node.path("dayAnalysis").asText(""))
                    .build();
                repository.save(fortune);
            } catch (Exception e) {
                log.warn("bloodtype stream cache save failed for {}형/{}: {}", bloodType, zodiacAnimal, e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
    }
}
