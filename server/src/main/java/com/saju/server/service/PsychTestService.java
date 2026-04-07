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

@Service
@RequiredArgsConstructor
@Slf4j
public class PsychTestService {

    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final SpecialFortuneRepository specialFortuneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ──────────────────────────────────────────────
    // 테스트 메타데이터
    // ──────────────────────────────────────────────

    private static final List<Map<String, Object>> TEST_META = List.of(
        Map.of("id", "love-style", "title", "연애 유형 테스트", "description", "나는 연애할 때 어떤 사람일까? 숨겨진 연애 스타일을 알아보세요!", "icon", "💕", "questionCount", 8),
        Map.of("id", "hidden-self", "title", "숨겨진 나 테스트", "description", "평소 모르고 지나친 내 안의 또 다른 나를 발견해보세요!", "icon", "🎭", "questionCount", 8),
        Map.of("id", "fortune-type", "title", "행운 체질 테스트", "description", "나에게 행운이 찾아오는 방식은? 나만의 행운 체질을 확인하세요!", "icon", "🍀", "questionCount", 8)
    );

    // ──────────────────────────────────────────────
    // 연애 유형 테스트 질문 (love-style)
    // ──────────────────────────────────────────────

    private static final List<Map<String, Object>> LOVE_STYLE_QUESTIONS = List.of(
        Map.of("q", "마음에 드는 사람을 발견했을 때 나는?",
            "A", "먼저 다가가서 말을 건다",
            "B", "눈을 자주 마주치며 신호를 보낸다",
            "C", "친구를 통해 자연스럽게 접근한다",
            "D", "상대가 먼저 오기를 기다린다"),
        Map.of("q", "연인과 함께하는 주말, 가장 하고 싶은 것은?",
            "A", "새로운 맛집이나 여행지 탐방",
            "B", "집에서 함께 영화 보며 쉬기",
            "C", "서로의 취미를 함께 즐기기",
            "D", "각자 시간을 보낸 뒤 저녁에 만나기"),
        Map.of("q", "연인이 나에게 서운하다고 했을 때?",
            "A", "바로 사과하고 다정하게 안아준다",
            "B", "무엇이 서운했는지 차분히 물어본다",
            "C", "선물이나 이벤트로 기분을 풀어준다",
            "D", "시간을 두고 서로 생각을 정리한다"),
        Map.of("q", "연인에게 사랑을 표현하는 나만의 방식은?",
            "A", "매일 \"사랑해\" 말과 스킨십",
            "B", "상대의 일상을 세심하게 챙기기",
            "C", "기념일마다 깜짝 이벤트 준비",
            "D", "묵묵히 옆에서 든든하게 지켜주기"),
        Map.of("q", "연인과 의견이 다를 때 나는?",
            "A", "내 생각을 솔직하게 이야기한다",
            "B", "상대의 의견을 먼저 끝까지 듣는다",
            "C", "중간 지점에서 타협점을 찾는다",
            "D", "큰 문제가 아니면 맞춰준다"),
        Map.of("q", "전 연인과 헤어진 후 나는?",
            "A", "슬프지만 빠르게 새 출발을 한다",
            "B", "충분히 슬퍼한 뒤 천천히 회복한다",
            "C", "친구들과 어울리며 잊으려 한다",
            "D", "혼자 조용히 감정을 정리한다"),
        Map.of("q", "이상형을 고를 때 가장 중요한 것은?",
            "A", "유머감각과 에너지가 넘치는 사람",
            "B", "따뜻하고 공감 능력이 좋은 사람",
            "C", "똑똑하고 대화가 잘 통하는 사람",
            "D", "성실하고 한결같은 사람"),
        Map.of("q", "소개팅에서 첫인상을 보는 포인트는?",
            "A", "밝은 표정과 적극적인 대화",
            "B", "눈빛과 말투에서 느껴지는 진심",
            "C", "센스 있는 유머와 재치",
            "D", "차분하고 예의 바른 태도")
    );

    // ──────────────────────────────────────────────
    // 숨겨진 나 테스트 질문 (hidden-self)
    // ──────────────────────────────────────────────

