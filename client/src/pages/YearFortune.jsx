import { useState, useRef } from 'react';
import api from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import BirthDatePicker from '../components/BirthDatePicker';
import './YearFortune.css';

const BIRTH_TIMES = [
  { value: '', label: '모름 / 선택안함' },
  { value: '자시', label: '자시 (23:00~01:00)' },
  { value: '축시', label: '축시 (01:00~03:00)' },
  { value: '인시', label: '인시 (03:00~05:00)' },
  { value: '묘시', label: '묘시 (05:00~07:00)' },
  { value: '진시', label: '진시 (07:00~09:00)' },
  { value: '사시', label: '사시 (09:00~11:00)' },
  { value: '오시', label: '오시 (11:00~13:00)' },
  { value: '미시', label: '미시 (13:00~15:00)' },
  { value: '신시', label: '신시 (15:00~17:00)' },
  { value: '유시', label: '유시 (17:00~19:00)' },
  { value: '술시', label: '술시 (19:00~21:00)' },
  { value: '해시', label: '해시 (21:00~23:00)' },
];

const QUARTER_LABELS = ['1분기 (1~3월)', '2분기 (4~6월)', '3분기 (7~9월)', '4분기 (10~12월)'];
const QUARTER_ICONS = ['🌸', '☀️', '🍂', '❄️'];

function getScoreColor(score) {
  if (score >= 85) return '#ff3d7f';
  if (score >= 70) return '#fbbf24';
  if (score >= 55) return '#4ade80';
  return '#94a3b8';
}

function getGradeLabel(score) {
  if (score >= 90) return '대길';
  if (score >= 75) return '길';
  if (score >= 55) return '보통';
  return '흉';
}

