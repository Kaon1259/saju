/**
 * 띠 × 출생연도 × 오늘 날짜 룰 기반 동적 운세 생성 (AI 호출 0)
 *
 * 원리:
 *   1) 출생연도 → 60갑자 (천간 + 지지)
 *   2) 오늘 날짜 → 일진 (천간 + 지지)
 *   3) 두 천간의 오행 관계 (상생/상극/비화)
 *   4) 두 지지의 합충 관계 (육합/삼합/충/형)
 *   5) 연령대 + 위 관계 → 텍스트 슬롯 조합
 *
 * 출력: { year, birthYear, ganji, ageTier, title, text } 배열 (각 띠 6개 출생연도)
 */

// ===== 60갑자 기초 =====
const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const JIJI_ZODIAC = { '자': '쥐', '축': '소', '인': '호랑이', '묘': '토끼', '진': '용', '사': '뱀', '오': '말', '미': '양', '신': '원숭이', '유': '닭', '술': '개', '해': '돼지' };
const ZODIAC_TO_JIJI = Object.fromEntries(Object.entries(JIJI_ZODIAC).map(([k, v]) => [v, k]));

// 오행: 0=목 1=화 2=토 3=금 4=수
const CHEONGAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]; // 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수
const JIJI_OHENG = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]; // 자=수, 축=토, 인=목, 묘=목, 진=토, 사=화, 오=화, 미=토, 신=금, 유=금, 술=토, 해=수
const OHENG_NAME = ['목', '화', '토', '금', '수'];
const OHENG_PRODUCES = [1, 2, 3, 4, 0]; // 목→화→토→금→수→목
const OHENG_OVERCOMES = [2, 3, 4, 0, 1]; // 목→토→수→화→금→목

// 지지 육합: (자축), (인해), (묘술), (진유), (사신), (오미)
const YUKAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
// 지지 삼합: (신자진=수국), (해묘미=목국), (인오술=화국), (사유축=금국)
const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];

// ===== 60갑자 계산 =====
function ganjiOfYear(year) {
  // 1924년 = 갑자년 기준
  const offset = ((year - 1924) % 60 + 60) % 60;
  const stem = offset % 10;
  const branch = offset % 12;
  return { stem, branch, name: CHEONGAN[stem] + JIJI[branch] };
}

function ganjiOfDate(date) {
  // 1900-01-31 = 갑진일 기준 (stem=0, branch=4)
  const base = new Date(Date.UTC(1900, 0, 31));
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const days = Math.floor((target - base) / (1000 * 60 * 60 * 24));
  const stem = ((days % 10) + 10) % 10;
  const branch = ((days + 4) % 12 + 12) % 12;
  return { stem, branch, name: CHEONGAN[stem] + JIJI[branch] };
}

// ===== 관계 분석 =====
function ohengRelation(a, b) {
  if (a === b) return 'same';
  if (OHENG_PRODUCES[a] === b) return 'iProduce';   // 내가 도와줌
  if (OHENG_PRODUCES[b] === a) return 'helped';     // 상대가 도와줌
  if (OHENG_OVERCOMES[a] === b) return 'iOvercome'; // 내가 누름
  if (OHENG_OVERCOMES[b] === a) return 'overcome';  // 상대가 누름
  return 'neutral';
}

function jijiRelation(a, b) {
  if (a === b) return 'same';
  for (const [x, y] of YUKAP) if ((a === x && b === y) || (a === y && b === x)) return 'yukap';
  for (const trio of SAMHAP) if (trio.includes(a) && trio.includes(b) && a !== b) return 'samhap';
  if (Math.floorMod(a - b, 12) === 6) return 'chung';
  return 'neutral';
}
if (!Math.floorMod) Math.floorMod = (a, n) => ((a % n) + n) % n;

// ===== 텍스트 슬롯 =====
const OHENG_TEXTS = {
  same:      ['같은 기운이라 동질감 강한 하루야. 친구처럼 편한 사람과 시간 보내면 운이 살아.', '비슷한 결의 사람들과 의기투합 좋은 날. 다만 너무 비슷해서 새 자극이 부족할 수 있어.'],
  iProduce:  ['오늘은 베푸는 게 곧 받는 길이야. 누군가에게 도움 한 번 주면 그게 되돌아와.', '에너지가 흘러나가는 날. 후배·자녀·동료에게 조언이나 도움 주면 좋은 인연으로 연결돼.'],
  helped:   ['오늘은 도움받는 운. 평소 막혔던 일이 의외의 인맥으로 풀려. 부탁하기 부끄러워 말고 솔직하게.', '주변에서 받는 게 많은 날. 받은 만큼 진심 어린 감사 표현이 다음 운을 부른다.'],
  iOvercome: ['주도권을 쥐기 좋은 날. 미뤄왔던 결정 오늘 밀어붙여도 좋아. 다만 너무 강하게 밀면 반발 생기니 부드럽게.', '리더십 발휘 시기. 본인 의견을 분명히 표현하면 통해. 단 디테일 챙기는 옆 사람의 점검 받자.'],
  overcome:  ['오늘은 한 발 물러서는 게 답. 무리한 추진은 역효과. 평온한 휴식과 자기 시간이 운을 살린다.', '평소보다 압박감 느껴질 수 있는 날. 그럴 땐 가까운 사람과 짧은 통화 한 번이 큰 위로.'],
  neutral:   ['특별한 변동 없이 평이한 흐름. 평소 루틴 유지하는 게 가장 안전한 하루.', '큰 변화 없는 안정적 하루. 작은 행복에 집중하면 의외로 만족감 커.'],
};