    private static final List<Map<String, Object>> HIDDEN_SELF_QUESTIONS = List.of(
        Map.of("q", "친구들 사이에서 나는 보통 어떤 역할인가요?",
            "A", "분위기 메이커, 웃음 담당",
            "B", "고민 상담사, 다 들어주는 역할",
            "C", "계획 짜는 사람, 일정 총괄",
            "D", "조용히 따라가지만 핵심을 짚는 사람"),
        Map.of("q", "혼자만의 시간이 생기면 가장 먼저 하는 것은?",
            "A", "밀린 드라마나 유튜브 몰아보기",
            "B", "일기를 쓰거나 생각을 정리하기",
            "C", "새로운 것을 배우거나 도전하기",
            "D", "아무것도 안 하고 멍 때리기"),
        Map.of("q", "스트레스를 받으면 나는?",
            "A", "맛있는 것을 먹으러 나간다",
            "B", "혼자 음악을 들으며 산책한다",
            "C", "운동이나 청소 등 몸을 움직인다",
            "D", "누군가에게 전화해서 수다를 떤다"),
        Map.of("q", "꿈에서 자주 나오는 상황에 가장 가까운 것은?",
            "A", "날아다니거나 초능력을 쓰는 꿈",
            "B", "낯선 곳을 탐험하는 꿈",
            "C", "시험이나 발표 같은 긴장되는 꿈",
            "D", "누군가와 대화하거나 만나는 꿈"),
        Map.of("q", "무인도에 한 가지만 가져갈 수 있다면?",
            "A", "음악 플레이어",
            "B", "책 한 보따리",
            "C", "만능 서바이벌 도구",
            "D", "소중한 사람의 사진"),
        Map.of("q", "나를 동물에 비유한다면?",
            "A", "자유로운 독수리",
            "B", "영리한 여우",
            "C", "충직한 강아지",
            "D", "독립적인 고양이"),
        Map.of("q", "갑자기 1억이 생긴다면 가장 먼저?",
            "A", "세계여행을 떠난다",
            "B", "자기계발에 투자한다",
            "C", "안정적으로 저축·투자한다",
            "D", "가족이나 소중한 사람에게 쓴다"),
        Map.of("q", "처음 만난 사람에게 나는 어떤 인상일까?",
            "A", "밝고 에너지 넘치는 사람",
            "B", "차분하고 신비로운 사람",
            "C", "믿음직하고 든든한 사람",
            "D", "다정하고 따뜻한 사람")
    );

    // ──────────────────────────────────────────────
    // 행운 체질 테스트 질문 (fortune-type)
    // ──────────────────────────────────────────────

    private static final List<Map<String, Object>> FORTUNE_TYPE_QUESTIONS = List.of(
        Map.of("q", "복권을 산다면 어떤 방식으로 번호를 고를까요?",
            "A", "직감으로 순간적으로 고른다",
            "B", "통계와 이전 당첨 번호를 분석한다",
            "C", "생년월일 등 의미 있는 숫자로 고른다",
            "D", "자동으로 맡긴다, 될 놈은 된다!"),
        Map.of("q", "중요한 결정을 내릴 때 나는?",
            "A", "직감을 믿고 빠르게 결정한다",
            "B", "장단점을 꼼꼼히 비교한 뒤 결정한다",
            "C", "주변 사람들의 조언을 구한다",
            "D", "일단 시작하고 상황에 맞춰 조절한다"),
        Map.of("q", "나에게 행운이 찾아온 적이 있다면 그때는?",
            "A", "예상치 못한 순간에 갑자기",
            "B", "꾸준히 노력한 결과로",
            "C", "누군가의 소개나 인연 덕분에",
            "D", "분위기 좋은 날 기분 좋게 나갔을 때"),
        Map.of("q", "아침에 일어났을 때 오늘 운이 좋을 것 같다고 느끼는 순간은?",
            "A", "좋은 꿈을 꿨을 때",
            "B", "계획한 일이 잘 풀릴 것 같은 예감이 들 때",
            "C", "기분 좋은 노래가 들릴 때",
            "D", "날씨가 화창할 때"),
        Map.of("q", "길을 걷다가 사거리에서 어느 방향으로 갈까요?",
            "A", "가본 적 없는 새로운 길",
            "B", "가장 빠른 지름길",
            "C", "사람이 많은 활기찬 길",
            "D", "나무와 꽃이 있는 예쁜 길"),
        Map.of("q", "운이 안 좋다고 느낄 때 나의 대처법은?",
            "A", "크게 신경 쓰지 않고 넘긴다",
            "B", "뭔가를 바꿔본다 (헤어스타일, 방 배치 등)",
            "C", "좋은 사람들을 만나서 기운을 받는다",
            "D", "조용히 쉬면서 때를 기다린다"),
        Map.of("q", "가장 끌리는 파워스톤(보석)은?",
            "A", "투명하게 빛나는 수정",
            "B", "깊은 보라색 자수정",
            "C", "따뜻한 금색 호박",
            "D", "신비로운 초록색 비취"),
        Map.of("q", "\"행운\"이라는 단어를 들으면 가장 먼저 떠오르는 것은?",
            "A", "네잎클로버와 무지개",
            "B", "노력 끝의 성공",
            "C", "소중한 인연과 만남",
            "D", "평화롭고 건강한 일상")
    );

