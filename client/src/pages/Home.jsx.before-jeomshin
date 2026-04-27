import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import FortuneCard from '../components/FortuneCard';
import { getGuestFortune, getLoveTemperature, getLoveFortuneBasic, getLoveFortuneStream, saveLoveFortuneCache, getUser, getMyFortune, isGuest, getHistory, getDailyTarotBasic, getDailyTarotStream } from '../api/fortune';
import BirthDatePicker from '../components/BirthDatePicker';
// sounds (kept for potential future use)
import { shareResult } from '../utils/share';
import parseAiJson from '../utils/parseAiJson';
import AnalysisMatrix from '../components/AnalysisMatrix';
import HeartCost from '../components/HeartCost';
import HistoryDrawer from '../components/HistoryDrawer';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import { getCurrentWeather, getTimeBand } from '../utils/weather';
import { DAILY_TAROT_MINOR } from '../data/dailyTarotMinor';
import { startKakaoLogin } from '../utils/kakaoAuth';
import './Home.css';

const BIRTH_TIMES = [
  { value: '', label: '모름' },
  { value: '자시', label: '자시 (23~01시)' },
  { value: '축시', label: '축시 (01~03시)' },
  { value: '인시', label: '인시 (03~05시)' },
  { value: '묘시', label: '묘시 (05~07시)' },
  { value: '진시', label: '진시 (07~09시)' },
  { value: '사시', label: '사시 (09~11시)' },
  { value: '오시', label: '오시 (11~13시)' },
  { value: '미시', label: '미시 (13~15시)' },
  { value: '신시', label: '신시 (15~17시)' },
  { value: '유시', label: '유시 (17~19시)' },
  { value: '술시', label: '술시 (19~21시)' },
  { value: '해시', label: '해시 (21~23시)' },
];

const CATEGORY_CONFIG = [
  { key: 'overall', icon: '🌟', title: '총운', field: 'overall' },
  { key: 'love', icon: '💕', title: '애정운', field: 'love' },
  { key: 'money', icon: '💰', title: '재물운', field: 'money' },
  { key: 'health', icon: '💪', title: '건강운', field: 'health' },
  { key: 'work', icon: '💼', title: '직장운', field: 'work' },
];

const LOVE_TYPES = [
  // 솔로
  { id: 'crush',              label: '짝사랑',    icon: '💘', desc: '내 마음이 이루어질까?', group: 'solo' },
  { id: 'blind_date',         label: '소개팅',    icon: '🤝', desc: '좋은 만남이 올까?', group: 'solo' },
  { id: 'meeting_timing',     label: '만남시기',   icon: '🔮', desc: '언제 인연을 만날까', group: 'solo' },
  { id: 'ideal_type',         label: '이상형',    icon: '👩‍❤️‍👨', desc: '사주로 보는 나의 이상형', group: 'solo' },
  // 썸/연애
  { id: 'couple_fortune',     label: '데이트운',   icon: '💑', desc: '오늘 연인과의 하루', group: 'love' },
  { id: 'confession_timing',  label: '고백타이밍',    icon: '💌', desc: '고백 타이밍은?', group: 'love' },
  { id: 'some_check',         label: '썸진단',    icon: '🎯', desc: '이 썸, 연애로 발전할까?', group: 'love' },
  { id: 'contact_fortune',    label: '연락운',    icon: '📱', desc: '먼저 연락해도 될까?', group: 'love' },
  // 결혼/인연
  { id: 'marriage',           label: '결혼운',    icon: '💒', desc: '결혼 시기와 인연', group: 'marriage' },
  { id: 'remarriage',         label: '재혼운',    icon: '💍', desc: '새로운 인연의 가능성', group: 'marriage' },
  { id: 'reunion',            label: '재회운',    icon: '💔', desc: '다시 만날 수 있을까?', group: 'marriage' },
  { id: 'past_life',          label: '전생인연',   icon: '🌌', desc: '전생에서의 우리 이야기', group: 'marriage' },
];

const LOVE_GROUPS = [
  { key: 'love', label: '썸/연애 중', emoji: '💗', status: ['IN_RELATIONSHIP', 'SOME'] },
  { key: 'marriage', label: '결혼/인연', emoji: '💒', status: ['IN_RELATIONSHIP', 'COMPLICATED'] },
  { key: 'solo', label: '솔로를 위한', emoji: '✨', status: ['SINGLE'] },
];

const LOVE_HEART_MAP = { relationship: 'LOVE_RELATIONSHIP', crush: 'LOVE_CRUSH', some_check: 'LOVE_SOME_CHECK', blind_date: 'LOVE_BLIND_DATE', couple_fortune: 'LOVE_COUPLE', confession_timing: 'LOVE_CONFESSION', ideal_type: 'LOVE_IDEAL_TYPE', reunion: 'LOVE_REUNION', remarriage: 'LOVE_REMARRIAGE', marriage: 'LOVE_MARRIAGE', past_life: 'LOVE_PAST_LIFE', meeting_timing: 'LOVE_MEETING_TIMING', contact_fortune: 'LOVE_CONTACT' };

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

const DAILY_MESSAGES = [
  '설레는 인연이 다가오고 있어요 💫',
  '사랑의 기운이 넘치는 하루 💕',
  '당신의 매력이 빛나는 날이에요 ✨',
  '좋은 만남이 기다리고 있어요 🌹',
  '사랑의 별이 당신을 비추고 있어요 🌟',
  '마음을 열면 인연이 보입니다 💗',
  '운명의 상대가 가까이 있을지도 🔮',
];

// 홈의 분석 메뉴는 모두 전용 페이지로 이관됨
// - 1:1연애운/결혼운/전생인연/재회운/재혼운 → /my-solo
// - 썸진단/짝사랑/고백타이밍/연락운 → /my-some-crush
// - 스킨십궁합/데이트운 → /my-love-compat
// - 심리테스트/MBTI/혈액형 → /traditional (성격·유형 분석 섹션)

function getLoveHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  return `hsl(340, ${30 + s * 0.7}%, ${85 - s * 0.4}%)`;
}

function getWeather(score) {
  if (score >= 85) return { type: 'sunny', emoji: '☀️', label: '맑음', desc: '최고의 하루가 될 거예요!' };
  if (score >= 70) return { type: 'rainbow', emoji: '🌤️', label: '화창', desc: '좋은 기운이 함께합니다' };
  if (score >= 55) return { type: 'cloudy', emoji: '⛅', label: '구름', desc: '차분한 하루를 보내세요' };
  if (score >= 40) return { type: 'wind', emoji: '🌧️', label: '비', desc: '비 뒤에 무지개가 옵니다' };
  return { type: 'storm', emoji: '⛈️', label: '폭풍', desc: '이것도 지나갈 거예요' };
}

