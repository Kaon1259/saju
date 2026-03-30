import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransition } from '../components/PageTransition';
import ZodiacGrid from '../components/ZodiacGrid';
import FortuneCard from '../components/FortuneCard';
import { getAllTodayFortunes, getMyFortune, getGuestFortune, getLoveTemperature, getSpecialLoveFortune } from '../api/fortune';
import SpeechButton from '../components/SpeechButton';
import BirthDatePicker from '../components/BirthDatePicker';
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

const DAILY_MESSAGES = [
  '오늘 하루도 빛나는 당신이 되세요 ✨',
  '좋은 기운이 당신을 감싸고 있습니다 🍀',
  '새로운 인연이 다가오고 있어요 💫',
  '당신의 노력은 반드시 빛을 발합니다 🌟',
  '오늘은 특별한 행운이 기다리고 있어요 🎯',
  '마음을 열면 기회가 보입니다 🌈',
  '당신만의 빛을 믿어보세요 🔮',
];

const LOVE_TYPES = [
  { id: 'relationship', label: '연애운',   icon: '💕', desc: '연인과의 오늘 하루' },
  { id: 'reunion',      label: '재회운',   icon: '💔', desc: '다시 만날 수 있을까?' },
  { id: 'remarriage',   label: '재혼운',   icon: '💍', desc: '새로운 인연의 가능성' },
  { id: 'blind_date',   label: '소개팅운', icon: '💘', desc: '좋은 만남이 올까?' },
];

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getLoveHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  return `hsl(340, ${30 + s * 0.7}%, ${85 - s * 0.4}%)`;
}

// ─── 오늘의 일진 계산 ───
const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const STEM_ELEMENT = ['목','목','화','화','토','토','금','금','수','수'];
const BRANCH_ELEMENT = ['수','토','목','목','토','화','화','토','금','금','토','수'];
const ELEMENT_ORDER = ['목','화','토','금','수'];

const ELEMENT_CONFIG = {
  '목': { emoji: '🌿', color: '#4ade80', label: '목', desc: '성장' },
  '화': { emoji: '🔥', color: '#f87171', label: '화', desc: '열정' },
  '토': { emoji: '🏔️', color: '#fbbf24', label: '토', desc: '안정' },
  '금': { emoji: '⚡', color: '#e2e8f0', label: '금', desc: '결단' },
  '수': { emoji: '💧', color: '#60a5fa', label: '수', desc: '지혜' },
};

const ILJIN_MESSAGES = {
  '목': ['새로운 시작의 기운이 가득합니다', '성장과 발전의 에너지가 넘칩니다', '창의적인 아이디어가 떠오르는 날'],
  '화': ['열정과 활력이 넘치는 하루입니다', '적극적인 행동이 좋은 결과를 만듭니다', '사교 활동에 좋은 기운이 흐릅니다'],
  '토': ['안정과 조화의 기운이 감싸는 날입니다', '차분하게 계획을 세우기 좋은 하루', '신뢰를 쌓아가기 좋은 에너지입니다'],
  '금': ['결단력과 집중력이 높아지는 날입니다', '정리와 마무리에 좋은 기운입니다', '명확한 판단이 빛을 발합니다'],
  '수': ['깊은 통찰과 지혜가 빛나는 날입니다', '내면을 돌아보기 좋은 하루입니다', '유연한 대처가 행운을 가져옵니다'],
};

function getTodayIljin() {
  const now = new Date();
  const ref = new Date(2000, 0, 1); // 2000-01-01 = 갑오일 (cycle 30)
  const daysDiff = Math.floor((now - ref) / 86400000);
  const cycle = ((30 + daysDiff) % 60 + 60) % 60;
  const stemIdx = cycle % 10;
  const branchIdx = cycle % 12;
  const stemEl = STEM_ELEMENT[stemIdx];
  const branchEl = BRANCH_ELEMENT[branchIdx];

  const elements = { '목': 1, '화': 1, '토': 1, '금': 1, '수': 1 }; // 기본 기운
  elements[stemEl] += 3;
  elements[branchEl] += 2;
  elements[ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(stemEl) + 1) % 5]] += 1; // 상생 보너스

  const maxEl = Object.entries(elements).sort((a, b) => b[1] - a[1])[0][0];
  const msgs = ILJIN_MESSAGES[maxEl];

  return {
    stem: STEMS[stemIdx], branch: BRANCHES[branchIdx],
    stemElement: stemEl, branchElement: branchEl,
    elements, maxElement: maxEl,
    message: msgs[now.getDate() % msgs.length],
    mainEmoji: ELEMENT_CONFIG[maxEl].emoji,
    mainColor: ELEMENT_CONFIG[maxEl].color,
  };
}