    // ──────────────────────────────────────────────
    // 유형별 폴백 결과 정의
    // ──────────────────────────────────────────────

    // love-style: A=열정형, B=감성형, C=사교형, D=안정형
    private static final Map<String, Map<String, Object>> LOVE_STYLE_FALLBACKS = Map.of(
        "A", Map.of(
            "type", "열정적 러버",
            "typeEmoji", "🔥",
            "title", "불꽃처럼 타오르는 열정적 연애가",
            "description", "당신은 사랑에 빠지면 온 마음을 다 바치는 열정적인 연애 스타일입니다. 좋아하는 감정을 숨기지 못하고 적극적으로 표현하며, 상대에게 먼저 다가가는 것을 두려워하지 않습니다. 연애를 하면 매 순간이 설레고, 상대와의 시간을 최우선으로 생각합니다. 다만 너무 강한 열정이 상대를 부담스럽게 할 수 있으니 적절한 거리감도 필요합니다.",
            "strengths", List.of("솔직하고 적극적인 표현력", "상대를 즐겁게 해주는 에너지", "새로운 데이트를 기획하는 센스"),
            "weaknesses", List.of("질투심이 강해질 수 있음", "감정 기복이 클 수 있음"),
            "advice", "당신의 열정은 큰 매력이지만, 가끔은 상대의 템포에 맞추는 여유도 필요합니다. 사랑은 단거리 달리기가 아닌 마라톤이니까요. 상대의 작은 변화에도 관심을 기울여보세요.",
            "compatibility", "안정형 파트너",
            "score", 82
        ),
        "B", Map.of(
            "type", "감성적 로맨티스트",
            "typeEmoji", "🌙",
            "title", "달빛처럼 따뜻한 감성 로맨티스트",
            "description", "당신은 깊은 감성으로 사랑을 느끼고, 상대의 마음을 섬세하게 읽어내는 로맨틱한 연애 스타일입니다. 눈빛과 작은 행동으로 사랑을 표현하며, 진정한 교감을 중요시합니다. 상대의 감정 변화를 누구보다 빨리 감지하고 따뜻하게 감싸줍니다. 다만 혼자 감정을 삭이는 경향이 있어 표현하는 연습이 필요합니다.",
            "strengths", List.of("뛰어난 공감 능력", "진심 어린 세심한 배려", "깊은 감정적 유대감 형성"),
            "weaknesses", List.of("감정을 표현하지 않아 오해를 살 수 있음", "이별에 오래 아파할 수 있음"),
            "advice", "감성이 풍부한 당신은 이미 훌륭한 파트너입니다. 다만 속마음을 말로 표현하는 연습을 해보세요. 상대는 당신의 마음을 짐작이 아닌 확인으로 알고 싶어합니다.",
            "compatibility", "열정형 파트너",
            "score", 78
        ),
        "C", Map.of(
            "type", "사교적 무드메이커",
            "typeEmoji", "🎉",
            "title", "함께하면 즐거운 사교형 연애가",
            "description", "당신은 밝고 유쾌한 에너지로 연애를 즐기는 사교적인 스타일입니다. 상대와 함께하는 시간을 재미있게 만드는 능력이 탁월하고, 기념일마다 깜짝 이벤트를 준비하는 센스도 갖추고 있습니다. 넓은 인간관계 속에서도 연인을 특별하게 대해주는 매력이 있습니다. 다만 가끔은 둘만의 깊은 대화 시간도 필요합니다.",
            "strengths", List.of("분위기를 밝게 만드는 능력", "재치 있는 이벤트 기획력", "유연한 갈등 해결 능력"),
            "weaknesses", List.of("깊은 대화보다 분위기에 치우칠 수 있음", "혼자만의 시간이 부족할 수 있음"),
            "advice", "밝은 에너지가 매력인 당신이지만, 때로는 조용히 상대의 이야기에 귀 기울여보세요. 재미만이 아닌 깊은 교감이 관계를 더 단단하게 만듭니다. 둘만의 진지한 시간도 소중히 여기세요.",
            "compatibility", "감성형 파트너",
            "score", 80
        ),
        "D", Map.of(
            "type", "안정적 수호자",
            "typeEmoji", "🛡️",
            "title", "든든한 바위같은 안정형 연애가",
            "description", "당신은 한결같은 마음으로 상대를 지켜주는 안정적인 연애 스타일입니다. 화려한 표현보다는 묵묵한 행동으로 사랑을 보여주며, 어떤 상황에서도 상대의 편이 되어줍니다. 신뢰와 약속을 가장 중요하게 생각하고, 오래 만날수록 더 깊어지는 사랑을 합니다. 다만 너무 무덤덤해 보일 수 있으니 가끔은 표현도 필요합니다.",
            "strengths", List.of("흔들리지 않는 믿음직한 모습", "약속을 반드시 지키는 성실함", "오래갈수록 깊어지는 진정성"),
            "weaknesses", List.of("표현이 부족해 오해받을 수 있음", "변화를 싫어해 루틴에 빠질 수 있음"),
            "advice", "안정감은 연애에서 가장 귀한 자산입니다. 하지만 가끔은 예상 밖의 행동으로 상대에게 설렘을 선물해보세요. 작은 편지 한 장이 큰 감동을 줄 수 있습니다.",
            "compatibility", "사교형 파트너",
            "score", 76
        )
    );

