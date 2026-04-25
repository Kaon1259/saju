import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getYearFortuneStream, getYearFortune, isGuest } from '../api/fortune';
import parseAiJson, { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import FortuneCard from '../components/FortuneCard';
import StreamingCard from '../components/StreamingCard';
import DeepAnalysis from '../components/DeepAnalysis';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import AnalysisComplete from '../components/AnalysisComplete';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import HeroIconButtons from '../components/HeroIconButtons';
import './YearFortune.css';

const BIRTH_TIMES = [
  { value: '', label: '모름 / 선택안함' },
  { value: '자시', label: '자시 (23:00~01:00)' }, { value: '축시', label: '축시 (01:00~03:00)' },
  { value: '인시', label: '인시 (03:00~05:00)' }, { value: '묘시', label: '묘시 (05:00~07:00)' },
  { value: '진시', label: '진시 (07:00~09:00)' }, { value: '사시', label: '사시 (09:00~11:00)' },
  { value: '오시', label: '오시 (11:00~13:00)' }, { value: '미시', label: '미시 (13:00~15:00)' },
  { value: '신시', label: '신시 (15:00~17:00)' }, { value: '유시', label: '유시 (17:00~19:00)' },
  { value: '술시', label: '술시 (19:00~21:00)' }, { value: '해시', label: '해시 (21:00~23:00)' },
];
const QUARTER_LABELS = ['1분기 (1~3월)', '2분기 (4~6월)', '3분기 (7~9월)', '4분기 (10~12월)'];
const QUARTER_ICONS = ['🌸', '☀️', '🍂', '❄️'];

function getScoreColor(s) { return s >= 85 ? '#ff3d7f' : s >= 70 ? '#fbbf24' : s >= 55 ? '#4ade80' : '#94a3b8'; }
function getGradeLabel(s) { return s >= 90 ? '대길' : s >= 75 ? '길' : s >= 55 ? '보통' : '흉'; }

function YearFortune() {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState(() => {
    const preset = location.state?.presetMode;
    return (preset === 'partner' || preset === 'other') ? preset : 'mine';
  });
  const [copied, setCopied] = useState(false);

  // 내 운세
  const [mineResult, setMineResult] = useState(null);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineStreamText, setMineStreamText] = useState('');
  const [mineStreaming, setMineStreaming] = useState(false);
  const mineCleanupRef = useRef(null);

  // 연인 운세
  const [partnerResult, setPartnerResult] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerStreamText, setPartnerStreamText] = useState('');
  const [partnerStreaming, setPartnerStreaming] = useState(false);
  const partnerCleanupRef = useRef(null);

  // 다른 사람
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('solar');
  const [gender, setGender] = useState('');
  const [otherResult, setOtherResult] = useState(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherStreamText, setOtherStreamText] = useState('');
  const [otherStreaming, setOtherStreaming] = useState(false);
  const otherCleanupRef = useRef(null);

  const resultRef = useRef(null);
  const stopAmbientRef = useRef(null);

  // 완료 애니
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const pendingSetterRef = useRef(null);

  // Progressive 카드 상태 (3탭 공용)
  const [streamingActive, setStreamingActive] = useState(false);
  const [doneFields, setDoneFields] = useState(() => new Set());

  useEffect(() => {
    return () => { mineCleanupRef.current?.(); partnerCleanupRef.current?.(); otherCleanupRef.current?.(); };
  }, []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  const getProfile = () => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } };
  const getPartnerInfo = () => {
    const p = getProfile();
    if (!p.partnerBirthDate) return null;
    return { birthDate: p.partnerBirthDate, birthTime: p.partnerBirthTime || '', gender: p.gender === 'M' ? 'F' : p.gender === 'F' ? 'M' : '' };
  };

  const { guardedAction: guardYear } = useHeartGuard('YEAR_FORTUNE');

  const startAnalysis = (bd, bt, g, ct, setters) => {
    const { setResult, setLoading, setStreamText, setStreaming, cleanupRef } = setters;
    setLoading(true); setStreamText(''); setStreaming(false); setResult(null);
    setDoneFields(new Set()); setStreamingActive(false);
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    let firstChunk = true;
    let gotResult = false;
    let buffer = '';
    let firstFieldShown = false;
    const PROG_FIELDS = ['love', 'money', 'career', 'health', 'relationship', 'advice', 'yearAdvice', 'summary', 'yearTheme'];

    // 비스트리밍 폴백: 스트림 실패/파싱실패 시 일반 API 로 재시도
    const fallback = async (reason) => {
      console.warn('[YearFortune] stream failed, falling back to non-stream:', reason);
      try {
        const data = await getYearFortune(bd, bt, g, ct);
        if (data) {
          gotResult = true;
          setResult(data);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }
      } catch (e) {
        console.error('[YearFortune] fallback failed:', e);
      } finally {
        setLoading(false); setStreaming(false); setStreamText('');
        setStreamingActive(false); setDoneFields(new Set());
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      }
    };

    cleanupRef.current = getYearFortuneStream(bd, bt, g, ct, {
      onCached: (data) => {
        gotResult = true;
        setResult(data); setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        buffer += chunk;
        setStreamText(prev => prev + chunk);
        // Progressive partial 추출 — 카드 placeholder + typewriter
        const partial = extractStreamingFieldsPartial(buffer, PROG_FIELDS);
        const newFields = {};
        const newDone = [];
        for (const k of PROG_FIELDS) {
          const p = partial[k];
          if (p !== undefined) {
            newFields[k] = p.value;
            if (p.done) newDone.push(k);
          }
        }
        if (Object.keys(newFields).length > 0) {
          if (!firstFieldShown) {
            firstFieldShown = true;
            setStreamingActive(true);
            setResult({ overallScore: 0, summary: '', yearTheme: '분석 중...', ...newFields });
          } else {
            setResult(prev => ({ ...(prev || {}), ...newFields }));
          }
          if (newDone.length > 0) {
            setDoneFields(prev => {
              let changed = false;
              const next = new Set(prev);
              for (const f of newDone) { if (!next.has(f)) { next.add(f); changed = true; } }
              return changed ? next : prev;
            });
          }
        }
      },
      onDone: (fullText) => {
        const parsed = parseAiJson(fullText);
        if (parsed) {
          gotResult = true;
          setStreaming(false); setLoading(false); setStreamText('');
          setStreamingActive(false); setDoneFields(new Set());
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          if (firstFieldShown) {
            // 이미 카드가 떠있으면 완료 애니 생략하고 바로 최종 결과로 교체
            setResult(parsed);
          } else {
            pendingResultRef.current = parsed;
            pendingSetterRef.current = setResult;
            setCompleting(true);
          }
        } else {
          // 파싱 실패 → 불완전 JSON(토큰 초과 등) → 폴백
          console.warn('[YearFortune] parseAiJson failed, fallback. raw length:', fullText?.length);
          fallback('parse-failed');
        }
      },
      onError: (err) => {
        if (gotResult) return; // 이미 결과 받았으면 무시 (EventSource close 후 onerror 정상 발화)
        fallback(err || 'stream-error');
      },
    });
  };

  const handleShare = (result) => {
    if (!result) return;
    const s = result.overallScore ?? result.score ?? 0;
    const g = result.overallGrade || result.grade || getGradeLabel(s);
    const text = `🎊 2026 신년운세\n\n종합 점수: ${s}점 (${g})\n${result.yearTheme || ''}\n\n${result.summary || ''}\n\n연애 앱에서 확인하세요!`;
    if (navigator.share) { navigator.share({ title: '2026 신년운세', text }).catch(() => {}); }
    else { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  };

  const circumference = 2 * Math.PI * 52;

  /* 결과 렌더링 공통 */
  const renderResult = (result, bd, bt, g, ct, onReset) => {
    const rScore = result.overallScore ?? result.score ?? 0;
    const rGrade = result.overallGrade || result.grade || getGradeLabel(rScore);
    const rTheme = result.yearTheme || result.theme || '도약의 해';
    const rThemeEmoji = result.yearEmoji || result.themeEmoji || '🐴';
    const rQuarters = result.quarterly || result.quarters;
    const rAdvice = result.yearAdvice || result.advice;

    return (
      <div className="yf-result fade-in" ref={resultRef}>
        <div className="yf-theme-badge glass-card">
          <span className="yf-theme-emoji">{rThemeEmoji}</span>
          <span className="yf-theme-text">{rTheme}</span>
        </div>
        <div className="yf-score-card glass-card">
          <div className="yf-score-circle">
            <svg viewBox="0 0 120 120" width="150" height="150">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={getScoreColor(rScore)} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * rScore) / 100}
                transform="rotate(-90 60 60)" className="yf-score-ring" />
            </svg>
            <div className="yf-score-inner"><span className="yf-score-num">{rScore}</span><span className="yf-score-unit">점</span></div>
          </div>
          <span className="yf-grade" style={{ color: getScoreColor(rScore) }}>{rGrade}</span>
        </div>
        {result.summary && <div className="yf-summary glass-card"><p>{result.summary}</p></div>}
        {rQuarters && rQuarters.length > 0 && (
          <div className="yf-section">
            <h3 className="yf-section-title"><span>📅</span> 분기별 운세</h3>
            <div className="yf-quarters-grid">
              {rQuarters.map((q, i) => (
                <div key={i} className="yf-quarter-card glass-card" style={{ '--q-color': getScoreColor(q.score) }}>
                  <span className="yf-quarter-icon">{QUARTER_ICONS[i]}</span>
                  <span className="yf-quarter-label">{QUARTER_LABELS[i]}</span>
                  <div className="yf-quarter-score-bar"><div className="yf-quarter-score-fill" style={{ width: `${q.score}%`, background: getScoreColor(q.score) }} /></div>
                  <span className="yf-quarter-score">{q.score}점</span>
                  <span className="yf-quarter-keyword">{q.keyword || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="yf-section">
          <h3 className="yf-section-title"><span>🔮</span> 영역별 운세</h3>
          {(() => {
            const fs = (field) => {
              if (!streamingActive) return 'done';
              if (doneFields.has(field)) return 'done';
              if (result[field]) return 'streaming';
              return 'pending';
            };
            if (streamingActive) {
              return (
                <>
                  <StreamingCard icon="💕" title="애정운" text={result.love || ''} status={fs('love')} delay={0} />
                  <StreamingCard icon="💰" title="재물운" text={result.money || ''} status={fs('money')} delay={80} />
                  <StreamingCard icon="💼" title="직장운" text={result.career || ''} status={fs('career')} delay={160} />
                  <StreamingCard icon="💚" title="건강운" text={result.health || ''} status={fs('health')} delay={240} />
                  <StreamingCard icon="🤝" title="대인관계운" text={result.relationship || ''} status={fs('relationship')} delay={320} />
                </>
              );
            }
            return (
              <>
                {result.love && <FortuneCard icon="💕" title="애정운" description={result.love} delay={0} />}
                {result.money && <FortuneCard icon="💰" title="재물운" description={result.money} delay={80} />}
                {result.career && <FortuneCard icon="💼" title="직장운" description={result.career} delay={160} />}
                {result.health && <FortuneCard icon="💚" title="건강운" description={result.health} delay={240} />}
                {result.relationship && <FortuneCard icon="🤝" title="대인관계운" description={result.relationship} delay={320} />}
              </>
            );
          })()}
        </div>
        {(result.luckyMonths || result.cautionMonths) && (
          <div className="yf-months glass-card">
            {result.luckyMonths && <div className="yf-months-row"><span className="yf-months-label">✨ 행운의 달</span><div className="yf-months-badges">{(Array.isArray(result.luckyMonths) ? result.luckyMonths : [result.luckyMonths]).map((m, i) => <span key={i} className="yf-month-badge yf-month-badge--lucky">{m}</span>)}</div></div>}
            {result.cautionMonths && <div className="yf-months-row"><span className="yf-months-label">⚠️ 주의 달</span><div className="yf-months-badges">{(Array.isArray(result.cautionMonths) ? result.cautionMonths : [result.cautionMonths]).map((m, i) => <span key={i} className="yf-month-badge yf-month-badge--caution">{m}</span>)}</div></div>}
          </div>
        )}
        {(result.luckyColor || result.luckyNumber || result.luckyDirection) && (
          <div className="yf-lucky glass-card">
            {result.luckyColor && <div className="yf-lucky-item"><span className="yf-lucky-label">행운의 색</span><span className="yf-lucky-value">{result.luckyColor}</span></div>}
            {result.luckyNumber && <div className="yf-lucky-item"><span className="yf-lucky-label">행운의 수</span><span className="yf-lucky-value">{result.luckyNumber}</span></div>}
            {result.luckyDirection && <div className="yf-lucky-item"><span className="yf-lucky-label">행운의 방위</span><span className="yf-lucky-value">{result.luckyDirection}</span></div>}
          </div>
        )}
        {streamingActive ? (
          <StreamingCard icon="💡" title="2026년 조언" text={rAdvice || ''}
            status={!streamingActive ? 'done' : (doneFields.has('advice') || doneFields.has('yearAdvice')) ? 'done' : (rAdvice ? 'streaming' : 'pending')}
            delay={400} />
        ) : rAdvice && <FortuneCard icon="💡" title="2026년 조언" description={rAdvice} delay={400} />}
        {bd && <DeepAnalysis type="yearly" birthDate={bd} birthTime={bt} gender={g} calendarType={ct} previousResult={result} />}
        <div className="yf-actions">
          <button className="yf-action-btn yf-share-btn" onClick={() => handleShare(result)}>{copied ? '✅ 복사됨' : '📤 공유하기'}</button>
          <button className="yf-action-btn yf-reset-btn" onClick={onReset}>🔄 다시 보기</button>
        </div>
      </div>
    );
  };

  const renderLoading = (isLoading, isStreaming, sText, hasResult) => {
    // streamingActive(=carousel placeholder 노출 중)면 매트릭스 숨김
    if (streamingActive) return null;
    if ((isLoading || isStreaming) && !hasResult && !completing) {
      return <AnalysisMatrix theme="year" label="AI가 2026년 운세를 분석하고 있어요" streamText={sText} />;
    }
    return null;
  };

  const profile = getProfile();
  const partnerInfo = getPartnerInfo();

  return (
    <div className="yf-page">
      <div className="yf-bg">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} className="yf-sparkle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 4}s`, animationDuration: `${2 + Math.random() * 3}s`, fontSize: `${Math.random() * 6 + 3}px` }}>✦</span>
        ))}
        {Array.from({ length: 8 }).map((_, i) => <span key={`fw-${i}`} className="yf-firework" style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 40}%`, animationDelay: `${i * 0.7}s` }} />)}
      </div>

      <div className="yf-hero" style={{ position: 'relative', paddingLeft: 48, paddingRight: 48 }}>
        <HeroIconButtons color="#fbbf24" />
        <div className="yf-hero-glow" />
        <div className="yf-hero-icon">🎊</div>
        <h1 className="yf-title">2026 신년운세</h1>
        <p className="yf-subtitle">병오년, 새해의 운명을 미리 확인하세요</p>
      </div>

      {/* 3탭 */}
      <div className="myf-mode-tabs" style={{ marginBottom: 16 }}>
        <button className={`myf-mode-tab ${viewMode === 'mine' ? 'active' : ''}`} onClick={() => setViewMode('mine')}>내 운세</button>
        <button className={`myf-mode-tab ${viewMode === 'partner' ? 'active' : ''}`} onClick={() => setViewMode('partner')}>연인 운세</button>
        <button className={`myf-mode-tab ${viewMode === 'other' ? 'active' : ''}`} onClick={() => setViewMode('other')}>다른 사람</button>
      </div>

      {/* ══ 내 운세 ══ */}
      {viewMode === 'mine' && (
        renderLoading(mineLoading, mineStreaming, mineStreamText, mineResult) || (
          !mineResult ? (
            <div className="yf-form glass-card fade-in" style={{ textAlign: 'center' }}>
              {profile.birthDate ? (
                <>
                  <h2 style={{ marginBottom: 12 }}>🎊 내 2026 신년운세</h2>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>프로필 정보로 분석합니다</p>
                  <div className="myf-badges" style={{ justifyContent: 'center', marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="myf-badge">{profile.birthDate}</span>
                    {profile.birthTime && <span className="myf-badge">{profile.birthTime}</span>}
                    {profile.gender && <span className="myf-badge">{profile.gender === 'M' ? '♂ 남성' : '♀ 여성'}</span>}
                  </div>
                  <button className="yf-submit" onClick={() => guardYear(() => startAnalysis(profile.birthDate, profile.birthTime, profile.gender, profile.calendarType || 'solar', {
                    setResult: setMineResult, setLoading: setMineLoading, setStreamText: setMineStreamText, setStreaming: setMineStreaming, cleanupRef: mineCleanupRef
                  }))}>🎊 내 신년운세 보기 <HeartCost category="YEAR_FORTUNE" /></button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, margin: '20px 0' }}>🔮</div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>프로필 정보가 없습니다.<br />회원가입 후 이용해주세요.</p>
                  <KakaoLoginCTA returnTo="/year-fortune" className="yf-submit">카카오 로그인하고 신년운세 받기</KakaoLoginCTA>
                </>
              )}
            </div>
          ) : renderResult(mineResult, profile.birthDate, profile.birthTime, profile.gender, profile.calendarType, () => { mineCleanupRef.current?.(); setMineResult(null); setMineStreamText(''); setMineStreaming(false); window.scrollTo({ top: 0, behavior: 'smooth' }); })
        )
      )}

      {/* ══ 연인 운세 ══ */}
      {viewMode === 'partner' && (
        renderLoading(partnerLoading, partnerStreaming, partnerStreamText, partnerResult) || (
          !partnerResult ? (
            <div className="yf-form glass-card fade-in" style={{ textAlign: 'center' }}>
              {partnerInfo ? (
                <>
                  <h2 style={{ marginBottom: 12 }}>💕 연인 2026 신년운세</h2>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>프로필에 등록된 연인 정보로 분석합니다</p>
                  <div className="myf-badges" style={{ justifyContent: 'center', marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="myf-badge">{partnerInfo.birthDate}</span>
                    {partnerInfo.birthTime && <span className="myf-badge">{partnerInfo.birthTime}</span>}
                    {partnerInfo.gender && <span className="myf-badge">{partnerInfo.gender === 'M' ? '♂ 남성' : '♀ 여성'}</span>}
                  </div>
                  <button className="yf-submit" onClick={() => guardYear(() => startAnalysis(partnerInfo.birthDate, partnerInfo.birthTime, partnerInfo.gender, 'solar', {
                    setResult: setPartnerResult, setLoading: setPartnerLoading, setStreamText: setPartnerStreamText, setStreaming: setPartnerStreaming, cleanupRef: partnerCleanupRef
                  }))}>💕 연인 신년운세 보기 <HeartCost category="YEAR_FORTUNE" /></button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, margin: '20px 0' }}>💔</div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>등록된 연인 정보가 없습니다.<br />프로필에서 연인 정보를 먼저 입력해주세요.</p>
                  <button className="yf-submit" onClick={() => navigate('/profile/edit')}>프로필에서 연인 등록하기</button>
                </>
              )}
            </div>
          ) : renderResult(partnerResult, partnerInfo?.birthDate, partnerInfo?.birthTime, partnerInfo?.gender, 'solar', () => { partnerCleanupRef.current?.(); setPartnerResult(null); setPartnerStreamText(''); setPartnerStreaming(false); window.scrollTo({ top: 0, behavior: 'smooth' }); })
        )
      )}

      {/* ══ 다른 사람 ══ */}
      {viewMode === 'other' && (
        renderLoading(otherLoading, otherStreaming, otherStreamText, otherResult) || (
          !otherResult ? (
            <div className="yf-form glass-card fade-in">
              <h2 style={{ textAlign: 'center', marginBottom: 16 }}>다른 사람 2026 신년운세</h2>
              <div className="yf-form-group">
                <label className="yf-label">생년월일</label>
                <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
              </div>
              <div className="yf-form-group">
                <label className="yf-label">태어난 시간</label>
                <select className="yf-input yf-select" value={birthTime} onChange={e => setBirthTime(e.target.value)}>
                  {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="yf-form-group">
                <label className="yf-label">달력 유형</label>
                <div className="yf-toggle">
                  <button className={`yf-toggle-btn ${calendarType === 'solar' ? 'active' : ''}`} onClick={() => setCalendarType('solar')}>☀ 양력</button>
                  <button className={`yf-toggle-btn ${calendarType === 'lunar' ? 'active' : ''}`} onClick={() => setCalendarType('lunar')}>☽ 음력</button>
                </div>
              </div>
              <div className="yf-form-group">
                <label className="yf-label">성별</label>
                <div className="yf-toggle">
                  <button className={`yf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}><span className="g-circle g-male">♂</span></button>
                  <button className={`yf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}><span className="g-circle g-female">♀</span></button>
                </div>
              </div>
              <button className="yf-submit" style={{ marginTop: 8 }} disabled={!birthDate || otherLoading} onClick={() => guardYear(() => startAnalysis(birthDate, birthTime, gender, calendarType, {
                setResult: setOtherResult, setLoading: setOtherLoading, setStreamText: setOtherStreamText, setStreaming: setOtherStreaming, cleanupRef: otherCleanupRef
              }))}>
                {otherLoading || otherStreaming ? 'AI 분석중...' : '🎊 2026 운세 보기'} <HeartCost category="YEAR_FORTUNE" />
              </button>
            </div>
          ) : renderResult(otherResult, birthDate, birthTime, gender, calendarType, () => { otherCleanupRef.current?.(); setOtherResult(null); setBirthDate(''); setBirthTime(''); setGender(''); setOtherStreamText(''); setOtherStreaming(false); window.scrollTo({ top: 0, behavior: 'smooth' }); })
        )
      )}
      <AnalysisComplete
        show={completing}
        theme="year"
        onDone={() => {
          setCompleting(false);
          const r = pendingResultRef.current;
          const setter = pendingSetterRef.current;
          pendingResultRef.current = null;
          pendingSetterRef.current = null;
          if (r && setter) {
            setter(r);
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
          }
        }}
      />
    </div>
  );
}

export default YearFortune;
