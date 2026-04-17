import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSajuCompatibilityBasic,
  getCompatibilityStream,
  saveCompatCache,
  getMbtiCompatibilityBasic,
  getMbtiCompatibilityStream,
  getBloodTypeCompatibilityBasic,
  getBloodTypeCompatibilityStream,
  isGuest,
} from '../api/fortune';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import PageTopBar from '../components/PageTopBar';
import FortuneCard from '../components/FortuneCard';
import parseAiJson from '../utils/parseAiJson';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './MyLoveCompat.css';

const TABS = [
  { id: 'saju',  icon: '🔮', label: '정통궁합' },
  { id: 'mbti',  icon: '🧠', label: 'MBTI궁합' },
  { id: 'blood', icon: '🩸', label: '혈액형궁합' },
];

const MBTI_TYPES = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP',
];

const BLOOD_TYPES = [
  { id: 'A',  label: 'A형',  color: '#3B82F6' },
  { id: 'B',  label: 'B형',  color: '#EF4444' },
  { id: 'O',  label: 'O형',  color: '#10B981' },
  { id: 'AB', label: 'AB형', color: '#C084FC' },
];

const ELEMENT_COLORS = { '목': '#4ade80', '화': '#f87171', '토': '#fbbf24', '금': '#e2e8f0', '수': '#60a5fa' };
const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getScoreColor(score) {
  if (score >= 80) return '#ff3d7f';
  if (score >= 60) return '#fbbf24';
  return '#94a3b8';
}

