import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startKakaoLogin } from '../utils/kakaoAuth';
import MenuIcon from '../components/MenuIcon';
import './Landing.css';

const SLIDES = [
  {
    id: 'welcome',
    iconKey: 'sparkleHeart',
    accent: '#EC4899',
    title: ['당신의 연애 운명,', '사주가 알려줍니다'],
    sub: '1:1 연애운 · 사주 궁합 · 타로 12덱',
    highlight: 'AI 사주 마스터 "러브"가 풀어드려요',
  },
  {
    id: 'features',
    iconKey: 'couple',
    accent: '#A78BFA',
    title: ['매일 새로운 운세,', '실시간 스트리밍'],
    sub: '사주·일진 기반 깊이 있는 분석',
    points: [
      { iconKey: 'target', text: '사주·일진 기반 정확한 분석' },
      { iconKey: 'spark', text: '실시간 스트리밍, 빠른 결과' },
      { iconKey: 'tarot', text: '타로 12덱 · 사주 궁합 · 토정비결' },
    ],
  },
  {
    id: 'start',
    iconKey: 'gift',
    accent: '#F472B6',
    title: ['가입하면', '70하트 즉시 지급'],
    sub: '매일 출석 +5하트 · 7일 연속 +20',
    perks: [
      { iconKey: 'attendance', label: '매일 출석', value: '+5' },
      { iconKey: 'star', label: '7일 연속', value: '+20' },
      { iconKey: 'sparkleHeart', label: '가입 보너스', value: '+70' },
    ],
  },
];

function Landing() {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const markSeen = () => {
    try { localStorage.setItem('landingSeen', '1'); } catch {}
  };

  const goLogin = () => {
    markSeen();
    startKakaoLogin('/');
  };

  const goHome = () => {
    markSeen();
    navigate('/', { replace: true });
  };

  const goSlide = (idx) => {
    const t = trackRef.current;
    if (!t) return;
    const target = Math.max(0, Math.min(SLIDES.length - 1, idx));
    t.scrollTo({ left: target * t.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    const idx = Math.round(t.scrollLeft / t.clientWidth);
    if (idx !== active) setActive(idx);
  };

  // 키보드 화살표 지원 (데스크탑/접근성)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goSlide(active + 1);
      else if (e.key === 'ArrowLeft') goSlide(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const isLast = active === SLIDES.length - 1;

  return (
    <div className="onb-page">
      {/* 배경 효과 — 슬라이드 전체에 공통 */}
      <div className="onb-bg" aria-hidden="true">
        <div className="onb-bg-orb onb-bg-orb-1" />
        <div className="onb-bg-orb onb-bg-orb-2" />
        <div className="onb-bg-orb onb-bg-orb-3" />
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="onb-particle" style={{
            '--p-x': `${(i * 13.7) % 100}%`,
            '--p-y': `${(i * 23.1) % 100}%`,
            '--p-delay': `${(i % 12) * 0.4}s`,
            '--p-dur': `${3 + (i % 5) * 0.7}s`,
            '--p-size': `${6 + (i % 4) * 3}px`,
          }}>{i % 3 === 0 ? '✦' : i % 3 === 1 ? '✧' : '·'}</span>
        ))}
      </div>

      {/* 상단 — Skip */}
      <button type="button" className="onb-skip" onClick={goHome} aria-label="온보딩 건너뛰기">
        건너뛰기
      </button>

      {/* 슬라이드 트랙 */}
      <div className="onb-track" ref={trackRef} onScroll={onScroll}>
        {SLIDES.map((s, i) => (
          <section
            key={s.id}
            className={`onb-slide ${active === i ? 'onb-slide--active' : ''}`}
            style={{ '--accent': s.accent }}
            aria-hidden={active !== i}
          >
            <div className="onb-slide-inner">
              <div className="onb-icon-wrap">
                <span className="onb-icon-glow" aria-hidden="true" />
                <MenuIcon name={s.iconKey} size={88} className="onb-icon" />
              </div>

              <h1 className="onb-title">
                {s.title.map((line, idx) => (
                  <span key={idx} className={`onb-title-line onb-title-line--${idx}`}>{line}</span>
                ))}
              </h1>
              <p className="onb-sub">{s.sub}</p>

              {/* 슬라이드 1 — 강조 한 줄 */}
              {s.highlight && (
                <div className="onb-highlight">
                  <MenuIcon name="sparkle" size={14} />
                  <span>{s.highlight}</span>
                </div>
              )}

              {/* 슬라이드 2 — 포인트 3개 */}
              {s.points && (
                <ul className="onb-points">
                  {s.points.map((p, idx) => (
                    <li key={idx} className="onb-point" style={{ animationDelay: `${0.2 + idx * 0.08}s` }}>
                      <span className="onb-point-icon"><MenuIcon name={p.iconKey} size={20} /></span>
                      <span className="onb-point-text">{p.text}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* 슬라이드 3 — 보상 3개 */}
              {s.perks && (
                <div className="onb-perks">
                  {s.perks.map((p, idx) => (
                    <div key={idx} className="onb-perk" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
                      <span className="onb-perk-icon"><MenuIcon name={p.iconKey} size={28} /></span>
                      <span className="onb-perk-label">{p.label}</span>
                      <span className="onb-perk-value">{p.value}<small>하트</small></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* 페이지 인디케이터 */}
      <div className="onb-dots" role="tablist" aria-label="온보딩 단계">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`onb-dot ${active === i ? 'onb-dot--active' : ''}`}
            onClick={() => goSlide(i)}
            role="tab"
            aria-selected={active === i}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>

      {/* 하단 CTA — 슬라이드별 분기 */}
      <div className="onb-cta">
        {!isLast ? (
          <button type="button" className="onb-cta-next" onClick={() => goSlide(active + 1)}>
            다음
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <>
            <button type="button" className="onb-cta-kakao" onClick={goLogin}>
              <span className="onb-cta-kakao-icon" aria-hidden="true">💬</span>
              <span>카카오로 3초만에 시작</span>
            </button>
            <button type="button" className="onb-cta-ghost" onClick={goHome}>
              그냥 둘러보기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Landing;