    // hidden-self: A=자유영혼, B=내면탐구자, C=실행가, D=관계중시형
    private static final Map<String, Map<String, Object>> HIDDEN_SELF_FALLBACKS = Map.of(
        "A", Map.of(
            "type", "자유로운 영혼",
            "typeEmoji", "🦅",
            "title", "경계를 넘나드는 자유로운 탐험가",
            "description", "당신의 내면에는 어디에도 얽매이지 않는 자유로운 영혼이 숨어 있습니다. 일상 속에서는 무난해 보이지만, 마음 깊은 곳에서는 항상 새로운 세계를 갈망하고 있습니다. 틀에 갇히는 것을 싫어하며, 나만의 독창적인 길을 걷고 싶어합니다. 이 에너지를 잘 활용하면 남들이 보지 못하는 기회를 포착할 수 있습니다.",
            "strengths", List.of("창의적 사고와 상상력", "변화에 대한 적응력", "독립적인 판단력"),
            "weaknesses", List.of("한 곳에 집중하기 어려움", "책임감이 부담스러울 때가 있음"),
            "advice", "자유로운 영혼은 당신의 가장 큰 재능입니다. 하지만 가끔은 한 곳에 뿌리를 내리는 용기도 필요합니다. 자유와 안정 사이에서 당신만의 균형을 찾아보세요.",
            "compatibility", "실행가 유형",
            "score", 81
        ),
        "B", Map.of(
            "type", "깊은 내면 탐구자",
            "typeEmoji", "🔮",
            "title", "마음의 심연을 여행하는 탐구자",
            "description", "당신의 내면에는 세상의 본질을 꿰뚫어 보려는 깊은 탐구 정신이 숨어 있습니다. 겉으로는 조용해 보이지만, 머릿속에서는 끊임없이 삶의 의미와 자신의 정체성에 대해 고민합니다. 직관이 뛰어나고 다른 사람의 감정을 민감하게 읽어냅니다. 이 깊이 있는 내면이 당신을 특별한 존재로 만듭니다.",
            "strengths", List.of("깊은 통찰력과 직관", "풍부한 내면 세계", "타인의 감정을 읽는 공감 능력"),
            "weaknesses", List.of("생각이 너무 많아 행동이 늦을 수 있음", "외로움을 잘 느낌"),
            "advice", "깊은 생각은 지혜의 원천이지만, 때로는 머리를 비우고 몸으로 느껴보세요. 완벽한 답을 찾으려 하지 말고, 불완전한 채로 행동하는 것도 성장입니다.",
            "compatibility", "자유영혼 유형",
            "score", 77
        ),
        "C", Map.of(
            "type", "숨겨진 실행가",
            "typeEmoji", "⚡",
            "title", "생각을 현실로 만드는 행동파",
            "description", "당신의 내면에는 강력한 실행력과 추진력이 숨어 있습니다. 평소에는 신중해 보이지만, 일단 결심하면 누구보다 빠르게 움직이는 타입입니다. 문제 앞에서 좌절하기보다 해결책을 찾는 데 집중하며, 목표를 향해 꾸준히 나아갑니다. 위기 상황에서 오히려 빛을 발하는 잠재력이 있습니다.",
            "strengths", List.of("결단력과 실행력", "위기 상황에서의 침착함", "목표를 향한 끈기"),
            "weaknesses", List.of("타인의 감정에 둔감할 수 있음", "완벽주의로 스트레스를 받을 수 있음"),
            "advice", "실행력은 당신의 숨겨진 무기입니다. 하지만 가끔은 속도를 늦추고 주변을 돌아보세요. 혼자서 모든 것을 해결하려 하지 말고, 도움을 요청하는 것도 강함입니다.",
            "compatibility", "내면탐구자 유형",
            "score", 83
        ),
        "D", Map.of(
            "type", "따뜻한 연결자",
            "typeEmoji", "🤝",
            "title", "사람과 사람을 잇는 따뜻한 다리",
            "description", "당신의 내면에는 사람을 향한 깊은 애정과 연결에 대한 갈망이 숨어 있습니다. 겉으로는 독립적으로 보이지만, 마음 깊은 곳에서는 소중한 사람들과의 유대를 가장 중요하게 여깁니다. 누군가를 돕고 함께 성장할 때 가장 큰 보람을 느끼며, 관계 속에서 자신의 가치를 발견합니다.",
            "strengths", List.of("따뜻한 포용력", "관계를 이어주는 중재 능력", "헌신적인 마음"),
            "weaknesses", List.of("타인의 기대에 지칠 수 있음", "자기 자신을 후순위에 놓을 수 있음"),
            "advice", "사람을 소중히 여기는 마음은 아름답지만, 가장 먼저 챙겨야 할 사람은 바로 자신입니다. 나를 위한 시간을 따로 마련하고, '아니오'라고 말하는 연습도 해보세요.",
            "compatibility", "자유영혼 유형",
            "score", 79
        )
    );

