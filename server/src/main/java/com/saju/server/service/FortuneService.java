package com.saju.server.service;

import com.saju.server.dto.FortuneResponse;
import com.saju.server.entity.DailyFortune;
import com.saju.server.repository.DailyFortuneRepository;
import com.saju.server.saju.SajuCalculator;
import com.saju.server.saju.SajuInterpreter;
import com.saju.server.saju.SajuPillar;
import com.saju.server.saju.SajuResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FortuneService {

    private final DailyFortuneRepository dailyFortuneRepository;

    private static final String[] ZODIAC_ANIMALS = {
            "쥐", "소", "호랑이", "토끼", "용", "뱀",
            "말", "양", "원숭이", "닭", "개", "돼지"
    };

    private static final String[] LUCKY_COLORS = {
            "빨강", "파랑", "노랑", "초록", "보라", "흰색",
            "검정", "분홍", "주황", "금색", "은색", "하늘색"
    };

    private static final String[] OVERALL_FORTUNES = {
            "오늘은 새로운 기회가 찾아오는 길일입니다. 평소 망설였던 일이 있다면 과감하게 도전해 보세요. 뜻밖의 좋은 결과가 기다리고 있습니다.",
            "주변 사람들의 도움으로 순조로운 하루가 될 것입니다. 감사한 마음을 표현하면 더 큰 행운이 돌아옵니다. 겸손한 자세가 복을 부릅니다.",
            "오늘은 차분하게 내면을 돌아보는 시간이 필요합니다. 급하게 서두르면 작은 실수가 생길 수 있으니 여유를 가지세요. 명상이나 산책이 도움이 됩니다.",
            "숨겨두었던 재능이 빛을 발하는 날입니다. 자신감을 가지고 적극적으로 나서면 주변의 인정을 받게 됩니다. 창의적인 아이디어가 빛납니다.",
            "예상치 못한 경사스러운 소식이 전해질 수 있습니다. 기쁜 마음으로 하루를 시작하면 모든 일이 잘 풀릴 것입니다. 밝은 에너지가 가득한 날입니다.",
            "오늘은 인내심이 필요한 하루입니다. 당장 결과가 보이지 않더라도 꾸준히 노력하면 반드시 좋은 열매를 맺게 됩니다. 포기하지 마세요.",
            "대인관계에서 좋은 인연을 만날 수 있는 날입니다. 열린 마음으로 사람들을 대하면 귀인이 나타날 것입니다. 첫인상에 신경 쓰면 좋겠습니다.",
            "작은 변화가 큰 행운을 가져오는 날입니다. 평소와 다른 길을 걸어보거나 새로운 시도를 해보세요. 변화를 두려워하지 않는 용기가 필요합니다.",
            "집중력이 높아지는 날이니 중요한 업무나 공부에 전념하기 좋습니다. 하루를 알차게 계획하면 큰 성과를 거둘 수 있습니다. 목표를 향해 달려가세요.",
            "오늘은 가족이나 가까운 사람들과 시간을 보내면 마음이 따뜻해지는 날입니다. 소중한 관계를 돌보는 것이 최고의 행운입니다. 따뜻한 말 한마디가 큰 힘이 됩니다.",
            "오랫동안 기다려왔던 일이 드디어 진전을 보이는 날입니다. 끈기 있게 해온 노력의 결실을 맛보게 될 것입니다. 자신을 칭찬해 주세요.",
            "직감이 예리해지는 날이니 중요한 결정은 마음의 소리를 따르세요. 논리보다 감각이 정확한 답을 알려줄 것입니다. 자신의 느낌을 믿으세요.",
            "나눔과 베풂이 더 큰 복으로 돌아오는 날입니다. 작은 친절이 뜻밖의 행운을 불러올 수 있습니다. 주변에 따뜻한 손길을 내밀어 보세요.",
            "새로운 배움의 기회가 찾아오는 날입니다. 호기심을 가지고 도전하면 놀라운 성장을 경험할 수 있습니다. 배움에는 나이가 없습니다."
    };

    private static final String[] LOVE_FORTUNES = {
            "사랑하는 사람과의 관계가 한층 깊어지는 날입니다. 진심 어린 대화를 나누면 서로의 마음을 더 잘 이해하게 될 것입니다. 솔직한 표현이 사랑을 키웁니다.",
            "새로운 만남이 기대되는 하루입니다. 설레는 인연이 예상치 못한 장소에서 시작될 수 있으니 항상 준비된 마음을 가지세요. 운명적인 만남이 다가옵니다.",
            "연인과 작은 오해가 생길 수 있으니 상대방의 말에 귀를 기울여 보세요. 서로의 다른 점을 인정하면 관계가 더 단단해집니다. 이해와 배려가 키워드입니다.",
            "오늘은 혼자만의 시간을 가지며 자신을 사랑하는 연습을 해보세요. 자기 자신을 소중히 여기는 사람이 더 아름다운 사랑을 할 수 있습니다. 내면의 아름다움이 빛나는 날입니다.",
            "사랑하는 사람에게 깜짝 선물이나 이벤트를 준비하면 큰 감동을 줄 수 있습니다. 작은 정성이 큰 행복으로 돌아올 것입니다. 로맨틱한 하루가 될 거예요.",
            "과거의 아픈 기억을 내려놓고 새로운 시작을 할 때입니다. 마음을 열면 따뜻한 사랑이 찾아올 것입니다. 용기를 내어 한 걸음 나아가 보세요.",
            "친구 같은 편안한 만남이 사랑으로 발전할 수 있는 날입니다. 주변을 둘러보면 이미 소중한 사람이 곁에 있을 수 있습니다. 가까운 곳에 행복이 있습니다.",
            "달콤한 고백을 받거나 할 수 있는 좋은 기운이 감돕니다. 용기를 내어 마음을 전해보세요. 진심은 반드시 통합니다.",
            "연인과 함께 맛있는 음식을 나누며 행복한 시간을 보내기 좋은 날입니다. 소소한 일상의 행복이 사랑을 더 풍요롭게 합니다. 함께하는 시간을 소중히 여기세요.",
            "오늘은 상대방의 장점에 집중해 보세요. 감사한 마음을 표현하면 관계가 더욱 좋아질 것입니다. 칭찬 한마디가 사랑의 온도를 높여줍니다.",
            "오래된 연인이라면 처음 만났을 때의 설렘을 되새겨 보세요. 초심을 잃지 않는 것이 사랑을 지키는 비결입니다. 추억을 함께 돌아보는 시간을 가져보세요.",
            "짝사랑 중이라면 오늘 용기를 내볼 만한 날입니다. 상대방도 당신에게 호감을 느끼고 있을 확률이 높습니다. 자신감 있는 모습이 매력적으로 보입니다.",
            "사랑에 있어 조급함은 금물입니다. 천천히 서로를 알아가는 과정을 즐기세요. 급할수록 돌아가는 것이 좋은 결과를 가져옵니다.",
            "오늘은 연인에게 따뜻한 위로가 되어주세요. 상대방이 힘든 시기를 보내고 있을 수 있습니다. 든든한 버팀목이 되어주면 사랑이 더 깊어집니다."
    };

    private static final String[] MONEY_FORTUNES = {
            "재물운이 상승하는 길한 날입니다. 그동안 투자했던 것에서 좋은 수익이 기대됩니다. 단, 과욕은 금물이니 적당한 선에서 만족하세요.",
            "예상치 못한 곳에서 금전적 이득이 생길 수 있습니다. 작은 행운이 찾아오니 감사한 마음으로 받아들이세요. 횡재수가 있는 날입니다.",
            "오늘은 지출을 줄이고 절약하는 습관을 들이면 좋겠습니다. 불필요한 소비를 자제하면 나중에 큰 도움이 됩니다. 알뜰한 소비가 부자의 첫걸음입니다.",
            "사업을 하시는 분들에게 좋은 거래처나 파트너를 만날 수 있는 날입니다. 신뢰를 바탕으로 한 관계가 재물운을 높여줍니다. 비즈니스 미팅에 좋은 날입니다.",
            "금전적으로 안정적인 하루가 될 것입니다. 무리한 투자보다는 안전한 저축이 더 나은 선택입니다. 꾸준한 관리가 재산을 불립니다.",
            "친구나 지인에게 돈을 빌려주는 것은 오늘은 피하는 것이 좋겠습니다. 정이 있어도 금전 문제는 신중하게 다루세요. 돈과 우정은 별개로 생각하세요.",
            "오늘은 자기계발에 투자하면 훗날 큰 재물로 돌아올 것입니다. 당장의 수익보다 미래를 위한 투자가 중요합니다. 지식이 곧 재산입니다.",
            "부수입을 올릴 수 있는 기회가 생길 수 있습니다. 평소 관심 있던 부업이나 재테크를 시작해 보세요. 새로운 수입원이 열리는 날입니다.",
            "오래된 빚을 정리하거나 재정 계획을 세우기 좋은 날입니다. 깔끔한 정리가 새로운 부를 가져옵니다. 가계부를 점검해 보세요.",
            "큰 지출이 예상되지만 꼭 필요한 소비라면 주저하지 마세요. 가치 있는 곳에 쓰는 돈은 낭비가 아닙니다. 현명한 소비가 중요합니다.",
            "재물운이 서서히 좋아지고 있습니다. 조급해하지 말고 꾸준히 노력하면 원하는 목표에 도달할 수 있습니다. 성실함이 최고의 재테크입니다.",
            "오늘은 충동구매를 조심하세요. 당장 끌리는 물건이 있어도 하루 정도 생각한 후에 결정하는 것이 좋습니다. 신중한 소비가 지갑을 지킵니다.",
            "나눔의 기운이 재물운을 높이는 날입니다. 기부나 봉사를 통해 돌아오는 복이 있습니다. 베풀면 베풀수록 더 큰 것이 돌아옵니다.",
            "장기적인 재무 목표를 세우기에 좋은 날입니다. 1년, 5년 후를 내다보는 계획이 필요합니다. 미래를 위한 준비가 현명한 선택입니다."
    };

    private static final String[] HEALTH_FORTUNES = {
            "오늘은 가벼운 운동으로 몸과 마음의 활력을 되찾으세요. 30분 정도의 산책이나 스트레칭이 큰 도움이 됩니다. 건강한 몸에 건강한 정신이 깃듭니다.",
            "수분 섭취를 충분히 하고 과로를 피하는 것이 좋겠습니다. 몸이 보내는 신호에 귀를 기울이세요. 무리하지 않는 것이 건강의 비결입니다.",
            "스트레스 관리에 특히 신경 써야 하는 날입니다. 좋아하는 취미 활동이나 명상으로 마음의 안정을 찾으세요. 심신의 균형이 중요합니다.",
            "오늘은 영양가 있는 식사로 에너지를 보충하세요. 제철 과일과 채소를 챙겨 먹으면 면역력이 높아집니다. 잘 먹는 것이 보약입니다.",
            "숙면을 취하기 좋은 날입니다. 일찍 잠자리에 들어 충분한 수면을 취하면 내일 더 활기찬 하루를 보낼 수 있습니다. 수면의 질이 건강을 좌우합니다.",
            "오늘은 눈과 허리 건강에 특히 주의하세요. 장시간 앉아있는 것을 피하고 틈틈이 스트레칭을 해주세요. 바른 자세가 건강의 시작입니다.",
            "야외 활동을 하면 기분이 한결 나아지는 날입니다. 맑은 공기를 마시며 자연 속에서 힐링하는 시간을 가져보세요. 자연이 최고의 치유제입니다.",
            "오늘은 규칙적인 식사 시간을 지키는 것이 중요합니다. 불규칙한 식습관은 소화기 건강에 좋지 않으니 정해진 시간에 식사하세요. 규칙적인 생활이 건강을 지킵니다.",
            "가벼운 두통이나 피로감이 있을 수 있으니 비타민을 챙겨 드세요. 충분한 휴식과 영양 보충이 필요한 날입니다. 몸의 소리에 귀 기울이세요.",
            "오늘은 체력이 넘치는 날이니 평소 하고 싶었던 운동에 도전해 보세요. 새로운 운동을 시작하기에 좋은 타이밍입니다. 활기찬 에너지를 느껴보세요.",
            "정신 건강에 신경 쓰는 것이 좋겠습니다. 부정적인 생각이 들 때는 좋아하는 음악을 듣거나 긍정적인 말을 되뇌어 보세요. 마음의 건강도 소중합니다.",
            "오늘은 따뜻한 차 한 잔으로 몸을 따뜻하게 하세요. 생강차나 대추차가 특히 좋겠습니다. 따뜻함이 면역력을 높여줍니다.",
            "과음이나 과식을 피하고 절제된 생활을 하면 건강운이 좋아집니다. 적당한 것이 최고라는 말을 기억하세요. 절제가 곧 건강입니다.",
            "오늘은 족욕이나 반신욕으로 몸의 피로를 풀어보세요. 혈액순환이 좋아지면서 개운한 기분을 느낄 수 있습니다. 몸을 따뜻하게 하는 것이 중요합니다."
    };

    private static final String[] WORK_FORTUNES = {
            "직장에서 능력을 인정받는 기회가 찾아옵니다. 맡은 바 업무에 최선을 다하면 승진이나 보상이 따를 것입니다. 꾸준한 노력이 빛을 발하는 날입니다.",
            "동료와의 협업이 좋은 결과를 가져오는 날입니다. 혼자 하기 어려운 일도 함께하면 쉽게 해결됩니다. 팀워크가 성공의 열쇠입니다.",
            "오늘은 새로운 프로젝트나 업무를 맡게 될 수 있습니다. 부담스럽더라도 도전해 보면 큰 성장의 기회가 될 것입니다. 도전을 두려워하지 마세요.",
            "상사나 클라이언트와의 미팅에서 좋은 인상을 남길 수 있는 날입니다. 충분한 준비와 자신감 있는 태도가 중요합니다. 프레젠테이션 실력이 빛나는 날입니다.",
            "업무 중 작은 실수에 주의하세요. 서류나 이메일을 보내기 전에 한 번 더 확인하는 습관이 필요합니다. 꼼꼼함이 프로의 자세입니다.",
            "이직이나 전직을 고민 중이라면 오늘 좋은 정보를 얻을 수 있습니다. 주변 사람들의 조언에 귀를 기울여 보세요. 새로운 길이 열릴 수 있습니다.",
            "오늘은 업무 효율이 높아지는 날이니 중요한 일을 집중적으로 처리하세요. 미뤄두었던 업무를 정리하기에도 좋은 날입니다. 생산성이 최고조에 달합니다.",
            "직장 내 갈등이 있었다면 오늘 원만하게 해결될 수 있습니다. 먼저 화해의 손을 내밀면 상대방도 마음을 열 것입니다. 관계 회복의 기회를 잡으세요.",
            "창의적인 아이디어가 떠오르는 날이니 적극적으로 제안해 보세요. 참신한 발상이 높은 평가를 받을 수 있습니다. 브레인스토밍에 적극 참여하세요.",
            "오늘은 멘토나 선배의 조언이 큰 도움이 됩니다. 모르는 것이 있다면 겸손하게 물어보세요. 배움의 자세가 성장을 이끕니다.",
            "루틴한 업무 속에서도 보람을 찾을 수 있는 날입니다. 작은 성취에도 스스로를 격려하며 긍정적인 마인드를 유지하세요. 꾸준함이 전문가를 만듭니다.",
            "네트워킹에 좋은 날입니다. 업계 관련 모임이나 세미나에 참석하면 좋은 인연을 만들 수 있습니다. 인맥이 곧 자산입니다.",
            "오늘은 업무 환경을 정리정돈하면 일의 능률이 올라갑니다. 깨끗한 책상이 맑은 정신을 만들어줍니다. 정리 정돈부터 시작해 보세요.",
            "중요한 계약이나 협상에서 유리한 위치를 점할 수 있는 날입니다. 자신감 있게 임하되 상대방의 입장도 고려하세요. 윈윈 전략이 최고의 결과를 가져옵니다."
    };

    @Transactional(readOnly = true)
    public FortuneResponse getTodayFortune(String zodiacAnimal) {
        LocalDate today = LocalDate.now();
        Optional<DailyFortune> existing = dailyFortuneRepository
                .findByZodiacAnimalAndFortuneDate(zodiacAnimal, today);

        if (existing.isPresent()) {
            return FortuneResponse.from(existing.get());
        }

        DailyFortune fortune = generateFortune(zodiacAnimal, today);
        return FortuneResponse.from(fortune);
    }

    @Transactional
    public DailyFortune generateFortune(String zodiacAnimal, LocalDate date) {
        // Check again inside transaction to avoid race conditions
        Optional<DailyFortune> existing = dailyFortuneRepository
                .findByZodiacAnimalAndFortuneDate(zodiacAnimal, date);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Deterministic seed based on zodiac + date
        long seed = (long) zodiacAnimal.hashCode() + date.hashCode();
        Random random = new Random(seed);

        String overall = OVERALL_FORTUNES[random.nextInt(OVERALL_FORTUNES.length)];
        String love = LOVE_FORTUNES[random.nextInt(LOVE_FORTUNES.length)];
        String money = MONEY_FORTUNES[random.nextInt(MONEY_FORTUNES.length)];
        String health = HEALTH_FORTUNES[random.nextInt(HEALTH_FORTUNES.length)];
        String work = WORK_FORTUNES[random.nextInt(WORK_FORTUNES.length)];
        int luckyNumber = random.nextInt(99) + 1;
        String luckyColor = LUCKY_COLORS[random.nextInt(LUCKY_COLORS.length)];
        int score = random.nextInt(61) + 40; // 40~100

        DailyFortune fortune = DailyFortune.builder()
                .zodiacAnimal(zodiacAnimal)
                .fortuneDate(date)
                .overall(overall)
                .love(love)
                .money(money)
                .health(health)
                .work(work)
                .luckyNumber(luckyNumber)
                .luckyColor(luckyColor)
                .score(score)
                .build();

        return dailyFortuneRepository.save(fortune);
    }

    /**
     * Get today's fortune based on user's saju (birth date/time)
     */
    public FortuneResponse getSajuBasedFortune(LocalDate birthDate, String birthTime) {
        SajuResult result = SajuCalculator.calculate(birthDate, birthTime);
        SajuInterpreter.interpret(result, LocalDate.now());

        SajuResult.CategoryFortune todayFortune = result.getTodayFortune();

        // Determine zodiac from birth date
        int sajuYear = SajuCalculator.getSajuYear(birthDate);
        SajuPillar yearPillar = SajuCalculator.calculateYearPillar(sajuYear);
        String zodiacAnimal = yearPillar.getAnimal();

        return FortuneResponse.builder()
                .zodiacAnimal(zodiacAnimal)
                .fortuneDate(LocalDate.now())
                .overall(todayFortune.getOverall())
                .love(todayFortune.getLove())
                .money(todayFortune.getMoney())
                .health(todayFortune.getHealth())
                .work(todayFortune.getWork())
                .luckyNumber(todayFortune.getLuckyNumber())
                .luckyColor(todayFortune.getLuckyColor())
                .score(todayFortune.getScore())
                .build();
    }

    @Transactional
    public List<FortuneResponse> getAllTodayFortunes() {
        LocalDate today = LocalDate.now();
        List<DailyFortune> existing = dailyFortuneRepository.findByFortuneDate(today);

        // Generate missing fortunes
        if (existing.size() < ZODIAC_ANIMALS.length) {
            List<String> existingAnimals = existing.stream()
                    .map(DailyFortune::getZodiacAnimal)
                    .collect(Collectors.toList());

            for (String animal : ZODIAC_ANIMALS) {
                if (!existingAnimals.contains(animal)) {
                    DailyFortune fortune = generateFortune(animal, today);
                    existing.add(fortune);
                }
            }
        }

        return existing.stream()
                .map(FortuneResponse::from)
                .collect(Collectors.toList());
    }
}
