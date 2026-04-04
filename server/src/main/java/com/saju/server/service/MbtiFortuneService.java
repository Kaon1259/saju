package com.saju.server.service;

import com.saju.server.entity.MbtiFortune;
import com.saju.server.repository.MbtiFortuneRepository;
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
public class MbtiFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final MbtiFortuneRepository repository;

    private static final String[] ALL_TYPES = {
        "INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP",
        "ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"
    };

    private static final Map<String, String> PERSONALITY = new LinkedHashMap<>();
    static {
        PERSONALITY.put("INTJ", "전략가 — 독창적이고 전략적인 사고가 뛰어난 완벽주의자. 큰 그림을 보는 능력이 탁월합니다.");
        PERSONALITY.put("INTP", "논리술사 — 끝없는 호기심의 소유자. 복잡한 이론과 시스템을 분석하는 것을 즐깁니다.");
        PERSONALITY.put("ENTJ", "통솔자 — 타고난 리더십의 소유자. 카리스마와 결단력으로 목표를 향해 돌진합니다.");
        PERSONALITY.put("ENTP", "변론가 — 재치 있고 창의적인 토론의 달인. 새로운 아이디어 탐구를 즐깁니다.");
        PERSONALITY.put("INFJ", "옹호자 — 이상주의적이고 통찰력 있는 조언자. 깊은 공감 능력을 가졌습니다.");
        PERSONALITY.put("INFP", "중재자 — 감성적이고 창의적인 몽상가. 풍부한 내면 세계와 공감 능력의 소유자.");
        PERSONALITY.put("ENFJ", "선도자 — 따뜻한 카리스마를 가진 영향력자. 다른 사람의 잠재력을 알아보고 성장을 돕습니다.");
        PERSONALITY.put("ENFP", "활동가 — 열정 넘치는 자유로운 영혼. 새로운 가능성 발견과 깊은 교감을 중요시합니다.");
        PERSONALITY.put("ISTJ", "현실주의자 — 책임감 있고 신뢰할 수 있는 사람. 체계적이고 꼼꼼하며 약속을 중시합니다.");
        PERSONALITY.put("ISFJ", "수호자 — 따뜻하고 헌신적인 보호자. 사랑하는 사람들을 위해 묵묵히 헌신합니다.");
        PERSONALITY.put("ESTJ", "경영자 — 질서와 효율을 추구하는 조직의 기둥. 리더십이 강하고 실용적입니다.");
        PERSONALITY.put("ESFJ", "집정관 — 사교적이고 배려심 깊은 화합의 중심. 조화로운 관계를 만드는 데 탁월합니다.");
        PERSONALITY.put("ISTP", "장인 — 논리적이면서도 실용적인 문제해결사. 위기 상황에서 침착하게 대처합니다.");
        PERSONALITY.put("ISFP", "모험가 — 온화하고 감성적인 예술가. 아름다움을 추구하고 현재 순간을 즐깁니다.");
        PERSONALITY.put("ESTP", "사업가 — 행동파이자 스릴을 즐기는 모험가. 빠른 판단력과 적응력이 뛰어납니다.");
        PERSONALITY.put("ESFP", "연예인 — 에너지 넘치는 무대의 주인공. 주변을 즐겁게 만드는 재능이 있습니다.");
    }

    // 궁합 매트릭스
    private static final Map<String, Map<String, Integer>> COMPAT = new LinkedHashMap<>();
    static {
        int[][] scores = {
            {75,80,85,90,78,72,80,88,70,65,75,68,72,65,70,62},
            {80,75,82,88,72,78,75,85,68,62,70,65,78,70,75,68},
            {85,82,78,85,80,70,82,80,78,68,80,72,70,62,72,65},
            {90,88,85,78,82,80,80,82,65,60,68,65,75,72,80,78},
            {78,72,80,82,75,80,88,92,68,72,65,70,65,72,62,68},
            {72,78,70,80,80,75,85,90,62,68,60,65,68,75,65,72},
            {80,75,82,80,88,85,78,85,72,78,75,80,68,75,72,78},
            {88,85,80,82,92,90,85,78,65,68,62,68,70,78,75,80},
            {70,68,78,65,68,62,72,65,78,80,85,82,75,72,70,68},
            {65,62,68,60,72,68,78,68,80,78,82,88,70,78,68,75},
            {75,70,80,68,65,60,75,62,85,82,78,85,72,68,78,72},
            {68,65,72,65,70,65,80,68,82,88,85,78,68,75,72,80},
            {72,78,70,75,65,68,68,70,75,70,72,68,78,80,88,85},
            {65,70,62,72,72,75,75,78,72,78,68,75,80,78,85,90},
            {70,75,72,80,62,65,72,75,70,68,78,72,88,85,78,82},
            {62,68,65,78,68,72,78,80,68,75,72,80,85,90,82,78},
        };
        for (int i = 0; i < ALL_TYPES.length; i++) {
            Map<String, Integer> inner = new LinkedHashMap<>();
            for (int j = 0; j < ALL_TYPES.length; j++) inner.put(ALL_TYPES[j], scores[i][j]);
            COMPAT.put(ALL_TYPES[i], inner);
        }
    }

    // 폴백 템플릿 (기질 그룹별)
    private static final Map<String, String[]> FB_O = new LinkedHashMap<>();
    private static final Map<String, String[]> FB_L = new LinkedHashMap<>();
    private static final Map<String, String[]> FB_W = new LinkedHashMap<>();
    static {
        for (String t : new String[]{"INTJ","INTP","ENTJ","ENTP"}) {
            FB_O.put(t, new String[]{"분석적 사고가 빛나는 날. 복잡한 문제도 명쾌하게 해결할 수 있습니다.", "새로운 아이디어가 샘솟는 하루! 지적 호기심을 따라가세요.", "전략적으로 움직이면 최상의 결과를 얻는 날입니다."});
            FB_L.put(t, new String[]{"지적인 대화가 사랑을 키웁니다.", "감정 표현에 솔직해지면 관계가 깊어집니다.", "상대의 감성을 이해하려 노력하세요."});
            FB_W.put(t, new String[]{"논리적 분석이 필요한 업무에서 성과를 냅니다.", "혁신적 아이디어 제안이 인정받습니다.", "전략적 기획에서 능력을 발휘하세요."});
        }
        for (String t : new String[]{"INFJ","INFP","ENFJ","ENFP"}) {
            FB_O.put(t, new String[]{"공감 능력이 빛나는 하루입니다.", "창의적 영감이 넘치는 날!", "내면의 목소리에 귀 기울이면 깨달음을 얻습니다."});
            FB_L.put(t, new String[]{"깊은 감정적 교감이 이루어지는 날.", "로맨틱한 제스처가 빛나는 하루.", "이상적 관계를 꿈꾸되 현실도 소중히 여기세요."});
            FB_W.put(t, new String[]{"팀 분위기를 밝게 만드는 능력이 빛납니다.", "창의적 프로젝트에서 영감을 발휘하세요.", "멘토링에서 빛나는 능력!"});
        }
        for (String t : new String[]{"ISTJ","ISFJ","ESTJ","ESFJ"}) {
            FB_O.put(t, new String[]{"성실함이 결실을 맺는 날.", "안정적이고 평화로운 하루.", "주변을 돌보는 따뜻한 마음이 감동을 줍니다."});
            FB_L.put(t, new String[]{"안정적인 사랑이 빛나는 날.", "믿음직한 모습이 안심을 줍니다.", "가족이나 오랜 친구와의 시간이 소중합니다."});
            FB_W.put(t, new String[]{"체계적인 업무 처리가 돋보입니다.", "팀의 든든한 버팀목 역할을 합니다.", "규칙 준수가 신뢰를 쌓습니다."});
        }
        for (String t : new String[]{"ISTP","ISFP","ESTP","ESFP"}) {
            FB_O.put(t, new String[]{"행동력이 빛나는 날!", "모험을 즐기면 행운을 만납니다.", "오감이 예민해지는 하루. 아름다운 것들을 즐기세요."});
            FB_L.put(t, new String[]{"즉흥적 데이트가 최고의 추억을 만듭니다!", "행동으로 사랑을 보여주세요.", "자유롭고 편안한 관계가 빛나는 하루."});
            FB_W.put(t, new String[]{"위기 대응 능력이 빛나는 날!", "실무적 능력이 극대화됩니다.", "현장에서의 빠른 판단력이 성과를 만듭니다."});
        }
    }

    /**
     * MBTI 오늘의 운세 (DB 캐싱 + AI)
     */
    @Transactional
    public Map<String, Object> getTodayFortune(String mbtiType, String zodiacAnimal) {
        String type = mbtiType.toUpperCase();
        if (zodiacAnimal == null || zodiacAnimal.isBlank()) zodiacAnimal = "용";
        LocalDate today = LocalDate.now();

        Optional<MbtiFortune> cached = repository.findByMbtiTypeAndZodiacAnimalAndFortuneDate(type, zodiacAnimal, today);
        if (cached.isPresent()) return toMap(cached.get());

        MbtiFortune fortune = generateWithAI(type, zodiacAnimal, today);
        if (fortune == null) fortune = generateFallback(type, zodiacAnimal, today);

        repository.save(fortune);
        return toMap(fortune);
    }

    @Transactional
    public Map<String, Object> getTodayFortune(String mbtiType) {
        return getTodayFortune(mbtiType, "용");
    }

    private MbtiFortune generateWithAI(String type, String zodiac, LocalDate date) {
        if (!claudeApiService.isAvailable()) {
            log.warn("MBTI AI skipped: Claude API not available");
            return null;
        }
        try {
            String system = promptBuilder.mbtiSystemPrompt();
            String user = promptBuilder.mbtiUserPrompt(type, zodiac, date);
            log.info("MBTI AI call for {}/{}", type, zodiac);
            String response = claudeApiService.generate(system, user, 2500);
            log.info("MBTI AI response length: {}", response != null ? response.length() : 0);
            String json = ClaudeApiService.extractJson(response);
            if (json == null) {
                log.warn("MBTI AI: extractJson returned null. Raw response: {}", response != null ? response.substring(0, Math.min(200, response.length())) : "null");
                return null;
            }

            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);

            return MbtiFortune.builder()
                .mbtiType(type).zodiacAnimal(zodiac).fortuneDate(date)
                .overall(node.path("overall").asText(""))
                .love(node.path("love").asText(""))
                .money(node.path("money").asText(""))
                .health(node.path("health").asText(""))
                .work(node.path("work").asText(""))
                .tip(node.path("tip").asText(""))
                .score(node.path("score").asInt(70))
                .luckyNumber(node.path("luckyNumber").asInt(7))
                .luckyColor(node.path("luckyColor").asText("파랑"))
                .personality(PERSONALITY.getOrDefault(type, ""))
                .build();
        } catch (Exception e) {
            log.warn("AI MBTI fortune failed for {}/{}: {}", type, zodiac, e.getMessage());
            return null;
        }
    }

    private MbtiFortune generateFallback(String type, String zodiac, LocalDate date) {
        long seed = type.hashCode() + zodiac.hashCode() + date.hashCode();
        Random r = new Random(seed);
        String[] colors = {"빨강","파랑","노랑","초록","보라","분홍","주황","금색","하늘색","민트"};
        return MbtiFortune.builder()
            .mbtiType(type).zodiacAnimal(zodiac).fortuneDate(date)
            .overall(FB_O.getOrDefault(type, FB_O.get("INTJ"))[r.nextInt(3)])
            .love(FB_L.getOrDefault(type, FB_L.get("INTJ"))[r.nextInt(3)])
            .money("재물 운이 안정적인 흐름을 보이는 하루입니다. 계획에 없던 충동 소비를 주의하세요.")
            .health("전반적인 컨디션은 양호합니다. 충분한 수분 섭취와 스트레칭으로 활력을 유지하세요.")
            .work(FB_W.getOrDefault(type, FB_W.get("INTJ"))[r.nextInt(3)])
            .tip("오늘 하루도 당신답게 빛나세요!")
            .score(r.nextInt(41) + 55).luckyNumber(r.nextInt(99) + 1)
            .luckyColor(colors[r.nextInt(colors.length)])
            .personality(PERSONALITY.getOrDefault(type, ""))
            .build();
    }

    /**
     * MBTI 궁합
     */
    public Map<String, Object> getCompatibility(String t1, String t2) {
        final String type1 = (t1 != null ? t1 : "INTJ").toUpperCase();
        final String type2 = (t2 != null ? t2 : "ENFP").toUpperCase();
        int score = COMPAT.containsKey(type1) && COMPAT.get(type1).containsKey(type2) ? COMPAT.get(type1).get(type2) : 70;

        String grade, advice;
        if (score >= 88) { grade = "천생연분 💕"; advice = "서로를 자연스럽게 이해하고 보완하는 환상의 조합입니다!"; }
        else if (score >= 78) { grade = "좋은 궁합 💛"; advice = "서로의 장점을 살리면 멋진 관계를 만들 수 있습니다."; }
        else if (score >= 68) { grade = "보통 궁합 💚"; advice = "서로 다른 점을 배움의 기회로 삼으면 성장합니다."; }
        else { grade = "노력 필요 💪"; advice = "차이가 있지만 서로 존중하면 가장 강한 관계가 됩니다."; }

        if (claudeApiService.isAvailable()) {
            try {
                String prompt = promptBuilder.compatibilityPrompt("mbti", type1, type2, LocalDate.now());
                String aiAdvice = claudeApiService.generate("카페에서 친한 친구한테 수다 떨듯이 자연스럽게 상담하는 MBTI 궁합 전문가야! 오행과 인지기능을 융합해서 자연스러운 대화체 반말로 분석해줘. 딱딱한 보고서 톤이나 고전적 표현은 절대 금지!", prompt, 400);
                if (aiAdvice != null && !aiAdvice.isBlank()) advice = aiAdvice;
            } catch (Exception e) { log.warn("AI MBTI compat failed: {}", e.getMessage()); }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type1", type1); result.put("type2", type2);
        result.put("score", score); result.put("grade", grade); result.put("advice", advice);
        result.put("personality1", PERSONALITY.getOrDefault(type1, ""));
        result.put("personality2", PERSONALITY.getOrDefault(type2, ""));
        if (COMPAT.containsKey(type1)) {
            result.put("bestMatch", COMPAT.get(type1).entrySet().stream()
                .filter(e -> !e.getKey().equals(type1)).max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse(""));
        }
        return result;
    }

    /**
     * 전체 유형 목록 + 오늘 점수
     */
    public List<Map<String, Object>> getAllTypes() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> list = new ArrayList<>();
        for (String type : ALL_TYPES) {
            long seed = type.hashCode() + today.hashCode();
            Random r = new Random(seed);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", type);
            item.put("personality", PERSONALITY.get(type));
            item.put("score", r.nextInt(41) + 55);
            list.add(item);
        }
        return list;
    }

    private Map<String, Object> toMap(MbtiFortune f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mbtiType", f.getMbtiType()); m.put("zodiacAnimal", f.getZodiacAnimal());
        m.put("date", f.getFortuneDate().toString());
        m.put("personality", f.getPersonality());
        m.put("overall", f.getOverall()); m.put("love", f.getLove());
        m.put("money", f.getMoney()); m.put("health", f.getHealth());
        m.put("work", f.getWork()); m.put("tip", f.getTip());
        m.put("score", f.getScore()); m.put("luckyNumber", f.getLuckyNumber()); m.put("luckyColor", f.getLuckyColor());
        return m;
    }

    /**
     * 캐시된 MBTI 운세 조회 (캐시 없으면 null 반환)
     */
    public Map<String, Object> getCachedFortune(String mbtiType, String zodiacAnimal) {
        LocalDate today = LocalDate.now();
        Optional<MbtiFortune> cached = repository.findByMbtiTypeAndZodiacAnimalAndFortuneDate(mbtiType, zodiacAnimal, today);
        return cached.map(this::toMap).orElse(null);
    }

    /**
     * MBTI 운세 스트리밍 (캐시 없을 때 호출, 완료 후 서버에서 DB 저장)
     */
    public SseEmitter streamFortune(String mbtiType, String zodiacAnimal) {
        LocalDate today = LocalDate.now();
        String system = promptBuilder.mbtiSystemPrompt();
        String user = promptBuilder.mbtiUserPrompt(mbtiType, zodiacAnimal, today);

        return claudeApiService.generateStream(system, user, 2500, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json == null) return;
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);

                MbtiFortune fortune = MbtiFortune.builder()
                    .mbtiType(mbtiType)
                    .zodiacAnimal(zodiacAnimal)
                    .fortuneDate(today)
                    .overall(node.path("overall").asText(""))
                    .love(node.path("love").asText(""))
                    .money(node.path("money").asText(""))
                    .health(node.path("health").asText(""))
                    .work(node.path("work").asText(""))
                    .tip(node.path("tip").asText(""))
                    .score(node.path("score").asInt(70))
                    .luckyNumber(node.path("luckyNumber").asInt(7))
                    .luckyColor(node.path("luckyColor").asText("파랑"))
                    .personality(PERSONALITY.getOrDefault(mbtiType, ""))
                    .build();
                repository.save(fortune);
            } catch (Exception e) {
                log.warn("mbti stream cache save failed for {}/{}: {}", mbtiType, zodiacAnimal, e.getMessage());
            }
        });
    }
}