    // fortune-type: A=직감형, B=노력형, C=인연형, D=순리형
    private static final Map<String, Map<String, Object>> FORTUNE_TYPE_FALLBACKS = Map.of(
        "A", Map.of(
            "type", "직감형 행운아",
            "typeEmoji", "✨",
            "title", "번개처럼 찾아오는 직감형 행운",
            "description", "당신은 직감을 따를 때 행운이 찾아오는 체질입니다. 논리적으로 따지면 설명이 안 되지만, '느낌이 좋다'고 생각한 순간 좋은 일이 일어나는 경험이 많았을 것입니다. 첫인상에 대한 감각이 뛰어나고, 순간적인 판단이 결과적으로 최선의 선택이 되는 경우가 많습니다. 당신의 직감을 믿으세요.",
            "strengths", List.of("뛰어난 순간 판단력", "기회를 놓치지 않는 감각", "예상치 못한 행운을 끌어당기는 힘"),
            "weaknesses", List.of("과신하면 무모해질 수 있음", "논리적 근거 없이 결정해 후회할 수 있음"),
            "advice", "당신의 직감은 정말로 특별한 능력입니다. 다만 큰 결정에서는 직감과 분석을 함께 사용하세요. 직감이 방향을 알려주면, 이성으로 길을 확인하는 것이 최고의 조합입니다.",
            "compatibility", "노력형 행운아",
            "score", 84
        ),
        "B", Map.of(
            "type", "노력형 행운아",
            "typeEmoji", "💎",
            "title", "갈고닦을수록 빛나는 노력형 행운",
            "description", "당신은 꾸준한 노력이 행운으로 돌아오는 체질입니다. 다른 사람들이 '운이 좋다'고 말하지만, 사실 그 뒤에는 묵묵한 준비와 성실한 노력이 있었습니다. 시간이 지날수록 좋은 결과가 쌓이며, 40대 이후에 크게 꽃피는 대기만성형입니다. 당신의 성실함은 반드시 보상받습니다.",
            "strengths", List.of("인내와 끈기로 만드는 확실한 성과", "시간이 지날수록 커지는 행운", "안정적이고 지속적인 운"),
            "weaknesses", List.of("초반에 성과가 느려 조급해질 수 있음", "즉흥적인 기회를 놓칠 수 있음"),
            "advice", "당신의 행운은 시간이 만들어줍니다. 조급해하지 마세요. 다만 가끔은 계획 밖의 제안에도 '네'라고 답해보세요. 예상치 못한 곳에서 행운의 통로가 열릴 수 있습니다.",
            "compatibility", "직감형 행운아",
            "score", 79
        ),
        "C", Map.of(
            "type", "인연형 행운아",
            "typeEmoji", "🌟",
            "title", "사람이 곧 행운인 인연형 복덩이",
            "description", "당신은 사람을 통해 행운이 찾아오는 인연형 체질입니다. 좋은 사람을 만나는 데 타고난 운이 있으며, 누군가의 소개나 추천으로 인생이 바뀌는 경험을 종종 합니다. 사교적인 에너지가 자연스럽게 좋은 기회를 끌어당기며, 인맥이 곧 재산입니다. 사람을 소중히 여기는 마음이 행운의 열쇠입니다.",
            "strengths", List.of("좋은 인연을 끌어당기는 매력", "인맥을 통한 다양한 기회", "사람을 보는 정확한 눈"),
            "weaknesses", List.of("혼자서 해내는 것에 약할 수 있음", "인간관계에 에너지를 너무 쏟을 수 있음"),
            "advice", "사람이 곧 당신의 행운입니다. 하지만 모든 사람을 만족시킬 필요는 없습니다. 진정한 인연에 집중하고, 소수의 깊은 관계가 수백 개의 얕은 관계보다 가치 있음을 기억하세요.",
            "compatibility", "순리형 행운아",
            "score", 81
        ),
        "D", Map.of(
            "type", "순리형 행운아",
            "typeEmoji", "🍃",
            "title", "흐름을 타는 자연형 행운아",
            "description", "당신은 자연의 흐름에 몸을 맡길 때 행운이 찾아오는 순리형 체질입니다. 억지로 무언가를 밀어붙이기보다 때를 기다리면 자연스럽게 기회가 찾아옵니다. 마음이 편안하고 긍정적일 때 좋은 일이 생기며, 스트레스 없는 상태에서 최고의 결정을 내립니다. 당신만의 리듬을 믿으세요.",
            "strengths", List.of("스트레스 없이 기회를 잡는 능력", "평화로운 에너지가 주변을 안정시킴", "때를 기다리는 지혜"),
            "weaknesses", List.of("수동적으로 보일 수 있음", "적극적으로 기회를 만드는 데 약함"),
            "advice", "흐름을 타는 것은 지혜롭지만, 때로는 물살을 거슬러야 할 때도 있습니다. 물이 흐르는 방향을 따르되, 가끔은 스스로 방향을 만들어보세요. 인생은 흐르기만 하는 강이 아닌, 항해하는 바다입니다.",
            "compatibility", "인연형 행운아",
            "score", 77
        )
    );