function MyLoveCompat() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const [tab, setTab] = useState('saju');

  // 사주 입력
  const [bd1, setBd1] = useState('');
  const [g1, setG1] = useState('M');
  const [bt1, setBt1] = useState('');
  const [bd2, setBd2] = useState('');
  const [g2, setG2] = useState('F');
  const [bt2, setBt2] = useState('');
  const [showTime, setShowTime] = useState(false);

  // MBTI 입력
  const [myMbti, setMyMbti] = useState('');
  const [partnerMbti, setPartnerMbti] = useState('');

  // 혈액형 입력
  const [myBlood, setMyBlood] = useState('');
  const [partnerBlood, setPartnerBlood] = useState('');

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [result, setResult] = useState(null);
  const cleanupRef = useRef(null);
  const resultRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);

  const handleAutoFill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBd1(p.birthDate);
      if (p.birthTime) setBt1(p.birthTime);
      if (p.gender) setG1(p.gender);
      if (p.mbtiType) setMyMbti(p.mbtiType);
      if (p.bloodType) setMyBlood(p.bloodType);
      if (p.partnerBirthDate) setBd2(p.partnerBirthDate);
      if (p.partnerBirthTime) setBt2(p.partnerBirthTime);
      const partnerG = p.gender === 'M' ? 'F' : p.gender === 'F' ? 'M' : 'F';
      setG2(partnerG);
      if (p.partnerMbtiType) setPartnerMbti(p.partnerMbtiType);
      if (p.partnerBloodType) setPartnerBlood(p.partnerBloodType);
    } catch {}
  };

  const handleTabChange = (id) => {
    if (id === tab) return;
    setTab(id);
    setResult(null);
    setStreamText('');
    setAiStreaming(false);
    setMatrixShown(false);
    setMatrixExiting(false);
    cleanupRef.current?.();
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
  };

  const handleReset = () => {
    cleanupRef.current?.();
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    setResult(null);
    setStreamText('');
    setAiStreaming(false);
    setLoading(false);
    setMatrixShown(false);
    setMatrixExiting(false);
    setBd1(''); setBd2(''); setBt1(''); setBt2('');
    setMyMbti(''); setPartnerMbti('');
    setMyBlood(''); setPartnerBlood('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { guardedAction: guardSajuCompat } = useHeartGuard('COMPATIBILITY');
  const { guardedAction: guardMbtiCompat } = useHeartGuard('MBTI_COMPAT');
  const { guardedAction: guardBloodCompat } = useHeartGuard('BLOODTYPE_COMPAT');

  // ─── 사주 궁합 ───
  const analyzeSaju = async () => {
    if (!bd1 || !bd2) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      const data = await getSajuCompatibilityBasic(
        bd1, bd2, bt1 || undefined, bt2 || undefined, 'SOLAR', 'SOLAR', g1, g2
      );
      data._g1 = g1;
      data._g2 = g2;

      if (data.aiAnalysis || data.aiSummary) {
        setResult(data);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        return;
      }

      setLoading(false);
      setAiStreaming(true);

      cleanupRef.current = getCompatibilityStream(
        bd1, bd2, bt1 || '', bt2 || '', 'SOLAR', 'SOLAR', g1, g2,
        data.score, data.elementRelation || '', data.branchRelation || '',
        {
          onChunk: (text) => setStreamText((prev) => prev + text),
          onDone: (fullText) => {
            setAiStreaming(false);
            setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
            const parsed = parseAiJson(fullText);
            const finalResult = parsed ? {
              ...data,
              aiSummary: parsed.summary || null,
              aiAnalysis: parsed.overall || null,
              aiLoveCompat: parsed.loveCompat || null,
              aiWorkCompat: parsed.workCompat || null,
              aiConflictPoint: parsed.conflictPoint || null,
              aiAdvice: parsed.advice || null,
            } : { ...data, aiAnalysis: fullText };
            setResult(finalResult);
            saveCompatCache({
              birthDate1: bd1, birthDate2: bd2,
              birthTime1: bt1 || null, birthTime2: bt2 || null,
              gender1: g1, gender2: g2,
              score: finalResult.score,
              aiSummary: finalResult.aiSummary,
              aiAnalysis: finalResult.aiAnalysis,
              aiLoveCompat: finalResult.aiLoveCompat,
              aiWorkCompat: finalResult.aiWorkCompat,
              aiConflictPoint: finalResult.aiConflictPoint,
              aiAdvice: finalResult.aiAdvice,
            }).catch(() => {});
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          },
          onError: () => {
            setAiStreaming(false); setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  // ─── MBTI 궁합 ───
  const analyzeMbti = async () => {
    if (!myMbti || !partnerMbti) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      const base = await getMbtiCompatibilityBasic(myMbti, partnerMbti);
      setLoading(false);
      setAiStreaming(true);

      cleanupRef.current = getMbtiCompatibilityStream(myMbti, partnerMbti, {
        onChunk: (text) => setStreamText((prev) => prev + text),
        onDone: (fullText) => {
          setAiStreaming(false);
          setStreamText('');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          const parsed = parseAiJson(fullText);
          const merged = parsed ? {
            _kind: 'mbti',
            ...base,
            aiSummary: parsed.summary || null,
            aiAnalysis: parsed.overall || null,
            aiLoveCompat: parsed.loveCompat || null,
            aiAdvice: parsed.advice || null,
            aiCaution: parsed.caution || null,
          } : { _kind: 'mbti', ...base, aiAnalysis: fullText };
          setResult(merged);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onError: () => {
          setAiStreaming(false); setStreamText('');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        },
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
      setAiStreaming(false);
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  // ─── 혈액형 궁합 ───
  const analyzeBlood = async () => {
    if (!myBlood || !partnerBlood) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      const base = await getBloodTypeCompatibilityBasic(myBlood, partnerBlood);
      setLoading(false);
      setAiStreaming(true);

      cleanupRef.current = getBloodTypeCompatibilityStream(myBlood, partnerBlood, {
        onChunk: (text) => setStreamText((prev) => prev + text),
        onDone: (fullText) => {
          setAiStreaming(false);
          setStreamText('');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          const parsed = parseAiJson(fullText);
          const merged = parsed ? {
            _kind: 'blood',
            ...base,
            aiSummary: parsed.summary || null,
            aiAnalysis: parsed.overall || null,
            aiLoveCompat: parsed.loveCompat || null,
            aiAdvice: parsed.advice || null,
            aiCaution: parsed.caution || null,
          } : { _kind: 'blood', ...base, aiAnalysis: fullText };
          setResult(merged);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onError: () => {
          setAiStreaming(false); setStreamText('');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        },
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
      setAiStreaming(false);
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const matrixLabel =
    tab === 'saju'  ? 'AI가 사주 궁합을 분석하고 있어요' :
    tab === 'mbti'  ? 'AI가 MBTI 궁합을 분석하고 있어요' :
                      'AI가 혈액형 궁합을 분석하고 있어요';

  return (
    <div className="mlc-page">
      <PageTopBar onReset={handleReset} color="#E91E63" />

      {/* 히어로 */}
      <section className="mlc-hero">
        <div className="mlc-hero-bg" />
        <div className="mlc-hero-couple">
          <span className="mlc-sym mlc-sym--m">♂</span>
          <div className="mlc-hero-bond">
            <span className="mlc-bond-heart">♥</span>
            {[...Array(5)].map((_, i) => <span key={i} className="mlc-hero-sparkle" style={{ '--sp-i': i }}>✦</span>)}
          </div>
          <span className="mlc-sym mlc-sym--f">♀</span>
        </div>
        <h1 className="mlc-title">나의 연인과의 궁합</h1>
        <p className="mlc-subtitle">세 가지 궁합으로 우리를 깊이 알아봐요</p>
      </section>

      {/* 탭 */}
      <div className="mlc-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`mlc-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            <span className="mlc-tab-icon">{t.icon}</span>
            <span className="mlc-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 입력 폼 (결과/로딩 중엔 숨김) */}
      {!result && !loading && !aiStreaming && (
        <div className="mlc-form fade-in">
          {userId ? (
            <button className="mlc-autofill-btn" onClick={handleAutoFill}>✨ 내 정보 / 연인 정보로 채우기</button>
          ) : (
            <button
              className="mlc-login-cta"
              onClick={() => navigate('/register', { state: { from: '/my-love-compat' } })}
            >
              💕 로그인하고 연인과 궁합보기
            </button>
          )}

          {/* ═══ 사주 ═══ */}
          {tab === 'saju' && (
            <>
              <div className="mlc-person-block">
                <h3 className="mlc-person-title">👤 내 정보</h3>
                <BirthDatePicker value={bd1} onChange={setBd1} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g1 === 'M' ? 'active' : ''}`} onClick={() => setG1('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span>
                    <span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g1 === 'F' ? 'active' : ''}`} onClick={() => setG1('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span>
                    <span>여자</span>
                  </button>
                </div>
              </div>

              <div className="mlc-person-block">
                <h3 className="mlc-person-title">💕 연인 정보</h3>
                <BirthDatePicker value={bd2} onChange={setBd2} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g2 === 'M' ? 'active' : ''}`} onClick={() => setG2('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span>
                    <span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g2 === 'F' ? 'active' : ''}`} onClick={() => setG2('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span>
                    <span>여자</span>
                  </button>
                </div>
              </div>

              <button className="mlc-submit" onClick={() => guardSajuCompat(analyzeSaju)} disabled={!bd1 || !bd2}>
                🔮 사주 궁합 보기 <HeartCost category="COMPATIBILITY" />
              </button>
            </>
          )}

          {/* ═══ MBTI ═══ */}
          {tab === 'mbti' && (
            <>
              <div className="mlc-person-block">
                <h3 className="mlc-person-title">👤 내 MBTI</h3>
                <div className="mlc-mbti-grid">
                  {MBTI_TYPES.map((t) => (
                    <button
                      key={t}
                      className={`mlc-mbti-btn ${myMbti === t ? 'active' : ''}`}
                      onClick={() => setMyMbti(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <div className="mlc-person-block">
                <h3 className="mlc-person-title">💕 연인 MBTI</h3>
                <div className="mlc-mbti-grid">
                  {MBTI_TYPES.map((t) => (
                    <button
                      key={t}
                      className={`mlc-mbti-btn ${partnerMbti === t ? 'active' : ''}`}
                      onClick={() => setPartnerMbti(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <button className="mlc-submit" onClick={() => guardMbtiCompat(analyzeMbti)} disabled={!myMbti || !partnerMbti}>
                🧠 MBTI 궁합 보기 <HeartCost category="MBTI_COMPAT" />
              </button>
            </>
          )}

          {/* ═══ 혈액형 ═══ */}
          {tab === 'blood' && (
            <>
              <div className="mlc-person-block">
                <h3 className="mlc-person-title">👤 내 혈액형</h3>
                <div className="mlc-blood-grid">
                  {BLOOD_TYPES.map((b) => (
                    <button
                      key={b.id}
                      className={`mlc-blood-btn ${myBlood === b.id ? 'active' : ''}`}
                      style={{ '--bb-color': b.color }}
                      onClick={() => setMyBlood(b.id)}
                    >{b.label}</button>
                  ))}
                </div>
              </div>

              <div className="mlc-person-block">
                <h3 className="mlc-person-title">💕 연인 혈액형</h3>
                <div className="mlc-blood-grid">
                  {BLOOD_TYPES.map((b) => (
                    <button
                      key={b.id}
                      className={`mlc-blood-btn ${partnerBlood === b.id ? 'active' : ''}`}
                      style={{ '--bb-color': b.color }}
                      onClick={() => setPartnerBlood(b.id)}
                    >{b.label}</button>
                  ))}
                </div>
              </div>

              <button className="mlc-submit" onClick={() => guardBloodCompat(analyzeBlood)} disabled={!myBlood || !partnerBlood}>
                🩸 혈액형 궁합 보기 <HeartCost category="BLOODTYPE_COMPAT" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 매트릭스 로딩 */}
      {matrixShown && (
        <AnalysisMatrix theme="love" label={matrixLabel} streamText={streamText} exiting={matrixExiting} />
      )}

      {/* ═══ 결과 ═══ */}
      {result && (
        <div className="mlc-result fade-in" ref={resultRef}>
          {/* 사주 결과 */}
          {tab === 'saju' && result.person1 && (
            <>
              <div className="mlc-score-hero">
                <div className="mlc-vs-row">
                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g1 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g1 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person1.dayMasterElement] || '#fbbf24' }}>
                      {result.person1.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person1.birthDate}</span>
                  </div>

                  <div className="mlc-score-ring-wrap">
                    <svg viewBox="0 0 100 100" className="mlc-score-ring">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 264} 264`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="mlc-score-inner">
                      <span className="mlc-score-num">{result.score}</span>
                      <span className="mlc-score-unit">점</span>
                    </div>
                  </div>

                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g2 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g2 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person2.dayMasterElement] || '#a78bfa' }}>
                      {result.person2.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person2.birthDate}</span>
                  </div>
                </div>
                <span className="mlc-grade-badge" style={{ color: GRADE_COLORS[result.grade] || getScoreColor(result.score) }}>
                  {result.grade}
                </span>
              </div>

              {result.aiSummary && <FortuneCard icon="💕" title="한 줄 요약" description={result.aiSummary} delay={0} />}
              {result.aiAnalysis && <FortuneCard icon="🔮" title="종합 분석" description={result.aiAnalysis} delay={80} />}
              {result.aiLoveCompat && <FortuneCard icon="💖" title="연애 궁합" description={result.aiLoveCompat} delay={160} />}
              {result.aiWorkCompat && <FortuneCard icon="🤝" title="일 / 협력 궁합" description={result.aiWorkCompat} delay={240} />}
              {result.aiConflictPoint && <FortuneCard icon="⚠️" title="갈등 포인트" description={result.aiConflictPoint} delay={320} />}
              {result.aiAdvice && <FortuneCard icon="💡" title="관계 조언" description={result.aiAdvice} delay={400} />}
            </>
          )}

          {/* MBTI 결과 */}
          {tab === 'mbti' && result._kind === 'mbti' && (
            <>
              <div className="mlc-score-hero">
                <div className="mlc-vs-row">
                  <div className="mlc-person-card">
                    <span className="mlc-person-pillar" style={{ color: '#8B5CF6' }}>{result.type1}</span>
                    <span className="mlc-person-date">나</span>
                  </div>
                  <div className="mlc-score-ring-wrap">
                    <svg viewBox="0 0 100 100" className="mlc-score-ring">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 264} 264`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="mlc-score-inner">
                      <span className="mlc-score-num">{result.score}</span>
                      <span className="mlc-score-unit">점</span>
                    </div>
                  </div>
                  <div className="mlc-person-card">
                    <span className="mlc-person-pillar" style={{ color: '#EC4899' }}>{result.type2}</span>
                    <span className="mlc-person-date">연인</span>
                  </div>
                </div>
                <span className="mlc-grade-badge" style={{ color: getScoreColor(result.score) }}>{result.grade}</span>
              </div>

              {result.aiSummary && <FortuneCard icon="💕" title="한 줄 요약" description={result.aiSummary} delay={0} />}
              {result.aiAnalysis && <FortuneCard icon="🔮" title="종합 분석" description={result.aiAnalysis} delay={80} />}
              {result.aiLoveCompat && <FortuneCard icon="💖" title="연애 궁합" description={result.aiLoveCompat} delay={160} />}
              {result.aiAdvice && <FortuneCard icon="💡" title="관계 조언" description={result.aiAdvice} delay={240} />}
              {result.aiCaution && <FortuneCard icon="⚠️" title="주의할 점" description={result.aiCaution} delay={320} />}
              {result.personality1 && <FortuneCard icon="👤" title={`${result.type1} — 나의 성격`} description={result.personality1} delay={400} />}
              {result.personality2 && <FortuneCard icon="💞" title={`${result.type2} — 연인의 성격`} description={result.personality2} delay={480} />}
              {result.bestMatch && <FortuneCard icon="✨" title="최고의 매치" description={`${result.type1}와 가장 잘 맞는 MBTI: ${result.bestMatch}`} delay={560} />}
            </>
          )}

          {/* 혈액형 결과 */}
          {tab === 'blood' && result._kind === 'blood' && (
            <>
              <div className="mlc-score-hero">
                <div className="mlc-vs-row">
                  <div className="mlc-person-card">
                    <span className="mlc-person-pillar" style={{ color: BLOOD_TYPES.find(b => b.id === result.type1)?.color || '#60A5FA' }}>
                      {result.type1}형
                    </span>
                    <span className="mlc-person-date">나</span>
                  </div>
                  <div className="mlc-score-ring-wrap">
                    <svg viewBox="0 0 100 100" className="mlc-score-ring">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 264} 264`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="mlc-score-inner">
                      <span className="mlc-score-num">{result.score}</span>
                      <span className="mlc-score-unit">점</span>
                    </div>
                  </div>
                  <div className="mlc-person-card">
                    <span className="mlc-person-pillar" style={{ color: BLOOD_TYPES.find(b => b.id === result.type2)?.color || '#EC4899' }}>
                      {result.type2}형
                    </span>
                    <span className="mlc-person-date">연인</span>
                  </div>
                </div>
                <span className="mlc-grade-badge" style={{ color: getScoreColor(result.score) }}>{result.grade}</span>
              </div>

              {result.aiSummary && <FortuneCard icon="💕" title="한 줄 요약" description={result.aiSummary} delay={0} />}
              {result.aiAnalysis && <FortuneCard icon="🔮" title="종합 분석" description={result.aiAnalysis} delay={80} />}
              {result.aiLoveCompat && <FortuneCard icon="💖" title="연애 궁합" description={result.aiLoveCompat} delay={160} />}
              {result.aiAdvice && <FortuneCard icon="💡" title="관계 조언" description={result.aiAdvice} delay={240} />}
              {result.aiCaution && <FortuneCard icon="⚠️" title="주의할 점" description={result.aiCaution} delay={320} />}
              {result.personality1 && <FortuneCard icon="👤" title={`${result.type1}형 — 나의 성격`} description={result.personality1} delay={400} />}
              {result.personality2 && <FortuneCard icon="💞" title={`${result.type2}형 — 연인의 성격`} description={result.personality2} delay={480} />}
            </>
          )}

          <button className="mlc-reset-btn" onClick={handleReset}>🔄 다시 보기</button>
        </div>
      )}
    </div>
  );
}

export default MyLoveCompat;
