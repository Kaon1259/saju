package com.saju.server.service;

import com.saju.server.entity.SpecialFortune;
import com.saju.server.repository.SpecialFortuneRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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

    // ═══════════════════════════════════════════════════
    // 마이너 아르카나 56장 정의
    // ═══════════════════════════════════════════════════

    public static final String[][] MINOR_ARCANA = {
        // ── 완드(Wands) / 불(火) - 열정, 행동, 창조 ──
        {"22", "Ace of Wands", "완드 에이스", "열정,새로운 시작,영감,창조력",
            "뜨거운 열정이 심장을 두드립니다. 새로운 사랑의 불꽃이 타오르려 하고 있어요. 용기를 내서 먼저 다가가면 놀라운 시작이 펼쳐질 거예요.",
            "마음속 불꽃이 꺼져가고 있어요. 설렘이 사라진 건 아닌지 돌아보세요. 억지로 불을 지피기보다 마음이 자연스레 타오를 때를 기다려보세요.",
            "불(火)", "양자리"},
        {"23", "Two of Wands", "완드 2", "계획,결정,미래,비전",
            "두 갈래 길 앞에서 설레는 고민을 하고 있네요. 당신의 선택이 사랑의 방향을 결정합니다. 넓은 세상을 바라보며 더 큰 사랑을 꿈꿔보세요.",
            "결정을 미루다 보면 두 사람 모두 놓칠 수 있어요. 완벽한 타이밍을 기다리기보다 지금 마음이 기우는 쪽을 따라가 보세요.",
            "불(火)", "양자리"},
        {"24", "Three of Wands", "완드 3", "확장,전망,진전,기다림",
            "뿌린 사랑의 씨앗이 싹을 틔우고 있어요. 멀리서 다가오는 인연의 배가 보입니다. 조금만 더 기다리면 기대 이상의 만남이 찾아올 거예요.",
            "기다림이 길어지고 있나요? 혼자 상상 속에서 사랑을 그리기보다 직접 발을 내딛어야 할 때예요. 수동적인 자세를 벗어던지세요.",
            "불(火)", "양자리"},
        {"25", "Four of Wands", "완드 4", "축하,안정,가정,화합",
            "사랑이 결실을 맺는 축복의 시간이에요. 함께 축하할 수 있는 따뜻한 순간이 다가옵니다. 두 사람의 관계가 한 단계 더 깊어지는 전환점이 될 거예요.",
            "관계의 안정감이 흔들리고 있어요. 함께 만든 행복의 기반을 다시 점검해보세요. 서로에 대한 감사를 잊지 않는 것이 중요해요.",
            "불(火)", "양자리"},
        {"26", "Five of Wands", "완드 5", "갈등,경쟁,대립,긴장",
            "연인 사이에 작은 불꽃이 튀고 있어요. 하지만 이 갈등은 서로를 더 깊이 이해하기 위한 과정이에요. 감정을 숨기지 말고 솔직하게 부딪혀 보세요.",
            "싸우기 지쳤다면 한 발 물러서세요. 이기려 하지 말고 함께 해결하려는 마음이 필요해요. 경쟁보다 협력이 사랑을 지키는 길이에요.",
            "불(火)", "사자자리"},
        {"27", "Six of Wands", "완드 6", "승리,인정,자신감,성취",
            "사랑에서 빛나는 순간이 찾아옵니다. 당신의 진심이 드디어 인정받는 때예요. 자신감 넘치는 모습이 상대방의 마음을 사로잡을 거예요.",
            "인정받고 싶은 마음이 너무 크진 않은지 돌아보세요. 사랑은 트로피가 아니에요. 겸손한 마음으로 상대를 바라보면 진짜 승리가 찾아와요.",
            "불(火)", "사자자리"},
        {"28", "Seven of Wands", "완드 7", "방어,도전,용기,신념",
            "사랑을 지키기 위해 싸워야 할 때가 있어요. 주변의 반대나 시련이 있더라도 당신의 마음을 굳건히 지키세요. 진심은 반드시 빛을 발합니다.",
            "너무 방어적인 태도가 오히려 상대를 밀어내고 있어요. 벽을 세우기보다 마음을 열어보세요. 모든 것을 혼자 감당하려 하지 않아도 괜찮아요.",
            "불(火)", "사자자리"},
        {"29", "Eight of Wands", "완드 8", "속도,전진,메시지,열정",
            "사랑이 빠르게 다가오고 있어요! 연락이 올 수도 있고, 관계가 급진전될 수도 있어요. 이 흐름에 몸을 맡기면 짜릿한 로맨스가 펼쳐질 거예요.",
            "너무 서두르고 있진 않나요? 빠르게 타오른 감정은 빠르게 식을 수도 있어요. 잠시 속도를 늦추고 서로의 마음을 확인해보세요.",
            "불(火)", "사수자리"},
        {"30", "Nine of Wands", "완드 9", "인내,끈기,경계,회복력",
            "지친 마음이지만 포기하지 마세요. 사랑의 마지막 고비를 넘기면 따뜻한 봄날이 기다리고 있어요. 당신의 끈기가 결국 사랑을 지켜낼 거예요.",
            "상처받은 마음이 새로운 사랑을 두려워하게 만들고 있어요. 과거의 아픔에서 벗어나야 해요. 완전히 무너지기 전에 쉬어가는 것도 용기예요.",
            "불(火)", "사수자리"},
        {"31", "Ten of Wands", "완드 10", "부담,책임,과중,헌신",
            "사랑을 위해 너무 많은 짐을 지고 있진 않나요? 혼자 모든 것을 감당하려 하지 마세요. 짐을 나눠 들 수 있는 사람이 바로 곁에 있어요.",
            "이제 내려놓을 때예요. 상대를 위해 자신을 희생하는 것은 진정한 사랑이 아니에요. 건강한 관계는 서로가 함께 짐을 나누는 거예요.",
            "불(火)", "사수자리"},
        {"32", "Page of Wands", "완드 시종", "탐험,열의,발견,메시지",
            "설레는 소식이 날아오고 있어요. 새로운 사람에게서 예상치 못한 호감 신호가 올 수 있어요. 호기심 가득한 눈으로 세상을 바라보면 사랑도 따라와요.",
            "충동적인 감정에 휩쓸리지 마세요. 잠깐의 설렘을 진짜 사랑으로 착각하고 있을 수 있어요. 마음을 가라앉히고 천천히 상대를 알아가세요.",
            "불(火)", "양자리"},
        {"33", "Knight of Wands", "완드 기사", "모험,행동,열정,추진력",
            "불같은 열정으로 사랑을 쟁취하러 달려가세요! 망설이지 말고 고백하고, 주저하지 말고 다가가세요. 당신의 뜨거운 에너지가 상대의 마음을 녹일 거예요.",
            "열정이 너무 뜨거우면 상대가 부담스러워할 수 있어요. 독주하지 말고 상대의 속도에 맞춰보세요. 질주하다 넘어지면 더 크게 다쳐요.",
            "불(火)", "사자자리"},
        {"34", "Queen of Wands", "완드 여왕", "자신감,매력,따뜻함,독립",
            "당신의 당당한 매력이 빛나는 시기예요. 자신감 넘치는 모습에 많은 사람이 끌릴 거예요. 따뜻하면서도 강한 당신의 모습 그대로가 최고의 매력이에요.",
            "질투심이나 소유욕이 관계를 흐리고 있어요. 상대를 통제하려 하기보다 믿어주세요. 자신감이 오만으로 변하지 않도록 마음을 다잡아보세요.",
            "불(火)", "사수자리"},
        {"35", "King of Wands", "완드 왕", "리더십,비전,카리스마,대담함",
            "사랑에서도 리더십을 발휘할 때예요. 관계의 방향을 이끌어가는 든든한 존재가 되어보세요. 당신의 따뜻한 카리스마가 상대에게 깊은 신뢰를 줄 거예요.",
            "독선적인 태도가 사랑을 멀어지게 만들어요. 내 뜻대로만 하려 하지 말고 상대의 의견에 귀 기울여보세요. 진정한 리더는 경청하는 사람이에요.",
            "불(火)", "양자리"},

        // ── 컵(Cups) / 물(水) - 감정, 사랑, 관계 ──
        {"36", "Ace of Cups", "컵 에이스", "사랑의 시작,감정,직관,풍요",
            "마음의 잔이 사랑으로 가득 차오르고 있어요. 새로운 감정이 샘솟듯 피어나는 아름다운 시작이에요. 이 순수한 감정을 소중히 간직하세요.",
            "감정의 흐름이 막혀 있어요. 사랑을 받아들일 준비가 안 된 건 아닌지 스스로에게 물어보세요. 닫힌 마음의 문을 살짝만 열어도 사랑이 흘러들어올 거예요.",
            "물(水)", "게자리"},
        {"37", "Two of Cups", "컵 2", "파트너십,상호 끌림,유대,약속",
            "두 마음이 하나로 만나는 운명적인 순간이에요. 서로를 바라보는 눈빛에서 깊은 유대가 느껴져요. 이 연결을 믿고 함께 걸어가면 아름다운 사랑이 꽃필 거예요.",
            "마음이 어긋나고 있어요. 서로 다른 곳을 바라보고 있진 않나요? 솔직한 대화로 마음의 간극을 좁혀보세요. 진심을 나누면 다시 가까워질 수 있어요.",
            "물(水)", "게자리"},
        {"38", "Three of Cups", "컵 3", "우정,축하,기쁨,교류",
            "사랑하는 사람들과 함께하는 즐거운 시간이 다가와요. 친구들의 응원 속에서 로맨스가 싹틀 수도 있어요. 마음을 열고 사람들과 어울리면 예상치 못한 인연을 만나게 돼요.",
            "삼각관계의 그림자가 드리우고 있어요. 친구와 연인 사이의 경계가 흐려지고 있진 않나요? 관계의 선을 명확히 하고 진짜 마음을 들여다보세요.",
            "물(水)", "게자리"},
        {"39", "Four of Cups", "컵 4", "무관심,권태,명상,재평가",
            "지금의 사랑에 무감각해진 건 아닌가요? 익숙함에 파묻혀 소중한 것을 놓치고 있을 수 있어요. 잠시 눈을 감고 마음속 진짜 감정이 뭔지 느껴보세요.",
            "새로운 가능성에 눈을 뜨기 시작했어요. 권태를 벗어나 다시 설레는 마음을 찾을 수 있어요. 변화를 두려워하지 말고 마음이 이끄는 대로 따라가보세요.",
            "물(水)", "전갈자리"},
        {"40", "Five of Cups", "컵 5", "상실,슬픔,후회,집착",
            "엎질러진 사랑 앞에서 눈물짓고 있나요? 잃어버린 것만 바라보지 마세요. 돌아보면 아직 남아 있는 소중한 감정이 있어요. 그것을 붙잡으면 다시 일어설 수 있어요.",
            "슬픔에서 벗어나 앞을 바라보기 시작했어요. 상처가 아물고 새로운 사랑을 받아들일 준비가 되고 있어요. 과거의 아픔이 더 깊은 사랑을 할 수 있는 힘이 될 거예요.",
            "물(水)", "전갈자리"},
        {"41", "Six of Cups", "컵 6", "추억,순수,재회,향수",
            "첫사랑의 떨림 같은 순수한 감정이 되살아나요. 오래된 인연이 다시 찾아올 수도 있어요. 그때의 순수했던 마음을 떠올리면 지금의 사랑도 더 따뜻해질 거예요.",
            "과거의 추억에 너무 젖어 있으면 현재를 놓쳐요. 그때로 돌아갈 수는 없어요. 아름다운 기억은 가슴에 품되, 눈은 지금 곁에 있는 사람을 바라보세요.",
            "물(水)", "전갈자리"},
        {"42", "Seven of Cups", "컵 7", "환상,선택,꿈,유혹",
            "사랑에 대한 환상이 무지갯빛으로 펼쳐져 있어요. 하지만 모든 꿈이 현실이 되진 않아요. 수많은 가능성 중 진짜 당신의 마음을 울리는 하나를 골라보세요.",
            "환상에서 깨어나 현실을 직시할 때예요. 이상형에 대한 비현실적인 기대를 내려놓으면, 진짜 당신을 사랑하는 사람이 보일 거예요.",
            "물(水)", "물고기자리"},
        {"43", "Eight of Cups", "컵 8", "떠남,성장,탐색,용기",
            "더 깊은 사랑을 찾아 떠나야 할 때가 왔어요. 지금의 관계가 당신을 채워주지 못한다면, 용기를 내서 새로운 길을 찾아보세요. 떠남은 포기가 아니라 성장이에요.",
            "떠나야 하는 걸 알면서도 발이 떨어지지 않나요? 미련이 당신을 붙잡고 있어요. 하지만 머물러야 할 이유가 정말 있는지 솔직하게 따져보세요.",
            "물(水)", "물고기자리"},
        {"44", "Nine of Cups", "컵 9", "소원 성취,만족,행복,감사",
            "소원이 이루어지는 마법 같은 시간이에요! 사랑에서 원하던 것을 드디어 얻게 돼요. 이 행복한 순간을 온전히 누리고, 감사하는 마음을 잊지 마세요.",
            "원하는 걸 다 가졌는데도 공허한 느낌이 드나요? 진짜 원하는 것이 무엇인지 다시 생각해보세요. 물질적 만족이 아닌 마음의 충족을 찾아야 해요.",
            "물(水)", "물고기자리"},
        {"45", "Ten of Cups", "컵 10", "행복한 결말,가족,조화,축복",
            "사랑이 가장 아름다운 모습으로 완성되는 순간이에요. 함께 웃고 함께 울 수 있는 사람이 곁에 있다는 건 최고의 축복이에요. 이 사랑, 영원히 빛날 거예요.",
            "행복한 가정의 꿈이 흔들리고 있어요. 겉으로는 완벽해 보여도 속으로는 균열이 가고 있을 수 있어요. 진심으로 마주 앉아 서로의 마음을 확인해보세요.",
            "물(水)", "물고기자리"},
        {"46", "Page of Cups", "컵 시종", "감수성,로맨스,직감,제안",
            "달콤한 연애 편지 같은 감정이 찾아오고 있어요. 예상치 못한 곳에서 사랑의 신호를 발견하게 될 거예요. 감수성을 열어두면 작은 설렘도 큰 사랑이 될 수 있어요.",
            "감정에 너무 빠져서 현실을 놓치고 있어요. 로맨틱한 상상은 즐겁지만, 진짜 관계는 노력이 필요해요. 꿈에서 깨어나 상대의 진짜 모습을 바라보세요.",
            "물(水)", "게자리"},
        {"47", "Knight of Cups", "컵 기사", "로맨스,매력,프로포즈,이상주의",
            "백마 탄 왕자님 같은 낭만적인 사랑이 다가오고 있어요. 감미로운 고백이나 달콤한 제안이 찾아올 수 있어요. 마음의 문을 활짝 열고 이 아름다운 순간을 맞이하세요.",
            "달콤한 말에 현혹되고 있진 않나요? 겉모습만 보고 사랑에 빠지면 나중에 실망할 수 있어요. 진심과 거짓을 구별하는 눈을 키우세요.",
            "물(水)", "전갈자리"},
        {"48", "Queen of Cups", "컵 여왕", "공감,직관,돌봄,감성",
            "깊은 공감 능력으로 상대의 마음을 어루만져줄 수 있는 시기예요. 당신의 따뜻한 마음이 상대에게 안식처가 되어줄 거예요. 직관을 믿고 사랑으로 감싸안으세요.",
            "타인의 감정에 너무 빠져들어 자신을 잃고 있어요. 상대를 돌보는 것도 좋지만, 나 자신의 감정도 소중히 여겨주세요. 건강한 사랑은 나를 지키는 것부터 시작해요.",
            "물(水)", "물고기자리"},
        {"49", "King of Cups", "컵 왕", "감정적 성숙,지혜,균형,관대",
            "감정의 바다를 다스리는 성숙한 사랑의 시기예요. 흔들리지 않는 마음으로 상대를 포용해줄 수 있어요. 당신의 깊은 이해심이 관계를 더욱 단단하게 만들어줄 거예요.",
            "감정을 너무 억누르고 있진 않나요? 강해 보이려고 감정을 숨기면 오히려 관계가 차가워져요. 때로는 약한 모습을 보여주는 것도 사랑의 일부예요.",
            "물(水)", "전갈자리"},

        // ── 소드(Swords) / 바람(風) - 지성, 진실, 소통 ──
        {"50", "Ace of Swords", "소드 에이스", "진실,명확함,돌파구,새로운 생각",
            "사랑에 대한 명확한 깨달음이 찾아와요. 흐릿했던 마음이 선명해지고, 진짜 원하는 것이 뭔지 알게 돼요. 이 명료함으로 관계에서 중요한 결정을 내릴 수 있어요.",
            "진실을 마주하기 두렵다면, 거짓된 평화 속에 머물게 돼요. 아프더라도 진실을 받아들이세요. 혼란스러운 생각 속에서 핵심을 찾아야 해요.",
            "바람(風)", "쌍둥이자리"},
        {"51", "Two of Swords", "소드 2", "선택,교착,회피,균형",
            "두 마음 사이에서 갈팡질팡하고 있네요. 눈을 가리고 결정을 피하고 싶지만, 언젠가는 선택해야 해요. 마음의 소리에 귀 기울이면 답이 보일 거예요.",
            "오랫동안 미뤄왔던 결정을 내릴 때가 왔어요. 더 이상 회피하지 마세요. 어떤 선택이든 행동하는 것이 멈춰 있는 것보다 나아요.",
            "바람(風)", "천칭자리"},
        {"52", "Three of Swords", "소드 3", "이별,슬픔,배신,상처",
            "마음에 깊은 상처가 찾아올 수 있어요. 이별이나 배신의 아픔이 가슴을 찌르지만, 이 아픔도 결국 지나가요. 울어도 괜찮아요, 눈물이 상처를 씻어줄 거예요.",
            "상처가 서서히 아물기 시작해요. 아픔을 통해 더 강해진 자신을 발견하게 될 거예요. 과거의 슬픔을 놓아주면 새로운 사랑이 들어올 자리가 생겨요.",
            "바람(風)", "천칭자리"},
        {"53", "Four of Swords", "소드 4", "휴식,회복,명상,재충전",
            "지친 마음에 쉼이 필요한 시기예요. 사랑을 잠시 내려놓고 나 자신을 돌봐주세요. 충분히 쉬고 나면 다시 사랑할 힘이 차오를 거예요.",
            "너무 오래 쉬고 있진 않나요? 회복의 시간은 충분했어요. 이제 다시 일어나 사랑의 세계로 발을 내딛을 때예요. 용기를 내보세요.",
            "바람(風)", "천칭자리"},
        {"54", "Five of Swords", "소드 5", "갈등,승부,패배,자존심",
            "사랑에서 이기려고만 하면 결국 둘 다 지게 돼요. 자존심 대결은 관계를 망가뜨려요. 이기는 것보다 함께 웃을 수 있는 방법을 찾아보세요.",
            "말다툼 후의 허무함을 느끼고 있나요? 이겨도 기쁘지 않은 싸움은 그만둘 때예요. 상대에게 먼저 손을 내밀면 관계가 회복될 수 있어요.",
            "바람(風)", "물병자리"},
        {"55", "Six of Swords", "소드 6", "전환,이동,회복,새출발",
            "아픈 과거를 뒤로하고 새로운 사랑을 향해 나아가는 중이에요. 아직 마음이 무겁지만, 한 걸음 한 걸음 나아가면 평온한 곳에 도착할 거예요. 포기하지 마세요.",
            "떠나야 할 때를 알면서도 주저하고 있어요. 과거에 묶여 있으면 앞으로 나아갈 수 없어요. 고통스러운 상황에서 벗어나는 것도 자기 사랑이에요.",
            "바람(風)", "물병자리"},
        {"56", "Seven of Swords", "소드 7", "속임,전략,비밀,회피",
            "관계에서 숨기고 있는 것은 없나요? 비밀은 결국 드러나게 되어 있어요. 지금 솔직해지면 아프더라도 관계를 살릴 수 있지만, 계속 숨기면 더 큰 상처가 돼요.",
            "숨겨왔던 진실을 마주할 용기가 생기고 있어요. 솔직해지는 것이 두렵지만, 그것만이 진정한 사랑으로 가는 길이에요. 거짓 없는 관계를 시작해보세요.",
            "바람(風)", "물병자리"},
        {"57", "Eight of Swords", "소드 8", "속박,무력감,제한,두려움",
            "사랑 앞에서 스스로를 가두고 있어요. 두려움이 만든 감옥에서 벗어나세요. 실은 언제든 떠날 수 있는데, 무서워서 눈을 가리고 있는 건 아닌가요?",
            "드디어 두려움의 눈가리개를 벗기 시작했어요. 사랑에 대한 두려움에서 벗어나면 자유로운 마음으로 다시 사랑할 수 있어요. 당신은 충분히 사랑받을 자격이 있어요.",
            "바람(風)", "쌍둥이자리"},
        {"58", "Nine of Swords", "소드 9", "불안,걱정,악몽,자책",
            "한밤중에 사랑 때문에 잠 못 이루고 있나요? 걱정이 꼬리에 꼬리를 물지만, 대부분은 상상이 만든 괴물이에요. 해가 뜨면 불안도 사라져요. 버텨내세요.",
            "불안의 밤이 지나가고 있어요. 혼자 끙끙대지 말고 믿을 수 있는 사람에게 마음을 털어놓으세요. 말하는 것만으로도 마음이 한결 가벼워질 거예요.",
            "바람(風)", "쌍둥이자리"},
        {"59", "Ten of Swords", "소드 10", "끝,바닥,재탄생,해방",
            "가장 깊은 바닥을 찍었어요. 하지만 이제 더 이상 내려갈 곳이 없으니 올라가기만 하면 돼요. 가장 어두운 밤이 지나면 반드시 새벽이 와요. 이 아픔이 새로운 시작이에요.",
            "최악의 상황은 이미 지나갔어요. 서서히 회복되고 있으니 자신을 믿으세요. 끝이라고 생각했던 곳에서 새로운 사랑의 문이 열리고 있어요.",
            "바람(風)", "쌍둥이자리"},
        {"60", "Page of Swords", "소드 시종", "호기심,관찰,솔직함,날카로움",
            "사랑에 대해 호기심 가득한 눈으로 바라보고 있어요. 상대를 알아가고 싶은 마음이 커지고 있네요. 솔직하게 물어보고, 진심으로 들어주면 사랑이 깊어질 거예요.",
            "너무 날카롭게 파고들면 상대가 다칠 수 있어요. 진실을 추구하는 것은 좋지만, 말하는 방식도 중요해요. 부드러운 솔직함이 관계를 살리는 비결이에요.",
            "바람(風)", "쌍둥이자리"},
        {"61", "Knight of Swords", "소드 기사", "직진,결단,용감,성급함",
            "거침없이 사랑을 향해 돌진하는 에너지가 넘쳐요. 고민하지 말고 행동으로 보여주세요. 과감한 한 마디가 관계를 결정적으로 바꿀 수 있는 순간이에요.",
            "너무 앞만 보고 달리다 중요한 것을 놓치고 있어요. 상대의 감정을 살피지 않고 내 생각만 밀어붙이면 역효과가 나요. 잠시 멈추고 주변을 둘러보세요.",
            "바람(風)", "천칭자리"},
        {"62", "Queen of Swords", "소드 여왕", "독립,명석함,경험,정직",
            "사랑에서도 명확한 기준과 원칙이 필요해요. 감정에 휘둘리지 않는 당당함이 오히려 진정한 사랑을 끌어당겨요. 스스로를 낮추지 말고 당당하게 사랑하세요.",
            "상처받은 경험 때문에 마음의 벽을 높이 쌓고 있어요. 차가운 논리로 감정을 재단하면 따뜻한 사랑이 스며들 수 없어요. 벽 너머로 손을 내밀어보세요.",
            "바람(風)", "물병자리"},
        {"63", "King of Swords", "소드 왕", "지적,공정,권위,명확함",
            "이성적이고 현명한 판단으로 관계를 이끌어갈 수 있는 시기예요. 감정적으로 흔들리지 않는 냉철함이 오히려 상대에게 신뢰를 줘요. 현명한 조언자가 되어보세요.",
            "너무 이성적이기만 하면 사랑이 차가워져요. 머리로만 사랑하려 하지 마세요. 가끔은 논리를 내려놓고 가슴이 시키는 대로 해보는 것도 필요해요.",
            "바람(風)", "천칭자리"},

        // ── 펜타클(Pentacles) / 땅(土) - 현실, 안정, 헌신 ──
        {"64", "Ace of Pentacles", "펜타클 에이스", "기회,풍요,안정,새로운 시작",
            "사랑의 새로운 기회가 현실로 다가오고 있어요. 진지하고 안정적인 관계의 씨앗이 뿌려지는 시기예요. 이 소중한 시작을 놓치지 말고 정성껏 가꿔나가세요.",
            "좋은 기회가 눈앞에 있는데 잡지 못하고 있어요. 완벽한 조건만 찾다 보면 인연을 놓칠 수 있어요. 지금 할 수 있는 작은 것부터 시작해보세요.",
            "땅(土)", "황소자리"},
        {"65", "Two of Pentacles", "펜타클 2", "균형,유연함,적응,우선순위",
            "사랑과 일 사이에서 균형을 찾아야 할 때예요. 둘 다 소중하지만, 지금 더 필요한 것이 무엇인지 마음에 물어보세요. 유연하게 대처하면 둘 다 잡을 수 있어요.",
            "이것저것 하다 보니 정작 중요한 사람에게 소홀해지고 있어요. 모든 것을 다 할 수는 없어요. 우선순위를 정하고 소중한 사람에게 시간을 내주세요.",
            "땅(土)", "황소자리"},
        {"66", "Three of Pentacles", "펜타클 3", "협력,노력,성장,인정",
            "사랑도 함께 만들어가는 거예요. 서로의 부족한 부분을 채워주며 관계를 쌓아가는 과정이 아름다워요. 노력한 만큼 사랑도 단단해지고 있어요.",
            "관계에서 혼자만 노력하고 있다는 느낌이 드나요? 사랑은 혼자 하는 게 아니에요. 상대에게도 함께 노력해달라고 솔직하게 이야기해보세요.",
            "땅(土)", "염소자리"},
        {"67", "Four of Pentacles", "펜타클 4", "안정,소유,집착,보수",
            "사랑을 꽉 움켜쥐고 놓지 않으려 하고 있어요. 잃을까 봐 두려운 마음은 이해하지만, 너무 꽉 쥐면 오히려 빠져나가요. 믿음으로 느슨하게 잡아보세요.",
            "집착을 내려놓기 시작했어요. 상대를 소유하려는 마음 대신 존중하는 마음을 키우세요. 사랑은 새장이 아니라 열린 하늘이에요.",
            "땅(土)", "염소자리"},
        {"68", "Five of Pentacles", "펜타클 5", "어려움,고립,시련,불안",
            "사랑이 힘들고 외로운 시기를 지나고 있어요. 추운 겨울밤 같은 시간이지만, 곁에 함께 걸어줄 사람이 분명 있어요. 도움을 청하는 것을 부끄러워하지 마세요.",
            "힘든 시기가 지나가고 있어요. 어둠 속에서도 꺼지지 않았던 사랑의 불씨가 다시 타오르기 시작해요. 시련을 함께 이겨낸 사랑은 더욱 강해져요.",
            "땅(土)", "황소자리"},
        {"69", "Six of Pentacles", "펜타클 6", "나눔,관대함,베풂,균형",
            "사랑을 아낌없이 나눠줄 수 있는 여유가 생겼어요. 받기만 하는 것보다 주는 기쁨이 더 크다는 걸 알게 되는 시기예요. 당신의 따뜻한 마음이 관계를 풍요롭게 만들어요.",
            "주는 것과 받는 것의 균형이 무너져 있어요. 한쪽만 계속 베풀면 관계가 불균형해져요. 건강한 사랑은 서로가 주고받는 거예요.",
            "땅(土)", "황소자리"},
        {"70", "Seven of Pentacles", "펜타클 7", "인내,평가,기다림,수확",
            "사랑의 열매가 익어가고 있어요. 지금까지 쏟은 정성과 시간이 결실을 맺으려 해요. 조급해하지 마세요. 가장 달콤한 열매는 충분히 익어야 맛있어요.",
            "투자한 만큼 결과가 나오지 않아 실망하고 있나요? 방향을 점검해보세요. 같은 방법을 반복해서는 다른 결과를 얻을 수 없어요.",
            "땅(土)", "황소자리"},
        {"71", "Eight of Pentacles", "펜타클 8", "노력,숙련,성실,집중",
            "사랑하는 법을 배워가고 있는 중이에요. 서투르더라도 진심을 담아 한 땀 한 땀 정성을 쏟으면 돼요. 꾸준한 노력이 가장 아름다운 사랑을 만들어요.",
            "관계에 너무 몰두한 나머지 다른 것들을 놓치고 있어요. 일에만 빠져서 사랑을 소홀히 하고 있진 않은지, 혹은 그 반대인지 점검해보세요.",
            "땅(土)", "처녀자리"},
        {"72", "Nine of Pentacles", "펜타클 9", "독립,풍요,자기 가치,우아함",
            "혼자서도 빛나는 당신이에요. 스스로를 사랑하고 가꿀 줄 아는 사람에게 가장 좋은 인연이 찾아와요. 자기 자신을 충분히 사랑한 후에 만나는 사랑이 가장 아름다워요.",
            "독립을 넘어 고립되고 있진 않나요? 혼자서도 충분하다며 마음의 문을 닫아버리면 진짜 사랑이 들어올 수 없어요. 혼자가 편해도 함께하는 따뜻함을 잊지 마세요.",
            "땅(土)", "처녀자리"},
        {"73", "Ten of Pentacles", "펜타클 10", "유산,가족,영속,완성",
            "사랑이 가장 풍요로운 결실을 맺는 시기예요. 오래도록 함께할 사랑, 가족이 될 인연을 만나게 돼요. 이 사랑은 시간이 지나도 빛바래지 않을 거예요.",
            "물질적 안정에만 집중하다 사랑의 본질을 잊고 있어요. 조건이 아닌 마음으로 사람을 바라보세요. 진짜 풍요는 통장 잔고가 아니라 따뜻한 마음이에요.",
            "땅(土)", "처녀자리"},
        {"74", "Page of Pentacles", "펜타클 시종", "성실,배움,계획,가능성",
            "사랑의 기초를 차근차근 쌓아가고 있어요. 화려하지 않지만 진심이 담긴 작은 행동들이 상대의 마음을 움직일 거예요. 성실한 마음이 가장 큰 매력이에요.",
            "너무 계획적으로만 사랑하려 하고 있어요. 사랑은 계산대로 되지 않아요. 가끔은 계획표를 접고 즉흥적인 설렘을 즐겨보세요.",
            "땅(土)", "황소자리"},
        {"75", "Knight of Pentacles", "펜타클 기사", "꾸준함,책임감,신뢰,인내",
            "느리지만 확실한 사랑이 다가오고 있어요. 화려한 고백보다 매일 한결같은 마음이 더 큰 감동을 줘요. 묵묵히 곁을 지켜주는 그 사람, 바로 진짜 사랑이에요.",
            "너무 느린 진행에 답답함을 느끼고 있나요? 신중한 것도 좋지만, 때로는 용기 내서 한 발 더 다가가야 해요. 완벽한 때를 기다리다 시기를 놓칠 수 있어요.",
            "땅(土)", "처녀자리"},
        {"76", "Queen of Pentacles", "펜타클 여왕", "풍요,현실감각,돌봄,안정",
            "따뜻하고 포근한 사랑을 줄 수 있는 시기예요. 상대에게 편안한 안식처가 되어주세요. 화려함보다 일상의 소소한 행복을 함께 나누는 것이 진정한 사랑이에요.",
            "타인을 돌보느라 정작 자신은 돌보지 못하고 있어요. 현실적인 걱정에 파묻혀 사랑의 낭만을 잃어가고 있어요. 가끔은 현실을 잊고 로맨틱한 시간을 가져보세요.",
            "땅(土)", "염소자리"},
        {"77", "King of Pentacles", "펜타클 왕", "성공,안정,풍요,신뢰",
            "사랑과 현실 모두에서 든든한 기둥이 될 수 있는 시기예요. 안정적이고 풍요로운 사랑을 만들어갈 준비가 되었어요. 믿음직한 당신의 모습이 상대에게 깊은 안심을 줄 거예요.",
            "물질적 성공에만 집착하다 사랑하는 사람의 마음을 놓치고 있어요. 바쁜 일상 속에서도 소중한 사람에게 시간을 내주세요. 돈으로 살 수 없는 것이 사랑이에요.",
            "땅(土)", "황소자리"}
    };

    // ═══════════════════════════════════════════════════
    // 전체 78장 통합 배열
    // ═══════════════════════════════════════════════════

    public static final String[][] ALL_CARDS;
    static {
        ALL_CARDS = new String[MAJOR_ARCANA.length + MINOR_ARCANA.length][];
        System.arraycopy(MAJOR_ARCANA, 0, ALL_CARDS, 0, MAJOR_ARCANA.length);
        System.arraycopy(MINOR_ARCANA, 0, ALL_CARDS, MAJOR_ARCANA.length, MINOR_ARCANA.length);
    }

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
     * 78장 전체 카드 정보
     */
    public List<Map<String, Object>> getAllCards() {
        List<Map<String, Object>> cards = new ArrayList<>();
        for (String[] card : ALL_CARDS) {
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
        for (int i = 0; i < 78; i++) indices.add(i);
        Collections.shuffle(indices);

        List<Map<String, Object>> drawn = new ArrayList<>();
        Random random = new Random();
        for (int i = 0; i < count; i++) {
            int idx = indices.get(i);
            String[] card = ALL_CARDS[idx];
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
            int id = Math.min(Math.max(ids[i], 0), 77);
            String[] card = ALL_CARDS[id];
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
     * 타로 리딩 스트리밍
     * 캐시 있으면 cached 이벤트로 즉시 반환, 없으면 AI 스트리밍 후 서버 캐시 저장
     */
    public SseEmitter streamReading(String cardIds, String reversals,
                                    String spread, String category, String question, Runnable onSuccess) {
        return doStreamReading(cardIds, reversals, spread, category, question, onSuccess);
    }

    public SseEmitter streamReading(String cardIds, String reversals,
                                    String spread, String category, String question) {
        return doStreamReading(cardIds, reversals, spread, category, question, null);
    }

    private SseEmitter doStreamReading(String cardIds, String reversals,
                                    String spread, String category, String question, Runnable onSuccess) {
        // 캐시 체크
        String cacheKey = buildCacheKey(cardIds, reversals, spread, category, question != null ? question : "");
        Map<String, Object> cached = getFromCache("tarot", cacheKey);
        if (cached != null) {
            SseEmitter emitter = new SseEmitter(30000L);
            try {
                String json = objectMapper.writeValueAsString(cached);
                emitter.send(SseEmitter.event().name("cached").data(json));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // 카드 파싱 (스트리밍용 카드 정보 구성)
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

        List<Map<String, Object>> cardDetails = new ArrayList<>();
        for (int i = 0; i < ids.length; i++) {
            int id = Math.min(Math.max(ids[i], 0), 77);
            String[] card = ALL_CARDS[id];
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

        // AI 스트리밍
        String systemPrompt = promptBuilder.tarotSystemPrompt();
        String userPrompt = promptBuilder.tarotUserPrompt(cardDetails, spread, categoryKr, question, LocalDate.now());

        final String finalCardIds = cardIds;
        final String finalReversals = reversals;
        final List<Map<String, Object>> finalCardDetails = cardDetails;
        final String finalCacheKey = cacheKey;
        final String finalCategoryKr = categoryKr;

        return claudeApiService.generateStream(systemPrompt, userPrompt, 1200, (fullText) -> {
            // 스트리밍 완료 → 결과 구성 후 서버에서 직접 캐시 저장
            try {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("spread", spread);
                result.put("category", category);
                result.put("categoryKr", finalCategoryKr);
                result.put("question", question);
                result.put("cards", finalCardDetails);
                result.put("interpretation", fullText.trim());
                result.put("overallMessage", generateOverallMessage(finalCardDetails));
                result.put("advice", generateAdvice(finalCardDetails, category));
                result.put("luckyElement", determineLuckyElement(finalCardDetails));
                result.put("date", LocalDate.now().toString());
                saveToCache("tarot", finalCacheKey, result);
            } catch (Exception e) {
                log.warn("Failed to save tarot stream cache: {}", e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
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
