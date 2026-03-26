import { useState } from 'react';
import { getSajuCompatibility } from '../api/fortune';
import './Compatibility.css';

const BIRTH_TIMES = [
  { value: '', label: '모름' },
  { value: '자시', label: '자시 (23~01)' }, { value: '축시', label: '축시 (01~03)' },
  { value: '인시', label: '인시 (03~05)' }, { value: '묘시', label: '묘시 (05~07)' },
  { value: '진시', label: '진시 (07~09)' }, { value: '사시', label: '사시 (09~11)' },
  { value: '오시', label: '오시 (11~13)' }, { value: '미시', label: '미시 (13~15)' },
  { value: '신시', label: '신시 (15~17)' }, { value: '유시', label: '유시 (17~19)' },
  { value: '술시', label: '술시 (19~21)' }, { value: '해시', label: '해시 (21~23)' },
];

const ELEMENT_COLORS = { '목': '#4ade80', '화': '#f87171', '토': '#fbbf24', '금': '#e2e8f0', '수': '#60a5fa' };

function Compatibility() {
  const [bd1, setBd1] = useState('');
  const [bt1, setBt1] = useState('');
  const [g1, setG1] = useState('M');
  const [bd2, setBd2] = useState('');
  const [bt2, setBt2] = useState('');
  const [g2, setG2] = useState('F');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!bd1 || !bd2) return;
    setLoading(true);
    try {
      const data = await getSajuCompatibility(bd1, bd2, bt1 || undefined, bt2 || undefined);
      data._g1 = g1;
      data._g2 = g2;
      setResult(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="compat-page">
        <div className="compat-loading">
          <div className="compat-loading-anim">
            <span className="compat-load-male">♂</span>
            <span className="compat-load-heart">❤️</span>
            <span className="compat-load-female">♀</span>
          </div>
          <p className="compat-loading-text">두 사람의 운명을 비교하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (result) {
    const score = result.score;
    const scorePercent = score / 100;
    const color1 = ELEMENT_COLORS[result.person1.dayMasterElement] || '#fbbf24';
    const color2 = ELEMENT_COLORS[result.person2.dayMasterElement] || '#a78bfa';
    const icon1 = result._g1 === 'F' ? '♀' : '♂';
    const icon2 = result._g2 === 'F' ? '♀' : '♂';

    return (
      <div className="compat-page">
        {/* 결과 히어로 */}
        <section className="compat-result-hero">
          <h1 className="compat-hero-title">사주 궁합</h1>

          <div className="compat-vs-row">
            {/* Person 1 */}
            <div className="compat-person-card">
              <div className="compat-gender-icon" style={{ background: result._g1 === 'F' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)' }}>
                <span style={{ color: result._g1 === 'F' ? '#F472B6' : '#60A5FA' }}>{icon1}</span>
              </div>
              <div className="compat-person-pillar" style={{ color: color1 }}>
                {result.person1.dayMaster}
              </div>
              <span className="compat-person-el">{result.person1.dayMasterElement}({result.person1.dayMasterYang ? '양' : '음'})</span>
              <span className="compat-person-date">{result.person1.birthDate}</span>
            </div>

            {/* Score */}
            <div className="compat-score-center">
              <svg viewBox="0 0 100 100" className="compat-score-ring">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#compatGrad)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${scorePercent * 264} 264`} transform="rotate(-90 50 50)" className="compat-score-progress" />
                <defs>
                  <linearGradient id="compatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={color1} />
                    <stop offset="100%" stopColor={color2} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="compat-score-inner">
                <span className="compat-score-num">{score}</span>
                <span className="compat-score-unit">점</span>
              </div>
            </div>

            {/* Person 2 */}
            <div className="compat-person-card">
              <div className="compat-gender-icon" style={{ background: result._g2 === 'F' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)' }}>
                <span style={{ color: result._g2 === 'F' ? '#F472B6' : '#60A5FA' }}>{icon2}</span>
              </div>
              <div className="compat-person-pillar" style={{ color: color2 }}>
                {result.person2.dayMaster}
              </div>
              <span className="compat-person-el">{result.person2.dayMasterElement}({result.person2.dayMasterYang ? '양' : '음'})</span>
              <span className="compat-person-date">{result.person2.birthDate}</span>
            </div>
          </div>

          <div className="compat-grade-badge" style={{
            background: score >= 80 ? 'rgba(74,222,128,0.12)' : score >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)',
            color: score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171',
            borderColor: score >= 80 ? 'rgba(74,222,128,0.3)' : score >= 60 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)',
          }}>
            {result.grade}
          </div>
        </section>

        {/* 분석 카드 */}
        <section className="compat-cards">
          <div className="compat-card glass-card">
            <div className="compat-card-header"><span className="compat-card-icon">⚡</span><h3>오행 관계</h3></div>
            <p className="compat-card-text">{result.elementRelation}</p>
          </div>
          <div className="compat-card glass-card">
            <div className="compat-card-header"><span className="compat-card-icon">🔗</span><h3>일지 관계</h3></div>
            <p className="compat-card-text">{result.branchRelation}</p>
          </div>
          <div className="compat-card glass-card">
            <div className="compat-card-header"><span className="compat-card-icon">☯️</span><h3>음양 조화</h3></div>
            <p className="compat-card-text">{result.yinyangBalance}</p>
          </div>
          {result.aiAnalysis && (
            <div className="compat-card glass-card compat-card--ai">
              <div className="compat-card-header"><span className="compat-card-icon">🔮</span><h3>AI 종합 분석</h3></div>
              <p className="compat-card-text">{result.aiAnalysis}</p>
            </div>
          )}
        </section>

        <button className="compat-reset-btn" onClick={() => { setResult(null); setBd1(''); setBd2(''); setBt1(''); setBt2(''); }}>
          다른 궁합 보기
        </button>
      </div>
    );
  }

  return (
    <div className="compat-page">
      <section className="compat-intro">
        <div className="compat-intro-symbols">
          <span className="compat-sym-male">♂</span>
          <span className="compat-sym-heart">❤</span>
          <span className="compat-sym-female">♀</span>
        </div>
        <h1 className="compat-intro-title">사주 궁합</h1>
        <p className="compat-intro-desc">두 사람의 사주팔자로 운명의 궁합을 분석합니다</p>
      </section>

      <div className="compat-form glass-card">
        {/* Person 1 */}
        <div className="compat-form-section">
          <div className="compat-form-top">
            <div className="compat-form-gender-toggle">
              <button className={`compat-g-btn compat-g-male ${g1 === 'M' ? 'active' : ''}`} onClick={() => setG1('M')}>♂ 남</button>
              <button className={`compat-g-btn compat-g-female ${g1 === 'F' ? 'active' : ''}`} onClick={() => setG1('F')}>♀ 여</button>
            </div>
          </div>
          <input type="date" className="compat-input" value={bd1} onChange={e => setBd1(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          <select className="compat-input compat-select" value={bt1} onChange={e => setBt1(e.target.value)}>
            {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="compat-form-divider">
          <span>❤</span>
        </div>

        {/* Person 2 */}
        <div className="compat-form-section">
          <div className="compat-form-top">
            <div className="compat-form-gender-toggle">
              <button className={`compat-g-btn compat-g-male ${g2 === 'M' ? 'active' : ''}`} onClick={() => setG2('M')}>♂ 남</button>
              <button className={`compat-g-btn compat-g-female ${g2 === 'F' ? 'active' : ''}`} onClick={() => setG2('F')}>♀ 여</button>
            </div>
          </div>
          <input type="date" className="compat-input" value={bd2} onChange={e => setBd2(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          <select className="compat-input compat-select" value={bt2} onChange={e => setBt2(e.target.value)}>
            {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <button className="compat-submit" onClick={handleAnalyze} disabled={!bd1 || !bd2}>
          💕 궁합 분석하기
        </button>
      </div>
    </div>
  );
}

export default Compatibility;
