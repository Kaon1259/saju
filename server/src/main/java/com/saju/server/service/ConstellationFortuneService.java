package com.saju.server.service;

import com.saju.server.entity.ConstellationFortune;
import com.saju.server.repository.ConstellationFortuneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConstellationFortuneService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final ConstellationFortuneRepository repository;

    private static final String[][] SIGNS = {
        {"물병자리", "1-20", "2-18", "공기", "♒"},
        {"물고기자리", "2-19", "3-20", "물", "♓"},
        {"양자리", "3-21", "4-19", "불", "♈"},
        {"황소자리", "4-20", "5-20", "흙", "♉"},
        {"쌍둥이자리", "5-21", "6-21", "공기", "♊"},
        {"게자리", "6-22", "7-22", "물", "♋"},
        {"사자자리", "7-23", "8-22", "불", "♌"},
        {"처녀자리", "8-23", "9-22", "흙", "♍"},
        {"천칭자리", "9-23", "10-22", "공기", "♎"},
        {"전갈자리", "10-23", "11-21", "물", "♏"},
        {"사수자리", "11-22", "12-21", "불", "♐"},
        {"염소자리", "12-22", "1-19", "흙", "♑"},
    };

    private static final Map<String, String> PERSONALITY = new LinkedHashMap<>();
    static {
        PERSONALITY.put("물병자리", "독립적이고 진보적인 사고의 소유자. 인도주의적이며 독창적인 아이디어로 세상을 변화시키려 합니다. 자유를 사랑하고 틀에 박힌 것을 싫어합니다.");
        PERSONALITY.put("물고기자리", "풍부한 감수성과 직관력의 소유자. 예술적 재능이 뛰어나고 공감 능력이 탁월합니다. 꿈과 현실 사이를 오가며 깊은 내면 세계를 가지고 있습니다.");
        PERSONALITY.put("양자리", "열정적이고 용감한 개척자. 새로운 시작을 두려워하지 않으며 강한 리더십과 추진력을 가지고 있습니다. 솔직하고 에너지가 넘칩니다.");
        PERSONALITY.put("황소자리", "안정적이고 실용적인 현실주의자. 인내심이 강하고 한번 마음먹으면 끝까지 해내는 끈기가 있습니다. 아름다움과 편안함을 추구합니다.");
        PERSONALITY.put("쌍둥이자리", "재치 있고 다재다능한 소통의 달인. 호기심이 왕성하고 새로운 정보를 빠르게 흡수합니다. 유머 감각이 뛰어나고 적응력이 좋습니다.");
        PERSONALITY.put("게자리", "따뜻하고 보호본능이 강한 돌봄의 아이콘. 가족과 가까운 사람을 위해 헌신적이며 감정이 풍부합니다. 직감이 예리하고 기억력이 좋습니다.");
        PERSONALITY.put("사자자리", "자신감 넘치고 관대한 타고난 왕. 카리스마가 있고 주목받는 것을 즐깁니다. 창의적이고 열정적이며 충성스러운 면이 있습니다.");
        PERSONALITY.put("처녀자리", "분석적이고 완벽을 추구하는 실무가. 세심하고 체계적이며 실질적인 도움을 주는 것을 좋아합니다. 겸손하지만 내면의 기준이 높습니다.");
        PERSONALITY.put("천칭자리", "조화와 균형을 추구하는 아름다움의 수호자. 공정하고 외교적이며 관계를 소중히 여깁니다. 우아한 취향과 뛰어난 심미안을 가지고 있습니다.");
        PERSONALITY.put("전갈자리", "강렬하고 깊이 있는 통찰력의 소유자. 한번 빠지면 끝까지 파고드는 집중력과 변화를 두려워하지 않는 용기가 있습니다. 비밀을 잘 지킵니다.");
        PERSONALITY.put("사수자리", "자유를 사랑하는 낙천적인 탐험가. 철학적 사고와 모험 정신이 풍부하며 솔직하고 유머러스합니다. 넓은 시야로 세상을 바라봅니다.");
        PERSONALITY.put("염소자리", "야망 있고 책임감 강한 성취가. 꾸준한 노력으로 목표를 달성하며 현실적이고 신뢰할 수 있습니다. 시간이 갈수록 빛나는 타입입니다.");
    }

    // 폴백 템플릿
    private static final String[][] FB = {
        {"새로운 아이디어가 빛나는 날입니다. 독창적인 발상이 주변을 놀라게 합니다.", "지적 호기심을 따라가면 뜻밖의 기회를 만납니다.", "사회적 활동에서 좋은 인연이 찾아옵니다."},
        {"직감이 예리해지는 하루. 느낌을 믿으세요.", "예술적 감성이 극대화됩니다. 창작 활동에 좋은 날.", "공감 능력이 빛나며 주변 사람들에게 위로가 됩니다."},
        {"열정과 추진력이 넘치는 날! 새로운 시작에 최적.", "리더십을 발휘할 기회가 옵니다. 당당하게 나서세요.", "도전적인 목표를 세우면 반드시 달성할 수 있습니다."},
        {"안정적인 에너지가 감싸는 하루. 꾸준함이 보상받습니다.", "미적 감각이 빛나는 날. 쇼핑이나 인테리어에 좋습니다.", "재정적으로 좋은 소식이 있을 수 있습니다."},
        {"소통 능력이 극대화! 중요한 대화나 협상에 좋은 날.", "새로운 정보를 접하면 큰 영감을 얻습니다.", "유머로 분위기를 밝히면 인기가 올라갑니다."},
        {"가족이나 가까운 사람과의 시간이 행복을 줍니다.", "직감을 따르면 좋은 결정을 내릴 수 있습니다.", "따뜻한 배려가 큰 감동으로 돌아옵니다."},
        {"자신감이 넘치고 매력이 빛나는 하루!", "창의적 에너지가 폭발합니다. 표현하세요!", "주목받는 자리에서 빛날 기회가 찾아옵니다."},
        {"꼼꼼한 분석력이 성과로 이어지는 날.", "건강 관리에 신경 쓰면 컨디션이 좋아집니다.", "체계적인 계획이 큰 성과를 만듭니다."},
        {"관계에서 조화를 이루는 아름다운 하루.", "미적 감각이 빛나며 중요한 선택에서 좋은 안목을 발휘합니다.", "파트너십이 빛나는 날. 함께하면 시너지가 납니다."},
        {"깊은 통찰력으로 핵심을 꿰뚫는 날입니다.", "변화를 받아들이면 한 단계 성장할 수 있습니다.", "비밀스러운 매력이 상대를 끌어당깁니다."},
        {"모험심이 발동하는 날! 새로운 경험이 행운을 부릅니다.", "낙관적인 태도가 주변에 긍정 에너지를 전파합니다.", "배움의 기회가 찾아옵니다. 열린 마음으로 받아들이세요."},
        {"목표를 향한 집중력이 극대화되는 하루.", "책임감 있는 모습이 주변의 신뢰를 얻습니다.", "꾸준한 노력이 드디어 결실을 맺습니다."},
    };

    public String getSignFromDate(LocalDate date) {
        int m = date.getMonthValue(), d = date.getDayOfMonth();
        int md = m * 100 + d;
        if (md >= 120 && md <= 218) return "물병자리";
        if (md >= 219 && md <= 320) return "물고기자리";
        if (md >= 321 && md <= 419) return "양자리";
        if (md >= 420 && md <= 520) return "황소자리";
        if (md >= 521 && md <= 621) return "쌍둥이자리";
        if (md >= 622 && md <= 722) return "게자리";
        if (md >= 723 && md <= 822) return "사자자리";
        if (md >= 823 && md <= 922) return "처녀자리";
        if (md >= 923 && md <= 1022) return "천칭자리";
        if (md >= 1023 && md <= 1121) return "전갈자리";
        if (md >= 1122 && md <= 1221) return "사수자리";
        return "염소자리";
    }

    @Transactional
    public Map<String, Object> getTodayFortune(String sign) {
        LocalDate today = LocalDate.now();
        int idx = getSignIndex(sign);

        // 1. DB 캐시 확인
        Optional<ConstellationFortune> cached = repository.findBySignAndFortuneDate(sign, today);
        if (cached.isPresent()) {
            return toMap(cached.get(), idx);
        }

        // 2. AI 생성 시도
        ConstellationFortune fortune = generateWithAI(sign, idx, today);
        if (fortune == null) {
            fortune = generateFallback(sign, idx, today);
        }

        // 3. DB 저장
        repository.save(fortune);
        return toMap(fortune, idx);
    }

    private ConstellationFortune generateWithAI(String sign, int idx, LocalDate date) {
        if (!claudeApiService.isAvailable()) return null;
        try {
            String todayCtx = promptBuilder.buildTodayContext(date);
            String prompt = todayCtx + "\n【의뢰인】" + sign + " (" + SIGNS[idx][3] + " 원소)\n" +
                "성격: " + PERSONALITY.get(sign) + "\n\n" +
                "위 천기와 별자리 특성을 종합하여 오늘의 운세를 작성하세요.\n" +
                "반드시 JSON만: {\"overall\":\"총운 3문장\",\"love\":\"애정운 2문장\",\"money\":\"재물운 2문장\",\"health\":\"건강운 2문장\",\"score\":점수(50-95),\"luckyNumber\":숫자,\"luckyColor\":\"색상\"}";
            String resp = claudeApiService.generate(
                "당신은 40년 경력의 점성술 대가 '천명 선생'입니다. 서양 별자리와 동양 역학을 융합합니다. 반드시 JSON만 응답.", prompt, 600);

            String json = ClaudeApiService.extractJson(resp);
            if (json == null) return null;

            var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
            long seed = sign.hashCode() + date.hashCode();
            Random r = new Random(seed);
            String[] colors = {"빨강","파랑","노랑","초록","보라","흰색","분홍","금색","하늘색","민트"};

            return ConstellationFortune.builder()
                .sign(sign)
                .fortuneDate(date)
                .overall(node.path("overall").asText(""))
                .love(node.path("love").asText(""))
                .money(node.path("money").asText(""))
                .health(node.path("health").asText(""))
                .score(node.path("score").asInt(70))
                .luckyNumber(node.path("luckyNumber").asInt(r.nextInt(99) + 1))
                .luckyColor(node.path("luckyColor").asText(colors[r.nextInt(colors.length)]))
                .build();
        } catch (Exception e) {
            log.warn("AI constellation fortune failed for {}: {}", sign, e.getMessage());
            return null;
        }
    }

    private ConstellationFortune generateFallback(String sign, int idx, LocalDate date) {
        long seed = sign.hashCode() + date.hashCode();
        Random r = new Random(seed);
        String[] colors = {"빨강","파랑","노랑","초록","보라","흰색","분홍","금색","하늘색","민트"};

        return ConstellationFortune.builder()
            .sign(sign)
            .fortuneDate(date)
            .overall(FB[idx][r.nextInt(3)])
            .love("사랑에 있어 " + (r.nextBoolean() ? "적극적인 표현이 통하는 날입니다." : "상대의 마음을 세심하게 읽어보세요."))
            .money(r.nextBoolean() ? "재정적으로 안정적인 흐름. 계획적 소비가 답입니다." : "뜻밖의 금전적 기회가 찾아올 수 있습니다.")
            .health(r.nextBoolean() ? "활력이 넘치는 날. 운동으로 에너지를 발산하세요." : "충분한 휴식이 필요한 날. 무리하지 마세요.")
            .score(r.nextInt(36) + 60)
            .luckyNumber(r.nextInt(99) + 1)
            .luckyColor(colors[r.nextInt(colors.length)])
            .build();
    }

    private Map<String, Object> toMap(ConstellationFortune f, int idx) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sign", f.getSign());
        result.put("symbol", SIGNS[idx][4]);
        result.put("element", SIGNS[idx][3]);
        result.put("dates", SIGNS[idx][1].replace("-","/") + "~" + SIGNS[idx][2].replace("-","/"));
        result.put("personality", PERSONALITY.getOrDefault(f.getSign(), ""));
        result.put("date", f.getFortuneDate().toString());
        result.put("overall", f.getOverall());
        result.put("love", f.getLove());
        result.put("money", f.getMoney());
        result.put("health", f.getHealth());
        result.put("score", f.getScore());
        result.put("luckyNumber", f.getLuckyNumber());
        result.put("luckyColor", f.getLuckyColor());
        return result;
    }

    public List<Map<String, Object>> getAllSigns() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < SIGNS.length; i++) {
            String[] s = SIGNS[i];
            long seed = s[0].hashCode() + today.hashCode();
            Random r = new Random(seed);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sign", s[0]);
            item.put("symbol", s[4]);
            item.put("element", s[3]);
            item.put("dates", s[1].replace("-","/") + "~" + s[2].replace("-","/"));
            item.put("score", r.nextInt(36) + 60);
            list.add(item);
        }
        return list;
    }

    private int getSignIndex(String sign) {
        for (int i = 0; i < SIGNS.length; i++) {
            if (SIGNS[i][0].equals(sign)) return i;
        }
        return 0;
    }
}
