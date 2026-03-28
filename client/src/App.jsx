import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import Manseryeok from './pages/Manseryeok';
import Tarot from './pages/Tarot';
import SpecialFortune from './pages/SpecialFortune';
import ProfileEdit from './pages/ProfileEdit';
import Dream from './pages/Dream';
import FaceReading from './pages/FaceReading';
import PsychTest from './pages/PsychTest';
import Biorhythm from './pages/Biorhythm';
import YearFortune from './pages/YearFortune';
import MonthlyFortune from './pages/MonthlyFortune';
import WeeklyFortune from './pages/WeeklyFortune';
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
            <h1 className="splash-title splash-title--love">사주운세</h1>
            <p className="splash-sub">{relStatus === 'IN_RELATIONSHIP' ? '사랑이 빛나는 오늘 하루' : '설레는 인연이 다가오고 있어요'}</p>
          </>
        ) : isSingle ? (
          <>
            <div className="splash-symbol">
              <div className="splash-ring" />
              <span className="splash-yin">🌟</span>
            </div>
            <h1 className="splash-title">사주운세</h1>
            <p className="splash-sub">빛나는 당신의 하루가 시작됩니다</p>
          </>
        ) : (
          <>
            <div className="splash-symbol">
              <div className="splash-ring" />
              <span className="splash-yin">☯</span>
            </div>
            <h1 className="splash-title">사주운세</h1>
            <p className="splash-sub">사주팔자로 보는 당신의 운명</p>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [splashKey, setSplashKey] = useState(Date.now());
  const [showSplash, setShowSplash] = useState(true);

  const triggerSplash = () => {
    setSplashKey(Date.now());
    setShowSplash(true);
  };

  return (
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
              <Route path="/profile" element={<Profile />} />
              <Route path="/saju" element={<SajuAnalysis />} />
              <Route path="/bloodtype" element={<BloodType />} />
              <Route path="/mbti" element={<Mbti />} />
              <Route path="/my" element={<MyFortune />} />
              <Route path="/constellation" element={<Constellation />} />
              <Route path="/tojeong" element={<Tojeong />} />
              <Route path="/compatibility" element={<Compatibility />} />
              <Route path="/manseryeok" element={<Manseryeok />} />
              <Route path="/tarot" element={<Tarot />} />
              <Route path="/special" element={<SpecialFortune />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/dream" element={<Dream />} />
              <Route path="/face-reading" element={<FaceReading />} />
              <Route path="/psych-test" element={<PsychTest />} />
              <Route path="/biorhythm" element={<Biorhythm />} />
              <Route path="/year-fortune" element={<YearFortune />} />
              <Route path="/monthly-fortune" element={<MonthlyFortune />} />
              <Route path="/weekly-fortune" element={<WeeklyFortune />} />
            </Routes>
          </main>
        </TransitionProvider>
      </div>
    </>
  );
}

export default App;
