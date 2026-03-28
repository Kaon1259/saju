import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransition } from './PageTransition';
import './Header.css';

const NAV_ITEMS = [
  { path: '/', label: '홈', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M3 12.5L12 3l9 9.5V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-8.5z" /></svg>
  ), color: '#FF6B6B' },
  { path: '/my', label: '오늘운세', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" /><path d="M15 4l2 2-2 2M17 2l2 2-2 2" strokeWidth="1.5" /></svg>
  ), color: '#FBBF24' },
  { path: '/saju', label: '사주', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /></svg>
  ), color: '#E879F9' },
  { path: '/tojeong', label: '토정비결', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><path d="M4 4h16v16H4z" rx="2" /><path d="M8 2v4M16 2v4M4 10h16" /><path d="M8 14h2M14 14h2M8 18h2" /></svg>
  ), color: '#F472B6' },
  { path: '/mbti', label: 'MBTI', icon: (
    <svg viewBox="0 0 24 24" className="tab-svg"><rect x="2" y="2" width="9" height="9" rx="2" /><rect x="13" y="2" width="9" height="9" rx="2" /><rect x="2" y="13" width="9" height="9" rx="2" /><rect x="13" y="13" width="9" height="9" rx="2" /></svg>
  ), color: '#34D399' },
];

const MORE_ITEMS = [
  { path: '/tarot', label: '타로 카드', icon: '🔮', effect: 'tarot' },
  { path: '/special', label: '특수 운세', icon: '💘', effect: 'compatibility' },
  { path: '/compatibility', label: '궁합', icon: '💕', effect: 'compatibility' },
  { path: '/bloodtype', label: '혈액형 운세', icon: '🩸', effect: 'bloodtype' },
  { path: '/constellation', label: '별자리 운세', icon: '⭐', effect: 'star' },
  { path: '/manseryeok', label: '만세력', icon: '📅', effect: 'saju' },
];

const PATH_EFFECTS = {
  '/': 'fortune',
  '/my': 'fortune',
  '/saju': 'saju',
  '/tojeong': 'tojeong',
  '/mbti': 'mbti',
  '/compatibility': 'compatibility',
  '/bloodtype': 'bloodtype',
  '/constellation': 'star',
  '/manseryeok': 'saju',
  '/tarot': 'tarot',
  '/special': 'compatibility',
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
          <div className="logo-icon-wrap">
            <svg viewBox="0 0 28 28" className="logo-svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <circle cx="14" cy="14" r="12" fill="url(#logoGrad)" />
              <text x="14" y="19" textAnchor="middle" fontSize="14" fontWeight="900" fill="#1a0533">운</text>
            </svg>
          </div>
          <span className="top-bar-text">사주운세</span>
        </button>

        <div className="top-bar-right">
          {/* 더보기 버튼 */}
          <button
            className={`top-bar-more-btn ${showMore ? 'active' : ''}`}
            onClick={() => setShowMore(!showMore)}
          >
            <span className="top-bar-more-dots">⋯</span>
            <span>더보기</span>
          </button>

          {/* 프로필 */}
          <button
            className={`top-bar-profile-btn ${location.pathname === '/profile' || location.pathname === '/register' ? 'active' : ''}`}
            onClick={() => {
              if (userId) {
                if (location.pathname === '/profile') return;
                triggerTransition('profile', '/profile');
              } else {
                if (location.pathname === '/register') return;
                navigate('/register', { state: { from: location.pathname } });
              }
            }}
          >
            <svg viewBox="0 0 24 24" className="top-bar-profile-svg">
              <circle cx="12" cy="8" r="5" />
              <path d="M3 21c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8" />
            </svg>
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
