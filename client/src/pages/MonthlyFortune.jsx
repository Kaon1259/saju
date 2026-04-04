import { useState, useRef, useEffect } from 'react';
import { getMonthlyFortuneStream } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';
import SpeechButton from '../components/SpeechButton';
import BirthDatePicker from '../components/BirthDatePicker';
import StreamText from '../components/StreamText';
import './MonthlyFortune.css';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

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

function getSeasonClass(month) {
  if (month >= 3 && month <= 5) return 'mf-season--spring';
  if (month >= 6 && month <= 8) return 'mf-season--summer';
  if (month >= 9 && month <= 11) return 'mf-season--autumn';
  return 'mf-season--winter';
}

function getSeasonEmoji(month) {
  if (month >= 3 && month <= 5) return '🌸';
  if (month >= 6 && month <= 8) return '☀️';
  if (month >= 9 && month <= 11) return '🍂';
  return '❄️';
}

function getScoreColor(score) {
  if (score >= 85) return '#ff3d7f';
  if (score >= 70) return '#fbbf24';
  if (score >= 55) return '#4ade80';
  return '#94a3b8';
}

function MonthlyFortune() {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [birthTime, setBirthTime] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const handleAutofill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBirthDate(p.birthDate);
      if (p.gender) setGender(p.gender);
      if (p.calendarType) setCalendarType(p.calendarType);
      if (p.birthTime) setBirthTime(p.birthTime);
    } catch {}
  };

  const handleAnalyze = (month) => {
    const m = month || selectedMonth;
    if (!birthDate) return;
    setLoading(true);
    setStreaming(false);
    setStreamText('');
    setResult(null);
    cleanupRef.current?.();

    let firstChunk = true;
    cleanupRef.current = getMonthlyFortuneStream(birthDate, m, birthTime, gender, {
      onCached: (data) => {
        setResult({ ...data, month: m });
        setLoading(false);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        setStreamText(prev => prev + chunk);
      },
      onDone: (fullText) => {
        setStreaming(false);
        setStreamText('');
        try {
          const json = fullText.match(/\{[\s\S]*\}/)?.[0];
          if (json) {
            const parsed = JSON.parse(json);
            setResult({ ...parsed, month: m });
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          }
        } catch (e) {
          console.error('월별운세 파싱 실패:', e);
        }
        setLoading(false);
      },
      onError: (err) => {
        console.error('월별운세 스트림 실패:', err);
        setLoading(false);
        setStreaming(false);
      },
    });
  };

  const handleMonthNav = (direction) => {
    const newMonth = direction === 'prev'
      ? (selectedMonth === 1 ? 12 : selectedMonth - 1)
      : (selectedMonth === 12 ? 1 : selectedMonth + 1);
    setSelectedMonth(newMonth);
    handleAnalyze(newMonth);
  };

  const resetAll = () => {
    cleanupRef.current?.();
    setResult(null);
    setLoading(false);
    setStreaming(false);
    setStreamText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const circumference = 2 * Math.PI * 52;
  const seasonClass = getSeasonClass(result?.month || selectedMonth);

  return (
    <div className={`mf-page ${seasonClass}`}>
      {/* 배경 */}
      <div className="mf-bg">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="mf-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${Math.random() * 5 + 3}px`,
          }}>&#10022;</span>
        ))}
      </div>

      {/* 히어로 */}
      <div className="mf-hero">
        <div className="mf-hero-glow" />
        <div className="mf-hero-icon">&#128197;</div>
        <h1 className="mf-title">월별 운세</h1>
        <p className="mf-subtitle">매달의 운세 흐름을 확인하세요</p>
      </div>

      {/* 입력 폼 */}
      {!result && !loading && (
        <div className="mf-form-section fade-in">
          {/* 월 선택 그리드 */}
          <div className="mf-month-grid">
            {MONTHS.map(m => (
              <button
                key={m}
                className={`mf-month-btn ${selectedMonth === m ? 'active' : ''} ${m === currentMonth ? 'current' : ''}`}
                onClick={() => setSelectedMonth(m)}
              >
                <span className="mf-month-num">{m}</span>
                <span className="mf-month-label">월</span>
                {m === currentMonth && <span className="mf-month-now">NOW</span>}
              </button>
            ))}
          </div>

          <div className="mf-form glass-card">
            {localStorage.getItem('userId') && (
              <button className="sf-autofill-btn" onClick={handleAutofill}>
                &#10024; 내 정보로 채우기
              </button>
            )}

            <div className="mf-form-group">
              <label className="mf-label">달력 구분</label>
              <div className="mf-toggle">
                <button type="button" className={`mf-toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button>
                <button type="button" className={`mf-toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button>
              </div>
            </div>

            <div className="mf-form-group">
              <label className="mf-label">생년월일</label>
              <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
            </div>

            <div className="mf-form-group">
              <label className="mf-label">성별</label>
              <div className="mf-toggle">
                <button className={`mf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>
                  <span className="g-circle g-male">♂</span>
                </button>
                <button className={`mf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>
                  <span className="g-circle g-female">♀</span>
                </button>
              </div>
            </div>

            <div className="mf-form-group">
              <label className="mf-label">태어난 시간 (선택)</label>
              <select className="mf-input mf-select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>
                {BIRTH_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <button className="mf-submit" onClick={() => handleAnalyze()} disabled={!birthDate}>
              {getSeasonEmoji(selectedMonth)} {selectedMonth}월 운세 보기
            </button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && !streaming && (
        <div className="mf-loading">
          <div className="mf-loading-icon">{getSeasonEmoji(selectedMonth)}</div>
          <p className="mf-loading-text">AI가 {selectedMonth}월 운세를 분석하고 있어요<span className="mf-dots" /></p>
        </div>
      )}

      {/* 스트리밍 중 */}
      {streaming && (
        <StreamText text={streamText} icon="📅" label="AI가 이번 달 운세를 분석하고 있어요..." color="#9B59B6" />
      )}

      {/* 결과 */}
      {result && (
        <div className="mf-result fade-in" ref={resultRef}>
          {/* 월 헤더 */}
          <div className="mf-result-header glass-card">
            <span className="mf-result-season-icon">{getSeasonEmoji(result.month)}</span>
            <div className="mf-result-header-text">
              <h2 className="mf-result-month">{result.month}월</h2>
              {result.pillar && <span className="mf-result-pillar">{result.pillar}</span>}
            </div>
            {result.theme && (
              <span className="mf-result-theme-badge">{result.theme}</span>
            )}
          </div>

          {/* 점수 원형 */}
          <div className="mf-score-card glass-card">
            <div className="mf-score-circle">
              <svg viewBox="0 0 120 120" width="150" height="150">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={getScoreColor(result.score)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * (result.score || 0)) / 100}
                  transform="rotate(-90 60 60)"
                  className="mf-score-ring"
                />
              </svg>
              <div className="mf-score-inner">
                <span className="mf-score-num">{result.score || 0}</span>
                <span className="mf-score-unit">점</span>
              </div>
            </div>
            <span className="mf-grade" style={{ color: getScoreColor(result.score) }}>
              {result.grade || ''}
            </span>
          </div>

          {/* 종합 분석 */}
          {result.overall && (
            <FortuneCard icon={getSeasonEmoji(result.month)} title="총운" description={result.overall} delay={0} />
          )}

          {/* 운세 카드들 */}
          {result.love && <FortuneCard icon="💕" title="애정운" description={result.love} delay={80} />}
          {result.money && <FortuneCard icon="💰" title="재물운" description={result.money} delay={160} />}
          {result.career && <FortuneCard icon="💼" title="직장운" description={result.career} delay={240} />}
          {result.health && <FortuneCard icon="💚" title="건강운" description={result.health} delay={320} />}

          {/* 좋은 주 / 주의 주 */}
          {(result.bestWeek || result.cautionWeek) && (
            <div className="mf-weeks glass-card">
              {result.bestWeek && (
                <div className="mf-week-item mf-week--best">
                  <span className="mf-week-icon">&#10024;</span>
                  <div>
                    <span className="mf-week-label">최고의 주</span>
                    <span className="mf-week-value">{result.bestWeek}</span>
                  </div>
                </div>
              )}
              {result.cautionWeek && (
                <div className="mf-week-item mf-week--caution">
                  <span className="mf-week-icon">&#9888;&#65039;</span>
                  <div>
                    <span className="mf-week-label">주의 주간</span>
                    <span className="mf-week-value">{result.cautionWeek}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 행운의 날 */}
          {result.luckyDay && (
            <div className="mf-lucky-day glass-card">
              <span className="mf-lucky-day-icon">&#128197;</span>
              <span className="mf-lucky-day-label">행운의 날</span>
              <span className="mf-lucky-day-value">{result.luckyDay}</span>
            </div>
          )}

          {/* 조언 */}
          {result.advice && (
            <FortuneCard icon="💡" title={`${result.month}월 조언`} description={result.advice} delay={400} />
          )}

          {/* 읽어주기 */}
          <div className="mf-speech-area">
            <SpeechButton
              label={`${result.month}월 운세 읽어주기`}
              text={[
                `${result.month}월 운세 결과입니다.`,
                `점수 ${result.score}점, ${result.grade}입니다.`,
                result.overall,
                result.love ? `애정운. ${result.love}` : '',
                result.money ? `재물운. ${result.money}` : '',
                result.career ? `직장운. ${result.career}` : '',
                result.health ? `건강운. ${result.health}` : '',
                result.advice ? `조언. ${result.advice}` : '',
              ].filter(Boolean).join(' ')}
              summaryText={[
                `${result.month}월 운세 ${result.score}점, ${result.grade}.`,
                result.overall,
              ].filter(Boolean).join(' ')}
            />
          </div>

          {/* 심화분석 */}
          {birthDate && (
            <DeepAnalysis type="monthly" birthDate={birthDate} birthTime={birthTime} gender={gender} calendarType={calendarType} />
          )}

          {/* 월 이동 버튼 */}
          <div className="mf-nav">
            <button className="mf-nav-btn" onClick={() => handleMonthNav('prev')}>
              &#9664; {selectedMonth === 1 ? 12 : selectedMonth - 1}월
            </button>
            <span className="mf-nav-current">{result.month}월</span>
            <button className="mf-nav-btn" onClick={() => handleMonthNav('next')}>
              {selectedMonth === 12 ? 1 : selectedMonth + 1}월 &#9654;
            </button>
          </div>

          {/* 리셋 */}
          <button className="mf-reset" onClick={resetAll}>
            &#128260; 다시 보기
          </button>
        </div>
      )}
    </div>
  );
}

export default MonthlyFortune;