    // ──────────────────────────────────────────────
    // 테스트별 질문 맵
    // ──────────────────────────────────────────────

    private static final Map<String, List<Map<String, Object>>> TEST_QUESTIONS = Map.of(
        "love-style", LOVE_STYLE_QUESTIONS,
        "hidden-self", HIDDEN_SELF_QUESTIONS,
        "fortune-type", FORTUNE_TYPE_QUESTIONS
    );

    private static final Map<String, Map<String, Map<String, Object>>> TEST_FALLBACKS = Map.of(
        "love-style", LOVE_STYLE_FALLBACKS,
        "hidden-self", HIDDEN_SELF_FALLBACKS,
        "fortune-type", FORTUNE_TYPE_FALLBACKS
    );

    private static final Map<String, String> TEST_NAMES = Map.of(
        "love-style", "연애 유형",
        "hidden-self", "숨겨진 나",
        "fortune-type", "행운 체질"
    );

    // ──────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────

    /**
     * 사용 가능한 심리테스트 목록 반환
     */
    public List<Map<String, Object>> getTests() {
        return TEST_META;
    }

    /**
     * 심리테스트 분석 스트리밍
     * 캐시 있으면 cached 이벤트로 즉시 반환, 없으면 AI 스트리밍 후 서버에서 캐시 저장
     */
    public SseEmitter streamAnalyze(String testId, String answers, String birthDate, String gender, Runnable onSuccess) {
        return doStreamAnalyze(testId, answers, birthDate, gender, onSuccess);
    }

