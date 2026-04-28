import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startKakaoLogin } from '../utils/kakaoAuth';
import './TarotLanding.css';

// 미리보기용 덱 커버 (12개 중 대표 5개)
const PREVIEW_COVERS = [
  { src: '/tarot-effects/deck-intro/lady_cover.webp',         name: '레이디' },
  { src: '/tarot-effects/deck-intro/celestial_cover.webp',    name: '셀레스티얼' },
  { src: '/tarot-effects/deck-intro/kdrama_cover.webp',       name: 'K-드라마' },
  { src: '/tarot-effects/deck-intro/cartoon_girl_cover.webp', name: '카툰 걸' },
  { src: '/tarot-effects/deck-intro/masterpiece_cover.webp',  name: '명화' },
];

const TAROT_HIGHLIGHTS = [
  { icon: '🎴', title: '12종 풀 덱', desc: '78장 × 12 덱\nK-드라마부터 셀레스티얼까지' },
  { icon: '🤖', title: 'AI 해석',    desc: '카드의 의미를 사주·일진과\n결합해 풀어드립니다' },
  { icon: '💗', title: '매일 무료', desc: '데일리 하트로\n오늘의 한 장 무료 리딩' },
];

function TarotLanding() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % TAROT_HIGHLIGHTS.length;
      setSlide(slideRef.current);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const goLogin = () => {
    startKakaoLogin('/tarot');
  };

  const goHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="tarot-landing">
      {/* 우주 배경 + 별 파티클 */}
      <div className="tlanding-bg">
        <div className="tlanding-bg-orb tlanding-bg-orb-1" />
        <div className="tlanding-bg-orb tlanding-bg-orb-2" />
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className="tlanding-star" style={{
            '--ts-x': `${(i * 11.7) % 100}%`,
            '--ts-y': `${(i * 17.3) % 100}%`,
            '--ts-delay': `${(i % 14) * 0.3}s`,
            '--ts-dur': `${2.5 + (i % 5) * 0.7}s`,
            '--ts-size': `${4 + (i % 4) * 3}px`,
          }}>{i % 3 === 0 ? '✦' : i % 3 === 1 ? '✧' : '·'}</span>
        ))}
      </div>

      {/* Hero */}
      <section className="tlanding-hero">
        <div className="tlanding-hero-icon">
          <span className="tlanding-hero-aura" />
          <span className="tlanding-hero-emoji">🔮</span>
        </div>
        <h1 className="tlanding-title">
          <span className="tlanding-title-line">신비로운 카드가</span>
          <span className="tlanding-title-line tlanding-title-accent">당신을 기다립니다</span>
        </h1>
        <p className="tlanding-sub">
          78장 × 12덱, AI가 풀어주는 오늘의 운명<br />
          카드 한 장이 당신의 길을 열어드려요
        </p>
      </section>

      {/* 덱 미리보기 — 가로 스크롤 카드 띠 */}
      <section className="tlanding-decks">
        <div className="tlanding-decks-track">
          {PREVIEW_COVERS.map((d, i) => (
            <div key={d.name} className="tlanding-deck-thumb" style={{ '--td-i': i }}>
              <img src={d.src} alt={d.name} loading="lazy" draggable={false} />
              <span className="tlanding-deck-name">{d.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 하이라이트 슬라이드 */}
      <section className="tlanding-highlights">
        <div className="tlanding-highlights-track" style={{ '--slide-idx': slide }}>
          {TAROT_HIGHLIGHTS.map((h, i) => (
            <div key={h.title} className={`tlanding-highlight ${i === slide ? 'active' : ''}`}>
              <div className="tlanding-highlight-icon">{h.icon}</div>
              <h3 className="tlanding-highlight-title">{h.title}</h3>
              <p className="tlanding-highlight-desc">{h.desc}</p>
            </div>
          ))}
        </div>
        <div className="tlanding-dots">
          {TAROT_HIGHLIGHTS.map((_, i) => (
            <button
              key={i}
              className={`tlanding-dot ${i === slide ? 'active' : ''}`}
              onClick={() => { slideRef.current = i; setSlide(i); }}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 하단 CTA */}
      <div className="tlanding-cta-bar">
        <button className="tlanding-cta-kakao" onClick={goLogin}>
          <svg className="tlanding-cta-kakao-logo" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#000" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.32.65.64.44l4.94-3.26c.38.04.76.06 1.16.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/>
          </svg>
          <span>카카오 로그인하고 카드 뽑기</span>
        </button>
        <button className="tlanding-cta-skip" onClick={goHome}>← 홈으로 돌아가기</button>
      </div>
    </div>
  );
}

export default TarotLanding;