// 점수별 날씨 결정
function getWeather(score) {
  if (score >= 85) return { type: 'sunny', emoji: '☀️', label: '맑음', desc: '최고의 하루가 될 거예요!' };
  if (score >= 70) return { type: 'rainbow', emoji: '🌤️', label: '화창', desc: '좋은 기운이 함께합니다' };
  if (score >= 55) return { type: 'cloudy', emoji: '⛅', label: '구름', desc: '차분한 하루를 보내세요' };
  if (score >= 40) return { type: 'wind', emoji: '🌧️', label: '비', desc: '비 뒤에 무지개가 옵니다' };
  return { type: 'storm', emoji: '⛈️', label: '폭풍', desc: '이것도 지나갈 거예요' };
}

// 날씨 배경 효과
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

function Home() {
  const navigate = useNavigate();
  const swipeRef = useRef(null); // guest result scroll용
  const [zodiacScores, setZodiacScores] = useState(null);
  const [zodiacLoading, setZodiacLoading] = useState(true);
  const [loveTemp, setLoveTemp] = useState(null);
  const [myData, setMyData] = useState(null);
  const [myLoading, setMyLoading] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [gender, setGender] = useState('');
  const [guestResult, setGuestResult] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // 연애 운세 모달
  const [loveModal, setLoveModal] = useState(null); // LOVE_TYPES id or null
  const [loveBirth, setLoveBirth] = useState('');
  const [loveGender, setLoveGender] = useState('');
  const [lovePartnerDate, setLovePartnerDate] = useState('');
  const [lovePartnerGender, setLovePartnerGender] = useState('');
  const [loveMeetDate, setLoveMeetDate] = useState('');
  const [loveBreakupDate, setLoveBreakupDate] = useState('');
  const [loveShowPartner, setLoveShowPartner] = useState(false);
  const [loveLoading, setLoveLoading] = useState(false);
  const [loveResult, setLoveResult] = useState(null);
  const [loveFormSliding, setLoveFormSliding] = useState(false);
  const loveResultRef = useRef(null);

  const { triggerTransition } = useTransition();

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayStr = dayNames[today.getDay()];
  const dailyMsg = useMemo(() => DAILY_MESSAGES[today.getDate() % DAILY_MESSAGES.length], []);
  const iljin = useMemo(() => getTodayIljin(), []);

  // 현재 보여지는 운세의 점수로 날씨 결정
  const activeScore = useMemo(() => {
    if (userId && myData) {
      const saju = myData.saju;
      return saju?.score || 70;
    }
    if (guestResult?.todayFortune) {
      return guestResult.todayFortune.score || 70;
    }
    return null;
  }, [userId, myData, guestResult]);

  const weather = activeScore !== null ? getWeather(activeScore) : null;

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllTodayFortunes();
        const scores = {};
        if (Array.isArray(data)) data.forEach((item) => { if (item.zodiacAnimal && item.score !== undefined) scores[item.zodiacAnimal] = item.score; });
        setZodiacScores(scores);
      } catch { setZodiacScores({}); }
      finally { setZodiacLoading(false); }
    })();
    // 연애 온도 (로그인 시 사용자 사주 기반)
    getLoveTemperature(userId || undefined).then(setLoveTemp).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setMyLoading(true);
    (async () => {
      try {
        const data = await getMyFortune(userId);
        setMyData(data);
        // 프로필 정보를 localStorage에 항상 최신으로 갱신
        if (data?.user) {
          localStorage.setItem('userProfile', JSON.stringify(data.user));
        }
      }
      catch (e) { console.error(e); }
      finally { setMyLoading(false); }
    })();
  }, [userId]);

  const handleZodiacSelect = (zodiac) => navigate(`/fortune?zodiac=${encodeURIComponent(zodiac)}`);
  const handleSwipeScroll = useCallback(() => {
    const el = swipeRef.current;
    if (el) setCurrentCard(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

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
    setLoveFormSliding(false);
  };
  const closeLoveModal = () => { setLoveModal(null); setLoveResult(null); setLoveLoading(false); setLoveFormSliding(false); };

  const handleLoveAnalyze = async () => {
    if (!loveBirth || !loveModal) return;
    setLoveLoading(true); setLoveResult(null);
    try {
      const data = await getSpecialLoveFortune(
        loveModal, loveBirth, null, loveGender || null, null,
        loveShowPartner && lovePartnerDate ? lovePartnerDate : null,
        loveShowPartner && lovePartnerGender ? lovePartnerGender : null,
        loveModal === 'reunion' && loveBreakupDate ? loveBreakupDate : null,
        loveModal === 'blind_date' && loveMeetDate ? loveMeetDate : null
      );
      setLoveResult(data);
      setTimeout(() => loveResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) { console.error(e); }
    finally { setLoveLoading(false); }
  };

  const loveInfo = LOVE_TYPES.find(l => l.id === loveModal);
  const loveHeartColor = loveResult?.score ? getLoveHeartColor(loveResult.score) : '#ffc0cb';

  const buildSwipeCards = () => {
    if (!myData) return [];
    const cards = [];
    const user = myData.user || {};
    if (myData.saju) cards.push({ id: 'saju', label: '사주 오늘의 운세', icon: '☯️', data: myData.saju, color: '#FBBF24' });
    if (myData.bloodType && user.bloodType) {
      cards.push({ id: 'blood', label: `${user.bloodType}형 혈액형 운세`, icon: '🩸', data: myData.bloodType, color: '#F472B6' });
    } else {
      cards.push({ id: 'blood', label: '혈액형 운세', icon: '🩸', data: null, color: '#F472B6', needSetup: true });
    }
    if (myData.mbti && user.mbtiType) {
      cards.push({ id: 'mbti', label: `${user.mbtiType} MBTI 운세`, icon: '🧬', data: myData.mbti, color: '#34D399' });
    } else {
      cards.push({ id: 'mbti', label: 'MBTI 운세', icon: '🧬', data: null, color: '#34D399', needSetup: true });
    }
    return cards;
  };
  const swipeCards = userId ? buildSwipeCards() : [];

  // 읽어주기 텍스트
  const speechText = useMemo(() => {
    if (!myData?.saju) return '';
    const s = myData.saju;
    const name = userName || myData.user?.name || '';
    return [
      `${name}님, 오늘의 사주 운세입니다.`,
      `오늘의 운세 점수는 ${s.score || 70}점입니다.`,
      s.overall ? `총운. ${s.overall}` : '',
      s.love ? `애정운. ${s.love}` : '',
      s.money ? `재물운. ${s.money}` : '',
      s.health ? `건강운. ${s.health}` : '',
      s.work ? `직장운. ${s.work}` : '',
      s.luckyNumber ? `행운의 숫자는 ${s.luckyNumber},` : '',
      s.luckyColor ? `행운의 색은 ${s.luckyColor}입니다.` : '',
      '오늘도 좋은 하루 보내세요!',
    ].filter(Boolean).join(' ');
  }, [myData, userName]);

  const speechSummary = useMemo(() => {
    if (!myData?.saju) return '';
    const s = myData.saju;
    const name = userName || myData.user?.name || '';
    return [
      `${name}님, 오늘 운세 점수는 ${s.score || 70}점입니다.`,
      s.overall ? `총운 요약. ${s.overall.split('.').slice(0, 2).join('.')}.` : '',
      s.luckyNumber ? `행운의 숫자 ${s.luckyNumber},` : '',
      s.luckyColor ? `행운의 색 ${s.luckyColor}입니다.` : '',
    ].filter(Boolean).join(' ');
  }, [myData, userName]);

  const renderFortuneContent = (fortune, cardType) => {
    if (!fortune) return null;
    return (
      <div className="swipe-card-content">
        <ScoreCircle score={fortune.score} size={110} />
        <div className="swipe-card-categories">
          {CATEGORY_CONFIG.map((cat) => {
            const text = fortune[cat.field];
            if (!text) return null;
            return (<div key={cat.key} className="swipe-cat-item"><span className="swipe-cat-icon">{cat.icon}</span><div className="swipe-cat-body"><span className="swipe-cat-title">{cat.title}</span><p className="swipe-cat-desc">{text}</p></div></div>);
          })}
        </div>
        {fortune.tip && <div className="swipe-card-tip"><span>💡</span><p>{fortune.tip}</p></div>}
        {cardType === 'blood' && fortune.dayAnalysis && <div className="swipe-card-analysis"><span>☯️</span><p>{fortune.dayAnalysis}</p></div>}
        {(fortune.luckyNumber || fortune.luckyColor) && (
          <div className="swipe-card-lucky">
            {fortune.luckyNumber != null && <div className="swipe-lucky-item"><span className="swipe-lucky-label">행운의 숫자</span><span className="swipe-lucky-value">{fortune.luckyNumber}</span></div>}
            {fortune.luckyNumber != null && fortune.luckyColor && <div className="swipe-lucky-divider" />}
            {fortune.luckyColor && <div className="swipe-lucky-item"><span className="swipe-lucky-label">행운의 색</span><span className="swipe-lucky-value">{fortune.luckyColor}</span></div>}
          </div>
        )}
      </div>
    );
  };

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
          {guestResult.dayMaster && <span className="home-guest-badge">{guestResult.dayMasterHanja} {guestResult.dayMaster} 일간</span>}
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
      {/* 날씨 배경 (운세 결과가 있을 때) */}
      {weather && <WeatherBg type={weather.type} />}

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__row">
          <div className="home-hero__left">
            <h1 className="home-hero__title">오늘의 운세</h1>
            <p className="home-hero__sub">{userId && userName ? `${userName}님의 맞춤 운세` : '사주팔자로 보는 당신의 하루'}</p>
          </div>
          <div className="home-hero__date-badge">
            <span className="home-hero__day">{dayStr}</span>
            <span className="home-hero__date">{dateStr}</span>
          </div>
        </div>
        <div className="home-hero-iljin">
          <span className="home-hero-iljin-dot" style={{ background: iljin.mainColor }} />
          <span>{iljin.mainEmoji} {iljin.stem}{iljin.branch}일</span>
          <span className="home-hero-iljin-el" style={{ color: iljin.mainColor }}>{ELEMENT_CONFIG[iljin.stemElement].label}+{ELEMENT_CONFIG[iljin.branchElement].label}</span>
        </div>
      </section>

      {/* ─── 오늘의 연애 온도 (최상단 전면) ─── */}
      {(() => {
        // 로그인/비로그인 모두 서버에서 계산된 연애 온도 사용
        const temp = loveTemp?.temperature || 55;
        const msg = loveTemp?.message || '사랑의 기운을 확인해보세요.';
        const heartSat = 30 + temp * 0.7;
        const heartLight = 80 - temp * 0.35;
        const heartColor = `hsl(340, ${heartSat}%, ${heartLight}%)`;
        const heartCount = Math.max(5, Math.floor(temp / 6));

        return (
          <section className="home-love-section" style={{ '--love-temp-color': heartColor }}>
            {/* 떠다니는 하트 (온도에 따라 개수/색 변화) */}
            <div className="home-love-hearts-bg">
              {Array.from({ length: heartCount }).map((_, i) => (
                <span key={i} className="home-love-float-heart" style={{
                  '--hf-x': `${5 + (i * 97 / heartCount) % 90}%`,
                  '--hf-delay': `${i * 0.35}s`,
                  '--hf-dur': `${2.5 + Math.random() * 2}s`,
                  '--hf-size': `${12 + Math.random() * 14}px`,
                  color: heartColor,
                }}>&#x2764;</span>
              ))}
            </div>

            {/* 온도 표시 */}
            <div className="home-love-temp-display">
              <span className="home-love-temp-heart" style={{ color: heartColor }}>&#x2764;</span>
              <div className="home-love-temp-info">
                <span className="home-love-temp-label">오늘의 연애 온도</span>
                <span className="home-love-temp-num" style={{ color: heartColor }}>{temp}°</span>
              </div>
            </div>
            <p className="home-love-temp-msg">{msg}</p>

            {/* 4종 카드 */}
            <div className="home-love-cards">
              <button className="home-love-card home-love--relationship" onClick={() => openLoveModal('relationship')}>
                <span className="home-love-icon">💕</span>
                <span className="home-love-label">연애운</span>
              </button>
              <button className="home-love-card home-love--reunion" onClick={() => openLoveModal('reunion')}>
                <span className="home-love-icon">💔</span>
                <span className="home-love-label">재회운</span>
              </button>
              <button className="home-love-card home-love--remarriage" onClick={() => openLoveModal('remarriage')}>
                <span className="home-love-icon">💍</span>
                <span className="home-love-label">재혼운</span>
              </button>
              <button className="home-love-card home-love--blind" onClick={() => openLoveModal('blind_date')}>
                <span className="home-love-icon">💘</span>
                <span className="home-love-label">소개팅운</span>
              </button>
            </div>
          </section>
        );
      })()}

      {/* ─── 오늘의 일진 ─── */}
      <section className="home-iljin-section">
        <div className="home-iljin-card glass-card">
          <span className="home-iljin-badge">☯ 오늘의 일진</span>
          <div className="home-iljin-main">
            <span className="home-iljin-emoji" style={{ '--iljin-glow': iljin.mainColor }}>{iljin.mainEmoji}</span>
            <div className="home-iljin-info">
              <span className="home-iljin-name">{iljin.stem}{iljin.branch}일</span>
              <span className="home-iljin-el-tag" style={{ color: iljin.mainColor }}>
                {ELEMENT_CONFIG[iljin.stemElement].emoji} {ELEMENT_CONFIG[iljin.stemElement].label} + {ELEMENT_CONFIG[iljin.branchElement].emoji} {ELEMENT_CONFIG[iljin.branchElement].label} 에너지
              </span>
            </div>
          </div>
          <div className="home-iljin-bars">
            {ELEMENT_ORDER.map(el => {
              const val = iljin.elements[el];
              const max = Math.max(...Object.values(iljin.elements));
              const cfg = ELEMENT_CONFIG[el];
              const isMax = el === iljin.maxElement;
              return (
                <div key={el} className={`home-iljin-bar-row ${isMax ? 'home-iljin-bar--dominant' : ''}`}>
                  <span className="home-iljin-bar-icon">{cfg.emoji}</span>
                  <span className="home-iljin-bar-label">{cfg.label}</span>
                  <div className="home-iljin-bar-track">
                    <div className="home-iljin-bar-fill" style={{ width: `${(val / max) * 100}%`, background: cfg.color, boxShadow: isMax ? `0 0 12px ${cfg.color}55` : 'none' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="home-iljin-msg">{iljin.message}</p>
        </div>
      </section>

      {/* ─── 읽어주기 ─── */}
      {userId && speechText && !myLoading && (
        <div className="home-speech-bar">
          <SpeechButton label="오늘의 운세 읽어주기" text={speechText} summaryText={speechSummary} />
        </div>
      )}

      {/* ─── Logged-in: 운세 메뉴 카드 ─── */}
      {userId && (
        <section className="home-fortune-section">
          {myLoading ? (
            <div className="home-fortune-loading"><div className="home-fortune-spinner" /><p>AI가 운세를 분석하고 있습니다...</p><p className="home-fortune-loading-hint">잠시만 기다려주세요</p></div>
          ) : (
            <div className="home-menu-cards">
              {swipeCards.map((card) => {
                const score = card.data?.score;
                const summary = card.data?.overall?.split('.').slice(0, 1).join('.') || '';
                const link = card.needSetup ? '/profile' : card.id === 'saju' ? '/my' : card.id === 'blood' ? '/bloodtype' : '/mbti';
                return (
                  <button key={card.id} className="home-menu-card glass-card" onClick={() => navigate(link, { state: { autoLoad: !card.needSetup } })} style={{ '--menu-accent': card.color }}>
                    <div className="home-menu-left">
                      <span className="home-menu-icon">{card.icon}</span>
                      <div className="home-menu-info">
                        <span className="home-menu-label">{card.label}</span>
                        {card.needSetup ? (
                          <p className="home-menu-summary" style={{ color: 'rgba(255,255,255,0.4)' }}>마이페이지에서 설정하기</p>
                        ) : summary ? (
                          <p className="home-menu-summary">{summary}.</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="home-menu-right">
                      {score != null && <span className="home-menu-score" style={{ color: card.color }}>{score}<small>점</small></span>}
                      <span className="home-menu-arrow">›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── Guest: Fun Landing or Form or Result ─── */}
      {!userId && (
        <section className="home-guest-section">
          {guestLoading ? (
            <div className="home-fortune-loading"><div className="home-fortune-spinner" /><p>오늘의 운세를 분석하고 있습니다...</p><p className="home-fortune-loading-hint">AI 분석에 10~30초가 소요됩니다</p></div>
          ) : guestResult ? (
            renderGuestResult()
          ) : !showForm ? (
            <div className="home-landing fade-in">
              <p className="home-landing-msg">{dailyMsg}</p>

              {/* 메뉴 카드 */}
              <div className="home-landing-cards">
                <button className="home-landing-card home-card--fortune" onClick={() => triggerTransition('fortune', () => setShowForm(true))}>
                  <div className="home-card-deco">卦</div>
                  <span className="home-landing-card-title">오늘의 운세</span>
                  <span className="home-landing-card-desc">AI 맞춤 운세</span>
                </button>
                <button className="home-landing-card home-card--saju" onClick={() => triggerTransition('saju', '/saju')}>
                  <div className="home-card-deco">命</div>
                  <span className="home-landing-card-title">사주팔자</span>
                  <span className="home-landing-card-desc">四柱八字 평생 분석</span>
                </button>
                <button className="home-landing-card home-card--tojeong" onClick={() => triggerTransition('tojeong', '/tojeong')}>
                  <div className="home-card-deco">秘</div>
                  <span className="home-landing-card-title">토정비결</span>
                  <span className="home-landing-card-desc">土亭秘訣 월별 운세</span>
                </button>
                <button className="home-landing-card home-card--star" onClick={() => triggerTransition('star', '/constellation')}>
                  <div className="home-card-deco">✦</div>
                  <span className="home-landing-card-title">별자리 운세</span>
                  <span className="home-landing-card-desc">12 Zodiac Signs</span>
                </button>
              </div>

              <button className="home-cta-btn" onClick={() => navigate('/register', { state: { from: '/' } })}>
                회원가입하고 맞춤 운세 받기
              </button>
            </div>
          ) : (
            /* 입력 폼 */
            <div className="home-guest glass-card fade-in">
              <h3 className="home-guest__title">생년월일로 오늘의 운세 보기</h3>
              <div className="home-guest__form-group"><label className="home-guest__label">달력</label><div className="home-guest__toggle"><button type="button" className={`home-guest__toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button><button type="button" className={`home-guest__toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button></div></div>
              <div className="home-guest__form-group"><label className="home-guest__label">생년월일</label><BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} /></div>
              <div className="home-guest__form-group"><label className="home-guest__label">태어난 시간 (선택)</label><select className="home-guest__input home-guest__select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>{BIRTH_TIMES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
              <div className="home-guest__form-group"><label className="home-guest__label">성별</label><div className="home-guest__toggle"><button type="button" className={`home-guest__toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>남성</button><button type="button" className={`home-guest__toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>여성</button></div></div>
              <button className="home-guest__submit-full" onClick={handleGuestSubmit} disabled={!birthDate}>오늘의 운세 보기</button>
              <button className="home-guest__link" onClick={() => setShowForm(false)}>← 돌아가기</button>
            </div>
          )}
        </section>
      )}

      {/* ─── 시간별 운세 ─── */}
      <section className="home-special-section">
        <h2 className="home-special-title">🕐 시간별 운세</h2>
        <div className="home-special-cards">
          <button className="home-special-card home-special-card--morning" onClick={() => navigate('/special?tab=time&mode=timeblock')}>
            <span className="home-special-icon">🌅</span>
            <span className="home-special-label">아침·점심·저녁</span>
            <span className="home-special-desc">3구간 운세</span>
          </button>
          <button className="home-special-card home-special-card--time" onClick={() => navigate('/special?tab=time&mode=hourly')}>
            <span className="home-special-icon">🕐</span>
            <span className="home-special-label">12시진 상세</span>
            <span className="home-special-desc">시간대별 운세</span>
          </button>
        </div>
      </section>

      {/* ─── 운세 캘린더: 신년 · 월별 · 주간 ─── */}
      <section className="home-new-section">
        <h2 className="home-special-title">📅 운세 캘린더</h2>
        <div className="home-new-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className="home-new-card" onClick={() => navigate('/year-fortune')} style={{ '--new-color': '#E74C3C' }}>
            <span className="home-new-icon">🎊</span>
            <span className="home-new-label">2026 운세</span>
            <span className="home-new-desc">올해의 운세</span>
          </button>
          <button className="home-new-card" onClick={() => navigate('/monthly-fortune')} style={{ '--new-color': '#3498DB' }}>
            <span className="home-new-icon">📅</span>
            <span className="home-new-label">월별 운세</span>
            <span className="home-new-desc">12개월 분석</span>
          </button>
          <button className="home-new-card" onClick={() => navigate('/weekly-fortune')} style={{ '--new-color': '#27AE60' }}>
            <span className="home-new-icon">📆</span>
            <span className="home-new-label">주간 운세</span>
            <span className="home-new-desc">이번 주 7일</span>
          </button>
        </div>
      </section>

      {/* ─── 더 알아보기: 꿈해몽 · 관상 · 심리 · 바이오리듬 ─── */}
      <section className="home-new-section">
        <h2 className="home-special-title">✨ 더 알아보기</h2>
        <div className="home-new-grid">
          <button className="home-new-card" onClick={() => navigate('/dream')} style={{ '--new-color': '#6C3483' }}>
            <span className="home-new-icon">🌙</span>
            <span className="home-new-label">꿈해몽</span>
            <span className="home-new-desc">꿈 속 메시지 해석</span>
          </button>
          <button className="home-new-card" onClick={() => navigate('/face-reading')} style={{ '--new-color': '#DAA520' }}>
            <span className="home-new-icon">👤</span>
            <span className="home-new-label">AI 관상</span>
            <span className="home-new-desc">얼굴로 보는 운세</span>
          </button>
          <button className="home-new-card" onClick={() => navigate('/psych-test')} style={{ '--new-color': '#E91E63' }}>
            <span className="home-new-icon">🎭</span>
            <span className="home-new-label">심리테스트</span>
            <span className="home-new-desc">숨겨진 나를 발견</span>
          </button>
          <button className="home-new-card" onClick={() => navigate('/biorhythm')} style={{ '--new-color': '#2196F3' }}>
            <span className="home-new-icon">📊</span>
            <span className="home-new-label">바이오리듬</span>
            <span className="home-new-desc">오늘의 컨디션</span>
          </button>
        </div>
      </section>

      {/* ─── Zodiac Grid ─── */}
      <section className="home-grid-section">
        <div className="home-grid-header"><h2 className="home-grid-title">띠별 운세</h2><span className="home-grid-hint">터치하여 상세보기</span></div>
        {zodiacLoading ? (
          <div className="home-loading">{Array.from({ length: 12 }).map((_, i) => (<div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />))}</div>
        ) : (<ZodiacGrid onSelect={handleZodiacSelect} scores={zodiacScores} />)}
      </section>

      {/* ─── 연애 운세 바텀시트 모달 ─── */}
      {loveModal && (
        <div className="love-modal-overlay" onClick={closeLoveModal}>
          <div className="love-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="love-modal-handle" />
            <div className="love-modal-header">
              <span className="love-modal-icon">{loveInfo?.icon}</span>
              <h2 className="love-modal-title">{loveInfo?.label}</h2>
              <span className="love-modal-desc">{loveInfo?.desc}</span>
              <button className="love-modal-close" onClick={closeLoveModal}>✕</button>
            </div>

            <div className="love-modal-body">
              {/* 입력 폼 */}
              {!loveResult && !loveLoading && (
                <div className="love-modal-form fade-in">
                  {userId && (
                    <button className="love-modal-autofill" onClick={() => {
                      try {
                        const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                        if (p.birthDate) setLoveBirth(p.birthDate);
                        if (p.gender) setLoveGender(p.gender);
                      } catch {}
                    }}>✨ 내 정보로 채우기</button>
                  )}
                  <div className="love-modal-field">
                    <label className="love-modal-label">생년월일</label>
                    <BirthDatePicker value={loveBirth} onChange={setLoveBirth} />
                  </div>
                  <div className="love-modal-field">
                    <label className="love-modal-label">성별</label>
                    <div className="love-modal-toggle">
                      <button className={`love-modal-toggle-btn ${loveGender === 'M' ? 'active' : ''}`} onClick={() => setLoveGender('M')}>♂ 남성</button>
                      <button className={`love-modal-toggle-btn ${loveGender === 'F' ? 'active' : ''}`} onClick={() => setLoveGender('F')}>♀ 여성</button>
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

                  <button className="love-modal-partner-btn" onClick={() => setLoveShowPartner(!loveShowPartner)}>
                    {loveShowPartner ? '▲ 상대방 정보 접기' : '▼ 상대방 정보 추가 (선택)'}
                  </button>
                  {loveShowPartner && (
                    <div className="love-modal-partner fade-in">
                      <div className="love-modal-field">
                        <label className="love-modal-label">상대방 생년월일</label>
                        <BirthDatePicker value={lovePartnerDate} onChange={setLovePartnerDate} />
                      </div>
                      <div className="love-modal-field">
                        <label className="love-modal-label">상대방 성별</label>
                        <div className="love-modal-toggle">
                          <button className={`love-modal-toggle-btn ${lovePartnerGender === 'M' ? 'active' : ''}`} onClick={() => setLovePartnerGender('M')}>♂ 남성</button>
                          <button className={`love-modal-toggle-btn ${lovePartnerGender === 'F' ? 'active' : ''}`} onClick={() => setLovePartnerGender('F')}>♀ 여성</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button className="love-modal-submit" onClick={handleLoveAnalyze} disabled={!loveBirth}>
                    {loveInfo?.icon} {loveInfo?.label} 보기
                  </button>
                </div>
              )}

              {/* 로딩 */}
              {loveLoading && (
                <div className="love-modal-loading fade-in">
                  <div className="love-modal-loading-hearts">
                    {[0,1,2].map(i => <span key={i} className="love-modal-loading-heart" style={{ animationDelay: `${i * 0.3}s` }}>💗</span>)}
                  </div>
                  <p>AI가 {loveInfo?.label}을 분석하고 있습니다...</p>
                </div>
              )}

              {/* 결과 */}
              {loveResult && (
                <div className="love-modal-result fade-in" ref={loveResultRef} style={{ '--heart-color': loveHeartColor }}>
                  <SpeechButton label={`${loveInfo?.label} 읽어주기`}
                    text={[`${loveInfo?.label} 결과입니다.`, `점수는 ${loveResult.score}점, ${loveResult.grade}입니다.`, loveResult.overall, loveResult.timing, loveResult.advice, loveResult.caution].filter(Boolean).join(' ')}
                    summaryText={`${loveInfo?.label} ${loveResult.score}점, ${loveResult.grade}. ${(loveResult.overall||'').split('.').slice(0,2).join('.')}.`} />

                  <div className="love-modal-score-card">
                    <div className="love-modal-heart-aura" style={{ background: `radial-gradient(circle, ${loveHeartColor}, transparent 70%)` }} />
                    <div className="love-modal-heart-center">
                      <span className="love-modal-heart-big" style={{ color: loveHeartColor }}>&#x2764;</span>
                      <span className="love-modal-heart-num">{loveResult.score}</span>
                      <span className="love-modal-heart-unit">점</span>
                    </div>
                    <span className="love-modal-heart-grade" style={{ color: GRADE_COLORS[loveResult.grade] || loveHeartColor }}>{loveResult.grade}</span>
                  </div>

                  <FortuneCard icon={loveInfo?.icon} title="종합 분석" description={loveResult.overall} delay={0} />
                  {loveResult.timing && <FortuneCard icon="📅" title="최적 시기" description={loveResult.timing} delay={80} />}
                  {loveResult.advice && <FortuneCard icon="💡" title="행동 조언" description={loveResult.advice} delay={160} />}
                  {loveResult.caution && <FortuneCard icon="⚠️" title="주의사항" description={loveResult.caution} delay={240} />}

                  {(loveResult.luckyDay || loveResult.luckyPlace || loveResult.luckyColor) && (
                    <div className="love-modal-lucky glass-card">
                      {loveResult.luckyDay && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 날</span><span className="love-modal-lucky-value">{loveResult.luckyDay}</span></div>}
                      {loveResult.luckyPlace && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 장소</span><span className="love-modal-lucky-value">{loveResult.luckyPlace}</span></div>}
                      {loveResult.luckyColor && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 색</span><span className="love-modal-lucky-value">{loveResult.luckyColor}</span></div>}
                    </div>
                  )}

                  <button className="love-modal-reset" onClick={() => { setLoveResult(null); setLoveBirth(''); }}>🔄 다시 보기</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
