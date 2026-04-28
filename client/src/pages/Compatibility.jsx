import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSajuCompatibilityBasic, getCompatibilityStream, saveCompatCache, isGuest, getHistory, getUser } from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import BirthDatePicker from '../components/BirthDatePicker';
import { shareResult } from '../utils/share';
import AnalysisMatrix from '../components/AnalysisMatrix';
import AnalysisComplete from '../components/AnalysisComplete';
import parseAiJson, { extractStreamingFields } from '../utils/parseAiJson';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import { useAiAbort } from '../hooks/useAiAbort';
import './Compatibility.css';

// JSON 잔여물 제거
function cleanAiText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/```[a-z]*\s*/g, '').replace(/```/g, '')
    .replace(/\{"[a-zA-Z]+":/g, '').replace(/[{}\[\]"]/g, '')
    .replace(/^\s*[a-zA-Z_]+\s*:\s*/gm, '')
    .replace(/,\s*$/gm, '')
    .trim();
}

const MY_STAR_KEY = 'myStarList';
function getMyStars() { try { return JSON.parse(localStorage.getItem(MY_STAR_KEY)||'[]'); } catch { return []; } }

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
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('userId');
  const [shareMsg, setShareMsg] = useState('');
  const [bd1, setBd1] = useState('');
  const [bt1, setBt1] = useState('');
  const [g1, setG1] = useState('M');
  const [calType1, setCalType1] = useState('SOLAR');
  const [bd2, setBd2] = useState('');
  const [bt2, setBt2] = useState('');
  const [g2, setG2] = useState('F');
  const [calType2, setCalType2] = useState('SOLAR');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const [showStarPicker, setShowStarPicker] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showMoreCards, setShowMoreCards] = useState(false);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  // 글로벌 ai:abort (하트 부족 등) 시 안전 정리
  useAiAbort(() => {
    try { cleanupRef.current?.(); } catch {}
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    setLoading(false); setAiStreaming(false); setStreamText('');
  });

  /** 스트리밍 완료 → matrix 페이드아웃(0.7s) → 완료 애니(1.6s) → 결과 */
  const finishWithCompleteAnimation = (finalResult) => {
    setMatrixExiting(true);
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    setTimeout(() => {
      setMatrixShown(false);
      setStreamText('');
      pendingResultRef.current = finalResult;
      setCompleting(true);
    }, 700);
  };

  useEffect(() => { return () => cleanupRef.current?.(); }, []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 페이지 진입 시 최신 프로필로 localStorage 리프레시 (파트너 정보 캐시 갱신)
  const [profileTick, setProfileTick] = useState(0);
  useEffect(() => {
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    (async () => {
      try {
        const fresh = await getUser(uid);
        if (fresh) {
          localStorage.setItem('userProfile', JSON.stringify(fresh));
          setProfileTick(t => t + 1); // 재렌더 유발 → hasPartner 재평가
        }
      } catch {}
    })();
  }, []);

  // 홈 드로어에서 넘어온 restoreHistoryId 복원
  useEffect(() => {
    const hid = location.state?.restoreHistoryId;
    if (!hid) return;
    (async () => {
      try {
        const full = await getHistory(hid);
        const p = full?.payload;
        if (p) {
          if (p.aiOverall && !p.aiAnalysis) p.aiAnalysis = p.aiOverall;
          setResult(p);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.restoreHistoryId]);

  useEffect(() => {
    if (result && matrixShown && !aiStreaming) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown, aiStreaming]);

  const { guardedAction: guardCompat } = useHeartGuard('COMPATIBILITY');

  const handleAnalyze = async () => {
    if (!bd1 || !bd2) return;
    setLoading(true);
    setStreamText('');
    setResult(null);
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      // 1단계: 사주 계산 (캐시에 AI 있으면 즉시 반환)
      const data = await getSajuCompatibilityBasic(bd1, bd2, bt1 || undefined, bt2 || undefined, calType1, calType2, g1, g2, { historyType: 'compatibility' });
      data._g1 = g1;
      data._g2 = g2;

      if (data.aiAnalysis || data.aiSummary) {
        setResult(data);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        return;
      }

      // 2단계: AI 스트리밍 — Progressive 카드 노출 (완성된 필드부터 즉시 표시)
      setLoading(false);
      setAiStreaming(true);

      // raw JSON key → UI ai* 필드 매핑
      const FIELD_MAP = {
        summary: 'aiSummary',
        overall: 'aiAnalysis',
        loveCompat: 'aiLoveCompat',
        workCompat: 'aiWorkCompat',
        conflictPoint: 'aiConflictPoint',
        advice: 'aiAdvice',
      };
      const PROG_FIELDS = Object.keys(FIELD_MAP);
      let buffer = '';
      let firstShown = false;

      cleanupRef.current = getCompatibilityStream(
        bd1, bd2, bt1 || '', bt2 || '', calType1, calType2, g1, g2,
        data.score, data.elementRelation || '', data.branchRelation || '',
        {
          historyType: 'compatibility',
          onChunk: (text) => {
            buffer += text;
            setStreamText(prev => prev + text);
            const completed = extractStreamingFields(buffer, PROG_FIELDS);
            const newFields = {};
            for (const [src, dst] of Object.entries(FIELD_MAP)) {
              if (completed[src] !== undefined) newFields[dst] = completed[src];
            }
            if (Object.keys(newFields).length > 0) {
              setResult((prev) => ({ ...(prev || data), ...newFields }));
              if (!firstShown) {
                firstShown = true;
                // 매트릭스 페이드아웃 → 결과 영역 노출 (aiStreaming은 유지하여 인디케이터 표시)
                setMatrixExiting(true);
                setTimeout(() => setMatrixShown(false), 600);
              }
            }
          },
          onDone: (fullText) => {
            const parsed = parseAiJson(fullText);
            const merged = parsed ? {
              ...data,
              aiSummary: parsed.summary || null,
              aiAnalysis: parsed.overall || null,
              aiLoveCompat: parsed.loveCompat || null,
              aiWorkCompat: parsed.workCompat || null,
              aiConflictPoint: parsed.conflictPoint || null,
              aiAdvice: parsed.advice || null,
            } : { ...data, aiAnalysis: fullText };
            saveCompatCache({
              birthDate1: bd1, birthDate2: bd2,
              birthTime1: bt1 || null, birthTime2: bt2 || null,
              gender1: g1, gender2: g2,
              score: merged.score,
              aiSummary: merged.aiSummary,
              aiAnalysis: merged.aiAnalysis,
              aiLoveCompat: merged.aiLoveCompat,
              aiWorkCompat: merged.aiWorkCompat,
              aiConflictPoint: merged.aiConflictPoint,
              aiAdvice: merged.aiAdvice,
            }).catch(() => {});
            setAiStreaming(false);
            // progressive로 이미 카드가 떠있으면 완료 애니 생략, 미노출이면 기존 흐름
            if (firstShown) {
              setResult(merged);
              try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
              setStreamText('');
            } else {
              finishWithCompleteAnimation(merged);
            }
          },
          onError: () => {
            setAiStreaming(false); setStreamText(''); setMatrixShown(false);
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (err) {
      console.error(err); setLoading(false); setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  if (result) {
    const score = result.score;
    const scorePercent = score / 100;
    const color1 = ELEMENT_COLORS[result.person1.dayMasterElement] || '#fbbf24';
    const color2 = ELEMENT_COLORS[result.person2.dayMasterElement] || '#a78bfa';
    const icon1 = result._g1 === 'F' ? '♀' : '♂';
    const icon2 = result._g2 === 'F' ? '♀' : '♂';

    return (
      <div className="compat-page">
        {matrixShown && !completing && (
          <AnalysisMatrix theme="love" label="AI가 사주 궁합을 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
        )}
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
          {aiStreaming && (
            <div className="compat-progress-bar">
              <span className="compat-progress-icon">✨</span>
              <span className="compat-progress-text">AI가 더 깊이 분석 중<span className="compat-progress-dots"><i/><i/><i/></span></span>
            </div>
          )}
          {result.aiSummary && (
            <div className="compat-card glass-card compat-card--summary">
              <p className="compat-summary-text">{cleanAiText(result.aiSummary)}</p>
            </div>
          )}
          {result.aiAnalysis && (
            <div className="compat-card glass-card compat-card--ai">
              <div className="compat-card-header"><span className="compat-card-icon">🔮</span><h3>종합 분석</h3></div>
              <p className="compat-card-text">{cleanAiText(result.aiAnalysis)}</p>
            </div>
          )}
          <div className="compat-card glass-card">
            <div className="compat-card-header"><span className="compat-card-icon">☯️</span><h3>음양 조화</h3></div>
            <p className="compat-card-text">{result.yinyangBalance}</p>
          </div>
          {result.aiLoveCompat && (
            <div className="compat-card glass-card compat-card--ai">
              <div className="compat-card-header"><span className="compat-card-icon">💕</span><h3>연애/결혼 궁합</h3></div>
              <p className="compat-card-text">{cleanAiText(result.aiLoveCompat)}</p>
            </div>
          )}
          {!showMoreCards ? (
            <button className="compat-more-btn" onClick={() => setShowMoreCards(true)}>
              더 자세한 분석 보기 ▼
            </button>
          ) : (
            <>
              {result.aiWorkCompat && (
                <div className="compat-card glass-card compat-card--ai fade-in">
                  <div className="compat-card-header"><span className="compat-card-icon">💼</span><h3>직장/업무 궁합</h3></div>
                  <p className="compat-card-text">{cleanAiText(result.aiWorkCompat)}</p>
                </div>
              )}
              {result.aiConflictPoint && (
                <div className="compat-card glass-card compat-card--ai fade-in">
                  <div className="compat-card-header"><span className="compat-card-icon">⚠️</span><h3>갈등 포인트 & 해결법</h3></div>
                  <p className="compat-card-text">{cleanAiText(result.aiConflictPoint)}</p>
                </div>
              )}
              {result.aiAdvice && (
                <div className="compat-card glass-card compat-card--ai fade-in">
                  <div className="compat-card-header"><span className="compat-card-icon">💡</span><h3>관계 개선 조언</h3></div>
                  <p className="compat-card-text">{cleanAiText(result.aiAdvice)}</p>
                </div>
              )}
              <div className="compat-card glass-card fade-in">
                <div className="compat-card-header"><span className="compat-card-icon">⚡</span><h3>오행 관계</h3></div>
                <p className="compat-card-text">{result.elementRelation}</p>
              </div>
              <div className="compat-card glass-card fade-in">
                <div className="compat-card-header"><span className="compat-card-icon">🔗</span><h3>일지 관계</h3></div>
                <p className="compat-card-text">{result.branchRelation}</p>
              </div>
              <button className="compat-more-btn" onClick={() => setShowMoreCards(false)}>접기 ▲</button>
            </>
          )}
        </section>

        <button className="compat-reset-btn" onClick={() => { setResult(null); setBd1(''); setBd2(''); setBt1(''); setBt2(''); setCalType1('SOLAR'); setCalType2('SOLAR'); }}>
          다른 궁합 보기
        </button>
        <button className="compat-share-btn compat-share-btn--bottom" onClick={async () => {
          const text = `[1:1연애 💕 사주 궁합]\n궁합 점수: ${result.score}점 (${result.grade})\n${result.aiSummary || ''}\n\nhttps://recipepig.kr`;
          const res = await shareResult({ title: '사주 궁합 결과', text });
          if (res === 'copied') { setShareMsg('클립보드에 복사됨!'); setTimeout(() => setShareMsg(''), 2000); }
        }}>📤 결과 공유하기</button>
        {shareMsg && <p style={{ textAlign: 'center', fontSize: 12, color: '#4ade80', margin: '4px 0' }}>{shareMsg}</p>}
      </div>
    );
  }

  const analysisCompleteEl = (
    <AnalysisComplete
      show={completing}
      theme="love"
      onDone={() => {
        setCompleting(false);
        const r = pendingResultRef.current;
        pendingResultRef.current = null;
        if (r) setResult(r);
      }}
    />
  );

  return (
    <div className="compat-page">
      {matrixShown && !completing && (
        <AnalysisMatrix theme="love" label="AI가 사주 궁합을 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
      )}
      {analysisCompleteEl}
      <section className="compat-intro compat-intro--compact">
        <span className="compat-intro-icon">💕</span>
        <h1 className="compat-intro-title">사주 궁합</h1>
      </section>

      {/* 비로그인 CTA */}
      {!userId && (
        <KakaoLoginCTA returnTo="/compatibility" style={{ margin: '0 0 8px' }}>
          카카오 로그인하고 맞춤 궁합 받기
        </KakaoLoginCTA>
      )}

      {/* 하단 pull-up drawer — 최근 본 사주 궁합 */}
      {userId && (
        <HistoryDrawer
          type="compatibility"
          label="📚 최근 본 사주 궁합"
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              const p = full?.payload;
              if (p) {
                p._g1 = p.gender1 || 'M';
                p._g2 = p.gender2 || 'F';
                if (p.aiOverall && !p.aiAnalysis) p.aiAnalysis = p.aiOverall;
                setResult(p);
              }
            } catch {}
          }}
        />
      )}

      <div className="compat-form glass-card">
        {/* Person 1 */}
        {userId && (() => { try { const p = JSON.parse(localStorage.getItem('userProfile') || '{}'); return !!p.birthDate; } catch { return false; } })() && (
          <button className="sf-autofill-btn" style={{ marginBottom: 8 }} onClick={() => {
            try {
              const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
              if (p.birthDate) setBd1(p.birthDate);
              if (p.gender) { setG1(p.gender); setG2(p.gender === 'M' ? 'F' : 'M'); }
              if (p.birthTime) setBt1(p.birthTime);
              if (p.calendarType) setCalType1(p.calendarType);
            } catch {}
          }}>✨ 내 정보로 채우기</button>
        )}
        <div className="form-group">
          <label className="form-label">성별</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${g1 === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => { setG1('M'); setG2('F'); }}><span className="g-circle g-male">♂</span></button>
            <button type="button" className={`form-toggle__btn ${g1 === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => { setG1('F'); setG2('M'); }}><span className="g-circle g-female">♀</span></button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">달력 구분</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${calType1 === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalType1('SOLAR')}>☀️ 양력</button>
            <button type="button" className={`form-toggle__btn ${calType1 === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalType1('LUNAR')}>🌙 음력</button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">생년월일</label>
          <BirthDatePicker value={bd1} onChange={setBd1} calendarType={calType1} />
        </div>
        {!showTime && (
          <button className="compat-time-toggle" onClick={() => setShowTime(true)}>⏰ 태어난 시간 입력 (선택, 더 정확한 분석)</button>
        )}
        {showTime && (
          <div className="form-group">
            <label className="form-label">태어난 시간</label>
            <select className="form-input form-select" value={bt1} onChange={e => setBt1(e.target.value)}>
              {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        <div className="compat-form-divider">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="compat-bubble-heart" style={{ '--bh-i': i }}>💗</span>
          ))}
          <span className="compat-divider-heart">💗</span>
        </div>

        {/* Person 2 */}
        {(() => {
          const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile')||'{}'); } catch { return {}; } })();
          const hasPartner = !!profile.partnerBirthDate;
          const stars = getMyStars();
          return (hasPartner || stars.length > 0) ? (
            <div className="compat-autofill-row">
              {hasPartner && (
                <button className="sf-autofill-btn" onClick={() => {
                  setBd2(profile.partnerBirthDate);
                  if (profile.partnerBirthTime) setBt2(profile.partnerBirthTime);
                  if (profile.gender === 'M') setG2('F'); else setG2('M');
                }}>💕 연인 정보로 채우기</button>
              )}
              {stars.length > 0 && (
                <button className="sf-autofill-btn" onClick={() => setShowStarPicker(true)}>
                  ⭐ 스타 정보로 채우기
                </button>
              )}
            </div>
          ) : null;
        })()}
        {showStarPicker && (
          <div className="star-picker-overlay" onClick={() => setShowStarPicker(false)}>
            <div className="star-picker-popup" onClick={e => e.stopPropagation()}>
              <div className="star-picker-header">
                <h3 className="star-picker-title">⭐ 나의 스타 선택</h3>
                <button className="star-picker-close" onClick={() => setShowStarPicker(false)}>✕</button>
              </div>
              <div className="star-picker-list">
                {getMyStars().map((s, i) => (
                  <button key={i} className="star-picker-item" onClick={() => {
                    setBd2(s.birth);
                    if (s.gender) setG2(s.gender);
                    setShowStarPicker(false);
                  }}>
                    <span className={`star-picker-sym ${s.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>{s.gender === 'M' ? '♂' : '♀'}</span>
                    <div className="star-picker-info">
                      <span className="star-picker-name">{s.name}</span>
                      {s.group && <span className="star-picker-group">{s.group}</span>}
                    </div>
                    <span className="star-picker-birth">{s.birth?.slice(0, 4)}년생</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">상대방 성별</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${g2 === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setG2('M')}><span className="g-circle g-male">♂</span></button>
            <button type="button" className={`form-toggle__btn ${g2 === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setG2('F')}><span className="g-circle g-female">♀</span></button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">달력 구분</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${calType2 === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalType2('SOLAR')}>☀️ 양력</button>
            <button type="button" className={`form-toggle__btn ${calType2 === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalType2('LUNAR')}>🌙 음력</button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">생년월일</label>
          <BirthDatePicker value={bd2} onChange={setBd2} calendarType={calType2} />
        </div>
        {showTime && (
          <div className="form-group">
            <label className="form-label">태어난 시간</label>
            <select className="form-input form-select" value={bt2} onChange={e => setBt2(e.target.value)}>
              {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        <button className="btn-gold" onClick={() => guardCompat(handleAnalyze)} disabled={!bd1 || !bd2} style={{ opacity: bd1 && bd2 ? 1 : 0.5 }}>
          💕 궁합 분석하기 <HeartCost category="COMPATIBILITY" />
        </button>
      </div>
    </div>
  );
}

export default Compatibility;
