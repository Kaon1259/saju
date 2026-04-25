import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startKakaoLogin } from '../utils/kakaoAuth';
import './Landing.css';

const FEATURES = [
  {
    id: 'love',
    icon: '💕',
    title: '1:1 연애운',
    desc: '오늘 그 사람과 나의 케미는?\n사주로 보는 매일의 연애 에너지',
    accent: '#EC4899',
  },
  {
    id: 'compat',
    icon: '💑',
    title: '사주 궁합',
    desc: '두 사람, 하늘이 정한 인연일까?\n정통/결혼/스킨십 궁합까지',
    accent: '#A78BFA',
  },
  {
    id: 'tarot',
    icon: '🔮',
    title: '타로 12종 덱',
    desc: '카드가 들려주는 오늘의 운명\nK드라마·셀레스티얼·고양이덱까지',
    accent: '#F472B6',
  },
];

function Landing() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % FEATURES.length;
      setSlide(slideRef.current);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const markSeen = () => {
    try { localStorage.setItem('landingSeen', '1'); } catch (e) {}
  };

  const goLogin = () => {
    markSeen();
    startKakaoLogin('/');
  };

  const goHome = () => {
    markSeen();
    navigate('/', { replace: true });
  };

  return (
    <div className="landing-page">
      {/* 배경 별/하트 파티클 */}
      <div className="landing-bg">
        <div className="landing-bg-orb landing-bg-orb-1" />
        <div className="landing-bg-orb landing-bg-orb-2" />
        <div className="landing-bg-orb landing-bg-orb-3" />
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="landing-particle" style={{
            '--lp-x': `${(i * 13.7) % 100}%`,
            '--lp-y': `${(i * 23.1) % 100}%`,
            '--lp-delay': `${(i % 12) * 0.4}s`,
            '--lp-dur': `${3 + (i % 5) * 0.7}s`,
            '--lp-size': `${6 + (i % 4) * 3}px`,
          }}>{i % 3 === 0 ? '✦' : i % 3 === 1 ? '✧' : '·'}</span>
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={`h${i}`} className="landing-heart" style={{
            '--lh-x': `${(i * 9.3) % 100}%`,
            '--lh-delay': `${i * 0.6}s`,
            '--lh-dur': `${5 + (i % 3) * 1.2}s`,
            '--lh-size': `${10 + (i % 4) * 4}px`,
          }}>♥</span>
        ))}
      </div>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-icon">
          <span className="landing-hero-emoji-back">✨</span>
          <span className="landing-hero-emoji-main">💞</span>
          <span className="landing-hero-emoji-front">✨</span>
        </div>
        <h1 className="landing-hero-title">
          <span className="landing-title-line1">당신의 연애 운명,</span>
          <span className="landing-title-line2">사주가 알려줍니다</span>
        </h1>
        <p className="landing-hero-sub">
          1:1 연애운 · 사주 궁합 · 타로 12덱<br />
          AI 사주 마스터 <strong>"러브"</strong>가 풀어드려요
        </p>
      </section>

      {/* 기능 슬라이드 */}
      <section className="landing-features">
        <div className="landing-features-track" style={{ '--slide-idx': slide }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.id}
              className={`landing-feature-card ${i === slide ? 'active' : ''}`}
              style={{ '--accent': f.accent }}
            >
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="landing-features-dots">
          {FEATURES.map((_, i) => (
            <button
              key={i}
              className={`landing-dot ${i === slide ? 'active' : ''}`}
              onClick={() => { slideRef.current = i; setSlide(i); }}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 강조 포인트 */}
      <section className="landing-points">
        <div className="landing-point">
          <span className="landing-point-icon">🎯</span>
          <span className="landing-point-text">사주·일진 기반 정확한 분석</span>
        </div>
        <div className="landing-point">
          <span className="landing-point-icon">⚡</span>
          <span className="landing-point-text">실시간 스트리밍, 빠른 결과</span>
        </div>
        <div className="landing-point">
          <span className="landing-point-icon">💝</span>
          <span className="landing-point-text">매일 무료 하트로 시작</span>
        </div>
      </section>

      {/* 하단 고정 CTA */}
      <div className="landing-cta-bar">
        <button className="landing-cta-kakao" onClick={goLogin}>
          <span className="landing-cta-kakao-icon">💬</span>
          <span>카카오로 3초만에 시작</span>
        </button>
        <button className="landing-cta-skip" onClick={goHome}>
          그냥 둘러보기 →
        </button>
      </div>
    </div>
  );
}

export default Landing;
