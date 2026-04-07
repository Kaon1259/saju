import { useState, useEffect } from 'react';
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
import MyStar from './pages/MyStar';
import CelebMatch from './pages/CelebMatch';
import MyMenu from './pages/MyMenu';
import Settings from './pages/Settings';
import { HeartProvider } from './context/HeartContext';
import './context/HeartContext.css';
// import FloatingMenu from './components/FloatingMenu';
import './App.css';

function Splash({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);
  const userProfile = (() => {
    try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; }
  })();
  const isLoggedIn = !!localStorage.getItem('userId');
  const relStatus = userProfile.relationshipStatus;
  const isLovey = relStatus === 'IN_RELATIONSHIP' || relStatus === 'SOME';
  const isSingle = isLoggedIn && !isLovey;

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 1200);
    const t2 = setTimeout(onDone, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash ${fadeOut ? 'splash--out' : ''}`}>
      {/* 번개 효과 */}
      <div className="splash-lightning" />
      <div className="splash-lightning splash-lightning--2" />

      {/* 비/빛 입자 */}
      <div className="splash-rain">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="splash-drop" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${0.6 + Math.random() * 0.8}s`,
            opacity: 0.15 + Math.random() * 0.35,
          }} />
        ))}
      </div>

      {/* 별 반짝임 */}
      <div className="splash-stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} className="splash-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            fontSize: `${Math.random() * 3 + 1}px`,
          }}>✦</span>
        ))}
      </div>

      {/* 로그인 + 연애중/썸: 러블리 하트 */}
      {isLovey && (
        <div className="splash-hearts">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="splash-heart" style={{
              left: `${5 + Math.random() * 90}%`,
              animationDelay: `${Math.random() * 1.2}s`,
              animationDuration: `${1.5 + Math.random() * 1}s`,
              fontSize: `${12 + Math.random() * 18}px`,
              color: ['#ff4081', '#e91e63', '#f06292', '#ff80ab', '#ff1744'][Math.floor(Math.random()*5)],
            }}>{['❤','💕','💗','💖','✨'][Math.floor(Math.random()*5)]}</span>
          ))}
        </div>
      )}

      {/* 로그인 + 솔로: 별빛 강화 */}
      {isSingle && (
        <div className="splash-solo-sparkles">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="splash-solo-star" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 1.5}s`,
              fontSize: `${6 + Math.random() * 12}px`,
            }}>{['✦','⭐','💫','🌟'][Math.floor(Math.random()*4)]}</span>
          ))}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="splash-content">
        {isLovey ? (
          <>
            <div className="splash-symbol splash-symbol--love">
              <div className="splash-ring splash-ring--love" />
              <span className="splash-yin splash-yin--love">💕</span>
            </div>
            <h1 className="splash-title splash-title--love">1:1연애 💕</h1>
            <p className="splash-sub">{relStatus === 'IN_RELATIONSHIP' ? '사랑이 빛나는 오늘 하루' : '설레는 인연이 다가오고 있어요'}</p>
          </>
        ) : isSingle ? (
          <>
            <div className="splash-symbol">
              <div className="splash-ring" />
              <span className="splash-yin">🌟</span>
            </div>
            <h1 className="splash-title">1:1연애 💕</h1>
            <p className="splash-sub">빛나는 당신의 하루가 시작됩니다</p>
          </>
        ) : (
          <>
            <div className="splash-symbol">
              <div className="splash-ring" />
              <span className="splash-yin">☯</span>
            </div>
            <h1 className="splash-title">1:1연애 💕</h1>
            <p className="splash-sub">사주팔자로 보는 당신의 운명</p>
          </>
        )}
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

// 프로필 미완성 사용자 리다이렉트
function useProfileGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const allowedPaths = ['/register', '/auth/kakao/callback', '/settings'];
    if (allowedPaths.some(p => location.pathname.startsWith(p))) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!profile.birthDate) {
        navigate('/register?needProfile=true', { replace: true });
      }
    } catch {}
  }, [location.pathname]);
}

function App() {
  const [splashKey, setSplashKey] = useState(Date.now());
  const [showSplash, setShowSplash] = useState(true);
  useTimeTheme();
  useFontSize();
  useProfileGuard();

  // 자동 로그인 off면 앱 시작 시 로그인 정보 제거
  useEffect(() => {
    if (localStorage.getItem('autoLogin') === 'off') {
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userProfile');
    }
  }, []);

  const triggerSplash = () => {
    setSplashKey(Date.now());
    setShowSplash(true);
  };

  return (
    <HeartProvider>
    <>
      {showSplash && <Splash key={splashKey} onDone={() => setShowSplash(false)} />}
      <div className="app" style={{ display: showSplash ? 'none' : undefined }}>
        <TransitionProvider>
          <Header onHomeSplash={triggerSplash} />
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
              <Route path="/my-menu" element={<MyMenu />} />
              <Route path="/my-star" element={<MyStar />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          {/* <FloatingMenu /> */}
        </TransitionProvider>
      </div>
    </>
    </HeartProvider>
  );
}

export default App;