function YearFortune() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('solar');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const handleAutofill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBirthDate(p.birthDate);
      if (p.gender) setGender(p.gender);
      if (p.birthTime) setBirthTime(p.birthTime);
      if (p.calendarType) setCalendarType(p.calendarType);
    } catch {}
  };

  const handleAnalyze = async () => {
    if (!birthDate) return;
    setLoading(true);
    setResult(null);
    try {
      const params = { birthDate };
      if (birthTime) params.birthTime = birthTime;
      if (gender) params.gender = gender;
      if (calendarType) params.calendarType = calendarType;
      const response = await api.get('/year-fortune', { params });
      setResult(response.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) {
      console.error('신년운세 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!result) return;
    const text = `🎊 2026 신년운세\n\n종합 점수: ${rScore}점 (${rGrade})\n${rTheme}\n\n${result.summary || ''}\n\n사주운세 앱에서 나의 2026 운세를 확인해보세요!`;
    if (navigator.share) {
      navigator.share({ title: '2026 신년운세', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('결과가 복사되었습니다!');
    }
  };

  const resetAll = () => {
    setResult(null);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const circumference = 2 * Math.PI * 52; // ~326.7
  const rScore = result ? (result.overallScore ?? result.score ?? 0) : 0;
  const rGrade = result ? (result.overallGrade || result.grade || getGradeLabel(rScore)) : '';
  const rTheme = result ? (result.yearTheme || result.theme || '도약의 해') : '';
  const rThemeEmoji = result ? (result.yearEmoji || result.themeEmoji || '🐴') : '';
  const rQuarters = result ? (result.quarterly || result.quarters) : null;
  const rAdvice = result ? (result.yearAdvice || result.advice) : '';

  return (
    <div className="yf-page">
      {/* 배경 효과 */}
      <div className="yf-bg">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} className="yf-sparkle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            fontSize: `${Math.random() * 6 + 3}px`,
          }}>&#10022;</span>
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={`fw-${i}`} className="yf-firework" style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 40}%`,
            animationDelay: `${i * 0.7}s`,
          }} />
        ))}
      </div>

      {/* 히어로 */}
      <div className="yf-hero">
        <div className="yf-hero-glow" />
        <div className="yf-hero-icon">🎊</div>
        <h1 className="yf-title">2026 신년운세</h1>
        <p className="yf-subtitle">병오년, 새해의 운명을 미리 확인하세요</p>
      </div>

      {/* 입력 폼 */}
      {!result && !loading && (
        <div className="yf-form glass-card fade-in">
          {localStorage.getItem('userId') && (
            <button className="sf-autofill-btn" onClick={handleAutofill}>
              &#10024; 내 정보로 채우기
            </button>
          )}

          <div className="yf-form-group">
            <label className="yf-label">생년월일</label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
          </div>

          <div className="yf-form-group">
            <label className="yf-label">태어난 시간</label>
            <select className="yf-input yf-select" value={birthTime} onChange={e => setBirthTime(e.target.value)}>
              {BIRTH_TIMES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="yf-form-group">
            <label className="yf-label">달력 유형</label>
            <div className="yf-toggle">
              <button className={`yf-toggle-btn ${calendarType === 'solar' ? 'active' : ''}`} onClick={() => setCalendarType('solar')}>
                &#9788; 양력
              </button>
              <button className={`yf-toggle-btn ${calendarType === 'lunar' ? 'active' : ''}`} onClick={() => setCalendarType('lunar')}>
                &#9789; 음력
              </button>
            </div>
          </div>

          <div className="yf-form-group">
            <label className="yf-label">성별</label>
            <div className="yf-toggle">
              <button className={`yf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>
                &#9794; 남성
              </button>
              <button className={`yf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>
                &#9792; 여성
              </button>
            </div>
          </div>

          <button className="yf-submit" onClick={handleAnalyze} disabled={!birthDate}>
            🎊 2026 운세 보기
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="yf-loading">
          <div className="yf-loading-fireworks">
            {[0, 1, 2].map(i => (
              <span key={i} className="yf-loading-burst" style={{ animationDelay: `${i * 0.4}s` }}>&#127878;</span>
            ))}
          </div>
          <p className="yf-loading-text">2026년 운세를 분석하고 있습니다<span className="yf-dots" /></p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="yf-result fade-in" ref={resultRef}>
          {/* 테마 배지 */}
          <div className="yf-theme-badge glass-card">
            <span className="yf-theme-emoji">{rThemeEmoji}</span>
            <span className="yf-theme-text">{rTheme}</span>
          </div>

          {/* 종합 점수 원형 */}
          <div className="yf-score-card glass-card">
            <div className="yf-score-circle">
              <svg viewBox="0 0 120 120" width="150" height="150">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={getScoreColor(rScore)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * rScore) / 100}
                  transform="rotate(-90 60 60)"
                  className="yf-score-ring"
                />
              </svg>
              <div className="yf-score-inner">
                <span className="yf-score-num">{rScore}</span>
                <span className="yf-score-unit">점</span>
              </div>
            </div>
            <span className="yf-grade" style={{ color: getScoreColor(rScore) }}>
              {rGrade}
            </span>
          </div>

          {/* 요약 */}
          {result.summary && (
            <div className="yf-summary glass-card">
              <p>{result.summary}</p>
            </div>
          )}

          {/* 분기별 타임라인 */}
          {rQuarters && rQuarters.length > 0 && (
            <div className="yf-section">
              <h3 className="yf-section-title"><span>&#128197;</span> 분기별 운세</h3>
              <div className="yf-quarters-grid">
                {rQuarters.map((q, i) => (
                  <div key={i} className="yf-quarter-card glass-card" style={{ '--q-color': getScoreColor(q.score) }}>
                    <span className="yf-quarter-icon">{QUARTER_ICONS[i]}</span>
                    <span className="yf-quarter-label">{QUARTER_LABELS[i]}</span>
                    <div className="yf-quarter-score-bar">
                      <div className="yf-quarter-score-fill" style={{ width: `${q.score}%`, background: getScoreColor(q.score) }} />
                    </div>
                    <span className="yf-quarter-score">{q.score}점</span>
                    <span className="yf-quarter-keyword">{q.keyword || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 운세 카드들 */}
          <div className="yf-section">
            <h3 className="yf-section-title"><span>&#128302;</span> 영역별 운세</h3>
            {result.love && <FortuneCard icon="💕" title="애정운" description={result.love} delay={0} />}
            {result.money && <FortuneCard icon="💰" title="재물운" description={result.money} delay={80} />}
            {result.career && <FortuneCard icon="💼" title="직장운" description={result.career} delay={160} />}
            {result.health && <FortuneCard icon="💚" title="건강운" description={result.health} delay={240} />}
            {result.relationship && <FortuneCard icon="🤝" title="대인관계운" description={result.relationship} delay={320} />}
          </div>

          {/* 행운의 달 / 주의 달 */}
          {(result.luckyMonths || result.cautionMonths) && (
            <div className="yf-months glass-card">
              {result.luckyMonths && (
                <div className="yf-months-row">
                  <span className="yf-months-label">&#10024; 행운의 달</span>
                  <div className="yf-months-badges">
                    {(Array.isArray(result.luckyMonths) ? result.luckyMonths : [result.luckyMonths]).map((m, i) => (
                      <span key={i} className="yf-month-badge yf-month-badge--lucky">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.cautionMonths && (
                <div className="yf-months-row">
                  <span className="yf-months-label">&#9888;&#65039; 주의 달</span>
                  <div className="yf-months-badges">
                    {(Array.isArray(result.cautionMonths) ? result.cautionMonths : [result.cautionMonths]).map((m, i) => (
                      <span key={i} className="yf-month-badge yf-month-badge--caution">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 럭키 정보 */}
          {(result.luckyColor || result.luckyNumber || result.luckyDirection) && (
            <div className="yf-lucky glass-card">
              {result.luckyColor && (
                <div className="yf-lucky-item">
                  <span className="yf-lucky-label">행운의 색</span>
                  <span className="yf-lucky-value">{result.luckyColor}</span>
                </div>
              )}
              {result.luckyNumber && (
                <div className="yf-lucky-item">
                  <span className="yf-lucky-label">행운의 수</span>
                  <span className="yf-lucky-value">{result.luckyNumber}</span>
                </div>
              )}
              {result.luckyDirection && (
                <div className="yf-lucky-item">
                  <span className="yf-lucky-label">행운의 방위</span>
                  <span className="yf-lucky-value">{result.luckyDirection}</span>
                </div>
              )}
            </div>
          )}

          {/* 한해 조언 */}
          {rAdvice && (
            <FortuneCard icon="💡" title="2026년 조언" description={rAdvice} delay={400} />
          )}

          {/* 읽어주기 */}
          <div className="yf-speech-area">
            <SpeechButton
              label="신년운세 읽어주기"
              text={[
                '2026 신년운세 결과입니다.',
                `종합 점수 ${rScore}점, ${rGrade}입니다.`,
                result.summary,
                result.love ? `애정운. ${result.love}` : '',
                result.money ? `재물운. ${result.money}` : '',
                result.career ? `직장운. ${result.career}` : '',
                result.health ? `건강운. ${result.health}` : '',
                rAdvice ? `조언. ${rAdvice}` : '',
              ].filter(Boolean).join(' ')}
              summaryText={[
                `2026 신년운세 ${rScore}점, ${rGrade}.`,
                result.summary,
              ].filter(Boolean).join(' ')}
            />
          </div>

          {/* 액션 버튼 */}
          <div className="yf-actions">
            <button className="yf-action-btn yf-share-btn" onClick={handleShare}>
              <span>&#128228;</span> 공유하기
            </button>
            <button className="yf-action-btn yf-reset-btn" onClick={resetAll}>
              <span>&#128260;</span> 다시 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default YearFortune;
