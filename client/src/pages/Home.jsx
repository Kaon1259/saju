import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FortuneCard from '../components/FortuneCard';
import { getGuestFortune, getLoveTemperature, getLoveFortuneBasic, getLoveFortuneStream, saveLoveFortuneCache, getUser, getMyFortune, isGuest, getHistory } from '../api/fortune';
import BirthDatePicker from '../components/BirthDatePicker';
// sounds (kept for potential future use)
import { shareResult } from '../utils/share';
import parseAiJson from '../utils/parseAiJson';
import AnalysisMatrix from '../components/AnalysisMatrix';
import HeartCost from '../components/HeartCost';
import HistoryDrawer from '../components/HistoryDrawer';
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

const HOME_MAIN_MENUS = [
  { id: 'love', icon: '💕', label: '1:1연애운', sub: '오늘 연애 기운은?', path: '/love-fortune' },
  { id: 'some', icon: '🎯', label: '썸진단', sub: '누가 먼저 끌리나요', path: '/love/some_check' },
  { id: 'compat', icon: '🌌', label: '전생인연', sub: '전생에 어떤 사이였을까?', path: '/love/past_life' },
  { id: 'crush', icon: '💘', label: '짝사랑', sub: '플러팅해도 될까요?', path: '/love/crush' },
  { id: 'blind', icon: '🤝', label: '소개팅', sub: '새로운 인연이 올까요?', path: '/love/blind_date' },
  { id: 'date', icon: '💑', label: '데이트운', sub: '오늘 만나도 될까요?', path: '/love/couple_fortune' },
  { id: 'confess', icon: '💌', label: '고백타이밍', sub: '언제 마음을 전할까?', path: '/love/confession_timing' },
  { id: 'meeting', icon: '🔮', label: '만남시기', sub: '언제 인연을 만날까?', path: '/love/meeting_timing' },
  { id: 'reunion', icon: '💔', label: '재회운', sub: '다시 만날 수 있을까?', path: '/love/reunion' },
];

