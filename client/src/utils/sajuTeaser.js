// 랜딩 "맛보기" 전용 — 서버/AI 호출 없이 양력 생년월일 + 성별로 일간·올해 세운 십성을 로컬 계산.
// 일주(日柱)는 만세력 일수 계산으로 정확. 시주·월주는 쓰지 않는다(절기 의존 → 맛보기에선 제외).
// 세운(歲運)은 해당 연도 간지 기준 (입춘 경계는 단순화: 2월 4일 이전이면 전년도로 취급).

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEM_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCH_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const ELEM = ['목', '화', '토', '금', '수'];
const ELEM_HANJA = ['木', '火', '土', '金', '水'];

// 지지 본기(정기) 천간 인덱스 — 세운 지지의 십성 판단용
const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

// 일간별 한 줄 이미지 + 연애 성향 (명리 통변의 흔한 상징 — 단정이 아니라 "경향")
const DAY_MASTER = [
  { image: '곧게 뻗는 큰 나무', love: '한번 마음먹으면 곧장 직진하는 타입. 자존심 때문에 먼저 숙이기가 어려워요.' },
  { image: '휘어도 꺾이지 않는 덩굴', love: '상대에게 맞추며 스며드는 타입. 겉은 부드럽지만 속으로 오래 담아둬요.' },
  { image: '세상을 비추는 태양', love: '밝고 화끈하게 표현하는 타입. 끌리면 숨기지 못하고, 식는 것도 빠를 수 있어요.' },
  { image: '어둠을 밝히는 촛불', love: '섬세하고 한 사람에게 깊이 몰입하는 타입. 감정 기복을 속으로 삼키는 편이에요.' },
  { image: '묵직한 큰 산', love: '믿음직하고 신중한 타입. 마음을 여는 데 오래 걸리지만 한번 주면 변치 않아요.' },
  { image: '만물을 품는 논밭', love: '챙겨주고 받아주는 타입. 좋은 사람이 되려다 정작 내 마음을 놓치기 쉬워요.' },
  { image: '단단한 바위와 쇠', love: '의리 있고 확실한 걸 좋아하는 타입. 표현이 투박해서 오해를 사기도 해요.' },
  { image: '잘 다듬어진 보석', love: '예민하고 취향이 분명한 타입. 기준이 높아 인연을 가리는 편이에요.' },
  { image: '넓게 흐르는 큰 강', love: '자유롭고 스케일 큰 타입. 구속받는 느낌이 들면 거리를 두려 해요.' },
  { image: '조용히 스미는 빗물', love: '생각이 깊고 감수성이 풍부한 타입. 속마음을 늦게 보여주는 편이에요.' },
];

function dayPillar(y, m, d) {
  // 1900-01-01 = 甲戌일 (천간 0, 지지 10). UTC 기준 일수 차로 계산.
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
  return { stem: ((days % 10) + 10) % 10, branch: (((days + 10) % 12) + 12) % 12 };
}

// 일간(d) 기준 대상 천간(t)의 십성
export function tenGod(d, t) {
  const same = d % 2 === t % 2;
  const rel = (Math.floor(t / 2) - Math.floor(d / 2) + 5) % 5; // 0 비겁 1 식상 2 재성 3 관성 4 인성
  const names = [
    ['비견', '겁재'], ['식신', '상관'], ['편재', '정재'], ['편관', '정관'], ['편인', '정인'],
  ];
  const groups = ['비겁', '식상', '재성', '관성', '인성'];
  return { name: names[rel][same ? 0 : 1], group: groups[rel] };
}

// 올해 세운 간지 (입춘 단순화)
function yearPillar(now) {
  let y = now.getFullYear();
  const beforeIpchun = now.getMonth() === 0 || (now.getMonth() === 1 && now.getDate() < 4);
  if (beforeIpchun) y -= 1;
  return { year: y, stem: (((y - 4) % 10) + 10) % 10, branch: (((y - 4) % 12) + 12) % 12 };
}

// 연애 별: 남자=재성, 여자=관성
function loverGroup(gender) {
  return gender === 'F' ? '관성' : '재성';
}

const YEAR_LINES = {
  lover: '올해는 인연의 별이 들어오는 해예요. 새로운 만남이든 기존 관계의 진전이든, 움직이면 반응이 오는 흐름입니다.',
  비겁: '올해는 나 자신이 강해지는 해예요. 연애보다 내 페이스가 앞서서, 주도권 다툼이나 경쟁자가 변수가 될 수 있어요.',
  식상: '올해는 표현력과 매력이 살아나는 해예요. 먼저 다가가고 드러낼수록 기회가 열리는 흐름입니다.',
  인성: '올해는 안으로 정리하고 채우는 해예요. 급하게 움직이기보다 마음의 기준을 세우는 데 맞는 흐름입니다.',
  other: '올해는 관계의 무게가 바뀌는 해예요. 책임이나 현실 문제가 연애에 끼어들기 쉬워서, 속도 조절이 중요합니다.',
};

// 결정 카테고리 × 올해 세운 성격(yearKey) 별 한 줄 — 단정 대신 "경향"으로 쓴다.
export const DECISION_CATS = {
  reunion:  { label: '재회', question: '그 사람, 다시 연락 올까?' },
  breakup:  { label: '이별', question: '헤어져야 할까?' },
  confess:  { label: '고백', question: '고백, 해도 될까?' },
  marriage: { label: '결혼', question: '이 사람과 결혼해도 될까?' },
};

