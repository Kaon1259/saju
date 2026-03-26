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
import './App.css';

function Splash({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);

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

      {/* 메인 콘텐츠 */}
      <div className="splash-content">
        <div className="splash-symbol">
          <div className="splash-ring" />
          <span className="splash-yin">☯</span>
        </div>
        <h1 className="splash-title">사주운세</h1>
        <p className="splash-sub">사주팔자로 보는 당신의 운명</p>
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
            </Routes>
          </main>
        </TransitionProvider>
      </div>
    </>
  );
}

export default App;