    public SseEmitter streamAnalyze(String testId, String answers, String birthDate, String gender) {
        return doStreamAnalyze(testId, answers, birthDate, gender, null);
    }

    private SseEmitter doStreamAnalyze(String testId, String answers, String birthDate, String gender, Runnable onSuccess) {
        String cacheKey = buildCacheKey(testId, answers, birthDate, gender);
        Map<String, Object> cached = getFromCache("psych-test", cacheKey);
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

        // 점수 계산 및 우세 유형 결정
        String[] answerArr = answers.toUpperCase().split(",");
        Map<String, Integer> scores = calculateScores(answerArr);
        String dominantType = getDominantType(scores);

        String systemPrompt = buildSystemPrompt();
        String userPrompt = buildUserPrompt(testId, answerArr, scores, dominantType, birthDate, gender);
        final String finalCacheKey = cacheKey;
        final String finalTestId = testId;
        final Map<String, Integer> finalScores = scores;

        return claudeApiService.generateStream(systemPrompt, userPrompt, 1000, (fullText) -> {
            try {
                String json = ClaudeApiService.extractJson(fullText);
                if (json != null) {
                    Map<String, Object> result = objectMapper.readValue(json, new TypeReference<>() {});
                    result.put("testId", finalTestId);
                    result.put("testName", TEST_NAMES.get(finalTestId));
                    result.put("answerScores", finalScores);
                    saveToCache("psych-test", finalCacheKey, result);
                }
            } catch (Exception e) {
                log.warn("심리테스트 스트림 캐시 저장 실패: {}", e.getMessage());
            }
            if (onSuccess != null) onSuccess.run();
        });
    }

    /**
     * 심리테스트 분석
     */
    @Transactional
    public Map<String, Object> analyzeTest(String testId, String answers, String birthDate, String gender) {
        if (!TEST_QUESTIONS.containsKey(testId)) {
            return Map.of("error", "존재하지 않는 테스트입니다: " + testId);
        }

        // 캐시 체크
        String cacheKey = buildCacheKey(testId, answers, birthDate, gender);
        Map<String, Object> cached = getFromCache("psych-test", cacheKey);
        if (cached != null) return cached;

        // 답변 파싱 및 점수 계산
        String[] answerArr = answers.toUpperCase().split(",");
        Map<String, Integer> scores = calculateScores(answerArr);
        String dominantType = getDominantType(scores);

        // AI 분석 시도
        Map<String, Object> result = tryAiAnalysis(testId, answerArr, scores, dominantType, birthDate, gender);
        if (result != null) {
            result.put("testId", testId);
            result.put("testName", TEST_NAMES.get(testId));
            result.put("answerScores", scores);
            saveToCache("psych-test", cacheKey, result);
            return result;
        }

        // 폴백: 패턴 기반 결과
        log.info("AI unavailable, using fallback for test: {}", testId);
        Map<String, Object> fallback = new LinkedHashMap<>(TEST_FALLBACKS.get(testId).get(dominantType));
        fallback.put("testId", testId);
        fallback.put("testName", TEST_NAMES.get(testId));
        fallback.put("answerScores", scores);
        return fallback;
    }

    // ──────────────────────────────────────────────
    // 점수 계산
    // ──────────────────────────────────────────────

    private Map<String, Integer> calculateScores(String[] answers) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        scores.put("A", 0);
        scores.put("B", 0);
        scores.put("C", 0);
        scores.put("D", 0);