const HOME_MORE_MENUS = [
  { id: 'skinship', icon: '💋', label: '스킨십궁합', sub: '우리 스킨십 케미는?', path: '/my-love-compat', state: { presetTab: 'skinship' } },
  { id: 'contact', icon: '📱', label: '연락운', sub: '먼저 연락해도 될까?', path: '/love/contact_fortune' },
  { id: 'marriage', icon: '💒', label: '결혼운', sub: '결혼 시기와 인연', path: '/love/marriage' },
  { id: 'remarriage', icon: '💍', label: '재혼운', sub: '새로운 인연의 가능성', path: '/love/remarriage' },
  { id: 'psych', icon: '🎭', label: '심리테스트', sub: '내 마음속 연애 유형', path: '/psych-test' },
  { id: 'mbti', icon: '🧬', label: 'MBTI', sub: 'MBTI로 보는 연애 궁합', path: '/mbti' },
  { id: 'blood', icon: '🩸', label: '혈액형', sub: '혈액형별 연애 스타일', path: '/bloodtype' },
];

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

  // guest form
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [gender, setGender] = useState('');
  const [guestResult, setGuestResult] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showMoreMenus, setShowMoreMenus] = useState(false);

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

      {/* 1. Hero + 연애온도 통합 */}
      {(() => {
        const temp = loveTemp?.temperature || 55;
        const msg = loveTemp?.message || dailyMsg;
        const heartSat = 30 + temp * 0.7;
        const heartLight = 80 - temp * 0.35;
        const heartColor = `hsl(340, ${heartSat}%, ${heartLight}%)`;
        const heartCount = Math.max(5, Math.floor(temp / 6));
        return (
          <section className="home-hero-new" style={{ '--love-temp-color': heartColor }}>
            <div className="home-love-hearts-bg">
              {Array.from({ length: heartCount }).map((_, i) => (
                <span key={i} className="home-love-float-heart" style={{
                  '--hf-x': `${5 + (i * 97 / heartCount) % 90}%`,
                  '--hf-delay': `${i * 0.35}s`,
                  '--hf-dur': `${2.5 + (i % 3) * 0.8}s`,
                  '--hf-size': `${12 + (i % 5) * 3}px`,
                  color: heartColor,
                }}>&#x2764;</span>
              ))}
            </div>
            <div className="home-hero-new__top">
              <h1 className="home-hero__title">1:1연애운</h1>
              <span className="home-hero__date-inline">{dayStr} {dateStr}</span>
            </div>
            <div className="home-love-temp-center">
              <span className="home-love-temp-heart" style={{ color: heartColor }}>&#x2764;</span>
              <span className="home-love-temp-num" style={{ color: heartColor }}>{temp}°</span>
            </div>
            <p className="home-love-temp-label">
              {loveTemp?.weatherBased && !userId ? '오늘의 연애 날씨' : '나의 연애 온도'}
            </p>
            <p className="home-hero-new__msg">{msg}</p>
            {/* 로그인 사용자: 오늘 운세 한줄 요약 (AI 분석 캐시가 있을 때만) */}
            {userId && fortuneLoading && !myData?.saju && (
              <div className="home-hero-fortune-summary skeleton-pulse">
                <span className="hero-fortune-badge">🔮 --</span>
                <span className="hero-fortune-text">운세를 불러오는 중...</span>
              </div>
            )}
            {userId && myData?.saju?.aiAnalyzed && myData?.saju?.score != null && myData?.saju?.overall && (
              <div className="home-hero-fortune-summary" onClick={() => navigate('/my')}>
                <span className={`hero-fortune-badge ${myData.saju.score >= 80 ? 'badge-great' : myData.saju.score >= 60 ? 'badge-good' : myData.saju.score >= 40 ? 'badge-normal' : 'badge-low'}`}>
                  {myData.saju.score >= 80 ? '🌟' : myData.saju.score >= 60 ? '☀️' : myData.saju.score >= 40 ? '🌤️' : '🌙'} {myData.saju.score}
                </span>
                <span className="hero-fortune-text">{myData.saju.overall.split('.')[0] + '.'}</span>
              </div>
            )}
            {/* AI 분석 캐시가 없으면 CTA */}
            {userId && !fortuneLoading && myData?.saju && !myData?.saju?.aiAnalyzed && (
              <button className="home-hero-fortune-cta" onClick={() => navigate('/my')}>
                ✨ 오늘의 운세 분석받기 <span>›</span>
              </button>
            )}
          </section>
        );
      })()}

      {/* 2. 비로그인 CTA */}
      {!userId && !showForm && (
        <section style={{ padding: '0 4px' }}>
          <button className="home-cta-btn" onClick={() => navigate('/register', { state: { from: '/' } })}>
            카카오 로그인하고 맞춤 운세 받기
          </button>
        </section>
      )}

      {/* 2-1. 나의 연인 배너 */}
      <section style={{ padding: '0 4px', marginBottom: 4 }}>
        <button className="home-lover-banner" onClick={() => navigate('/my-love-compat')}>
          <div className="home-lover-banner-sparkles">
            {[...Array(6)].map((_, i) => <span key={i} style={{ '--hlb-i': i }}>✦</span>)}
          </div>
          <div className="home-lover-banner-icon">
            <span className="home-lover-banner-m">♂</span>
            <span className="home-lover-banner-heart">♥</span>
            <span className="home-lover-banner-f">♀</span>
          </div>
          <div className="home-lover-banner-text">
            <span className="home-lover-banner-title">나의 연인</span>
            <span className="home-lover-banner-sub">정통 · 결혼 · 스킨십 궁합 한 번에</span>
          </div>
          <span className="home-lover-banner-arrow">›</span>
        </button>
      </section>

      {/* 3. 핵심 동선 9개 그리드 */}
      <section className="home-main-actions">
        {HOME_MAIN_MENUS.map((item, idx) => (
          <button
            key={item.id}
            className="home-main-action-card"
            onClick={() => navigate(item.path)}
            style={{ '--mac-color': '#E91E63', '--card-idx': idx }}
          >
            <span className={`home-mac-icon home-mac-anim--${item.id}`}>{item.icon}</span>
            <span className="home-mac-label">{item.label}</span>
            <span className="home-mac-sub">{item.sub}</span>
          </button>
        ))}
      </section>

      {/* 3-1. 더보기 드롭다운 */}
      {showMoreMenus && (
        <section className="home-main-actions home-more-actions">
          {HOME_MORE_MENUS.map((item, idx) => (
            <button
              key={item.id}
              className="home-main-action-card"
              onClick={() => navigate(item.path, item.state ? { state: item.state } : undefined)}
              style={{ '--mac-color': '#E91E63', '--card-idx': idx }}
            >
              <span className={`home-mac-icon home-mac-anim--${item.id}`}>{item.icon}</span>
              <span className="home-mac-label">{item.label}</span>
              <span className="home-mac-sub">{item.sub}</span>
            </button>
          ))}
        </section>
      )}

      <button
        className="home-more-toggle"
        onClick={() => setShowMoreMenus(v => !v)}
      >
        {showMoreMenus ? '접기 ▲' : '더보기 ▼'}
      </button>


      {/* 5. 스타 운세 배너 */}
      <section style={{ padding: '0 4px', marginBottom: 8 }}>
        <button className="home-year-banner home-star-banner" onClick={() => navigate('/star-fortune')}>
          <span className="home-year-banner-bg" />
          <div className="star-banner-particles">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="star-banner-particle" style={{
                '--sp-x': `${5 + (i * 8.3) % 90}%`,
                '--sp-delay': `${i * 0.4}s`,
                '--sp-dur': `${2 + (i % 4) * 0.6}s`,
                '--sp-size': `${8 + (i % 3) * 4}px`,
              }}>✦</span>
            ))}
          </div>
          <div className="home-year-banner-content">
            <span className="home-year-banner-icon star-banner-icon-anim">⭐</span>
            <div className="home-year-banner-text">
              <span className="home-year-banner-title">스타 운세</span>
              <span className="home-year-banner-desc">최애 스타와 사주로 통하는 운명을 확인하세요</span>
            </div>
            <span className="home-year-banner-arrow">›</span>
          </div>
        </button>
      </section>

      {/* 5.4 오늘의 운세 배너 */}
      <section style={{ padding: '0 4px', marginBottom: 8 }}>
        <button className="home-year-banner home-today-banner" onClick={() => navigate('/my')}>
          <span className="home-year-banner-bg" />
          <span className="home-year-banner-sparkles">✦✦✦</span>
          <div className="home-year-banner-content">
            <span className="home-year-banner-icon">🔮</span>
            <div className="home-year-banner-text">
              <span className="home-year-banner-title">오늘의 운세</span>
              <span className="home-year-banner-desc">오늘 하루 총운·애정·재물·건강을 확인하세요</span>
            </div>
            <span className="home-year-banner-arrow">›</span>
          </div>
        </button>
      </section>

      {/* 5.5 신년운세 배너 */}
      <section style={{ padding: '0 4px', marginBottom: 4 }}>
        <button className="home-year-banner" onClick={() => navigate('/year-fortune')}>
          <span className="home-year-banner-bg" />
          <span className="home-year-banner-sparkles">✦✦✦</span>
          <div className="home-year-banner-content">
            <span className="home-year-banner-icon">🎊</span>
            <div className="home-year-banner-text">
              <span className="home-year-banner-title">2026 신년운세</span>
              <span className="home-year-banner-desc">병오년, 새해 운명을 미리 확인하세요</span>
            </div>
            <span className="home-year-banner-arrow">›</span>
          </div>
        </button>
      </section>


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

      {/* 비로그인: 카카오 로그인 유도 */}
      {!userId && !showForm && (
        <section style={{ padding: '0 4px' }}>
          <button className="home-cta-btn" onClick={() => navigate('/register', { state: { from: '/' } })}>
            카카오 로그인하고 맞춤 운세 받기
          </button>
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
