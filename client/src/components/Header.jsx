import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransition } from './PageTransition';
import { useHearts } from '../context/HeartContext';
import { useApp } from '../context/AppContext';
import {
  playHomeChime, playLovebeat, playCrystalBall, playHarmony, playOriental,
  playProfilePing, playTarotReveal, playStarTwinkle, playBloodDrop,
  playMbtiPop, playDreamWave, playPsychPop, playAncientBell,
  playClockChime, playShutter, playBioWave
} from '../utils/sounds';
import './Header.css';

const NAV_ITEMS = [
  { path: '/', label: '홈', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M3 12.5L12 3l9 9.5V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z" /></svg>
  ), color: '#FF6B6B' },
  { path: '/tarot', label: '타로카드', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M12 7l1 2h-2l1-2M9 15h6" /><path d="M8 4h8M8 20h8" strokeWidth="1" opacity="0.5" /></svg>
  ), color: '#9B59B6' },
  { path: '/traditional', label: '정통운세', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="12" r="10" /><path d="M12 2c0 5.5-5 10-5 10s5 4.5 5 10" /><circle cx="10" cy="7" r="1.5" fill="var(--color-bg, #1a0533)" stroke="none" /><circle cx="14" cy="17" r="1.5" /></svg>
  ), color: '#E879F9' },
  { path: '/my-menu', label: '하트충전', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
  ), color: '#FBBF24' },
  { path: '/profile', label: '마이', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="8" r="5" /><path d="M3 21c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8" /></svg>
  ), color: '#34D399' },
];

const MORE_ITEMS = [
  { path: '/love-fortune', label: '1:1 연애운', icon: '💕', effect: 'compatibility' },
  { path: '/compatibility', label: '사주 궁합', icon: '💑', effect: 'compatibility' },
  { path: '/constellation', label: '별자리 운세', icon: '⭐', effect: 'star' },
  { path: '/bloodtype', label: '혈액형 운세', icon: '🩸', effect: 'bloodtype' },
  { path: '/mbti', label: 'MBTI', icon: '🧬', effect: 'mbti' },
  { path: '/dream', label: '꿈해몽', icon: '🌙', effect: 'fortune' },
  { path: '/psych-test', label: '심리테스트', icon: '🎭', effect: 'fortune' },
];

const PATH_EFFECTS = {
  '/': 'fortune',
  '/my': 'fortune',
  '/my-menu': 'fortune',
  '/compatibility': 'compatibility',
  '/traditional': 'saju',
  '/profile': 'profile',
  '/saju': 'saju',
  '/tojeong': 'tojeong',
  '/mbti': 'mbti',
  '/bloodtype': 'bloodtype',
  '/constellation': 'star',
  '/manseryeok': 'saju',
  // '/tarot': 'tarot', // 타로는 자체 GIF 인트로 사용
  '/special': 'compatibility',
  '/love-fortune': 'compatibility',
};

const PATH_SOUNDS = {
  '/': playHomeChime,
  '/love-fortune': playLovebeat,
  '/my': playCrystalBall,
  '/my-menu': playCrystalBall,
  '/compatibility': playHarmony,
  '/traditional': playOriental,
  '/profile': playProfilePing,
  '/tarot': playTarotReveal,
  '/constellation': playStarTwinkle,
  '/bloodtype': playBloodDrop,
  '/mbti': playMbtiPop,
  '/dream': playDreamWave,
  '/psych-test': playPsychPop,
  '/saju': playOriental,
  '/tojeong': playAncientBell,
  '/manseryeok': playClockChime,
  '/face-reading': playShutter,
  '/biorhythm': playBioWave,
};

// 탭 경로 → 인트로 키 매핑
const TAB_INTRO_MAP = {
  '/traditional': 'fortune',
  '/my-menu': 'heart',
  '/profile': 'my',
};

function Header({ onHomeSplash, onTabIntro }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerTransition } = useTransition();
  const { isLoggedIn, appUser } = useApp();
  const userId = isLoggedIn ? localStorage.getItem('userId') : null;
  const { heartPoints } = useHearts();
  const [showMore, setShowMore] = useState(false);
  // 다크모드 고정
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // 풀스크린 랜딩(/welcome)에서는 헤더 자체를 숨김
  if (location.pathname === '/welcome') return null;

  const handleTabClick = (item) => {
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);
    if (isActive) return;

    // 마이 탭: 비로그인 시 회원가입으로
    if (item.path === '/profile' && !userId) {
      navigate('/register', { state: { from: location.pathname } });
      return;
    }

    // 클릭 즉시 효과음
    const sound = PATH_SOUNDS[item.path];
    if (sound) sound();

    if (item.path === '/' && onHomeSplash) {
      onHomeSplash();
      navigate('/');
      return;
    }

    // 탭 인트로 표시
    const introKey = TAB_INTRO_MAP[item.path];
    if (introKey && onTabIntro) {
      onTabIntro(introKey);
      navigate(item.path);
      return;
    }

    const effect = PATH_EFFECTS[item.path];
    if (effect) triggerTransition(effect, item.path);
    else navigate(item.path);
  };

  const handleMoreNav = (item) => {
    setShowMore(false);
    if (location.pathname === item.path) return;

    // 클릭 즉시 효과음
    const sound = PATH_SOUNDS[item.path];
    if (sound) sound();

    triggerTransition(item.effect, item.path);
  };

  return (
    <>
      {/* 상단 로고 바 */}
      <header className="top-bar">
        <button className="top-bar-logo" onClick={() => {
          if (location.pathname === '/') return;
          if (onHomeSplash) onHomeSplash();
          navigate('/');
        }}>
          <span className="top-bar-heart">♥</span>
          <span className="top-bar-text">1:1연애운 <span style={{color:'#F472B6'}}>💕</span></span>
        </button>

        <div className="top-bar-right">
          <span className="top-bar-user" onClick={() => navigate(isLoggedIn ? '/profile' : '/register')}>
            {isLoggedIn ? (appUser?.name || localStorage.getItem('userName') || '사용자') : 'Guest'}
          </span>
          {heartPoints != null && (
            <div className="top-bar-hearts" onClick={() => navigate('/my-menu')}>
              <span className="top-bar-hearts-icon">💗</span>
              <span className="top-bar-hearts-count">{heartPoints}</span>
            </div>
          )}
          <button
            className="top-bar-settings-btn"
            onClick={() => navigate('/settings')}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* 하단 고정 탭바 */}
      <nav className="bottom-tab-bar">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              className={`tab-item ${isActive ? 'active' : ''}`}
              style={{ '--tab-color': item.color }}
              onClick={() => handleTabClick(item)}
            >
              <div className={`tab-icon-wrap ${isActive ? 'active' : ''}`}>
                {item.icon}
              </div>
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export default Header;