        for (String a : answers) {
            String key = a.trim();
            if (scores.containsKey(key)) {
                scores.put(key, scores.get(key) + 1);
            }
        }
        return scores;
    }

    private String getDominantType(Map<String, Integer> scores) {
        return scores.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("A");
    }

    // ──────────────────────────────────────────────
    // AI 분석
    // ──────────────────────────────────────────────

    private Map<String, Object> tryAiAnalysis(String testId, String[] answers,
                                               Map<String, Integer> scores, String dominantType,
                                               String birthDate, String gender) {
        if (!claudeApiService.isAvailable()) {
            return null;
        }

        try {
            String systemPrompt = buildSystemPrompt();
            String userPrompt = buildUserPrompt(testId, answers, scores, dominantType, birthDate, gender);

            String response = claudeApiService.generate(systemPrompt, userPrompt, 1000);
            String json = ClaudeApiService.extractJson(response);

            if (json != null) {
                return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            log.error("AI psych test analysis failed: {}", e.getMessage());
        }
        return null;
    }

    private String buildSystemPrompt() {
        return """
당신은 심리학이랑 사주 역학을 결합한 성격 분석 전문가야!
심리테스트 응답 패턴을 분석해서 재밌고 공감 가는 유형 분석을 해주는 게 특기거든.

【말투 규칙】
- 카페에서 친한 친구한테 수다 떨듯이 자연스러운 반말
- 분석 보고서가 아니라 대화하는 느낌으로 써줘
- 딱딱한 문장, 고전적 표현, 격식체 절대 금지
- "~하옵소서", "~이로다", "~하시오" 같은 고전적/격식체 표현 절대 금지

【역할】
- 심리학적 성격 유형 이론(MBTI, 에니어그램 등)에 정통해
- 사주 오행(목화토금수)과 심리 유형을 연결하여 독창적 해석을 해줘
- 재미있지만 통찰력 있는 분석을 해줘

【작성 규칙】
1. 반드시 JSON만 응답 (설명 텍스트 없이)
2. description은 4-5문장으로 구체적이고 공감 가는 내용
3. strengths는 정확히 3개, weaknesses는 정확히 2개
4. advice는 3문장으로 따뜻하면서도 실질적인 조언
5. score는 0-100 사이 정수 (유형 적합도)
6. 자연스러운 대화체 반말로 작성
7. 격식체, 보고서 톤 대신 자연스러운 대화체 반말 사용

응답 형식:
{"type":"유형명","typeEmoji":"이모지","title":"유형 제목","description":"성격 설명(4-5문장)","strengths":["강점1","강점2","강점3"],"weaknesses":["약점1","약점2"],"advice":"조언(3문장)","compatibility":"잘 맞는 유형","score":0-100}""";
    }

    private String buildUserPrompt(String testId, String[] answers,
                                    Map<String, Integer> scores, String dominantType,
                                    String birthDate, String gender) {
        StringBuilder sb = new StringBuilder();

        sb.append("【심리테스트 분석 요청】\n");
        sb.append("테스트: ").append(TEST_NAMES.get(testId)).append(" 테스트\n");
        sb.append("답변 패턴: A=").append(scores.get("A"))
          .append("회, B=").append(scores.get("B"))
          .append("회, C=").append(scores.get("C"))
          .append("회, D=").append(scores.get("D")).append("회\n");
        sb.append("우세 유형: ").append(dominantType).append("\n");

        // 질문별 답변 상세
        List<Map<String, Object>> questions = TEST_QUESTIONS.get(testId);
        sb.append("\n【질문별 응답】\n");
        for (int i = 0; i < Math.min(answers.length, questions.size()); i++) {
            Map<String, Object> q = questions.get(i);
            String answer = answers[i].trim();
            String choiceText = (String) q.getOrDefault(answer, "무응답");
            sb.append(String.format("%d. %s → %s (%s)\n", i + 1, q.get("q"), answer, choiceText));
        }

        if (birthDate != null && !birthDate.isBlank()) {
            sb.append("\n【생년월일】").append(birthDate);
            if (gender != null && !gender.isBlank()) {
                sb.append(" / ").append(gender);
            }
            sb.append("\n사주 오행과 심리 유형을 결합하여 더 깊은 분석을 해주세요.\n");
        }

        sb.append("\n위 응답 패턴을 분석하여 '").append(TEST_NAMES.get(testId)).append("' 유형 결과를 JSON으로 작성하세요.");

        return sb.toString();
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
