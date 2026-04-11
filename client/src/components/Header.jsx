import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransition } from './PageTransition';
import { useHearts } from '../context/HeartContext';
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
  { path: '/my-menu', label: '마이메뉴', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
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

function Header({ onHomeSplash }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerTransition } = useTransition();
  const userId = localStorage.getItem('userId');
  const { heartPoints } = useHearts();
  const [showMore, setShowMore] = useState(false);
  // 다크모드 고정
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

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
          {userId && heartPoints != null && (
            <div className="top-bar-hearts">
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
