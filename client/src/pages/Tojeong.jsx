import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTojeongStream } from '../api/fortune';
import DeepAnalysis from '../components/DeepAnalysis';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import parseAiJson from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './Tojeong.css';

const RATING_STYLE = {
  '대길': { bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  '길': { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  '보통': { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  '흉': { bg: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'rgba(248,113,113,0.3)' },
  '대흉': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function Tojeong() {
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [birthDate, setBirthDate] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  const baseRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  const userId = localStorage.getItem('userId');
  const location = useLocation();
  const autoLoad = localStorage.getItem('autoFortune') === 'on' || location.state?.autoLoad;

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  // 결과 등장 시 매트릭스 페이드아웃
  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);

  const loadUserTojeong = () => {
    if (!userId) return;
    setShowInput(false);
    setLoading(true);
    setStreaming(false);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    let userBirthDate = '';
    let userCalendarType = 'SOLAR';
    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (profile.birthDate) { userBirthDate = profile.birthDate; setBirthDate(profile.birthDate); }
      if (profile.calendarType) { userCalendarType = profile.calendarType; setCalendarType(profile.calendarType); }
    } catch {}

    if (!userBirthDate) { setShowInput(true); setLoading(false); setMatrixShown(false); return; }

    let firstChunk = true;
    cleanupRef.current = getTojeongStream(userBirthDate, userCalendarType, {
      onCached: (data) => {
        setResult(data);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
      onBase: (base) => {
        // 기본 계산값(sangsu/jungsu/hasu/totalGwae/gwaeName/monthlyFortunes) 먼저 저장
        baseRef.current = base;
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        setStreamText(prev => prev + chunk);
      },
      onDone: (fullText) => {
        setStreaming(false);
        setStreamText('');
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        const parsed = parseAiJson(fullText);
        const base = baseRef.current || {};
        if (parsed) {
          // AI 월별 운세 배열과 base 월별 배열 병합 (AI가 더 풍부하면 사용)
          const aiMonths = parsed.months || parsed.monthlyFortunes || [];
          const baseMonths = base.monthlyFortunes || [];
          const mergedMonths = baseMonths.length === 12
            ? baseMonths.map((bm, i) => {
                const am = aiMonths.find(x => Number(x.month) === i + 1) || aiMonths[i];
                return {
                  ...bm,
                  fortune: am?.fortune || bm.fortune,
                  rating: am?.rating || bm.rating,
                };
              })
            : (aiMonths.length ? aiMonths : baseMonths);
          const mapped = {
            ...base,
            yearSummary: parsed.yearSummary,
            yearKeywords: parsed.yearKeywords,
            bestMonth: parsed.bestMonth,
            cautionMonth: parsed.cautionMonth,
            yearAdvice: parsed.yearAdvice,
            monthlyFortunes: mergedMonths,
          };
          setResult(mapped);
        } else if (base && base.totalGwae) {
          // AI 실패해도 기본 계산 결과는 표시
          setResult(base);
        } else {
          setShowInput(true);
        }
        setLoading(false);
      },
      onError: (err) => {
        console.error('토정비결 스트림 실패:', err);
        setLoading(false);
        setStreaming(false);
        setMatrixShown(false);
        setShowInput(true);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
  };

  useEffect(() => {
    if (userId && autoLoad) {
      loadUserTojeong();
    }
  }, [userId]);

  const handleAnalyze = () => {
    if (!birthDate) return;
    setLoading(true);
    setStreaming(false);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    setShowInput(false);
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    let firstChunk = true;
    cleanupRef.current = getTojeongStream(birthDate, calendarType, {
      onCached: (data) => {
        setResult(data);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
      onBase: (base) => {
        // 기본 계산값(sangsu/jungsu/hasu/totalGwae/gwaeName/monthlyFortunes) 먼저 저장
        baseRef.current = base;
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        setStreamText(prev => prev + chunk);
      },
      onDone: (fullText) => {
        setStreaming(false);
        setStreamText('');
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        const parsed = parseAiJson(fullText);
        const base = baseRef.current || {};
        if (parsed) {
          // AI 월별 운세 배열과 base 월별 배열 병합 (AI가 더 풍부하면 사용)
          const aiMonths = parsed.months || parsed.monthlyFortunes || [];
          const baseMonths = base.monthlyFortunes || [];
          const mergedMonths = baseMonths.length === 12
            ? baseMonths.map((bm, i) => {
                const am = aiMonths.find(x => Number(x.month) === i + 1) || aiMonths[i];
                return {
                  ...bm,
                  fortune: am?.fortune || bm.fortune,
                  rating: am?.rating || bm.rating,
                };
              })
            : (aiMonths.length ? aiMonths : baseMonths);
          const mapped = {
            ...base,
            yearSummary: parsed.yearSummary,
            yearKeywords: parsed.yearKeywords,
            bestMonth: parsed.bestMonth,
            cautionMonth: parsed.cautionMonth,
            yearAdvice: parsed.yearAdvice,
            monthlyFortunes: mergedMonths,
          };
          setResult(mapped);
        } else if (base && base.totalGwae) {
          // AI 실패해도 기본 계산 결과는 표시
          setResult(base);
        } else {
          setShowInput(true);
        }
        setLoading(false);
      },
      onError: (err) => {
        console.error('토정비결 스트림 실패:', err);
        setLoading(false);
        setStreaming(false);
        setMatrixShown(false);
        setShowInput(true);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
  };

  const currentMonth = new Date().getMonth(); // 0-indexed

  if ((loading || streaming) && !result) {
    return (
      <div className="tj-page">
        <AnalysisMatrix theme="saju" label="AI가 토정비결을 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
      </div>
    );
  }

  if (showInput) {
    return (
      <div className="tj-page">
        <section className="tj-intro animate-fade-in-up">
          <div className="tj-intro-visual">
            <div className="tj-seal">
              <span className="tj-seal-char tj-seal-char--1">土</span>
              <span className="tj-seal-char tj-seal-char--2">亭</span>
              <span className="tj-seal-char tj-seal-char--3">秘</span>
              <span className="tj-seal-char tj-seal-char--4">訣</span>
            </div>
            <div className="tj-seal-ring" />
            <div className="tj-seal-ring tj-seal-ring--2" />
          </div>
          <h1 className="tj-intro-title">토정비결</h1>
          <p className="tj-intro-desc">
            조선시대 토정 이지함 선생의 토정비결로<br />
            올해 월별 운세를 확인하세요
          </p>
        </section>

        {userId && !autoLoad && (
          <div className="glass-card animate-fade-in-up" style={{ padding: '20px', textAlign: 'center', marginBottom: 16 }}>
            <button className="btn-gold" onClick={loadUserTojeong} style={{ width: '100%' }}>
              🔮 내 토정비결 보기
            </button>
          </div>
        )}

        <div className="tj-input glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {localStorage.getItem('userId') && (
            <button className="sf-autofill-btn" style={{ marginBottom: 12 }} onClick={() => {
              try {
                const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                if (p.birthDate) setBirthDate(p.birthDate);
                if (p.gender) setGender(p.gender);
                if (p.calendarType) setCalendarType(p.calendarType);
              } catch {}
            }}>✨ 내 정보로 채우기</button>
          )}
          <div className="form-group">
            <label className="form-label">달력 구분</label>
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${calendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button>
              <button type="button" className={`form-toggle__btn ${calendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">생년월일</label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
          </div>
          <button className="btn-gold" onClick={handleAnalyze} disabled={!birthDate} style={{ opacity: birthDate ? 1 : 0.5 }}>
            토정비결 보기
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="tj-page">
      {/* 헤더 */}
      <section className="tj-header animate-fade-in-up">
        <h1 className="tj-title">토정비결</h1>
        <div className="tj-gwae-info">
          <div className="tj-gwae-numbers">
            <div className="tj-num-item">
              <span className="tj-num-label">상수</span>
              <span className="tj-num-value">{result.sangsu}</span>
            </div>
            <span className="tj-num-plus">+</span>
            <div className="tj-num-item">
              <span className="tj-num-label">중수</span>
              <span className="tj-num-value">{result.jungsu}</span>
            </div>
            <span className="tj-num-plus">+</span>
            <div className="tj-num-item">
              <span className="tj-num-label">하수</span>
              <span className="tj-num-value">{result.hasu}</span>
            </div>
            <span className="tj-num-equals">=</span>
            <div className="tj-num-item tj-num-total">
              <span className="tj-num-label">총괘</span>
              <span className="tj-num-value">{result.totalGwae}</span>
            </div>
          </div>
          {result.gwaeName && (
            <div className="tj-gwae-name">{result.gwaeName}</div>
          )}
        </div>
      </section>

      {/* 올해 총평 */}
      {result.yearSummary && (
        <section className="tj-summary glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="tj-section-title">📅 {new Date().getFullYear()}년 총평</h2>
          <p className="tj-summary-text">{result.yearSummary}</p>
        </section>
      )}

      {/* 월별 운세 */}
      <section className="tj-months animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="tj-section-title" style={{ padding: '0 4px', marginBottom: 12 }}>월별 운세</h2>
        <div className="tj-month-grid">
          {(result.monthlyFortunes || []).map((m, idx) => {
            const style = RATING_STYLE[m.rating] || RATING_STYLE['보통'];
            const isCurrent = idx === currentMonth;
            return (
              <div key={idx} className={`tj-month-card glass-card ${isCurrent ? 'tj-month--current' : ''}`}>
                <div className="tj-month-header">
                  <span className="tj-month-name">{MONTH_NAMES[idx]}</span>
                  <span className="tj-month-rating" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                    {m.rating}
                  </span>
                  {isCurrent && <span className="tj-month-now">NOW</span>}
                </div>
                <p className="tj-month-text">{m.fortune}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 심화분석 */}
      {birthDate && (
        <DeepAnalysis type="tojeong" birthDate={birthDate} calendarType={calendarType} />
      )}

      {/* 다시하기 */}
      <section className="tj-actions animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <button className="tj-reset-btn" onClick={() => { setResult(null); setShowInput(true); }}>
          🔄 다른 생년월일로 보기
        </button>
      </section>
    </div>
  );
}

export default Tojeong;
