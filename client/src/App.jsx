import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { TransitionProvider } from './components/PageTransition';
import Header from './components/Header';
import Home from './pages/Home';
import Fortune from './pages/Fortune';
import Register from './pages/Register';
import Profile from './pages/Profile';
import SajuAnalysis from './pages/SajuAnalysis';
import BloodType from './pages/BloodType';
import Mbti from './pages/Mbti';
import MyFortune from './pages/MyFortune';
import Constellation from './pages/Constellation';
import Tojeong from './pages/Tojeong';
import Compatibility from './pages/Compatibility';
import CelebCompatibility from './pages/CelebCompatibility';
import GroupFortune from './pages/GroupFortune';
import Manseryeok from './pages/Manseryeok';
import Tarot from './pages/Tarot';
import SpecialFortune from './pages/SpecialFortune';
import ProfileEdit from './pages/ProfileEdit';
import Dream from './pages/Dream';
import FaceReading from './pages/FaceReading';
import PsychTest from './pages/PsychTest';
import Biorhythm from './pages/Biorhythm';
import TraditionalSaju from './pages/TraditionalSaju';
import YearFortune from './pages/YearFortune';
import MonthlyFortune from './pages/MonthlyFortune';
import WeeklyFortune from './pages/WeeklyFortune';
import LoveFortune from './pages/LoveFortune';
import LoveTypeFortune from './pages/LoveTypeFortune';
import MyLoveCompat from './pages/MyLoveCompat';
import MySomeCrush from './pages/MySomeCrush';
import MySolo from './pages/MySolo';
import MyAgainMeet from './pages/MyAgainMeet';
import Landing from './pages/Landing';
import MyStar from './pages/MyStar';
import CelebMatch from './pages/CelebMatch';
import MyMenu from './pages/MyMenu';
import StarFortune from './pages/StarFortune';
import Settings from './pages/Settings';
import { HeartProvider } from './context/HeartContext';
import { AppProvider } from './context/AppContext';
import './context/HeartContext.css';
// import FloatingMenu from './components/FloatingMenu';
import './App.css';

const TITLE_IMAGES = Array.from({ length: 20 }, (_, i) => `/title/title_${String(i).padStart(2, '0')}.jpg`);

// 탭별 인트로 이미지
const TAB_INTRO_IMAGES = {
  fortune: { images: Array.from({ length: 24 }, (_, i) => `/intro-fortune/fortune_${String(i).padStart(2, '0')}.jpg`), title: '정통운세', sub: '사주팔자로 읽는 당신의 운명', color: '#E879F9' },
  heart: { images: Array.from({ length: 24 }, (_, i) => `/intro-heart/heart_${String(i).padStart(2, '0')}.jpg`), title: '하트충전', sub: '사랑의 에너지를 충전하세요', color: '#FF6B8A' },
  my: { images: Array.from({ length: 24 }, (_, i) => `/intro-my/my_${String(i).padStart(2, '0')}.jpg`), title: '마이', sub: '별들이 그린 나의 이야기', color: '#34D399' },
};

function TabIntro({ tabKey, onDone }) {
  const [fadeOut, setFadeOut] = useState(false);
  const config = TAB_INTRO_IMAGES[tabKey];
  const [img] = useState(() => config.images[Math.floor(Math.random() * config.images.length)]);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFadeOut(true);
    setTimeout(onDone, 200);
  };

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 800);
    const t2 = setTimeout(onDone, 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash splash--title ${fadeOut ? 'splash--out' : ''}`} onClick={finish} style={{ cursor: 'pointer' }}>
      <img src={img} alt="" className="splash-title-img" draggable={false} />
      <div className="splash-title-overlay">
        <h1 className="splash-title-text" style={{ background: `linear-gradient(135deg, #fff 0%, ${config.color}88 50%, ${config.color} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>{config.title}</h1>
        <p className="tab-intro-sub">{config.sub}</p>
      </div>
    </div>
  );
}