const JIJI_TEXTS = {
  same:    ['띠가 같아 본인의 정체성 확인하기 좋은 날. 거울 속 자신과 한 번 대화해봐.', '본인 띠와 같은 일진. 자기 내면을 들여다보기 좋은 시기.'],
  yukap:   ['오늘은 천생연분급 합이 들어와. 평소 신경 쓰던 사람과의 만남 추천. 의외의 인연이 시작될 수도.', '특히 좋은 합의 날. 새 인연·중요한 만남·계약 같은 일에 좋은 기운.'],
  samhap:  ['삼합의 기운이 함께해. 셋이 모이는 자리(가족·동료·친구) 운이 좋아. 단체 모임에 적극 참여.', '오늘은 협력의 기운. 혼자보단 같이 하는 일에서 좋은 결과.'],
  chung:   ['충돌 기운 있는 날이라 평소보다 갈등 가능. 욱하지 말고 한 박자 쉬는 게 답. 큰 결정은 내일로.', '오늘은 부딪힘 조심. 운전·말다툼·서두름 모두 자제. 차분함이 무기.'],
  neutral: ['평이한 일진. 무리하지 않으면 무난한 하루.', '특별한 일진 작용 없음. 본인 페이스대로 가면 충분.'],
};

const AGE_TIPS = {
  0: ['건강 챙기는 게 최우선. 무리한 외출보다 가까운 사람과 차 한잔이 보약.', '가족과의 짧은 통화 한 번이 하루를 따뜻하게 만들어.'],
  1: ['직장·가정에서 균형 찾기. 본인 한계 알고 거절도 해야 해.', '아이들·후배에게 따뜻한 말 한마디가 큰 힘이 돼.'],
  2: ['새로운 도전에 좋은 시기. 망설였던 일이라면 오늘 첫걸음 떼봐.', '인맥 확장 좋아. SNS·동호회·강의 등 적극 참여.'],
  3: ['공부·자기계발 황금기. 짧고 강한 학습이 효율 ↑.', '에너지 발산 필요. 운동이나 새 액티비티 시도 추천.'],
};

// 띠 × 관계 조합용 키워드 (각 띠의 강점)
const ZODIAC_THEME = {
  '쥐':     '재물 흐름과 인맥',
  '소':     '꾸준함과 성실함',
  '호랑이': '추진력과 리더십',
  '토끼':   '감각과 화합',
  '용':     '큰 그림과 명예',
  '뱀':     '직관과 깊이',
  '말':     '활동력과 이동',
  '양':     '예술 감성과 평온',
  '원숭이': '재치와 아이디어',
  '닭':     '꼼꼼함과 계획',
  '개':     '신뢰와 의리',
  '돼지':   '복덕과 인복',
};

const TITLES_BY_RELATION = {
  same:      ['같은 기운, 안정의 날', '동질감이 운을 부른다'],
  iProduce:  ['베푸는 만큼 돌아와', '주는 운이 좋은 날'],
  helped:    ['도움받는 운', '귀인이 다가온다'],
  iOvercome: ['주도권을 쥐는 날', '결정에 강한 시기'],
  overcome:  ['한 발 물러서기', '평온이 답'],
  neutral:   ['평이한 흐름', '안정적인 하루'],
};

// ===== 60갑자 사이클 출생연도 =====
const ZODIAC_BIRTH_YEARS = {
  '쥐': [1948, 1960, 1972, 1984, 1996, 2008],
  '소': [1949, 1961, 1973, 1985, 1997, 2009],
  '호랑이': [1950, 1962, 1974, 1986, 1998, 2010],
  '토끼': [1951, 1963, 1975, 1987, 1999, 2011],
  '용': [1952, 1964, 1976, 1988, 2000, 2012],
  '뱀': [1953, 1965, 1977, 1989, 2001, 2013],
  '말': [1954, 1966, 1978, 1990, 2002, 2014],
  '양': [1955, 1967, 1979, 1991, 2003, 2015],
  '원숭이': [1956, 1968, 1980, 1992, 2004, 2016],
  '닭': [1957, 1969, 1981, 1993, 2005, 2017],
  '개': [1958, 1970, 1982, 1994, 2006, 2018],
  '돼지': [1959, 1971, 1983, 1995, 2007, 2019],
};

