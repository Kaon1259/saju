import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChooseHome.css';

/* 클래식 홈 미리보기 — 감성형 (코랄 히어로 + 배너) */
function PreviewClassic() {
  return (
    <div className="ch-preview ch-preview--classic">
      <div className="ch-pv-hero">
        <span className="ch-pv-hero-tag" />
        <span className="ch-pv-hero-line ch-pv-w70" />
        <span className="ch-pv-hero-line ch-pv-w50" />
        <div className="ch-pv-hearts">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="ch-pv-heart" style={{ animationDelay: `${i * 0.3}s` }}>♥</span>
          ))}
        </div>
      </div>
      <div className="ch-pv-banner" />
      <div className="ch-pv-banner ch-pv-banner--alt" />
    </div>
  );
}

/* 새 홈 미리보기 — 심플 카드형 (점수 + 레이더 + 그리드) */
function PreviewNew() {
  return (
    <div className="ch-preview ch-preview--new">
      <div className="ch-pv-card ch-pv-score">
        <div className="ch-pv-score-text">
          <span className="ch-pv-line ch-pv-w40" />
          <span className="ch-pv-bignum">82</span>
          <span className="ch-pv-line ch-pv-w60" />
        </div>
        <svg className="ch-pv-radar" viewBox="0 0 60 60">
          <polygon points="30,8 50,24 43,48 17,48 10,24" />
          <polygon points="30,18 42,28 38,42 23,43 19,29" className="ch-pv-radar-fill" />
        </svg>
      </div>
      <div className="ch-pv-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ch-pv-card ch-pv-mini" />
        ))}
      </div>
    </div>
  );
}

/* 동화 홈 미리보기 — 동화책형 (삽화풍 히어로 + 종이 카드) */
function PreviewStory() {
  return (
    <div className="ch-preview ch-preview--story">
      <div className="ch-pv-sky">
        <span className="ch-pv-moon" />
        {[18, 44, 66, 84].map((l, i) => (
          <span key={i} className="ch-pv-twinkle" style={{ left: `${l}%`, top: `${12 + (i % 2) * 22}%` }}>·</span>
        ))}
        <span className="ch-pv-orb">82</span>
      </div>
      <div className="ch-pv-paper">
        <span className="ch-pv-line ch-pv-w50" />
        <span className="ch-pv-line ch-pv-w70" />
      </div>
      <div className="ch-pv-story-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="ch-pv-dot" />
        ))}
      </div>
    </div>
  );
}

const OPTIONS = [
  {
    id: 'classic',
    name: '감성 홈',
    tag: '기존 스타일',
    desc: '코랄 히어로와 떠다니는 하트, 감성적인 배너 중심의 따뜻한 홈',
    Preview: PreviewClassic,
  },
  {
    id: 'new',
    name: '심플 홈',
    tag: 'SIMPLE',
    desc: '오늘의 운세 점수와 항목별 차트, 깔끔한 카드 그리드 중심의 홈',
    Preview: PreviewNew,
  },
  {
    id: 'story',
    name: '동화 홈',
    tag: 'NEW',
    desc: '삽화풍 히어로와 흩날리는 별, 동화책처럼 펼쳐 보는 파스텔 톤 홈',
    Preview: PreviewStory,
  },
];

function ChooseHome() {
  const navigate = useNavigate();
  // 재방문 시 현재 적용된 스타일을 미리 선택 상태로 표시
  const [selected, setSelected] = useState(() => localStorage.getItem('homeStyle') || null);

  const confirm = (id) => {
    try { localStorage.setItem('homeStyle', id); } catch (_) {}
    navigate('/', { replace: true });
  };

  return (
    <div className="ch-page">
      <header className="ch-header">
        <h1 className="ch-title">홈 화면을 골라주세요</h1>
        <p className="ch-sub">세 가지 스타일 중 마음에 드는 홈으로 시작할 수 있어요.<br />나중에 설정에서 언제든 바꿀 수 있습니다.</p>
      </header>

      <div className="ch-options">
        {OPTIONS.map((opt) => {
          const { Preview } = opt;
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`ch-option ${active ? 'ch-option--active' : ''}`}
              onClick={() => setSelected(opt.id)}
            >
              <div className="ch-option-head">
                <span className="ch-option-name">{opt.name}</span>
                <span className={`ch-option-tag ch-option-tag--${opt.id}`}>{opt.tag}</span>
              </div>
              <div className="ch-option-frame">
                <Preview />
              </div>
              <p className="ch-option-desc">{opt.desc}</p>
              <span className="ch-option-radio" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div className="ch-cta">
        <button
          type="button"
          className="ch-confirm"
          disabled={!selected}
          onClick={() => selected && confirm(selected)}
        >
          {selected
            ? `${OPTIONS.find((o) => o.id === selected).name} 적용하기`
            : '홈 스타일을 선택하세요'}
        </button>
      </div>
    </div>
  );
}

export default ChooseHome;
