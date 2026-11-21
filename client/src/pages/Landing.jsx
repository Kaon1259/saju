import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '../components/MenuIcon';
import BirthDatePicker from '../components/BirthDatePicker';
import { buildTeaser, categoryLine, DECISION_CATS } from '../utils/sajuTeaser';
import './Landing.css';


function Landing() {
  const navigate = useNavigate();
  const resultRef = useRef(null);
  const [birth, setBirth] = useState('');
  const [gender, setGender] = useState('');
  const [teaser, setTeaser] = useState(null);
  const [cat, setCat] = useState(''); // '' = 그냥 올해 연애운

  const markSeen = () => {
    try { localStorage.setItem('landingSeen', '1'); } catch {}
  };
  const goRegister = () => {
    markSeen();
    // 고민을 골랐으면 가입 직후 해당 결정 상담 탭으로, 아니면 연애 타이밍 페이지로
    navigate('/register', { state: { from: cat ? `/decision?cat=${cat}` : '/love-timing' } });
  };
  const goHome = () => {
    markSeen();
    navigate('/', { replace: true });
  };

  const canSubmit = !!birth && !!gender;
  const onSubmit = () => {
    if (!canSubmit) return;
    setTeaser(buildTeaser(birth, gender));
    // 가입 화면에서 다시 묻지 않도록 이 탭 세션에만 임시 보관 (가입 완료 시 삭제)
    try { sessionStorage.setItem('landingBirth', JSON.stringify({ birthDate: birth, gender, cat })); } catch {}
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <div className="onb-page lp-page">
      <div className="onb-bg" aria-hidden="true">
        <div className="onb-bg-orb onb-bg-orb-1" />
        <div className="onb-bg-orb onb-bg-orb-2" />
        <div className="onb-bg-orb onb-bg-orb-3" />
      </div>

      <button type="button" className="onb-skip" onClick={goHome} aria-label="건너뛰고 둘러보기">
        둘러보기
      </button>

      <div className="lp-scroll">
        <div className="lp-inner">
          <p className="lp-kicker">1:1연애 · 사주 결정 상담</p>
          <h1 className="lp-title">
            <span className="fs-fixed lp-title-l">올해, 내 연애</span>
            <span className="fs-fixed lp-title-l lp-title-accent">언제 풀릴까?</span>
          </h1>
          <p className="lp-sub">생년월일만 넣으면 사주로 바로 보여드려요</p>

          <div className="lp-q-label">어떤 고민인가요? <small className="fs-fixed">(선택)</small></div>
          <div className="lp-questions" role="radiogroup" aria-label="고민 선택">
            {[...Object.entries(DECISION_CATS).map(([k, c]) => [k, c.question]), ['', '그냥 올해 연애운이 궁금해요']].map(([k, q]) => (
              <button key={k || 'general'} type="button" role="radio" aria-checked={cat === k}
                className={`lp-q ${cat === k ? 'lp-q--on' : ''}`} onClick={() => setCat(k)}>{q}</button>
            ))}
          </div>

          <div className="lp-card">
            <div className="lp-field-label">양력 생년월일</div>
            <BirthDatePicker value={birth} onChange={setBirth} />

            <div className="lp-field-label lp-field-label--gap">성별</div>
            <div className="lp-gender" role="radiogroup" aria-label="성별">
              {[['F', '여자'], ['M', '남자']].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={gender === v}
                  className={`lp-gender-btn ${gender === v ? 'lp-gender-btn--on' : ''}`}
                  onClick={() => setGender(v)}
                >{label}</button>
              ))}
            </div>

            <button type="button" className="lp-cta" disabled={!canSubmit} onClick={onSubmit}>
              <MenuIcon name="sparkleHeart" size={18} />
              <span>내 연애 타이밍 보기</span>
            </button>
            <p className="lp-note">로그인 없이 바로 확인 · 가입 전에는 서버에 저장되지 않아요</p>
          </div>

          {teaser && (
            <div className="lp-result" ref={resultRef}>
              <div className="lp-r-head">
                <span className="fs-fixed lp-r-badge">{teaser.dayStemKo}{teaser.dayElement} · {teaser.dayStemHanja}{teaser.dayElementHanja} 일간</span>
                <h2 className="lp-r-title">당신은 <em>{teaser.image}</em> 같은 사람</h2>
                <p className="lp-r-text">{teaser.love}</p>
              </div>

              {cat && (
                <div className="lp-r-block lp-r-block--cat">
                  <div className="lp-r-label">‘{DECISION_CATS[cat].question}’ — 올해 사주의 경향</div>
                  <p className="lp-r-text">{categoryLine(cat, teaser)}</p>
                </div>
              )}

              <div className="lp-r-block">
                <div className="lp-r-label">
                  {teaser.year}년 {teaser.yearGanjiKo}년의 연애 흐름
                  <small className="fs-fixed">세운 {teaser.stemGod} · {teaser.branchGod}</small>
                </div>
                <p className="lp-r-text">{teaser.yearLine}</p>
              </div>

              <div className="lp-r-block lp-r-block--locked">
                <div className="lp-r-label">{cat ? `${DECISION_CATS[cat].label}, 언제가 가장 유리할까?` : '인연이 가장 가까워지는 달은?'}</div>
                <div className="lp-r-blur" aria-hidden="true">
                  <span className="fs-fixed">▒▒월 ▒▒주</span>
                  <span className="fs-fixed">이 시기에 ▒▒▒▒▒ 하면 ▒▒▒▒▒</span>
                </div>
                <div className="lp-r-lock"><MenuIcon name="lock" size={16} /><span>가입하면 월별 타이밍을 열어드려요</span></div>
              </div>

              <button type="button" className="lp-cta lp-cta--solid" onClick={goRegister}>
                <span>{cat ? `3초 가입하고 ${DECISION_CATS[cat].label} 상담 이어서 보기` : '3초 가입하고 이어서 보기'} · 60하트</span>
              </button>
              <button type="button" className="onb-cta-ghost lp-ghost" onClick={goHome}>
                가입 없이 둘러보기
              </button>
              <p className="lp-note">사주 풀이는 운세의 관점이에요. 중요한 결정은 본인의 판단과 함께 참고하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Landing;