function ageTierOf(birthYear, today = new Date()) {
  const age = today.getFullYear() - birthYear;
  if (age >= 60) return 0;
  if (age >= 40) return 1;
  if (age >= 20) return 2;
  return 3;
}

// 결정적 시드 — 같은 (날짜+연도+슬롯) 조합엔 항상 같은 텍스트
function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function seedOf(...nums) {
  let s = 0;
  for (const n of nums) s = (s * 31 + (n | 0)) | 0;
  return s;
}

/**
 * 한 띠의 6개 출생연도별 오늘 운세 생성
 * @param zodiac '쥐'~'돼지'
 * @param date Date 객체 (기본: 오늘)
 * @returns [{ year, birthYear, ganji, title, text }, ...]
 */
export function getZodiacByYearList(zodiac, date = new Date()) {
  const years = ZODIAC_BIRTH_YEARS[zodiac];
  if (!years) return [];
  const today = ganjiOfDate(date);
  const todayKey = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

  return years.map((y) => {
    const birth = ganjiOfYear(y);
    const ohengRel = ohengRelation(CHEONGAN_OHENG[birth.stem], CHEONGAN_OHENG[today.stem]);
    const jijiRel = jijiRelation(birth.branch, today.branch);
    const tier = ageTierOf(y, date);

    const seedBase = seedOf(todayKey, y);
    const ohengSentence = pick(OHENG_TEXTS[ohengRel], seedBase);
    const jijiSentence = pick(JIJI_TEXTS[jijiRel], seedBase + 1);
    const ageSentence = pick(AGE_TIPS[tier], seedBase + 2);
    const title = pick(TITLES_BY_RELATION[ohengRel], seedBase + 3);
    const themeWord = ZODIAC_THEME[zodiac];

    // 풍부한 4문장 조합
    const text = `${ohengSentence} ${jijiSentence} ${zodiac}띠 특유의 ${themeWord}이 살아나는 시기야. ${ageSentence}`;

    return {
      year: `${y}년생`,
      birthYear: y,
      ganji: birth.name + '년',
      todayGanji: today.name + '일',
      title,
      text,
    };
  });
}

/** 사용자 출생연도와 가장 근접한 항목 1개 반환 */
export function getZodiacByYearMatch(zodiac, userBirthYear, date = new Date()) {
  const list = getZodiacByYearList(zodiac, date);
  if (list.length === 0) return null;
  if (!userBirthYear) return list[Math.floor(list.length / 2)];
  let best = list[0];
  let minDiff = Math.abs(list[0].birthYear - userBirthYear);
  for (const item of list) {
    const diff = Math.abs(item.birthYear - userBirthYear);
    if (diff < minDiff) { minDiff = diff; best = item; }
  }
  return best;
}

/** 띠의 오늘 한 줄 요약 (출생연도 무관) — 일진 기반 */
export function getZodiacOneLiner(zodiac, date = new Date()) {
  const today = ganjiOfDate(date);
  const myBranch = ZODIAC_TO_JIJI[zodiac];
  if (myBranch == null) return null;
  const myBranchIdx = JIJI.indexOf(myBranch);
  const jijiRel = jijiRelation(myBranchIdx, today.branch);
  const ohengRel = ohengRelation(JIJI_OHENG[myBranchIdx], CHEONGAN_OHENG[today.stem]);

  const oneLiners = {
    yukap:   `오늘 ${zodiac}띠는 천생연분급 합이 들어와. 중요한 만남에 좋은 날.`,
    samhap:  `오늘 ${zodiac}띠는 협력의 기운이 강해. 모임·팀워크에 좋아.`,
    chung:   `오늘 ${zodiac}띠는 충돌 기운 조심. 욱하지 말고 한 박자 쉬어가자.`,
    same:    `오늘 ${zodiac}띠는 자기 내면 들여다보기 좋은 날.`,
    neutral: ohengRel === 'helped' ? `오늘 ${zodiac}띠는 도와주는 사람이 나타나는 날.`
           : ohengRel === 'iProduce' ? `오늘 ${zodiac}띠는 베푸는 만큼 돌아오는 날.`
           : ohengRel === 'iOvercome' ? `오늘 ${zodiac}띠는 주도권 쥐기 좋은 날.`
           : ohengRel === 'overcome' ? `오늘 ${zodiac}띠는 한 발 물러서는 게 답.`
           : `오늘 ${zodiac}띠는 평이한 흐름. 무리하지 않으면 무난.`,
  };
  return oneLiners[jijiRel] || oneLiners.neutral;
}

export default { getZodiacByYearList, getZodiacByYearMatch, getZodiacOneLiner };
