import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransition } from '../components/PageTransition';
import ZodiacGrid from '../components/ZodiacGrid';
import FortuneCard from '../components/FortuneCard';
import { getAllTodayFortunes, getMyFortune, getGuestFortune } from '../api/fortune';
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
  const swipeRef = useRef(null);
  const [zodiacScores, setZodiacScores] = useState(null);
  const [zodiacLoading, setZodiacLoading] = useState(true);
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

  const { triggerTransition } = useTransition();

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayStr = dayNames[today.getDay()];
  const dailyMsg = useMemo(() => DAILY_MESSAGES[today.getDate() % DAILY_MESSAGES.length], []);
  const [realWeather, setRealWeather] = useState(null);

  // 실제 날씨 가져오기 (위치 기반)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
        const data = await res.json();
        if (data.current) {
          const code = data.current.weather_code;
          const temp = Math.round(data.current.temperature_2m);
          let icon = '☀️', desc = '맑음', wCode = 'sunny';
          if (code >= 71) { icon = '❄️'; desc = '눈'; wCode = 'snow'; }
          else if (code >= 61) { icon = '🌧️'; desc = '비'; wCode = 'rain'; }
          else if (code >= 51) { icon = '🌦️'; desc = '이슬비'; wCode = 'rain'; }
          else if (code >= 45) { icon = '🌫️'; desc = '안개'; wCode = 'cloudy'; }
          else if (code >= 3) { icon = '☁️'; desc = '흐림'; wCode = 'cloudy'; }
          else if (code >= 1) { icon = '⛅'; desc = '구름 조금'; wCode = 'cloudy'; }
          setRealWeather({ icon, desc, temp, code: wCode });
        }
      } catch { /* 날씨 가져오기 실패 - 무시 */ }
    }, () => {}, { timeout: 5000 });
  }, []);

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
  }, []);

  useEffect(() => {
    if (!userId) return;
    setMyLoading(true);
    (async () => {
      try { setMyData(await getMyFortune(userId)); }
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

  const buildSwipeCards = () => {
    if (!myData) return [];
    const cards = [];
    const user = myData.user || {};
    if (myData.saju) cards.push({ id: 'saju', label: '사주 오늘의 운세', icon: '☯️', data: myData.saju, color: '#FBBF24' });
    if (myData.bloodType && user.bloodType) cards.push({ id: 'blood', label: `${user.bloodType}형 혈액형 운세`, icon: '🩸', data: myData.bloodType, color: '#F472B6' });
    if (myData.mbti && user.mbtiType) cards.push({ id: 'mbti', label: `${user.mbtiType} MBTI 운세`, icon: '🧬', data: myData.mbti, color: '#34D399' });
    return cards;
  };
  const swipeCards = userId ? buildSwipeCards() : [];

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
        {/* 날씨 뱃지 (로그인 사용자) */}
        {weather && userId && (
          <div className="home-weather-badge"><span>{weather.emoji}</span> <span>{weather.label}</span> <span className="home-weather-desc">{weather.desc}</span></div>
        )}
      </section>

      {/* ─── Logged-in User ─── */}
      {userId && (
        <section className="home-fortune-section">
          {myLoading ? (
            <div className="home-fortune-loading"><div className="home-fortune-spinner" /><p>AI가 운세를 분석하고 있습니다...</p><p className="home-fortune-loading-hint">잠시만 기다려주세요</p></div>
          ) : swipeCards.length > 0 ? (
            <>
              <div className="swipe-container" ref={swipeRef} onScroll={handleSwipeScroll}>
                {swipeCards.map((card) => (
                  <div key={card.id} className="swipe-card">
                    <div className="swipe-card-inner glass-card">
                      <div className="swipe-card-header" style={{ '--card-accent': card.color }}><span className="swipe-card-icon">{card.icon}</span><h3 className="swipe-card-title">{card.label}</h3></div>
                      {renderFortuneContent(card.data, card.id)}
                    </div>
                  </div>
                ))}
              </div>
              {swipeCards.length > 1 && (
                <div className="swipe-dots">{swipeCards.map((card, idx) => (
                  <button key={card.id} className={`swipe-dot ${currentCard === idx ? 'active' : ''}`} onClick={() => { const el = swipeRef.current; if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' }); }} />
                ))}</div>
              )}
            </>
          ) : null}
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
            /* 재미있는 랜딩 */
            <div className="home-landing fade-in">
              {/* 날씨 기반 비주얼 */}
              <div className="home-landing-visual">
                {realWeather ? (
                  <div className="home-weather-scene">
                    <div className={`home-weather-anim home-weather-anim--${realWeather.code}`}>
                      {realWeather.code === 'snow' && Array.from({ length: 30 }).map((_, i) => (
                        <span key={i} className="home-snowflake" style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*4}s`, animationDuration: `${2+Math.random()*3}s`, fontSize: `${8+Math.random()*10}px`, opacity: 0.4+Math.random()*0.5 }}>❄</span>
                      ))}
                      {realWeather.code === 'rain' && Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="home-raindrop" style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*1.5}s`, animationDuration: `${0.4+Math.random()*0.4}s`, opacity: 0.3+Math.random()*0.4 }} />
                      ))}
                      {realWeather.code === 'sunny' && <>
                        <div className="home-sun" />
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="home-sun-ray" style={{ '--ray-angle': `${i*45}deg` }} />
                        ))}
                      </>}
                      {realWeather.code === 'cloudy' && <>
                        <div className="home-cloud-anim home-cloud-anim--1">☁️</div>
                        <div className="home-cloud-anim home-cloud-anim--2">⛅</div>
                        <div className="home-cloud-anim home-cloud-anim--3">☁️</div>
                      </>}
                    </div>
                    <div className="home-weather-info-big">
                      <span className="home-weather-temp-big">{realWeather.temp}°</span>
                      <span className="home-weather-desc-big">{realWeather.desc}</span>
                    </div>
                  </div>
                ) : (
                  <div className="home-weather-scene">
                    <div className="home-default-visual">
                      <span className="home-default-symbol">☯</span>
                    </div>
                  </div>
                )}
                <p className="home-landing-msg">{dailyMsg}</p>
              </div>

              {/* 메뉴 카드 - 동양풍 */}
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

              <button className="home-cta-btn" onClick={() => navigate('/register')}>
                회원가입하고 맞춤 운세 받기
              </button>
            </div>
          ) : (
            /* 입력 폼 */
            <div className="home-guest glass-card fade-in">
              <h3 className="home-guest__title">생년월일로 오늘의 운세 보기</h3>
              <div className="home-guest__form-group"><label className="home-guest__label">달력</label><div className="home-guest__toggle"><button type="button" className={`home-guest__toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button><button type="button" className={`home-guest__toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button></div></div>
              <div className="home-guest__form-group"><label className="home-guest__label">생년월일</label><input type="date" className="home-guest__input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} min="1920-01-01" /></div>
              <div className="home-guest__form-group"><label className="home-guest__label">태어난 시간 (선택)</label><select className="home-guest__input home-guest__select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>{BIRTH_TIMES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
              <div className="home-guest__form-group"><label className="home-guest__label">성별</label><div className="home-guest__toggle"><button type="button" className={`home-guest__toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>남성</button><button type="button" className={`home-guest__toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>여성</button></div></div>
              <button className="home-guest__submit-full" onClick={handleGuestSubmit} disabled={!birthDate}>오늘의 운세 보기</button>
              <button className="home-guest__link" onClick={() => setShowForm(false)}>← 돌아가기</button>
            </div>
          )}
        </section>
      )}

      {/* ─── Zodiac Grid ─── */}
      <section className="home-grid-section">
        <div className="home-grid-header"><h2 className="home-grid-title">띠별 운세</h2><span className="home-grid-hint">터치하여 상세보기</span></div>
        {zodiacLoading ? (
          <div className="home-loading">{Array.from({ length: 12 }).map((_, i) => (<div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />))}</div>
        ) : (<ZodiacGrid onSelect={handleZodiacSelect} scores={zodiacScores} />)}
      </section>
    </div>
  );
}

export default Home;
