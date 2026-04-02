import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransition } from './PageTransition';
import './Header.css';

const NAV_ITEMS = [
  { path: '/', label: '홈', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M3 12.5L12 3l9 9.5V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z" /></svg>
  ), color: '#FF6B6B' },
  { path: '/love-fortune', label: '1:1연애', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /><text x="12" y="13" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="900" stroke="none">1:1</text></svg>
  ), color: '#F472B6' },
  { path: '/my', label: '오늘운세', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" /><path d="M15 4l2 2-2 2M17 2l2 2-2 2" strokeWidth="1.5" /></svg>
  ), color: '#FBBF24' },
  { path: '/compatibility', label: '궁합', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
  ), color: '#F472B6' },
  { path: '/traditional', label: '정통사주', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="12" r="10" /><path d="M12 2c0 5.5-5 10-5 10s5 4.5 5 10" /><circle cx="10" cy="7" r="1.5" fill="var(--color-bg, #1a0533)" stroke="none" /><circle cx="14" cy="17" r="1.5" /></svg>
  ), color: '#E879F9' },
  { path: '/profile', label: '마이', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="8" r="5" /><path d="M3 21c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8" /></svg>
  ), color: '#34D399' },
];

const MORE_ITEMS = [
  { path: '/tarot', label: '타로 카드', icon: '🔮', effect: 'tarot' },
  { path: '/constellation', label: '별자리 운세', icon: '⭐', effect: 'star' },
  { path: '/bloodtype', label: '혈액형 운세', icon: '🩸', effect: 'bloodtype' },
  { path: '/mbti', label: 'MBTI', icon: '🧬', effect: 'mbti' },
  { path: '/dream', label: '꿈해몽', icon: '🌙', effect: 'fortune' },
  { path: '/psych-test', label: '심리테스트', icon: '🎭', effect: 'fortune' },
];

const PATH_EFFECTS = {
  '/': 'fortune',
  '/my': 'fortune',
  '/compatibility': 'compatibility',
  '/traditional': 'saju',
  '/profile': 'profile',
  '/saju': 'saju',
  '/tojeong': 'tojeong',
  '/mbti': 'mbti',
  '/bloodtype': 'bloodtype',
  '/constellation': 'star',
  '/manseryeok': 'saju',
  '/tarot': 'tarot',
  '/special': 'compatibility',
  '/love-fortune': 'compatibility',
};

function Header({ onHomeSplash }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerTransition } = useTransition();
  const userId = localStorage.getItem('userId');
  const [showMore, setShowMore] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return (localStorage.getItem('theme') || 'dark') === 'dark';
  });

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setIsDark(!isDark);
  };

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
          <span className="top-bar-text">1:1연애 <span style={{color:'#F472B6'}}>💕</span></span>
        </button>

        <div className="top-bar-right">
          <button
            className={`top-bar-more-btn ${showMore ? 'active' : ''}`}
            onClick={() => setShowMore(!showMore)}
          >
            <span className="top-bar-more-dots">⋯</span>
            <span>더보기</span>
          </button>
        </div>
      </header>

      {/* 더보기 드롭다운 */}
      {showMore && (
        <>
          <div className="top-bar-overlay" onClick={() => setShowMore(false)} />
          <div className="top-bar-dropdown">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.path}
                className={`top-bar-dropdown-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleMoreNav(item)}
              >
                <span className="top-bar-dropdown-icon">{item.icon}</span>
                <span className="top-bar-dropdown-label">{item.label}</span>
              </button>
            ))}
            <div className="top-bar-dropdown-divider" />
            <button className="top-bar-dropdown-item" onClick={() => { toggleTheme(); setShowMore(false); }}>
              <span className="top-bar-dropdown-icon">{isDark ? '☀️' : '🌙'}</span>
              <span className="top-bar-dropdown-label">{isDark ? '라이트 모드' : '다크 모드'}</span>
            </button>
          </div>
        </>
      )}

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
