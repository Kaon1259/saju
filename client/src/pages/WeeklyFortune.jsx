import { useState, useRef, useEffect } from 'react';
import { getWeeklyFortuneStream } from '../api/fortune';
import parseAiJson from '../utils/parseAiJson';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';
import BirthDatePicker from '../components/BirthDatePicker';
import StreamText from '../components/StreamText';
import HeartCost from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './WeeklyFortune.css';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

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

function getScoreColor(score) {
  if (score >= 85) return '#ff3d7f';
  if (score >= 70) return '#fbbf24';
  if (score >= 55) return '#4ade80';
  return '#94a3b8';
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)} ~ ${fmt(sunday)}`;
}

function WeeklyFortune() {
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const daysScrollRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  const handleAutofill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBirthDate(p.birthDate);
      if (p.gender) setGender(p.gender);
      if (p.birthTime) setBirthTime(p.birthTime);
      if (p.calendarType) setCalendarType(p.calendarType);
    } catch {}
  };

  const handleAnalyze = () => {
    if (!birthDate) return;
    setLoading(true);
    setStreaming(false);
    setStreamText('');
    setResult(null);
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    let firstChunk = true;
    cleanupRef.current = getWeeklyFortuneStream(birthDate, birthTime, gender, {
      onCached: (data) => {
        setResult(data);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        setStreamText(prev => prev + chunk);
      },
      onDone: (fullText) => {
        setStreaming(false);
        setStreamText('');
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        {
          const parsed = parseAiJson(fullText);
          if (parsed) {
            setResult(parsed);
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          }
        }
        setLoading(false);
      },
      onError: (err) => {
        console.error('주간운세 스트림 실패:', err);
        setLoading(false);
        setStreaming(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
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
  const weekRange = getWeekRange();

  // 최고/주의 요일 판별
  const bestDayName = result?.bestDay || '';
  const cautionDayName = result?.cautionDay || '';

  return (
    <div className="wf-page">
      {/* 배경 */}
      <div className="wf-bg">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="wf-grid-dot" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
          }} />
        ))}
      </div>

      {/* 히어로 */}
      <div className="wf-hero">
        <div className="wf-hero-glow" />
        <div className="wf-hero-icon">&#128198;</div>
        <h1 className="wf-title">이번 주 운세</h1>
        <p className="wf-subtitle">{weekRange}</p>
      </div>

      {/* 입력 폼 */}
      {!result && !loading && (
        <div className="wf-form glass-card fade-in">
          {localStorage.getItem('userId') && (
            <button className="sf-autofill-btn" onClick={handleAutofill}>
              &#10024; 내 정보로 채우기
            </button>
          )}

          <div className="wf-form-group">
            <label className="wf-label">달력 구분</label>
            <div className="wf-toggle">
              <button type="button" className={`wf-toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button>
              <button type="button" className={`wf-toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button>
            </div>
          </div>

          <div className="wf-form-group">
            <label className="wf-label">생년월일</label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
          </div>

          <div className="wf-form-group">
            <label className="wf-label">성별</label>
            <div className="wf-toggle">
              <button className={`wf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>
                <span className="g-circle g-male">♂</span>
              </button>
              <button className={`wf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>
                <span className="g-circle g-female">♀</span>
              </button>
            </div>
          </div>

          <div className="wf-form-group">
            <label className="wf-label">태어난 시간 (선택)</label>
            <select className="wf-input wf-select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>
              {BIRTH_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <button className="wf-submit" onClick={handleAnalyze} disabled={!birthDate}>
            &#128198; 이번 주 운세 보기 <HeartCost category="WEEKLY_FORTUNE" />
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && !streaming && (
        <div className="wf-loading">
          <div className="wf-loading-cal">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="wf-loading-day" style={{ animationDelay: `${i * 0.15}s` }}>{d}</span>
            ))}
          </div>
          <p className="wf-loading-text">AI가 이번 주 운세를 분석하고 있어요<span className="wf-dots" /></p>
        </div>
      )}

      {/* 스트리밍 중 */}
      {streaming && (
        <StreamText text={streamText} icon="📅" label="AI가 이번 주 운세를 분석하고 있어요..." color="#34D399" />
      )}

      {/* 결과 */}
      {result && (
        <div className="wf-result fade-in" ref={resultRef}>
          {/* 주간 헤더 */}
          <div className="wf-result-header glass-card">
            <div className="wf-result-header-top">
              <span className="wf-result-range">{result.weekRange || weekRange}</span>
              {result.theme && <span className="wf-result-theme">{result.themeEmoji || '📋'} {result.theme}</span>}
            </div>
          </div>

          {/* 종합 점수 */}
          <div className="wf-score-card glass-card">
            <div className="wf-score-circle">
              <svg viewBox="0 0 120 120" width="150" height="150">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={getScoreColor(result.overallScore ?? result.score)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * ((result.overallScore ?? result.score) || 0)) / 100}
                  transform="rotate(-90 60 60)"
                  className="wf-score-ring"
                />
              </svg>
              <div className="wf-score-inner">
                <span className="wf-score-num">{(result.overallScore ?? result.score) || 0}</span>
                <span className="wf-score-unit">점</span>
              </div>
            </div>
            <span className="wf-grade" style={{ color: getScoreColor(result.overallScore ?? result.score) }}>
              {result.grade || ''}
            </span>
          </div>

          {/* 요약 */}
          {result.summary && (
            <div className="wf-summary glass-card">
              <p>{result.summary}</p>
            </div>
          )}

          {/* 7일 타임라인 */}
          {result.days && result.days.length > 0 && (
            <div className="wf-section">
              <h3 className="wf-section-title"><span>&#128197;</span> 요일별 운세</h3>
              <div className="wf-days-scroll" ref={daysScrollRef}>
                {result.days.map((day, i) => {
                  const isBest = day.dayLabel === bestDayName || day.day === bestDayName;
                  const isCaution = day.dayLabel === cautionDayName || day.day === cautionDayName;
                  const scoreColor = getScoreColor(day.score);
                  return (
                    <div
                      key={i}
                      className={`wf-day-card glass-card ${isBest ? 'wf-day--best' : ''} ${isCaution ? 'wf-day--caution' : ''}`}
                    >
                      {isBest && <span className="wf-day-badge wf-day-badge--best">BEST</span>}
                      {isCaution && <span className="wf-day-badge wf-day-badge--caution">&#9888;</span>}
                      <span className="wf-day-label">{day.dayLabel || DAY_LABELS[i] || ''}</span>
                      <span className="wf-day-date">{day.date || ''}</span>
                      <div className="wf-day-score-bar">
                        <div className="wf-day-score-fill" style={{ height: `${day.score}%`, background: scoreColor }} />
                      </div>
                      <span className="wf-day-score" style={{ color: scoreColor }}>{day.score}</span>
                      <span className="wf-day-keyword">{day.keyword || ''}</span>
                      {day.tip && <span className="wf-day-tip">{day.tip}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 운세 카드들 */}
          {result.love && <FortuneCard icon="💕" title="애정운" description={result.love} delay={0} />}
          {result.money && <FortuneCard icon="💰" title="재물운" description={result.money} delay={80} />}
          {result.career && <FortuneCard icon="💼" title="직장운" description={result.career} delay={160} />}

          {/* 조언 */}
          {result.advice && (
            <FortuneCard icon="💡" title="이번 주 조언" description={result.advice} delay={240} />
          )}

          {/* 심화분석 */}
          {birthDate && (
            <DeepAnalysis type="weekly" birthDate={birthDate} birthTime={birthTime} gender={gender} calendarType={calendarType} />
          )}

          {/* 리셋 */}
          <button className="wf-reset" onClick={resetAll}>
            &#128260; 다시 보기
          </button>
        </div>
      )}
    </div>
  );
}

export default WeeklyFortune;