function WeatherBg({ type }) {
  if (type === 'sunny') return (
    <div className="weather-bg weather--sunny">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="weather-sunray" style={{ '--ray-angle': `${i * 30}deg`, animationDelay: `${i * 0.2}s` }} />
      ))}
      <div className="weather-light-orb weather-light-orb--1" />
      <div className="weather-light-orb weather-light-orb--2" />
    </div>
  );
  if (type === 'rainbow') return (
    <div className="weather-bg weather--rainbow">
      <div className="weather-light-orb weather-light-orb--1" />
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="weather-sparkle" style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 60}%`, animationDelay: `${Math.random() * 3}s` }}>✦</span>
      ))}
    </div>
  );
  if (type === 'cloudy') return (
    <div className="weather-bg weather--cloudy">
      <div className="weather-cloud weather-cloud--1">☁️</div>
      <div className="weather-cloud weather-cloud--2">☁️</div>
      <div className="weather-cloud weather-cloud--3">⛅</div>
    </div>
  );
  if (type === 'wind') return (
    <div className="weather-bg weather--rain">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} className="weather-raindrop" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 1.5}s`,
          animationDuration: `${0.5 + Math.random() * 0.5}s`,
          opacity: 0.2 + Math.random() * 0.3,
        }} />
      ))}
    </div>
  );
  if (type === 'storm') return (
    <div className="weather-bg weather--storm">
      <div className="weather-storm-flash" />
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="weather-raindrop weather-raindrop--heavy" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 1}s`,
          animationDuration: `${0.3 + Math.random() * 0.3}s`,
          opacity: 0.3 + Math.random() * 0.4,
        }} />
      ))}
    </div>
  );
  return null;
}

function ScoreCircle({ score, size = 120, label }) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - ((score || 0) / 100) * circumference;
  return (
    <div className="home-score-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="home-score-svg">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#homeScoreGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset} transform={`rotate(-90 ${size/2} ${size/2})`} className="home-score-fill" />
        <defs>
          <linearGradient id="homeScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-gold)" />
            <stop offset="100%" stopColor="var(--color-primary-light)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="home-score-inner">
        <span className="home-score-num">{score || 0}</span>
        <span className="home-score-unit">{label || '점'}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 연애상태별 카드 캐러셀 — 데이팅앱 스타일 (가로 스와이프 + Peek)
// ════════════════════════════════════════════════════════════════
const REL_CARDS = {
  lover: {
    id: 'lover',
    path: '/my-love-compat',
    title: '나의 연인',
    sub: '정통 · 결혼 · 스킨십 궁합',
    icon: '💑',
    accentFrom: '#ec4899',
    accentTo: '#f472b6',
    shortcuts: [
      { icon: '💞', label: '정통궁합',   path: '/my-love-compat', state: { presetTab: 'saju' } },
      { icon: '💑', label: '데이트운',   path: '/my-love-compat', state: { presetTab: 'date' } },
    ],
  },
  some: {
    id: 'some',
    path: '/my-some-crush',
    title: '나의 썸·짝사랑',
    sub: '썸 · 짝사랑 · 고백 · 연락',
    icon: '💘',
    accentFrom: '#a855f7',
    accentTo: '#ec4899',
    shortcuts: [
      { icon: '🎯', label: '썸진단', path: '/love/some_check' },
      { icon: '💘', label: '짝사랑', path: '/love/crush' },
    ],
  },
  solo: {
    id: 'solo',
    path: '/my-solo',
    title: '나는 솔로',
    sub: '연애운 · 이상형 · 만남시기',
    icon: '🙋',
    accentFrom: '#06b6d4',
    accentTo: '#a78bfa',
    shortcuts: [
      { icon: '💕', label: '1:1연애운', path: '/love-fortune' },
      { icon: '👩‍❤️‍👨', label: '이상형', path: '/love/ideal_type' },
    ],
  },
};

// 사용자의 relationshipStatus → 3카드만 정렬 (again·star 는 메뉴/별도 진입점으로)
function getOrderedRelCards(profile) {
  const status = profile?.relationshipStatus;
  let order;
  switch (status) {
    case 'IN_RELATIONSHIP':
    case 'MARRIED':
      order = ['lover', 'some', 'solo'];
      break;
    case 'SOME':
      order = ['some', 'solo', 'lover'];
      break;
    case 'SINGLE':
      order = ['solo', 'some', 'lover'];
      break;
    case 'COMPLICATED':
      order = ['solo', 'lover', 'some'];
      break;
    default:
      order = ['solo', 'some', 'lover'];
  }
  return order.map(k => REL_CARDS[k]);
}

// ════════════════════════════════════════════════════════════════
// 오늘의 추천 풀 — 사용자 상태별 후보 4~5개, 날짜+요일 시드로 일별 로테이션
// ════════════════════════════════════════════════════════════════
const RECOMMEND_POOL = {
  guest: [
    { icon: '🌟', title: '나의 사주 보기', sub: '정통 사주로 오늘의 운세 확인', path: '/traditional' },
  ],
  couple: [
    { icon: '💑', title: '오늘 연인과의 데이트운', sub: '두 사람의 오늘 케미스트리', path: '/my-love-compat', state: { presetTab: 'date' } },
    { icon: '💞', title: '우리 사주 궁합 점수', sub: '정통 궁합 다시 확인', path: '/my-love-compat', state: { presetTab: 'saju' } },
    { icon: '🤝', title: '오늘 우리 스킨십 운', sub: '두 사람의 케미 분석', path: '/my-love-compat', state: { presetTab: 'skinship' } },
    { icon: '💒', title: '결혼 시기 다시 보기', sub: '두 사람의 결혼 운', path: '/my-love-compat', state: { presetTab: 'marriage' } },
    { icon: '📱', title: '오늘 먼저 연락해도 될까?', sub: '연락운으로 본 타이밍', path: '/love/contact_fortune' },
  ],
  some: [
    { icon: '💌', title: '이 썸, 고백해도 될까?', sub: '고백 타이밍 운세', path: '/love/confession_timing' },
    { icon: '🎯', title: '이 사람과 잘 맞을까?', sub: '썸 진단으로 확인', path: '/love/some_check' },
    { icon: '📱', title: '먼저 연락해도 될까?', sub: '연락운으로 본 타이밍', path: '/love/contact_fortune' },
    { icon: '💘', title: '내 짝사랑은 이뤄질까?', sub: '짝사랑 성공 가능성', path: '/love/crush' },
  ],
  complicated: [
    { icon: '🌙', title: '다시 만날 수 있을까?', sub: '재회운으로 인연 확인', path: '/love/reunion' },
    { icon: '💍', title: '새로운 인연이 올 시기', sub: '재혼/재출발 운', path: '/love/remarriage' },
    { icon: '🕯️', title: '마음 정리하고 회복하기', sub: '이별 회복 운', path: '/love/reunion' },
    { icon: '📞', title: '먼저 연락해도 될까?', sub: '연락 타이밍 운', path: '/love/contact_fortune' },
  ],
  solo: [
    { icon: '🔮', title: '내 인연이 올 시기는?', sub: '사주로 보는 만남시기', path: '/love/meeting_timing' },
    { icon: '👩‍❤️‍👨', title: '나에게 맞는 이상형은?', sub: '사주로 본 이상형 분석', path: '/love/ideal_type' },
    { icon: '💕', title: '오늘의 1:1 연애운', sub: '솔로를 위한 오늘 운', path: '/love-fortune' },
    { icon: '🤝', title: '소개팅 잘 풀릴까?', sub: '소개팅 운으로 확인', path: '/love/blind_date' },
    { icon: '💒', title: '내가 결혼할 시기는?', sub: '결혼 시기 운', path: '/love/marriage' },
  ],
};

function pickDailyRecommend(userId, status) {
  let key;
  if (!userId) key = 'guest';
  else if (status === 'IN_RELATIONSHIP' || status === 'MARRIED') key = 'couple';
  else if (status === 'SOME') key = 'some';
  else if (status === 'COMPLICATED') key = 'complicated';
  else key = 'solo';
  const pool = RECOMMEND_POOL[key];
  // 시드 = 날짜 + 요일×7 → 매일 다른 카드, 같은 날엔 일관
  const d = new Date();
  const seed = d.getDate() + d.getDay() * 7;
  return pool[seed % pool.length];
}

// ════════════════════════════════════════════════════════════════
// DailyTarot — 오늘의 타로 한 장 (날짜 시드, 뒷면→클릭 시 플립→앞면)
// 22장 메이저 아르카나만 사용 (가장 직관적)
// ════════════════════════════════════════════════════════════════
// 22장 메이저 카드 + 5카테고리 정적 해석 (비로그인/로그인 기본 노출용)
// 마이너 56장은 추후 AI 일괄 생성 후 추가
const DAILY_TAROT_CARDS = [
  { id: 0,  nameKr: '광대', nameEn: 'The Fool',
    msg: '새로운 시작과 모험의 기운이 감돕니다. 두려움 없이 한 걸음을 내딛으세요.',
    overall: '오늘은 백지 위에 새 그림을 그리는 날입니다. 익숙함을 벗어나 낯선 길에 발을 내딛는 용기가 행운을 부릅니다. 결과보다 과정의 자유로움을 즐기면 의외의 기회가 찾아옵니다.',
    love: '뜻밖의 만남이 다가옵니다. 가벼운 마음으로 사람을 대하면 자연스럽게 인연이 열립니다. 연인이 있다면 새로운 데이트나 작은 모험이 관계에 활력을 줍니다.',
    career: '익숙한 일에서 벗어나 새 분야에 도전하기 좋은 날. 큰 그림을 그리되 첫 걸음은 작게 떼세요.',
    advice: '계산하지 말고 직관을 따르세요. 지나친 신중함보다 한 발 내딛는 용기가 답입니다.',
    lucky: '🍀 색: 노랑 · 숫자: 0 · 시간: 아침' },
  { id: 1,  nameKr: '마법사', nameEn: 'The Magician',
    msg: '당신에게는 원하는 것을 현실로 만들 힘이 있습니다.',
    overall: '필요한 도구는 이미 손 안에 있습니다. 의지를 모으고 행동으로 옮기는 순간 일이 빠르게 풀립니다. 자기 능력을 의심하지 않는 것이 핵심입니다.',
    love: '솔직한 표현이 마음을 움직입니다. 망설였던 한마디를 오늘 꺼내보세요. 매력이 빛나는 날입니다.',
    career: '아이디어를 행동으로 바꿀 수 있는 날. 발표·제안에 적극적으로 나서면 좋은 반응을 얻습니다.',
    advice: '머릿속 계획을 한 가지라도 오늘 안에 시작하세요. 작은 행동이 큰 결과를 만듭니다.',
    lucky: '🍀 색: 빨강 · 숫자: 1 · 시간: 정오' },
  { id: 2,  nameKr: '여사제', nameEn: 'The High Priestess',
    msg: '내면의 목소리에 귀 기울이세요. 직관이 답을 알고 있습니다.',
    overall: '말로 설명할 수 없는 감각이 진실을 가리킵니다. 정보를 더 모으기보다 잠시 멈춰 자기 내면을 살피세요. 답은 이미 알고 있습니다.',
    love: '아직 말하지 않은 마음을 들여다볼 시간. 상대의 침묵에도 의미가 있습니다. 강요보다 기다림이 답입니다.',
    career: '데이터보다 직감이 옳을 때. 중요한 결정은 혼자만의 시간을 갖고 내리세요.',
    advice: '서두르지 마세요. 침묵 속에서 답이 떠오릅니다.',
    lucky: '🍀 색: 남색 · 숫자: 2 · 시간: 새벽' },
  { id: 3,  nameKr: '여황제', nameEn: 'The Empress',
    msg: '풍요와 창조의 에너지가 넘칩니다. 사랑이 꽃피는 시기입니다.',
    overall: '내가 가진 것을 충분히 누리고 베푸는 날입니다. 풍요는 결핍감이 아닌 만족감에서 옵니다. 자신을 잘 보살피면 모든 것이 따라옵니다.',
    love: '관계가 더 깊어지고 따뜻해집니다. 솔로라면 부드러운 매력이 누군가를 끌어당기는 시기입니다.',
    career: '창의적인 작업에 좋은 날. 협업도 자연스럽게 풀립니다.',
    advice: '자신에게 친절하세요. 좋아하는 음식, 충분한 휴식이 오늘의 보약입니다.',
    lucky: '🍀 색: 초록 · 숫자: 3 · 시간: 오후' },
  { id: 4,  nameKr: '황제', nameEn: 'The Emperor',
    msg: '질서와 리더십을 발휘할 때입니다. 계획대로 진행하세요.',
    overall: '구조와 원칙이 빛나는 날. 즉흥보다 계획이, 감정보다 논리가 답입니다. 책임감 있는 행동이 신뢰를 만듭니다.',
    love: '안정적인 관계를 위한 진지한 약속이 필요한 시기. 흔들리지 않는 모습이 매력으로 다가옵니다.',
    career: '리더십을 발휘하기 좋은 날. 결정권을 잡고 명확하게 방향을 제시하세요.',
    advice: '감정에 휘둘리지 말고 원칙을 지키세요. 단단함이 길게 갑니다.',
    lucky: '🍀 색: 진한 빨강 · 숫자: 4 · 시간: 오전' },
  { id: 5,  nameKr: '교황', nameEn: 'The Hierophant',
    msg: '전통과 가르침 안에서 답을 찾으세요. 좋은 멘토를 만나게 됩니다.',
    overall: '경험 많은 이의 조언이 큰 도움이 됩니다. 검증된 길을 택하는 것이 안전한 날. 형식과 절차를 존중하면 일이 매끄럽게 풀립니다.',
    love: '진지한 약속이나 만남에 대한 조언이 필요한 시기. 가족이나 주변의 의견에 귀 기울이세요.',
    career: '멘토·선배의 조언을 구하기 좋은 날. 검증된 방식을 따르는 것이 효율적입니다.',
    advice: '자기 고집보다 지혜로운 사람의 조언이 답입니다.',
    lucky: '🍀 색: 짙은 보라 · 숫자: 5 · 시간: 오전' },
  { id: 6,  nameKr: '연인', nameEn: 'The Lovers',
    msg: '중요한 선택의 기로에 섰습니다. 마음이 이끄는 방향을 따르세요.',
    overall: '오늘은 두 갈래 길 중 하나를 택해야 하는 날. 머리로는 답이 안 나옵니다. 진짜 원하는 것이 무엇인지 마음에게 물어보세요.',
    love: '두 마음이 통하는 결정적인 순간이 옵니다. 솔로라면 운명적인 만남의 시그널이 보입니다.',
    career: '두 가지 옵션 중 선택할 때는 가치관에 부합하는 쪽을 고르세요.',
    advice: '머리보다 마음이 옳은 답을 알고 있어요. 진심을 따르세요.',
    lucky: '🍀 색: 분홍 · 숫자: 6 · 시간: 저녁' },
  { id: 7,  nameKr: '전차', nameEn: 'The Chariot',
    msg: '강한 의지로 전진하세요. 승리가 기다리고 있습니다.',
    overall: '추진력이 폭발하는 날. 망설이던 일을 밀어붙이면 돌파구가 보입니다. 두 방향의 힘을 하나로 모으는 능력이 빛납니다.',
    love: '망설이지 말고 다가가세요. 적극성이 매력입니다. 갈등이 있다면 정면으로 풀어보세요.',
    career: '경쟁 상황에서 승리할 수 있는 날. 리더십과 결단력이 빛납니다.',
    advice: '두 가지 상반된 힘을 균형 있게 다루세요. 한쪽에 치우치면 길을 잃습니다.',
    lucky: '🍀 색: 검정 · 숫자: 7 · 시간: 정오' },
  { id: 8,  nameKr: '힘', nameEn: 'Strength',
    msg: '부드러운 힘이 강한 힘을 이깁니다. 인내심이 보상받습니다.',
    overall: '오늘은 강한 압박 앞에서도 부드러움을 잃지 않는 사람이 승리합니다. 다그치지 말고 천천히, 그러나 확실하게 가세요.',
    love: '갈등을 부드럽게 풀어내면 사랑이 더 깊어집니다. 인내가 사랑의 본질입니다.',
    career: '어려운 동료·고객도 부드러운 접근으로 풀어낼 수 있는 날.',
    advice: '감정을 억누르지 말고 다스리세요. 그게 진짜 힘입니다.',
    lucky: '🍀 색: 주황 · 숫자: 8 · 시간: 오후' },
  { id: 9,  nameKr: '은둔자', nameEn: 'The Hermit',
    msg: '내면을 탐구하면 답을 찾게 됩니다. 조용한 지혜가 빛납니다.',
    overall: '소란을 피해 자기 안으로 들어갈 때 진짜 답이 보입니다. 누군가의 의견보다 자기 내면의 소리가 더 정확한 날입니다.',
    love: '잠시 거리를 두고 자신과 관계를 돌아보세요. 침묵이 더 많은 것을 말해줍니다.',
    career: '혼자 집중해서 깊이 파는 작업에 좋은 날. 회의보다 사색이 답입니다.',
    advice: '혼자만의 시간이 가장 큰 통찰을 줍니다. 외부 소음을 차단하세요.',
    lucky: '🍀 색: 회색 · 숫자: 9 · 시간: 밤' },
  { id: 10, nameKr: '운명의 수레바퀴', nameEn: 'Wheel of Fortune',
    msg: '운명의 전환점에 섰습니다. 변화를 받아들이세요.',
    overall: '예측할 수 없는 변화가 일어나는 날. 흐름에 저항하지 말고 올라타세요. 우연처럼 보이는 일이 큰 기회로 발전합니다.',
    love: '예상치 못한 인연의 흐름이 시작됩니다. 갑작스런 재회나 새 만남이 있을 수 있어요.',
    career: '뜻밖의 기회·제안이 찾아옵니다. 망설이지 말고 받아들이세요.',
    advice: '계획에 집착하지 말고 흐름을 신뢰하세요. 변화가 곧 기회입니다.',
    lucky: '🍀 색: 보라 · 숫자: 10 · 시간: 자정' },
  { id: 11, nameKr: '정의', nameEn: 'Justice',
    msg: '정당한 결과를 받게 됩니다. 공정하게 행동하세요.',
    overall: '뿌린 만큼 거두는 날. 그동안의 노력과 행동이 객관적으로 평가받습니다. 진실은 결국 드러납니다.',
    love: '관계 속 진실을 마주할 시기. 회피했던 대화가 필요합니다.',
    career: '공정한 평가를 받습니다. 계약·협상에서 명확한 기준을 세우세요.',
    advice: '감정에 휘둘리지 말고 사실에 기반해 판단하세요. 공정함이 답입니다.',
    lucky: '🍀 색: 흰색 · 숫자: 11 · 시간: 정오' },
  { id: 12, nameKr: '매달린 사람', nameEn: 'The Hanged Man',
    msg: '다른 관점에서 바라보세요. 전략적 기다림이 필요합니다.',
    overall: '잠시 멈춰서 거꾸로 보면 답이 보이는 날. 행동보다 관점의 전환이 필요합니다. 기다림이 곧 전략입니다.',
    love: '서두르지 말고 상대의 시간을 존중하세요. 한 발 물러서면 더 가까워집니다.',
    career: '잠시 일을 멈추고 다른 각도에서 검토해 보세요. 새 해결책이 보입니다.',
    advice: '집착을 내려놓으면 답이 옵니다. 멈춤이 곧 전진입니다.',
    lucky: '🍀 색: 청록 · 숫자: 12 · 시간: 새벽' },
  { id: 13, nameKr: '죽음', nameEn: 'Death',
    msg: '하나의 장이 끝나고 새로운 장이 열립니다. 변화가 성장을 가져옵니다.',
    overall: '낡은 것을 보내고 새것을 맞이하는 날. 두려움보다 해방감이 큽니다. 끝은 곧 새로운 시작입니다.',
    love: '낡은 관계 패턴을 정리하고 새로운 형태로 나아가세요. 정리도 사랑입니다.',
    career: '오래된 방식을 버리고 새 방향으로 전환할 때. 끝맺음이 새 출발이 됩니다.',
    advice: '놓아주는 용기가 새로운 가능성을 엽니다. 집착이 가장 큰 장애입니다.',
    lucky: '🍀 색: 검정 · 숫자: 13 · 시간: 자정' },
  { id: 14, nameKr: '절제', nameEn: 'Temperance',
    msg: '균형과 조화를 유지하세요. 중용의 길이 답입니다.',
    overall: '극단을 피하고 두 가지를 적절히 섞는 지혜가 빛나는 날. 모든 일에 균형이 답입니다.',
    love: '극단적 감정을 피하고 부드럽게 어우러지세요. 차이를 조화로 만드는 능력이 빛납니다.',
    career: '서두름과 기다림을 적절히 섞으세요. 협업과 독립의 균형이 핵심.',
    advice: '한쪽으로 치우치지 마세요. 중용이 가장 빠른 길입니다.',
    lucky: '🍀 색: 하늘 · 숫자: 14 · 시간: 오후' },
  { id: 15, nameKr: '악마', nameEn: 'The Devil',
    msg: '자신을 속박하는 것에서 벗어나세요. 자유를 되찾을 때입니다.',
    overall: '나를 묶고 있는 것이 무엇인지 직시하는 날. 길들여진 습관, 의존, 집착에서 한 걸음 물러나세요.',
    love: '집착이 사랑을 가립니다. 진짜 원하는 것이 무엇인지 살펴보세요.',
    career: '소모적인 일·관계는 정리할 때. 거절도 능력입니다.',
    advice: '나를 속박하는 것이 무엇인지 알아차리세요. 자각이 곧 해방입니다.',
    lucky: '🍀 색: 진홍 · 숫자: 15 · 시간: 밤' },
  { id: 16, nameKr: '탑', nameEn: 'The Tower',
    msg: '예상치 못한 변화가 옵니다. 파괴 후에 재건이 있습니다.',
    overall: '갑작스런 충격이 있을 수 있는 날. 무너지는 것에 매달리지 말고, 그 위에 새것을 세울 준비를 하세요.',
    love: '오해가 드러나는 순간이 진짜 시작입니다. 진실을 마주할 용기가 필요합니다.',
    career: '갑작스런 변화·재편에 유연하게 대응하세요. 위기 속 기회가 있습니다.',
    advice: '무너지는 것을 두려워하지 마세요. 흔들리는 것은 약했던 것입니다.',
    lucky: '🍀 색: 진회색 · 숫자: 16 · 시간: 저녁' },
  { id: 17, nameKr: '별', nameEn: 'The Star',
    msg: '희망의 빛이 비칩니다. 치유와 회복의 시간입니다.',
    overall: '오랜 고민에 한 줄기 빛이 드는 날. 천천히 회복하면서 꿈을 다시 그려보세요. 영감이 솟아오릅니다.',
    love: '상처가 아물고 새 마음이 깨어나는 시기. 솔로라면 운명적 만남의 예감.',
    career: '창의력이 빛나는 날. 장기 비전을 세우기 좋습니다.',
    advice: '꿈을 잃지 말고 천천히 회복하세요. 희망이 곧 길입니다.',
    lucky: '🍀 색: 연하늘 · 숫자: 17 · 시간: 새벽' },
  { id: 18, nameKr: '달', nameEn: 'The Moon',
    msg: '숨겨진 것들이 드러나는 시기입니다. 직감을 믿으세요.',
    overall: '논리로 설명되지 않는 일이 일어나는 날. 꿈, 직감, 무의식이 중요한 메시지를 줍니다. 명확함보다 신비를 받아들이세요.',
    love: '말로 못한 진심이 흘러나옵니다. 상대의 미묘한 신호를 잘 읽으세요.',
    career: '겉보기보다 속을 살피세요. 숨은 의도를 파악하는 것이 핵심.',
    advice: '논리보다 꿈과 직감을 신뢰하세요. 첫 느낌이 정답일 때가 많습니다.',
    lucky: '🍀 색: 은빛 · 숫자: 18 · 시간: 한밤' },
  { id: 19, nameKr: '태양', nameEn: 'The Sun',
    msg: '성공과 기쁨의 시기입니다. 자신감을 갖고 빛나세요.',
    overall: '모든 일이 명확하고 순조롭게 풀리는 날. 자신의 빛을 숨기지 말고 드러내세요. 성공이 손에 잡힙니다.',
    love: '관계가 활짝 피어나는 순간. 함께 있는 것만으로 행복합니다.',
    career: '성과·인정·승진의 기운. 자신의 능력을 보여주기 좋은 날.',
    advice: '솔직하게 자신의 빛을 드러내세요. 자신감이 곧 매력입니다.',
    lucky: '🍀 색: 황금 · 숫자: 19 · 시간: 정오' },
  { id: 20, nameKr: '심판', nameEn: 'Judgement',
    msg: '과거를 돌아보고 새롭게 시작할 때입니다. 내면의 소명을 따르세요.',
    overall: '지나온 길을 정리하고 새 챕터를 여는 날. 후회와 미련을 내려놓고 가벼워지세요. 진짜 원하는 삶의 방향이 보입니다.',
    love: '용서와 화해의 시간. 묵은 감정을 정리하면 관계가 새로워집니다.',
    career: '커리어 전환의 시그널. 내면의 진짜 소명을 따라가세요.',
    advice: '지나간 일을 정리하세요. 가벼워질수록 멀리 갑니다.',
    lucky: '🍀 색: 자주 · 숫자: 20 · 시간: 아침' },
  { id: 21, nameKr: '세계', nameEn: 'The World',
    msg: '하나의 순환이 완성됩니다. 목표를 달성하고 새로운 차원으로 나아갑니다.',
    overall: '오랜 노력의 결실을 맺는 날. 만족감과 성취감을 충분히 누리세요. 다음 챕터의 문이 열립니다.',
    love: '두 사람의 여정이 의미 있는 결실을 맺습니다. 약속·결정의 시기.',
    career: '큰 프로젝트의 마무리·성공. 다음 단계를 준비할 때.',
    advice: '지금까지의 노력을 충분히 음미하고 다음 챕터로 자연스럽게 이동하세요.',
    lucky: '🍀 색: 에메랄드 · 숫자: 21 · 시간: 정오' },
];

// 사용 가능한 덱 ID — 모두 m{NN}_v0.jpg (variants) 형식
const DAILY_TAROT_DECKS = [
  'newclassic', 'masterpiece', 'jester', 'cats', 'dogs',
  'celestial', 'kdrama', 'lady', 'cartoon_girl', 'cartoon_boy',
];

function DailyTarot() {
  const [flipped, setFlipped] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [autoStartAi, setAutoStartAi] = useState(false);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // 카카오 로그인 후 복귀 → pendingDailyTarotAnalysis 있으면 모달 자동 오픈 + AI 분석 자동 시작
  useEffect(() => {
    if (!userId) return;
    if (localStorage.getItem('pendingDailyTarotAnalysis')) {
      localStorage.removeItem('pendingDailyTarotAnalysis');
      setFlipped(true);
      setModalOpen(true);
      setAutoStartAi(true);
    }
  }, [userId]);

  // 날짜 시드로 매일 다른 덱 + 카드 (78장 풀덱: 메이저 22 + 마이너 56)
  const { deck, card, frontSrc, backSrc } = useMemo(() => {
    const allCards = [...DAILY_TAROT_CARDS, ...DAILY_TAROT_MINOR];   // 78장
    const d = new Date();
    const baseSeed = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
    const deckId = DAILY_TAROT_DECKS[baseSeed % DAILY_TAROT_DECKS.length];
    const card = allCards[(baseSeed * 7 + 3) % allCards.length];
    const cardNum = String(card.id).padStart(2, '0');
    return {
      deck: deckId,
      card,
      frontSrc: `/tarot-${deckId}/m${cardNum}_v0.jpg`,
      backSrc:  `/tarot-backs/${deckId}_0.jpg`,
    };
  }, []);

  const handleClick = (e) => {
    e?.stopPropagation();
    if (!flipped) setFlipped(true);
    setModalOpen(true);
  };

  // ESC 로 닫기
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  return (
    <>
      <div className="home-hero-v2-col home-hero-v2-col--tarot">
        <div
          className={`home-hero-v2-tarot-flip ${flipped ? 'flipped' : ''} ${!flipped ? 'glow' : ''}`}
          onClick={handleClick}
          role="button"
          aria-label={flipped ? card.nameKr : '오늘의 타로 카드 뒤집기'}
        >
          <div className="home-hero-v2-tarot-face home-hero-v2-tarot-back">
            <img src={backSrc} alt="" draggable={false} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div className="home-hero-v2-tarot-face home-hero-v2-tarot-front">
            <img src={frontSrc} alt={card.nameKr} draggable={false} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </div>
      </div>
      {modalOpen && (
        <DailyTarotModal
          card={card}
          frontSrc={frontSrc}
          backSrc={backSrc}
          autoStart={autoStartAi}
          onClose={() => { setModalOpen(false); setAutoStartAi(false); }}
        />
      )}
    </>
  );
}

function DailyTarotModal({ card, frontSrc, onClose, autoStart = false }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const profile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); }
    catch { return {}; }
  }, []);

  // AI 분석 상태
  const [aiResult, setAiResult] = useState(null);   // { overall, love, career, advice, lucky }
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const cleanupRef = useRef(null);
  const autoStartedRef = useRef(false);

  // 진입 시 캐시 선조회 — 오늘 이미 분석한 적 있으면 즉시 노출
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getDailyTarotBasic(card.id)
      .then((data) => {
        if (cancelled || !data || !data.overall) return;
        setAiResult(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId, card.id]);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  // 카카오 로그인 후 자동 모달 오픈 + AI 분석 자동 시작
  useEffect(() => {
    if (!autoStart || !userId) return;
    if (autoStartedRef.current) return;
    if (aiResult || aiLoading) return;
    autoStartedRef.current = true;
    // 캐시 선조회와 충돌 방지 위해 살짝 지연
    const t = setTimeout(() => { startAiAnalysis(); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, userId]);

  const startAiAnalysis = (e) => {
    e?.stopPropagation();
    if (aiLoading || aiResult) return;
    setAiLoading(true);
    setAiError('');
    cleanupRef.current = getDailyTarotStream(
      {
        cardId: card.id,
        cardNameKr: card.nameKr,
        cardNameEn: card.nameEn,
        birthDate: profile.birthDate,
        calendarType: profile.calendarType || 'SOLAR',
        birthTime: profile.birthTime,
      },
      {
        onCached: (data) => { setAiResult(data); setAiLoading(false); },
        onChunk: () => {},
        onDone: (full) => {
          setAiLoading(false);
          try {
            const parsed = parseAiJson(full);
            if (parsed && parsed.overall) {
              setAiResult({ ...parsed, cardId: card.id, nameKr: card.nameKr, nameEn: card.nameEn });
            }
          } catch {}
        },
        onError: () => { setAiLoading(false); setAiError('분석에 실패했어요. 다시 시도해주세요.'); },
        onInsufficientHearts: () => { setAiLoading(false); navigate('/my-menu'); },
      }
    );
  };

  // 노출용 데이터 — AI 결과 우선, 없으면 정적
  const view = aiResult || {
    overall: card.overall || card.msg,
    love:    card.love,
    career:  card.career,
    advice:  card.advice,
    lucky:   card.lucky,
  };
  const isAi = !!aiResult;

  // body 에 직접 렌더링 — Hero stacking context 영향 없이 완전한 풀스크린
  return createPortal((
    <div className="dt-detail-overlay fade-in" onClick={onClose} role="dialog" aria-modal="true">
      {/* dt-detail 자체는 stopPropagation 안 함 — 빈 공간 어디든 탭하면 닫힘
          단, CTA 버튼·dismiss는 각자 onClick 에서 stopPropagation 처리 */}
      <div className="dt-detail">
        <div className="dt-detail-img">
          <img src={frontSrc} alt={card.nameKr} draggable={false} />
        </div>
        <div className="dt-detail-info">
          <span className="dt-detail-pos">오늘의 카드 {isAi && '· AI 맞춤'}</span>
          <h3 className="dt-detail-name">{card.nameKr}</h3>
          <p className="dt-detail-name-en">{card.nameEn}</p>
        </div>

        {/* 5개 섹션 — AI 결과 또는 정적 */}
        <div className="dt-detail-sections">
          {view.overall && (
            <div className="dt-detail-section">
              <span className="dt-detail-section-label">🔮 오늘의 메시지</span>
              <p className="dt-detail-section-text">{view.overall}</p>
            </div>
          )}
          {view.love && (
            <div className="dt-detail-section">
              <span className="dt-detail-section-label">💕 연애운</span>
              <p className="dt-detail-section-text">{view.love}</p>
            </div>
          )}
          {view.career && (
            <div className="dt-detail-section">
              <span className="dt-detail-section-label">💼 일·재물운</span>
              <p className="dt-detail-section-text">{view.career}</p>
            </div>
          )}
          {view.advice && (
            <div className="dt-detail-section">
              <span className="dt-detail-section-label">💡 행동 조언</span>
              <p className="dt-detail-section-text">{view.advice}</p>
            </div>
          )}
          {view.lucky && (
            <div className="dt-detail-section dt-detail-section--lucky">
              <p className="dt-detail-section-text">{view.lucky}</p>
            </div>
          )}
        </div>

        {/* 하단 CTA — 비로그인 / 로그인(AI 미사용) / 로그인(AI 사용 완료) */}
        {aiLoading ? (
          <div className="dt-detail-loading">✨ AI가 카드를 풀이하는 중...</div>
        ) : aiError ? (
          <div className="dt-detail-error">{aiError}</div>
        ) : !userId ? (
          <button className="dt-detail-cta" onClick={(e) => {
            e.stopPropagation();
            // 카카오 즉시 로그인 → 복귀 후 자동 모달 오픈 + AI 분석
            localStorage.setItem('pendingDailyTarotAnalysis', '1');
            startKakaoLogin('/');
          }}>
            🔑 카카오 로그인하고 AI 맞춤 분석 받기
          </button>
        ) : !aiResult ? (
          <button className="dt-detail-cta dt-detail-cta--ai" onClick={startAiAnalysis}>
            ✨ AI 맞춤 분석 받기 <span className="dt-detail-cta-cost">하트 5개</span>
          </button>
        ) : null}

        <p className="dt-detail-dismiss" onClick={onClose}>탭하여 돌아가기</p>
      </div>
    </div>
  ), document.body);
}

// ════════════════════════════════════════════════════════════════
// HeartScore — 하트 모양 안에 분홍이 점수만큼 차오르는 SVG (좌측 연애운용)
// ════════════════════════════════════════════════════════════════
function HeartScore({ score, color = '#ec4899' }) {
  const size = 56;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  // 하트 path 의 실제 y 영역(대략 3 ~ 21) 기준으로 fill 시작점 계산
  const heartTop = 3, heartBottom = 21.4;
  const fillY = heartBottom - (pct / 100) * (heartBottom - heartTop);
  const heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
  return (
    <div className="home-hero-v2-score-gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <defs>
          <clipPath id="heart-clip">
            <path d={heartPath} />
          </clipPath>
          <linearGradient id="heart-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {/* 배경 — 옅은 흰 하트 (점수 미계산 시에도 윤곽 보임) */}
        <path d={heartPath} fill="rgba(255,255,255,0.20)" />
        {/* 점수만큼 차오르는 분홍 */}
        {score != null && (
          <g clipPath="url(#heart-clip)">
            <rect x="0" y={fillY} width="24" height={24 - fillY} fill="url(#heart-grad)" style={{ transition: 'y 0.8s ease' }} />
          </g>
        )}
        {/* 외곽선 — 하트 윤곽 강조 */}
        <path d={heartPath} fill="none" stroke="#fff" strokeWidth="0.6" strokeOpacity="0.65" strokeLinejoin="round" />
      </svg>
      <span className="home-hero-v2-score-num" style={{ color: '#fff' }}>
        {score != null ? score : '--'}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ScoreGauge — Hero 의 우측 점수용 작은 도넛 SVG 게이지 (오늘의 운세)
// ════════════════════════════════════════════════════════════════
function ScoreGauge({ score, color = '#ec4899' }) {
  const size = 52;
  const stroke = 4.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = c - (pct / 100) * c;
  const id = `g-${color.replace('#', '')}`;
  return (
    <div className="home-hero-v2-score-gauge" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        {score != null && (
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        )}
      </svg>
      <span className="home-hero-v2-score-num" style={{ color: '#fff' }}>
        {score != null ? score : '--'}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 메뉴 페이저 — 4×2 정사각 타일 × N페이지, 가로 스크롤(snap) + 도트
// ════════════════════════════════════════════════════════════════
const MENU_PAGES = [
  // 페이지 1 — 오늘의 운세 + 연애 핵심
  [
    { icon: '🔮', label: '오늘의 운세', path: '/my' },
    { icon: '💑', label: '나의 연인',   path: '/my-love-compat' },
    { icon: '💘', label: '썸·짝사랑',   path: '/my-some-crush' },
    { icon: '🙋', label: '솔로 운세',   path: '/my-solo' },
    { icon: '🌙', label: '다시 만날까', path: '/again-meet' },
    { icon: '💞', label: '사주궁합',   path: '/compatibility' },
    { icon: '✨', label: '별자리',     path: '/constellation' },
    { icon: '🎊', label: '신년운세',   path: '/year-fortune' },
  ],
  // 페이지 2 — 종합 / 특수 분석
  [
    { icon: '⭐', label: '스타 운세',   path: '/star-fortune' },
    { icon: '🩸', label: '혈액형',     path: '/bloodtype' },
    { icon: '🧬', label: 'MBTI',       path: '/mbti' },
    { icon: '💭', label: '꿈해몽',     path: '/dream' },
    { icon: '🧠', label: '심리테스트', path: '/psych-test' },
    { icon: '👤', label: '관상분석',   path: '/face-reading' },
    { icon: '📅', label: '월간운세',   path: '/monthly-fortune' },
    { icon: '📜', label: '토정비결',   path: '/tojeong' },
  ],
];

function MenuPager({ navigate }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);
  const isProgrammaticRef = useRef(false);

  const goPage = (idx) => {
    const track = trackRef.current;
    if (!track) return;
    isProgrammaticRef.current = true;
    track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
    setActive(idx);
    setTimeout(() => { isProgrammaticRef.current = false; }, 600);
  };

  const onScroll = () => {
    if (isProgrammaticRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    if (idx !== active) setActive(idx);
  };

  return (
    <section className="home-menu-pager-wrap">
      <div className="home-menu-pager" ref={trackRef} onScroll={onScroll}>
        {MENU_PAGES.map((page, pIdx) => (
          <div className="home-menu-page" key={pIdx}>
            {page.map((m) => (
              <button key={m.label} className="home-menu-tile" onClick={() => navigate(m.path)}>
                <span className="home-menu-tile-icon">{m.icon}</span>
                <span className="home-menu-tile-label">{m.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="home-menu-dots">
        {MENU_PAGES.map((_, i) => (
          <button
            key={i}
            className={`home-menu-dot ${i === active ? 'active' : ''}`}
            onClick={() => goPage(i)}
            aria-label={`메뉴 페이지 ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function RelationshipCarousel({ navigate, myData }) {
  const profile = myData?.user;
  const cards = useMemo(() => getOrderedRelCards(profile), [profile?.relationshipStatus]);
  const len = cards.length;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flyDir, setFlyDir] = useState(0);  // -1=이전, 1=다음, 0=정지
  const [sliding, setSliding] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef({ startX: 0, dragging: false, moved: false });
  const velocityRef = useRef({ lastX: 0, lastT: 0, v: 0 });
  const resumeTimerRef = useRef(null);

  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(360);
  useEffect(() => {
    const update = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.clientWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 슬라이드 간격 — 카드 폭(82%) 만큼 → 인접 카드는 살짝 옆에서 peek
  const slideW = Math.max(220, Math.round(trackWidth * 0.82));

  // 순환 인덱스 — 항상 valid
  const cardAt = (offset) => cards[((active + offset) % len + len) % len];

  // 한 칸 이동 (방향 +1 or -1) — 타로덱과 동일하게 1.1초 트랜지션
  const slide = (dir) => {
    if (sliding) return;
    setFlyDir(dir);
    setSliding(true);
    setTimeout(() => {
      setActive((a) => ((a + dir) % len + len) % len);
      setFlyDir(0);
      setDragX(0);
      setSliding(false);
    }, 1100);
    pauseAuto();
  };

  // 자동 회전 (4.5초)
  useEffect(() => {
    if (paused || sliding) return;
    const id = setInterval(() => slide(1), 4500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, sliding, len]);

  const pauseAuto = () => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 6000);
  };
  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  // 드래그 핸들러 — 물리(관성) 기반 momentum
  const onDragStart = (clientX) => {
    if (sliding) return;
    dragRef.current = { startX: clientX, dragging: true, moved: false };
    velocityRef.current = { lastX: clientX, lastT: performance.now(), v: 0 };
  };
  const onDragMove = (clientX) => {
    if (!dragRef.current.dragging) return;
    const now = performance.now();
    const dt = now - velocityRef.current.lastT;
    if (dt > 0) {
      // EMA(0.6/0.4) — instant velocity 와 누적 velocity 를 부드럽게 섞음
      const instant = (clientX - velocityRef.current.lastX) / dt; // px/ms
      velocityRef.current.v = velocityRef.current.v * 0.6 + instant * 0.4;
      velocityRef.current.lastT = now;
      velocityRef.current.lastX = clientX;
    }
    const dx = clientX - dragRef.current.startX;
    if (Math.abs(dx) > 8) dragRef.current.moved = true;
    setDragX(dx);
  };
  const onDragEnd = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const v = velocityRef.current.v;        // px/ms
    // 관성 거리 — 250ms 후 정지한다고 가정
    const projected = dragX + v * 250;
    const threshold = slideW * 0.30;        // 카드 폭의 30% 만 넘어도 다음 카드로
    if (projected < -threshold) slide(1);
    else if (projected > threshold) slide(-1);
    else setDragX(0);
  };

  // 보여줄 윈도우 — 5장 (-2, -1, 0, 1, 2). 자연스러운 무한 순환.
  const visible = [-2, -1, 0, 1, 2].map((off) => ({ off, card: cardAt(off) }));
  const animOffset = flyDir ? -flyDir * slideW : dragX;
  const transStyle = dragRef.current.dragging
    ? 'none'
    : 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease';

  return (
    <section className="home-rel-section">
      <div
        className="home-rel-stage"
        ref={trackRef}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
        onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX); }}
        onMouseMove={(e) => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={() => { if (dragRef.current.dragging) onDragEnd(); }}
      >
        {visible.map(({ off, card }) => {
          const x = off * slideW + animOffset;
          const dist = Math.abs(x) / slideW;
          // 타로덱과 동일한 곡선 — 옆 카드는 작고 옅게
          const scale = Math.max(0.65, 1 - dist * 0.15);
          const opacity = Math.max(0.3, 1 - dist * 0.35);
          const z = 10 - Math.abs(off);
          const isCenter = off === 0 && !flyDir;
          // 무한 순환을 위해 key 에 off 포함 (같은 카드가 다른 위치에 있을 수 있음)
          return (
            <div
              key={`${card.id}-${off}`}
              className={`home-rel-h-card ${isCenter ? 'is-active' : ''}`}
              style={{
                '--c-from': card.accentFrom,
                '--c-to': card.accentTo,
                transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
                opacity,
                zIndex: z,
                transition: transStyle,
              }}
              onClick={(e) => {
                if (dragRef.current.moved) { e.preventDefault(); return; }
                if (isCenter) navigate(card.path);
                else if (off < 0) slide(-1);
                else if (off > 0) slide(1);
              }}
              role="button"
              aria-label={card.title}
            >
              <div className="home-rel-card-bg" />
              <div className="home-rel-card-sparkles">
                {Array.from({ length: 8 }).map((_, k) => (
                  <span key={k} style={{ '--rs-i': k }}>✦</span>
                ))}
              </div>

              <div className="home-rel-card-icon">
                <span className="home-rel-card-icon-main">{card.icon}</span>
              </div>

              <h3 className="home-rel-card-title">{card.title}</h3>
              <p className="home-rel-card-sub">{card.sub}</p>

              <div className="home-rel-card-shortcuts">
                {card.shortcuts.map((sc, sIdx) => (
                  <button
                    key={sc.label}
                    className="home-rel-shortcut"
                    style={{ '--sc-i': sIdx }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragRef.current.moved) { e.preventDefault(); return; }
                      if (!isCenter) {
                        if (off < 0) slide(-1);
                        else if (off > 0) slide(1);
                        return;
                      }
                      navigate(sc.path, sc.state ? { state: sc.state } : undefined);
                    }}
                    tabIndex={isCenter ? 0 : -1}
                  >
                    <span className="home-rel-shortcut-icon">{sc.icon}</span>
                    <span className="home-rel-shortcut-label">{sc.label}</span>
                  </button>
                ))}
              </div>

              <div className="home-rel-card-cta">
                전체 보기 <span className="home-rel-card-arrow">→</span>
              </div>
            </div>
          );
        })}

        {/* 좌우 화살표 */}
        <button className="home-rel-arrow home-rel-arrow-left" onClick={() => slide(-1)} aria-label="이전">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3 L5 12 L16 21 Z" fill="currentColor" /></svg>
        </button>
        <button className="home-rel-arrow home-rel-arrow-right" onClick={() => slide(1)} aria-label="다음">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3 L19 12 L8 21 Z" fill="currentColor" /></svg>
        </button>
      </div>

      {/* 도트 인디케이터 */}
      <div className="home-rel-dots">
        {cards.map((_, i) => (
          <button
            key={i}
            className={`home-rel-dot ${i === active ? 'active' : ''}`}
            onClick={() => {
              if (i === active) return;
              const diff = ((i - active) % len + len) % len;
              slide(diff <= len / 2 ? 1 : -1);
            }}
            aria-label={`카드 ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

// 시간대별 폴백 그라데이션 — weatherData 없을 때 사용 (실제 날씨 받기 전)
const TIMEBAND_FALLBACK_GRAD = {
  dawn:     { bgFrom: '#fb923c', bgTo: '#fcd34d' },
  morning:  { bgFrom: '#7dd3fc', bgTo: '#fde68a' },
  noon:     { bgFrom: '#7dd3fc', bgTo: '#fbbf24' },
  evening:  { bgFrom: '#f97316', bgTo: '#7c3aed' },
  night:    { bgFrom: '#1e3a8a', bgTo: '#312e81' },
  midnight: { bgFrom: '#0f172a', bgTo: '#1e1b4b' },
};

const FALLBACK_WEATHER_BASE = {
  city: '서울',
  temp: 18,
  high: 22,
  low: 12,
  condition: 'Clear',
  conditionLabel: '맑음',
  icon: '☀️',
  humidity: 45,
  message: '날씨 정보를 불러오는 중...',
};

function Home() {
  const navigate = useNavigate();
  const location = useLocation();


  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayStr = dayNames[today.getDay()];
  const dailyMsg = useMemo(() => DAILY_MESSAGES[today.getDate() % DAILY_MESSAGES.length], []);

  const [myData, setMyData] = useState(null);
  const [fortuneLoading, setFortuneLoading] = useState(false);
  const [loveTemp, setLoveTemp] = useState(null);

  // (heroFace 제거됨 — Hero v2 는 통합 카드)

  // 오늘의 날씨 (서버 프록시 → OpenWeather)
  const [weatherData, setWeatherData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getCurrentWeather()
      .then((w) => { if (!cancelled) setWeatherData(w); })
      .catch((e) => { console.warn('[home] weather fetch failed', e?.message); });
    return () => { cancelled = true; };
  }, []);

  // 시간대별 (새벽/아침/점심/저녁/밤/심야) — 1분마다 갱신
  const [timeBand, setTimeBandState] = useState(() => getTimeBand());
  useEffect(() => {
    const id = setInterval(() => setTimeBandState(getTimeBand()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // guest form
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [gender, setGender] = useState('');
  const [guestResult, setGuestResult] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // 더보기 토글 제거됨 — HOME_MORE_MENUS 도 전용 페이지로 이관

  // love modal
  const [loveModal, setLoveModal] = useState(null);
  const [loveBirth, setLoveBirth] = useState('');
  const [loveGender, setLoveGender] = useState('');
  const [lovePartnerDate, setLovePartnerDate] = useState('');
  const [lovePartnerGender, setLovePartnerGender] = useState('');
  const [loveMeetDate, setLoveMeetDate] = useState('');
  const [loveBreakupDate, setLoveBreakupDate] = useState('');
  const [loveShowPartner, setLoveShowPartner] = useState(false);
  const [loveShowStarPicker, setLoveShowStarPicker] = useState(false);
  const [loveLoading, setLoveLoading] = useState(false);
  const [loveResult, setLoveResult] = useState(null);
  const [loveStreamText, setLoveStreamText] = useState('');
  const [loveMatrixShown, setLoveMatrixShown] = useState(false);
  const [loveMatrixExiting, setLoveMatrixExiting] = useState(false);
  const [loveStreaming, setLoveStreaming] = useState(false);
  const loveResultRef = useRef(null);
  const loveCleanupRef = useRef(null);

  const activeScore = useMemo(() => {
    if (guestResult?.todayFortune) return guestResult.todayFortune.score || 70;
    return null;
  }, [guestResult]);
  const weather = activeScore !== null ? getWeather(activeScore) : null;


  useEffect(() => {
    getLoveTemperature(userId || undefined).then(setLoveTemp).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setFortuneLoading(true);
        // 유저 정보와 운세를 병렬 로딩
        const [user, fortune] = await Promise.all([
          getUser(userId),
          getMyFortune(userId).catch(e => { console.warn('운세 미리보기 로드 실패:', e.message); return null; })
        ]);
        const data = { user };
        if (fortune?.saju) data.saju = fortune.saju;
        setMyData(data);
        localStorage.setItem('userProfile', JSON.stringify(user));
      } catch (e) { console.error(e); }
      finally { setFortuneLoading(false); }
    })();
  }, [userId]);

  useEffect(() => {
    if (location.state?.openLove) {
      openLoveModal(location.state.openLove);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleGuestSubmit = async () => {
    if (!birthDate) return;
    setGuestLoading(true);
    try { setGuestResult(await getGuestFortune(birthDate, birthTime || undefined, calendarType, gender || undefined)); }
    catch (err) { console.error(err); }
    finally { setGuestLoading(false); }
  };

  const handleGuestReset = () => { setGuestResult(null); setBirthDate(''); setBirthTime(''); setGender(''); setShowForm(false); };

  const openLoveModal = (typeId) => {
    setLoveModal(typeId);
    setLoveResult(null);
    setLoveLoading(false);
    setLoveBirth('');
    setLoveGender('');
    setLovePartnerDate('');
    setLovePartnerGender('');
    setLoveMeetDate('');
    setLoveBreakupDate('');
    setLoveShowPartner(false);
  };
  const closeLoveModal = () => { setLoveModal(null); setLoveResult(null); setLoveLoading(false); setLoveStreaming(false); setLoveStreamText(''); setLoveMatrixShown(false); setLoveMatrixExiting(false); loveCleanupRef.current?.(); };

  useEffect(() => {
    if (loveResult && loveMatrixShown) {
      setLoveMatrixExiting(true);
      const t = setTimeout(() => setLoveMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [loveResult, loveMatrixShown]);

  const handleLoveAnalyze = async () => {
    if (isGuest()) { navigate('/register'); return; }
    if (!loveBirth || !loveModal) return;
    setLoveLoading(true); setLoveResult(null); setLoveStreamText(''); setLoveMatrixShown(true); setLoveMatrixExiting(false);

    const pDate = loveShowPartner && lovePartnerDate ? lovePartnerDate : null;
    const pGender = loveShowPartner && lovePartnerGender ? lovePartnerGender : null;
    const bDate = loveModal === 'reunion' && loveBreakupDate ? loveBreakupDate : null;
    const mDate = loveModal === 'blind_date' && loveMeetDate ? loveMeetDate : null;

    try {
      // 1단계: 캐시 체크
      const basic = await getLoveFortuneBasic(loveModal, loveBirth, null, loveGender || null, null, pDate, pGender, bDate, mDate, null);
      if (basic.score && basic.overall) {
        setLoveResult(basic);
        setLoveLoading(false);
        return;
      }

      // 2단계: 스트리밍 — 매트릭스에 실시간 텍스트 공급
      setLoveStreaming(true);

      loveCleanupRef.current = getLoveFortuneStream(
        loveModal, loveBirth, '', loveGender || '', '', pDate || '', pGender || '', bDate || '', mDate || '', '',
        {
          onCached: (cachedData) => {
            setLoveStreaming(false); setLoveLoading(false); setLoveStreamText('');
            setLoveResult(cachedData);
          },
          onChunk: (text) => setLoveStreamText(prev => prev + text),
          onDone: (fullText) => {
            setLoveStreaming(false); setLoveLoading(false);
            const text = fullText || '';
            setLoveStreamText('');
            const parsed = parseAiJson(text);
            if (parsed) {
              const finalResult = { ...basic, ...parsed, score: parsed.score || basic.score || 65, grade: parsed.grade || basic.grade || '보통', overall: parsed.overall || '' };
              setLoveResult(finalResult);
              saveLoveFortuneCache({ ...finalResult, type: loveModal, birthDate: loveBirth, gender: loveGender }).catch(() => {});
            } else {
              setLoveResult({ ...basic, score: 65, grade: '보통', overall: text });
            }
          },
          onError: () => { setLoveStreaming(false); setLoveLoading(false); setLoveStreamText(''); },
        }
      );
    } catch (e) { console.error(e); setLoveLoading(false); setLoveStreaming(false); }
  };

  const loveInfo = LOVE_TYPES.find(l => l.id === loveModal);
  const loveHeartColor = loveResult?.score ? getLoveHeartColor(loveResult.score) : '#ffc0cb';

  const buildSwipeCards = () => {
    const cards = [];
    const user = myData?.user || {};
    cards.push({ id: 'saju', label: '사주 오늘의 운세', icon: '☯️', color: '#FBBF24' });
    if (user.bloodType) {
      cards.push({ id: 'blood', label: `${user.bloodType}형 혈액형 운세`, icon: '🩸', color: '#F472B6' });
    } else {
      cards.push({ id: 'blood', label: '혈액형 운세', icon: '🩸', color: '#F472B6', needSetup: true });
    }
    if (user.mbtiType) {
      cards.push({ id: 'mbti', label: `${user.mbtiType} MBTI 운세`, icon: '🧬', color: '#34D399' });
    } else {
      cards.push({ id: 'mbti', label: 'MBTI 운세', icon: '🧬', color: '#34D399', needSetup: true });
    }
    return cards;
  };
  const swipeCards = userId ? buildSwipeCards() : [];

  const renderGuestResult = () => {
    if (!guestResult?.todayFortune) return null;
    const f = guestResult.todayFortune;
    const w = getWeather(f.score);
    return (
      <div className="home-guest-result fade-in">
        <WeatherBg type={w.type} />
        <div className="home-weather-badge"><span>{w.emoji}</span> <span>{w.label}</span> <span className="home-weather-desc">{w.desc}</span></div>
        <div className="home-guest-result-header">
          <h3>오늘의 사주 운세</h3>
          {guestResult.dayMaster && <span className="home-guest-badge">{guestResult.dayMaster} 일간</span>}
        </div>
        <ScoreCircle score={f.score} size={120} />
        <div className="home-guest-fortunes">
          {CATEGORY_CONFIG.map((cat, index) => (<FortuneCard key={cat.key} icon={cat.icon} title={cat.title} description={f[cat.field] || ''} delay={index * 80} />))}
        </div>
        {(f.luckyNumber || f.luckyColor) && (
          <div className="swipe-card-lucky" style={{ marginTop: 12 }}>
            {f.luckyNumber != null && <div className="swipe-lucky-item"><span className="swipe-lucky-label">행운의 숫자</span><span className="swipe-lucky-value">{f.luckyNumber}</span></div>}
            {f.luckyNumber != null && f.luckyColor && <div className="swipe-lucky-divider" />}
            {f.luckyColor && <div className="swipe-lucky-item"><span className="swipe-lucky-label">행운의 색</span><span className="swipe-lucky-value">{f.luckyColor}</span></div>}
          </div>
        )}
        <button className="home-guest-reset-btn" onClick={handleGuestReset}>다른 생년월일로 보기</button>
      </div>
    );
  };


  return (
    <div className="home">
      {weather && <WeatherBg type={weather.type} />}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 1. Hero — 점수 + 날씨 + 한줄 통합 카드 (자동 움직임 X)         */}
      {/* ════════════════════════════════════════════════════════════ */}
      {(() => {
        const fallbackGrad = TIMEBAND_FALLBACK_GRAD[timeBand.id] || TIMEBAND_FALLBACK_GRAD.noon;
        const w = weatherData || { ...FALLBACK_WEATHER_BASE, ...fallbackGrad };
        const sajuScore = (myData?.saju?.aiAnalyzed && myData?.saju?.score != null) ? myData.saju.score : null;
        const sajuGrade = sajuScore == null ? '미계산' : sajuScore >= 80 ? '대길' : sajuScore >= 60 ? '길' : sajuScore >= 40 ? '보통' : '주의';
        const loveScore = loveTemp?.temperature ?? null;
        const loveGrade = loveScore == null ? '--' : loveScore >= 80 ? '뜨거움' : loveScore >= 60 ? '따뜻' : loveScore >= 40 ? '미지근' : '차가움';
        // 좌측 연애운 버튼 — 사용자 상태별로 가장 어울리는 메뉴로 동적 변경
        const loveBtn = (() => {
          if (!userId) return { icon: '💑', label: '나의 연인', path: '/my-love-compat' };
          switch (myData?.user?.relationshipStatus) {
            case 'IN_RELATIONSHIP':
            case 'MARRIED':
              return { icon: '💑', label: '나의 연인', path: '/my-love-compat' };
            case 'SOME':
              return { icon: '💘', label: '썸·짝사랑', path: '/my-some-crush' };
            case 'COMPLICATED':
              return { icon: '🌙', label: '다시 만날까', path: '/again-meet' };
            case 'SINGLE':
              return { icon: '🙋', label: '솔로 운세', path: '/my-solo' };
            default:
              return { icon: '💑', label: '나의 연인', path: '/my-love-compat' };
          }
        })();
        const oneLiner = (() => {
          if (!userId) return '';
          if (fortuneLoading && !myData?.saju) return '오늘의 운세를 불러오는 중...';
          if (myData?.saju?.aiAnalyzed && myData?.saju?.overall) {
            return myData.saju.overall.split('.')[0] + '.';
          }
          return '오늘의 운세를 분석받아보세요';
        })();
        return (
          <section
            className={`home-hero-v2 home-hero-v2--${timeBand.id}`}
            style={{ '--w-from': w.bgFrom, '--w-to': w.bgTo, '--w-overlay': timeBand.overlay }}
          >
            <div className="home-hero-v2-orb home-hero-v2-orb--1" />
            <div className="home-hero-v2-orb home-hero-v2-orb--2" />

            {/* 떠오르는 하트 버블 — loveScore 가 높을수록 더 많이/뜨겁게 */}
            <div className="home-hero-v2-hearts">
              {Array.from({ length: Math.max(8, Math.floor((loveScore || 50) / 5)) }).map((_, i) => {
                const total = Math.max(8, Math.floor((loveScore || 50) / 5));
                return (
                  <span key={i} className="home-hero-v2-heart" style={{
                    '--hf-x': `${5 + (i * 95 / total) % 92}%`,
                    '--hf-delay': `${(i * 0.4) % 5}s`,
                    '--hf-dur': `${3 + (i % 4) * 0.7}s`,
                    '--hf-size': `${10 + (i % 4) * 4}px`,
                  }}>&#x2764;</span>
                );
              })}
            </div>

            {/* 상단 메타 — 도시/시간대/날씨, 날씨 부분은 클릭 가능(로그인 시 날씨 궁합) */}
            <div className="home-hero-v2-top">
              <span className="home-hero-v2-meta">📍 {w.city}</span>
              <span className="home-hero-v2-meta-sep">·</span>
              <button
                className="home-hero-v2-meta home-hero-v2-meta--btn"
                onClick={(e) => { e.stopPropagation(); if (userId) navigate('/weather-compat'); }}
                title={userId ? '날씨 궁합 보기' : ''}
                disabled={!userId}
              >
                {w.icon} {w.temp}° {w.conditionLabel || w.condition}
                {userId && <span className="home-hero-v2-meta-arrow">›</span>}
              </button>
              <span className="home-hero-v2-meta-sep">·</span>
              <span className="home-hero-v2-meta">{timeBand.icon} {timeBand.label}</span>
            </div>

            {/* 중앙: 좌(연애운+버튼) | 우(오늘의 운세+버튼) */}
            <div className="home-hero-v2-center">
              {/* 좌측 — 연애운 + [나의 연인] 버튼 */}
              <div className="home-hero-v2-col home-hero-v2-col--love">
                <div className="home-hero-v2-score home-hero-v2-score--love">
                  <HeartScore score={loveScore} color="#ec4899" />
                  <div className="home-hero-v2-score-text">
                    <span className="home-hero-v2-score-label">오늘의 연애운</span>
                    <span className="home-hero-v2-score-grade" style={{ color: '#ec4899' }}>{loveGrade}</span>
                  </div>
                </div>
                <button
                  className="home-hero-v2-col-btn home-hero-v2-col-btn--love"
                  onClick={(e) => { e.stopPropagation(); navigate(loveBtn.path); }}
                >
                  {loveBtn.icon} {loveBtn.label} ›
                </button>
              </div>

              <div className="home-hero-v2-divider" />

              {/* 우측 — 오늘의 타로 한 장 (날짜 시드 + 플립 + 모달) */}
              <DailyTarot />
            </div>

            {oneLiner && <p className="home-hero-v2-oneliner">{oneLiner}</p>}
          </section>
        );
      })()}

      {/* 비로그인 CTA — Hero 바로 아래 */}
      {!userId && !showForm && (
        <section style={{ padding: '0 4px', marginBottom: 10 }}>
          <KakaoLoginCTA returnTo="/">카카오 로그인하고 맞춤 운세 받기</KakaoLoginCTA>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 2. 오늘의 추천 — 사용자 상태별 후보 풀 + 일별 로테이션         */}
      {/* ════════════════════════════════════════════════════════════ */}
      {(() => {
        const rec = pickDailyRecommend(userId, myData?.user?.relationshipStatus);
        const today = new Date();
        const dateLabel = `${today.getMonth() + 1}/${today.getDate()}`;
        const handleClick = () => {
          if (rec.isAction) { setShowForm(true); return; }
          navigate(rec.path, rec.state ? { state: rec.state } : undefined);
        };
        return (
          <section style={{ padding: '0 4px', marginBottom: 12 }}>
            <button className="home-recommend-card" onClick={handleClick}>
              <span className="home-recommend-badge">오늘의 추천 · {dateLabel}</span>
              <div className="home-recommend-body">
                <span className="home-recommend-icon">{rec.icon}</span>
                <div className="home-recommend-text">
                  <span className="home-recommend-title">{rec.title}</span>
                  <span className="home-recommend-sub">{rec.sub}</span>
                </div>
                <span className="home-recommend-arrow">›</span>
              </div>
            </button>
          </section>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 3. 메뉴 페이저 — 4×2 정사각 타일 × N페이지 (가로 스와이프)    */}
      {/* ════════════════════════════════════════════════════════════ */}
      <MenuPager navigate={navigate} />

      {/* 인기 운세 섹션 제거 — 메뉴 페이저로 충분 */}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 5. 오늘의 행운 — 우→좌 흐르는 마퀴                            */}
      {/* ════════════════════════════════════════════════════════════ */}
      {(() => {
        const COLORS  = ['빨강','주황','노랑','초록','하늘','파랑','보라','분홍','금색','은색','청록','자주'];
        const TIMES   = ['새벽', '아침', '낮', '저녁', '밤', '오전 9시', '오후 3시', '오후 7시'];
        const PLACES  = ['카페', '서점', '공원', '강변', '산책로', '미술관', '한강', '바다', '꽃집', '도서관'];
        const d = new Date();
        const seed = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
        const color  = COLORS[seed % COLORS.length];
        const number = ((seed * 7) % 99) + 1;
        const time   = TIMES[(seed * 11) % TIMES.length];
        const place  = PLACES[(seed * 13) % PLACES.length];
        const text = `🍀 오늘의 행운  ·  🎨 색: ${color}  ·  🔢 숫자: ${number}  ·  ⏰ 시간: ${time}  ·  📍 장소: ${place}  ·  💫 ${d.getMonth()+1}월 ${d.getDate()}일`;
        return (
          <section className="home-lucky-marquee">
            <div className="home-lucky-marquee-track">
              <span className="home-lucky-marquee-text">{text}</span>
              <span className="home-lucky-marquee-text" aria-hidden="true">{text}</span>
            </div>
          </section>
        );
      })()}


      {/* 7. 비로그인: 게스트 운세 입력폼 */}
      {!userId && showForm && (
        <section className="home-guest-section">
          {guestLoading ? (
            <AnalysisMatrix theme="saju" label="오늘의 운세를 분석하고 있어요" />
          ) : guestResult ? (
            renderGuestResult()
          ) : (
            <div className="home-guest glass-card fade-in">
              <h3 className="home-guest__title">생년월일로 오늘의 운세 보기</h3>
              <div className="home-guest__form-group"><label className="home-guest__label">달력</label><div className="home-guest__toggle"><button type="button" className={`home-guest__toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button><button type="button" className={`home-guest__toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button></div></div>
              <div className="home-guest__form-group"><label className="home-guest__label">생년월일</label><BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} /></div>
              <div className="home-guest__form-group"><label className="home-guest__label">태어난 시간 (선택)</label><select className="home-guest__input home-guest__select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>{BIRTH_TIMES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
              <div className="home-guest__form-group"><label className="home-guest__label">성별</label><div className="home-guest__toggle"><button type="button" className={`home-guest__toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}><span className="g-circle g-male">♂</span></button><button type="button" className={`home-guest__toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}><span className="g-circle g-female">♀</span></button></div></div>
              <button className="home-guest__submit-full" onClick={handleGuestSubmit} disabled={!birthDate}>오늘의 운세 보기</button>
              <button className="home-guest__link" onClick={() => setShowForm(false)}>돌아가기</button>
            </div>
          )}
        </section>
      )}

      {/* 연애 운세 바텀시트 모달 */}
      {loveModal && (
        <div className="love-modal-overlay" onClick={closeLoveModal}>
          <div className="love-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="love-modal-handle" />
            <div className="love-modal-header">
              <span className="love-modal-icon">{loveInfo?.icon === 'couple' ? <span className="couple-icon"><span className="couple-m">♂</span><span className="couple-heart">♡</span><span className="couple-f">♀</span></span> : loveInfo?.icon === 'wedding' ? <span className="wedding-icon wedding-icon--lg"><span className="wedding-person"><span className="wedding-hat">🎩</span><span className="wedding-sym wedding-sym--m">♂</span></span><span className="wedding-person"><span className="wedding-hat">🎀</span><span className="wedding-sym wedding-sym--f">♀</span></span></span> : loveInfo?.icon}</span>
              <h2 className="love-modal-title">{loveInfo?.label}</h2>
              <span className="love-modal-desc">{loveInfo?.desc}</span>
              <button className="love-modal-close" onClick={closeLoveModal}>✕</button>
            </div>

            <div className="love-modal-body">
              {!loveResult && !loveLoading && (
                <div className="love-modal-form fade-in">
                  {userId && (
                    <button className="love-modal-autofill" onClick={() => {
                      try {
                        const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                        if (p.birthDate) setLoveBirth(p.birthDate);
                        if (p.gender) setLoveGender(p.gender);
                      } catch {}
                    }}>내 정보로 채우기</button>
                  )}
                  <div className="love-modal-field">
                    <label className="love-modal-label">생년월일</label>
                    <BirthDatePicker value={loveBirth} onChange={setLoveBirth} />
                  </div>
                  <div className="love-modal-field">
                    <label className="love-modal-label">성별</label>
                    <div className="love-modal-toggle">
                      <button className={`love-modal-toggle-btn ${loveGender === 'M' ? 'active' : ''}`} onClick={() => setLoveGender('M')}><span className="g-circle g-male">♂</span></button>
                      <button className={`love-modal-toggle-btn ${loveGender === 'F' ? 'active' : ''}`} onClick={() => setLoveGender('F')}><span className="g-circle g-female">♀</span></button>
                    </div>
                  </div>

                  {loveModal === 'reunion' && (
                    <div className="love-modal-field">
                      <label className="love-modal-label">헤어진 시기 <span className="love-modal-opt">(선택)</span></label>
                      <BirthDatePicker value={loveBreakupDate} onChange={setLoveBreakupDate} />
                    </div>
                  )}
                  {loveModal === 'blind_date' && (
                    <div className="love-modal-field">
                      <label className="love-modal-label">소개팅 날짜 <span className="love-modal-opt">(선택)</span></label>
                      <BirthDatePicker value={loveMeetDate} onChange={setLoveMeetDate} />
                    </div>
                  )}

                  {loveModal !== 'ideal_type' && (
                  <button className="love-modal-partner-btn" onClick={() => setLoveShowPartner(!loveShowPartner)}>
                    {loveShowPartner ? '상대방 정보 접기' : '상대방 정보 추가 (선택)'}
                  </button>
                  )}
                  {loveShowPartner && (
                    <div className="love-modal-partner fade-in">
                      {(() => {
                        const prof = (() => { try { return JSON.parse(localStorage.getItem('userProfile')||'{}'); } catch { return {}; } })();
                        const stars = (() => { try { return JSON.parse(localStorage.getItem('myStarList')||'[]'); } catch { return []; } })();
                        return (prof.partnerBirthDate || stars.length > 0) ? (
                          <div className="compat-autofill-row">
                            {prof.partnerBirthDate && (
                              <button className="sf-autofill-btn" onClick={() => { setLovePartnerDate(prof.partnerBirthDate); if (prof.gender === 'M') setLovePartnerGender('F'); else setLovePartnerGender('M'); }}>💕 연인 정보로 채우기</button>
                            )}
                            {stars.length > 0 && (
                              <button className="sf-autofill-btn" onClick={() => setLoveShowStarPicker(true)}>⭐ 스타 정보로 채우기</button>
                            )}
                          </div>
                        ) : null;
                      })()}
                      {loveShowStarPicker && (
                        <div className="star-picker-overlay" onClick={() => setLoveShowStarPicker(false)}>
                          <div className="star-picker-popup" onClick={e => e.stopPropagation()}>
                            <div className="star-picker-header">
                              <h3 className="star-picker-title">⭐ 나의 스타 선택</h3>
                              <button className="star-picker-close" onClick={() => setLoveShowStarPicker(false)}>✕</button>
                            </div>
                            <div className="star-picker-list">
                              {(() => { try { return JSON.parse(localStorage.getItem('myStarList')||'[]'); } catch { return []; } })().map((s, i) => (
                                <button key={i} className="star-picker-item" onClick={() => { setLovePartnerDate(s.birth); if (s.gender) setLovePartnerGender(s.gender); setLoveShowStarPicker(false); }}>
                                  <span className={`star-picker-sym ${s.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>{s.gender === 'M' ? '♂' : '♀'}</span>
                                  <div className="star-picker-info"><span className="star-picker-name">{s.name}</span>{s.group && <span className="star-picker-group">{s.group}</span>}</div>
                                  <span className="star-picker-birth">{s.birth?.slice(0, 4)}년생</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="love-modal-field">
                        <label className="love-modal-label">상대방 생년월일</label>
                        <BirthDatePicker value={lovePartnerDate} onChange={setLovePartnerDate} />
                      </div>
                      <div className="love-modal-field">
                        <label className="love-modal-label">상대방 성별</label>
                        <div className="love-modal-toggle">
                          <button className={`love-modal-toggle-btn ${lovePartnerGender === 'M' ? 'active' : ''}`} onClick={() => setLovePartnerGender('M')}><span className="g-circle g-male">♂</span></button>
                          <button className={`love-modal-toggle-btn ${lovePartnerGender === 'F' ? 'active' : ''}`} onClick={() => setLovePartnerGender('F')}><span className="g-circle g-female">♀</span></button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button className="love-modal-submit" onClick={handleLoveAnalyze} disabled={!loveBirth}>
                    {loveInfo?.icon === 'couple' ? <span className="couple-icon"><span className="couple-m">♂</span><span className="couple-heart">♡</span><span className="couple-f">♀</span></span> : loveInfo?.icon === 'wedding' ? '💒' : loveInfo?.icon} {loveInfo?.label} 보기
                    <HeartCost category={LOVE_HEART_MAP[loveModal] || 'LOVE_RELATIONSHIP'} />
                  </button>
                </div>
              )}

              {loveMatrixShown && (
                <AnalysisMatrix theme="love" variant="modal" label={`AI가 ${loveInfo?.label || '연애운'}을 분석하고 있어요`} streamText={loveStreamText} exiting={loveMatrixExiting} />
              )}

              {loveResult && (
                <div className="love-modal-result love-result-reveal" ref={loveResultRef} style={{ '--heart-color': loveHeartColor }}>
                  {loveModal === 'ideal_type' ? (
                    <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
                      <span style={{ fontSize: 40 }}>👩‍❤️‍👨</span>
                      <h3 style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 4px', color: 'var(--color-text)' }}>나의 이상형 분석</h3>
                    </div>
                  ) : (
                    <div className="love-modal-score-card">
                      <div className="love-modal-heart-aura" style={{ background: `radial-gradient(circle, ${loveHeartColor}, transparent 70%)` }} />
                      <div className="love-modal-heart-center">
                        <span className="love-modal-heart-big" style={{ color: loveHeartColor }}>&#x2764;</span>
                        <span className="love-modal-heart-num">{loveResult.score}</span>
                        <span className="love-modal-heart-unit">점</span>
                      </div>
                      <span className="love-modal-heart-grade" style={{ color: GRADE_COLORS[loveResult.grade] || loveHeartColor }}>{loveResult.grade}</span>
                    </div>
                  )}

                  <FortuneCard icon={loveModal === 'ideal_type' ? '🔮' : loveInfo?.icon === 'couple' ? '💕' : loveInfo?.icon === 'wedding' ? '💒' : loveInfo?.icon} title={loveModal === 'ideal_type' ? '사주로 본 나의 이상형' : '종합 분석'} description={loveResult.overall} delay={0} />

                  {/* 이상형 전용 카드 */}
                  {loveModal === 'ideal_type' && (
                    <>
                      {loveResult.lookType && <FortuneCard icon="✨" title="이상형 외모/분위기" description={loveResult.lookType} delay={80} />}
                      {loveResult.personalityType && <FortuneCard icon="💎" title="이상형 성격/가치관" description={loveResult.personalityType} delay={160} />}
                      {loveResult.bestZodiac && <FortuneCard icon="🐾" title="잘 맞는 띠 TOP3" description={loveResult.bestZodiac} delay={240} />}
                      {loveResult.bestMbti && <FortuneCard icon="🧬" title="잘 맞는 MBTI" description={loveResult.bestMbti} delay={320} />}
                      {loveResult.celebMatch && <FortuneCard icon="🌟" title="나와 궁합 좋은 연예인" description={loveResult.celebMatch} delay={400} />}
                      {loveResult.meetingPlace && <FortuneCard icon="📍" title="만남 장소 추천" description={loveResult.meetingPlace} delay={480} />}
                      {loveResult.meetingTiming && <FortuneCard icon="📅" title="인연 만날 시기" description={loveResult.meetingTiming} delay={560} />}
                    </>
                  )}

                  {/* 일반 연애 운세 카드 */}
                  {loveModal !== 'ideal_type' && loveResult.timing && <FortuneCard icon="📅" title="최적 시기" description={loveResult.timing} delay={80} />}
                  {loveModal !== 'ideal_type' && loveResult.advice && <FortuneCard icon="💡" title="행동 조언" description={loveResult.advice} delay={160} />}
                  {loveResult.caution && <FortuneCard icon="⚠️" title="주의사항" description={loveResult.caution} delay={loveModal === 'ideal_type' ? 640 : 240} />}

                  {(loveResult.luckyDay || loveResult.luckyPlace || loveResult.luckyColor) && (
                    <div className="love-modal-lucky glass-card">
                      {loveResult.luckyDay && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 날</span><span className="love-modal-lucky-value">{loveResult.luckyDay}</span></div>}
                      {loveResult.luckyPlace && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 장소</span><span className="love-modal-lucky-value">{loveResult.luckyPlace}</span></div>}
                      {loveResult.luckyColor && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 색</span><span className="love-modal-lucky-value">{loveResult.luckyColor}</span></div>}
                    </div>
                  )}

                  <button className="love-modal-share" onClick={async () => {
                    const text = `[1:1연애 💕 ${loveInfo?.label}]\n점수: ${loveResult.score}점 (${loveResult.grade})\n${(loveResult.overall||'').split('.').slice(0,2).join('.')}.\n\nhttps://recipepig.kr`;
                    const res = await shareResult({ title: `${loveInfo?.label} 결과`, text });
                    if (res === 'copied') alert('클립보드에 복사되었습니다!');
                  }}>📤 공유하기</button>
                  <button className="love-modal-reset" onClick={() => { setLoveResult(null); setLoveBirth(''); }}>다시 보기</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 하단 pull-up drawer — 오늘 본 모든 운세 히스토리 (타입 무관) */}
      {!isGuest() && (
        <HistoryDrawer
          label="📚 최근 본 운세"
          limit={20}
          onOpen={async (item) => {
            try {
              let subType = null;
              if (item.type === 'love_11') {
                const full = await getHistory(item.id);
                subType = full?.payload?.type || 'relationship';
              }
              const state = { restoreHistoryId: item.id };
              switch (item.type) {
                case 'today_fortune':
                case 'partner_fortune':
                case 'other_fortune':
                  navigate('/my', { state });
                  break;
                case 'love_11':
                  navigate(`/love/${subType || 'relationship'}`, { state });
                  break;
                case 'tarot':
                  navigate('/tarot', { state });
                  break;
                case 'compatibility':
                  navigate('/compatibility', { state });
                  break;
                case 'celeb_compatibility':
                  navigate('/celeb-compatibility', { state });
                  break;
                case 'my_love_compat':
                case 'marriage_compat':
                case 'skinship_compat':
                  navigate('/my-love-compat', { state });
                  break;
                default:
                  break;
              }
            } catch {}
          }}
        />
      )}
    </div>
  );
}

export default Home;