function Splash({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [titleImg] = useState(() => TITLE_IMAGES[Math.floor(Math.random() * TITLE_IMAGES.length)]);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2500);
    const t2 = setTimeout(onDone, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash splash--title ${fadeOut ? 'splash--out' : ''}`} onClick={() => { setFadeOut(true); setTimeout(onDone, 500); }}>
      <img src={titleImg} alt="1:1연애운" className="splash-title-img" draggable={false} />
      <div className="splash-title-overlay">
        <div className="splash-title-hearts">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="splash-title-heart" style={{
              left: `${8 + Math.random() * 84}%`,
              animationDelay: `${0.5 + Math.random() * 1.5}s`,
              animationDuration: `${2 + Math.random() * 1.5}s`,
              fontSize: `${10 + Math.random() * 16}px`,
            }}>{['💕','💗','💖','🩷','♥'][Math.floor(Math.random()*5)]}</span>
          ))}
        </div>
        <h1 className="splash-title-text">💕 1:1연애운 💕</h1>
      </div>
      {/* 반짝임 파티클 */}
      <div className="splash-stars">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="splash-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            fontSize: `${Math.random() * 3 + 1}px`,
          }}>✦</span>
        ))}
      </div>
    </div>
  );
}

// 시간대별 배경 테마
function useTimeTheme() {
  useEffect(() => {
    const apply = () => {
      const h = new Date().getHours();
      let period;
      if (h >= 5 && h < 8) period = 'dawn';       // 새벽~아침
      else if (h >= 8 && h < 12) period = 'morning'; // 오전
      else if (h >= 12 && h < 15) period = 'noon';   // 한낮
      else if (h >= 15 && h < 18) period = 'afternoon'; // 오후
      else if (h >= 18 && h < 21) period = 'evening'; // 저녁
      else period = 'night'; // 밤
      document.documentElement.setAttribute('data-time', period);
    };
    apply();
    const timer = setInterval(apply, 60000); // 1분마다 갱신
    return () => clearInterval(timer);
  }, []);
}

// 글자 크기 설정 적용
function useFontSize() {
  useEffect(() => {
    const apply = () => {
      const size = localStorage.getItem('fontSize') || 'normal';
      document.documentElement.setAttribute('data-fontsize', size);
    };
    apply();
    window.addEventListener('storage', apply);
    window.addEventListener('fontSizeChange', apply);
    return () => {
      window.removeEventListener('storage', apply);
      window.removeEventListener('fontSizeChange', apply);
    };
  }, []);
}

// 비로그인 첫 방문 사용자를 /welcome 랜딩으로 리다이렉트 (한 번 보면 landingSeen=1)
function useLandingRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') return;
    const userId = localStorage.getItem('userId');
    const seen = localStorage.getItem('landingSeen');
    if (!userId && !seen) {
      navigate('/welcome', { replace: true });
    }
  }, [location.pathname]);
}

// 프로필 미완성 사용자 리다이렉트 (Guest는 건너뜀)
function useProfileGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const allowedPaths = ['/register', '/auth/kakao/callback', '/settings'];
    if (allowedPaths.some(p => location.pathname.startsWith(p))) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Guest는 프로필 가드 건너뜀
    const userName = localStorage.getItem('userName');
    if (userName === 'Guest') return;

    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!profile.birthDate) {
        navigate('/register?needProfile=true', { replace: true });
      }
    } catch {}
  }, [location.pathname]);
}

function App() {
  // 세션 내 스플래시 중복 방지: sessionStorage에 표시 여부 기록
  const [splashKey, setSplashKey] = useState(Date.now());
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('splashShown') !== '1';
  });
  const [tabIntro, setTabIntro] = useState(null); // { key, tabKey }
  useTimeTheme();
  useFontSize();
  useLandingRedirect();
  useProfileGuard();

  // 자동 로그인 off면 앱 시작 시 로그인 정보 제거
  useEffect(() => {
    if (localStorage.getItem('autoLogin') === 'off') {
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userProfile');
    }
  }, []);

  // 타로 자산 유휴 시간 프리로드 — 페이지/셔플/카드 노출 지연 제거
  useEffect(() => {
    const DECK_IDS = ['newclassic','jester','masterpiece','cartoon_girl','cartoon_boy','kdrama','celestial','lady'];
    const TAROT_DECK_INTROS = DECK_IDS.map(id => {
      const ext = (id === 'cartoon_girl' || id === 'cartoon_boy') ? 'gif' : 'webp';
      return `/tarot-effects/deck-intro/${id}_0.${ext}`;
    });
    const TAROT_DECK_COVERS = DECK_IDS.map(id => `/tarot-effects/deck-intro/${id}_cover.jpg`);
    const TAROT_EFFECTS = [
      '/tarot-effects/shuffle.jpg',
      '/tarot-effects/shuffle_0.jpg', '/tarot-effects/shuffle_1.jpg',
      '/tarot-effects/shuffle_2.jpg', '/tarot-effects/shuffle_3.jpg',
      '/tarot-effects/spread.jpg',
      '/tarot-effects/spread_0.jpg', '/tarot-effects/spread_1.jpg',
      '/tarot-effects/spread_2.jpg', '/tarot-effects/spread_3.jpg',
      '/tarot-effects/pick.jpg',
      '/tarot-effects/table.jpg',
    ];

    const preload = (src) => {
      const img = new Image();
      if ('fetchPriority' in img) img.fetchPriority = 'low';
      img.decoding = 'async';
      img.src = src;
    };

    // 데이터 절약 모드면 효과/인트로만, 카드 78장은 스킵
    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    const saveData = !!(conn && conn.saveData);

    const savedDeck = localStorage.getItem('tarotDeck') || 'newclassic';
    const deck = DECK_IDS.includes(savedDeck) ? savedDeck : 'newclassic';
    const SELECTED_DECK_CARDS = saveData ? [] : Array.from({ length: 78 }, (_, i) =>
      `/tarot-${deck}/m${String(i).padStart(2,'0')}_v0.jpg`
    );

    const run = () => {
      // 우선순위: 커버(즉시 보임) → 효과(셔플 화면) → 인트로(덱 선택 GIF) → 카드 78장(셔플 결과)
      TAROT_DECK_COVERS.forEach(preload);
      TAROT_EFFECTS.forEach(preload);
      TAROT_DECK_INTROS.forEach(preload);
      SELECTED_DECK_CARDS.forEach(preload);
    };
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
    const handle = ric(run, { timeout: 5000 });
    return () => {
      if (window.cancelIdleCallback && typeof handle === 'number') window.cancelIdleCallback(handle);
    };
  }, []);

  const triggerSplash = () => {
    // 세션에 한 번이라도 스플래시를 봤다면 다시 띄우지 않음
    if (sessionStorage.getItem('splashShown') === '1') return;
    setSplashKey(Date.now());
    setShowSplash(true);
  };

  const handleSplashDone = () => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  };

  const triggerTabIntro = (tabKey) => {
    if (TAB_INTRO_IMAGES[tabKey]) {
      setTabIntro({ key: Date.now(), tabKey });
    }
  };

  return (
    <AppProvider>
    <HeartProvider>
    <>
      {showSplash && <Splash key={splashKey} onDone={handleSplashDone} />}
      {tabIntro && <TabIntro key={tabIntro.key} tabKey={tabIntro.tabKey} onDone={() => setTabIntro(null)} />}
      <div className="app" style={{ display: showSplash ? 'none' : undefined }}>
        <TransitionProvider>
          <Header onHomeSplash={triggerSplash} onTabIntro={triggerTabIntro} />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/fortune" element={<Fortune />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/kakao/callback" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/saju" element={<SajuAnalysis />} />
              <Route path="/bloodtype" element={<BloodType />} />
              <Route path="/mbti" element={<Mbti />} />
              <Route path="/my" element={<MyFortune />} />
              <Route path="/constellation" element={<Constellation />} />
              <Route path="/tojeong" element={<Tojeong />} />
              <Route path="/compatibility" element={<Compatibility />} />
              <Route path="/celeb-compatibility" element={<CelebCompatibility />} />
              <Route path="/celeb-fortune" element={<GroupFortune />} />
              <Route path="/celeb-match" element={<CelebMatch />} />
              <Route path="/manseryeok" element={<Manseryeok />} />
              <Route path="/tarot" element={<Tarot />} />
              <Route path="/special" element={<SpecialFortune />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/dream" element={<Dream />} />
              <Route path="/face-reading" element={<FaceReading />} />
              <Route path="/psych-test" element={<PsychTest />} />
              <Route path="/biorhythm" element={<Biorhythm />} />
              <Route path="/traditional" element={<TraditionalSaju />} />
              <Route path="/year-fortune" element={<YearFortune />} />
              <Route path="/monthly-fortune" element={<MonthlyFortune />} />
              <Route path="/weekly-fortune" element={<WeeklyFortune />} />
              <Route path="/love-fortune" element={<LoveFortune />} />
              <Route path="/love/:type" element={<LoveTypeFortune />} />
              <Route path="/my-love-compat" element={<MyLoveCompat />} />
              <Route path="/my-some-crush" element={<MySomeCrush />} />
              <Route path="/my-solo" element={<MySolo />} />
              <Route path="/again-meet" element={<MyAgainMeet />} />
              <Route path="/welcome" element={<Landing />} />
              <Route path="/my-menu" element={<MyMenu />} />
              <Route path="/star-fortune" element={<StarFortune />} />
              <Route path="/my-star" element={<MyStar />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          {/* <FloatingMenu /> */}
        </TransitionProvider>
      </div>
    </>
    </HeartProvider>
    </AppProvider>
  );
}

export default App;