const CAT_LINES = {
  reunion: {
    lover: '인연의 별이 움직이는 해라 끊어진 관계에도 다시 불이 붙을 여지가 있어요. 다만 재회는 감정보다 헤어진 이유가 풀렸는지가 기준입니다.',
    비겁: '내 고집과 자존심이 앞서는 해예요. 먼저 숙이지 않으면 연락이 닿아도 같은 자리에서 막히기 쉬워요.',
    식상: '말이 앞서는 해라 연락은 닿기 쉬워요. 다만 서운함을 쏟아내면 다시 멀어질 수 있어 표현의 수위가 관건입니다.',
    인성: '마음을 돌아보고 정리하는 해예요. 급히 매달리기보다 스스로 정리가 끝난 뒤의 재회가 오래 갑니다.',
    other: '관계의 무게가 바뀌는 해라 현실 문제가 재회의 변수예요. 감정만으로 밀기보다 조건부터 맞춰 보세요.',
  },
  breakup: {
    lover: '연애 별이 움직이는 해라 지금 관계를 끊더라도 새 인연이 들어올 여지가 커요. 다만 도피성 이별은 후회로 남기 쉽습니다.',
    비겁: '내 주장이 강해지는 해라 갈등이 커 보일 수 있어요. 권태인지 본질적인 어긋남인지 먼저 구분하세요.',
    식상: '불만이 말로 터지기 쉬운 해예요. 순간의 감정으로 내린 이별 통보는 번복이 어려우니 하루 이틀 묵혀 보세요.',
    인성: '생각이 많아지는 해라 결정이 자꾸 미뤄져요. 답이 안 나올 땐 기한을 정해 두고 판단하세요.',
    other: '관계의 부담이 커지는 해예요. 헤어짐 자체보다 이유가 반복되는 패턴인지 살펴보는 게 먼저입니다.',
  },
  confess: {
    lover: '인연의 별이 들어오는 해라 마음을 전하면 반응이 오기 쉬운 흐름이에요. 타이밍만 잘 고르면 해볼 만합니다.',
    비겁: '경쟁자나 내 조급함이 변수인 해예요. 서두르지 말고 상대의 속도를 보며 다가가세요.',
    식상: '표현력과 매력이 살아나는 해라 고백에 유리한 흐름이에요. 진심을 담백하게 전할수록 좋아요.',
    인성: '마음이 안으로 향하는 해라 망설임이 길어져요. 충분히 준비하되 기회를 놓치지 않게 기한을 정해 보세요.',
    other: '관계가 무겁게 느껴지기 쉬운 해예요. 부담 주지 않는 가벼운 접근으로 시작하는 게 맞습니다.',
  },
  marriage: {
    lover: '배우자 별이 움직이는 해라 결혼 이야기가 구체화되기 좋은 흐름이에요. 다만 가볍게 단정하긴 이르고, 갈등 패턴도 함께 봐야 해요.',
    비겁: '내 의견이 강해지는 해라 양가·가치관 조율이 숙제예요. 양보할 선을 미리 정해 두세요.',
    식상: '말과 표현이 늘어 대화로 풀기 좋은 해예요. 다만 결정은 감정이 가라앉은 뒤에 하세요.',
    인성: '신중해지는 해라 결혼 결정이 늦어질 수 있어요. 불안의 정체가 현실 조건인지 마음인지 구분해 보세요.',
    other: '책임과 현실의 무게가 커지는 해예요. 결혼은 감정보다 생활 조건 합의가 우선입니다.',
  },
};

export function categoryLine(cat, t) {
  if (!t || !CAT_LINES[cat]) return '';
  return CAT_LINES[cat][t.yearKey] || CAT_LINES[cat].other;
}

/**
 * @param {string} birth 'YYYY-MM-DD' (양력)
 * @param {'M'|'F'} gender
 */
export function buildTeaser(birth, gender, now = new Date()) {
  const [y, m, d] = (birth || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const day = dayPillar(y, m, d);
  const yr = yearPillar(now);
  const dm = day.stem;

  const stemGod = tenGod(dm, yr.stem);
  const branchGod = tenGod(dm, BRANCH_MAIN_STEM[yr.branch]);
  const lover = loverGroup(gender);
  const hasLover = stemGod.group === lover || branchGod.group === lover;

  let yearKey;
  if (hasLover) yearKey = 'lover';
  else if ([stemGod.group, branchGod.group].includes('비겁')) yearKey = '비겁';
  else if ([stemGod.group, branchGod.group].includes('식상')) yearKey = '식상';
  else if ([stemGod.group, branchGod.group].includes('인성')) yearKey = '인성';
  else yearKey = 'other';
  const line = YEAR_LINES[yearKey];

  const el = Math.floor(dm / 2);
  return {
    dayStemKo: STEM_KO[dm],
    dayStemHanja: STEMS[dm],
    dayElement: ELEM[el],
    dayElementHanja: ELEM_HANJA[el],
    dayPillarKo: `${STEM_KO[dm]}${BRANCH_KO[day.branch]}`,
    image: DAY_MASTER[dm].image,
    love: DAY_MASTER[dm].love,
    year: yr.year,
    yearGanjiKo: `${STEM_KO[yr.stem]}${BRANCH_KO[yr.branch]}`,
    stemGod: stemGod.name,
    branchGod: branchGod.name,
    hasLover,
    yearKey,
    yearLine: line,
  };
}
