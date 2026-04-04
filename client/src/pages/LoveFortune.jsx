import { useState, useRef } from 'react';
import { getSpecialLoveFortune } from '../api/fortune';
import SpeechButton from '../components/SpeechButton';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import FortuneLoading from '../components/FortuneLoading';
import './LoveFortune.css';

const RELATION_STATUSES = [
  { value: 'SINGLE', label: '솔로', icon: '💫', desc: '설레는 인연을 기다리는 중' },
  { value: 'SOME', label: '썸', icon: '💗', desc: '미묘한 감정, 이건 뭘까?' },
  { value: 'IN_RELATIONSHIP', label: '연애중', icon: '💕', desc: '사랑하는 사람이 있어요' },
  { value: 'COMPLICATED', label: '복잡', icon: '💔', desc: '복잡 미묘한 사이...' },
];

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  const sat = 30 + s * 0.7;
  const light = 85 - s * 0.4;
  return `hsl(340, ${sat}%, ${light}%)`;
}

function FloatingHearts({ score }) {
  const color = getHeartColor(score);
  const count = Math.max(3, Math.floor((score || 50) / 12));
  return (
    <div className="lf-hearts-container">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="lf-floating-heart" style={{
          '--heart-color': color,
          '--float-delay': `${i * 0.4}s`,
          '--float-duration': `${2 + Math.random() * 2}s`,
          '--heart-x': `${10 + Math.random() * 80}%`,
          '--heart-size': `${12 + Math.random() * 14}px`,
        }}>&#x2764;</span>
      ))}
    </div>
  );
}

function LoveFortune() {
  const userId = localStorage.getItem('userId');
  const [relationStatus, setRelationStatus] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  // 로그인 유저는 프로필에서 자동 로드
  const handleAutoFill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBirthDate(p.birthDate);
      if (p.gender) setGender(p.gender);
      if (p.relationshipStatus) setRelationStatus(p.relationshipStatus);
    } catch {}
  };

  const handleAnalyze = async () => {
    if (!birthDate || !relationStatus) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await getSpecialLoveFortune(
        'relationship', birthDate, null, gender || null, null,
        null, null, null, null, relationStatus
      );
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const heartColor = result?.score ? getHeartColor(result.score) : '#ffc0cb';
  const statusInfo = RELATION_STATUSES.find(r => r.value === relationStatus);

  return (
    <div className="lf-page">
      {/* 히어로 */}
      <section className="lf-hero">
        <div className="lf-hero-bg" />
        <div className="lf-hero-couple">
          <span className="lf-sym lf-sym--m">♂</span>
          <div className="lf-hero-bond">
            <span className="lf-bond-heart">♥</span>
            {[...Array(5)].map((_, i) => <span key={i} className="lf-hero-sparkle" style={{ '--sp-i': i }}>✦</span>)}
          </div>
          <span className="lf-sym lf-sym--f">♀</span>
        </div>
        <h1 className="lf-title">1:1 연애운</h1>
        <p className="lf-subtitle">두근두근, 오늘 나의 연애 기운은?</p>
      </section>

      {/* 입력 폼 */}
      {!result && !loading && (
        <div className="lf-form fade-in">
          {userId && (
            <button className="lf-autofill-btn" onClick={handleAutoFill}>✨ 내 정보로 채우기</button>
          )}

          {/* 연애 상태 */}
          <div className="lf-form-group">
            <label className="lf-label">지금 연애 상태는?</label>
            <div className="lf-status-grid">
              {RELATION_STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`lf-status-chip ${relationStatus === s.value ? 'active' : ''}`}
                  onClick={() => setRelationStatus(s.value)}
                >
                  <span className="lf-status-icon">{s.icon}</span>
                  <span className="lf-status-label">{s.label}</span>
                  <span className="lf-status-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div className="lf-form-group">
            <label className="lf-label">생년월일</label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} />
          </div>

          {/* 성별 */}
          <div className="lf-form-group">
            <label className="lf-label">성별</label>
            <div className="lf-toggle">
              <button className={`lf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>
                <span className="g-circle g-male">♂</span>
              </button>
              <button className={`lf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>
                <span className="g-circle g-female">♀</span>
              </button>
            </div>
          </div>

          <button className="lf-submit" onClick={handleAnalyze} disabled={!birthDate || !relationStatus}>
            💕 오늘의 연애운 보기
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <FortuneLoading type="love" />
      )}

      {/* 결과 */}
      {result && (
        <div className="lf-result fade-in" ref={resultRef} style={{ '--heart-color': heartColor }}>
          <div className="lf-speech-area">
            <SpeechButton label="연애운 읽어주기"
              text={[`오늘의 연애운 결과입니다.`, `점수는 ${result.score}점, ${result.grade}입니다.`, result.overall, result.timing, result.advice, result.caution].filter(Boolean).join(' ')}
              summaryText={`연애운 ${result.score}점, ${result.grade}. ${(result.overall||'').split('.').slice(0,2).join('.')}.`} />
          </div>

          {/* 하트 점수 */}
          <div className="lf-heart-score-card">
            <FloatingHearts score={result.score} />
            <div className="lf-heart-aura" style={{ background: `radial-gradient(circle, ${heartColor}, transparent 70%)` }} />
            <div className="lf-heart-center">
              <span className="lf-heart-big" style={{ color: heartColor }}>&#x2764;</span>
              <span className="lf-heart-num">{result.score}</span>
              <span className="lf-heart-unit">점</span>
            </div>
            <span className="lf-heart-grade" style={{ color: GRADE_COLORS[result.grade] || heartColor }}>{result.grade}</span>
            {statusInfo && <span className="lf-heart-status">{statusInfo.icon} {statusInfo.label}</span>}
          </div>

          <FortuneCard icon="💕" title="종합 분석" description={result.overall} delay={0} />
          {result.timing && <FortuneCard icon="📅" title="최적 시기" description={result.timing} delay={80} />}
          {result.advice && <FortuneCard icon="💡" title="행동 조언" description={result.advice} delay={160} />}
          {result.caution && <FortuneCard icon="⚠️" title="주의사항" description={result.caution} delay={240} />}

          <div className="lf-lucky">
            {result.luckyDay && <div className="lf-lucky-item"><span className="lf-lucky-label">행운의 날</span><span className="lf-lucky-value">{result.luckyDay}</span></div>}
            {result.luckyPlace && <div className="lf-lucky-item"><span className="lf-lucky-label">행운의 장소</span><span className="lf-lucky-value">{result.luckyPlace}</span></div>}
            {result.luckyColor && <div className="lf-lucky-item"><span className="lf-lucky-label">행운의 색</span><span className="lf-lucky-value">{result.luckyColor}</span></div>}
          </div>

          <button className="lf-reset" onClick={() => { setResult(null); setBirthDate(''); setRelationStatus(''); }}>🔄 다시 보기</button>
        </div>
      )}
    </div>
  );
}

export default LoveFortune;
