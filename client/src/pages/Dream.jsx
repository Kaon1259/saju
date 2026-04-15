import { useState, useRef, useEffect } from 'react';
import { interpretDreamStream } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import parseAiJson from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './Dream.css';

// ═══════════════════════════════════════════════════
// 인기 꿈 키워드
// ═══════════════════════════════════════════════════
const DREAM_KEYWORDS = [
  { label: '물',   emoji: '🌊' },
  { label: '뱀',   emoji: '🐍' },
  { label: '돈',   emoji: '💰' },
  { label: '죽음', emoji: '💀' },
  { label: '비행', emoji: '🕊️' },
  { label: '불',   emoji: '🔥' },
  { label: '아기', emoji: '👶' },
  { label: '시험', emoji: '📝' },
  { label: '결혼', emoji: '💍' },
  { label: '이빨', emoji: '🦷' },
  { label: '꽃',   emoji: '🌸' },
  { label: '산',   emoji: '⛰️' },
];

const MAX_CHARS = 500;

// ── 점수에 따른 등급 ──
function getRating(score) {
  if (score >= 90) return { label: '대길', color: '#FFD700', bg: 'rgba(255,215,0,0.15)' };
  if (score >= 70) return { label: '길',   color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
  if (score >= 50) return { label: '보통', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' };
  if (score >= 30) return { label: '흉',   color: '#fb923c', bg: 'rgba(251,146,60,0.15)' };
  return              { label: '대흉', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
}

// ── 점수에 따른 링 색상 ──
function getScoreColor(score) {
  if (score >= 90) return '#FFD700';
  if (score >= 70) return '#4ade80';
  if (score >= 50) return '#60a5fa';
  if (score >= 30) return '#fb923c';
  return '#f87171';
}

function Dream() {
  // ─── 상태 ───
  const [step, setStep] = useState('input');     // 'input' | 'loading' | 'streaming' | 'result'
  const [dreamText, setDreamText] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [showPersonal, setShowPersonal] = useState(false);
  const [result, setResult] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const resultRef = useRef(null);
  const textareaRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 결과 등장 시 매트릭스 페이드아웃
  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);


  // ── 키워드 클릭 ──
  const handleKeyword = (keyword) => {
    const newText = dreamText
      ? (dreamText.endsWith(' ') ? dreamText + keyword : dreamText + ' ' + keyword)
      : keyword;
    if (newText.length <= MAX_CHARS) {
      setDreamText(newText);
      textareaRef.current?.focus();
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  // ── 꿈 해석 요청 (스트리밍) ──
  const handleSubmit = () => {
    if (!dreamText.trim()) return;
    setStep('loading');
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const cleanup = interpretDreamStream(
      dreamText.trim(),
      birthDate || undefined,
      gender || undefined,
      {
        onChunk: (chunk) => {
          setStreamText(prev => prev + chunk);
          setStep('streaming');
        },
        onCached: (data) => {
          setResult(data);
          setStep('result');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onDone: (fullText) => {
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          const parsed = parseAiJson(fullText);
          if (parsed) {
            setResult(parsed);
          } else {
            setResult({ interpretation: fullText, score: 65, category: '일반', symbol: '🌙' });
          }
          setStep('result');
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onError: (err) => {
          console.error('꿈해몽 스트리밍 실패:', err);
          setMatrixShown(false);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          setResult({
            category: '일반',
            symbol: '🌙',
            score: 65,
            interpretation: '꿈은 당신의 내면을 반영하고 있습니다. 최근 마음속에 품고 있던 소망이나 걱정이 꿈으로 나타났을 수 있습니다.',
            psychology: '무의식에서 보내는 메시지에 주의를 기울여보세요.',
            fortuneHint: '가까운 시일 내에 새로운 기회가 찾아올 수 있습니다.',
            luckyAction: '명상이나 산책으로 마음을 정리해보세요',
            luckyNumber: 7,
          });
          setStep('result');
        },
      }
    );
    cleanupRef.current = cleanup;
  };

  // ── 공유 ──
  const handleShare = () => {
    if (!result) return;
    const rating = getRating(result.score);
    const text = `🌙 꿈해몽 결과\n\n` +
      `분류: ${result.symbol || '🌙'} ${result.category}\n` +
      `등급: ${rating.label} (${result.score}점)\n\n` +
      `${result.interpretation}\n\n` +
      `연애 앱에서 나만의 꿈을 해석해보세요!`;
    if (navigator.share) {
      navigator.share({ title: '꿈해몽 결과', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('결과가 복사되었습니다!');
    }
  };

  // ── 초기화 ──
  const resetAll = () => {
    setStep('input');
    setDreamText('');
    setResult(null);
    setMatrixShown(false);
    setMatrixExiting(false);
    setStreamText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ═══ 렌더링 ═══
  return (
    <div className="dream-page">

      {/* ── 신비로운 배경 ── */}
      <div className="dream-bg">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} className="dream-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${Math.random() * 3 + 1}px`,
          }}>*</span>
        ))}
        <div className="dream-mist dream-mist--1" />
        <div className="dream-mist dream-mist--2" />
      </div>

      {/* ── 히어로 ── */}
      <div className="dream-hero">
        <div className="dream-hero-glow" />
        <div className="dream-hero-moon">🌙</div>
        <h1 className="dream-title">꿈해몽</h1>
        <p className="dream-subtitle">꿈 속 메시지를 풀어드립니다</p>
      </div>

      {/* ═══ STEP: 입력 ═══ */}
      {step === 'input' && (
        <div className="dream-input-section fade-in">

          {/* 인기 키워드 */}
          <section className="dream-section">
            <h2 className="dream-section-title">
              <span className="dream-section-icon">✨</span>
              인기 꿈 키워드
            </h2>
            <div className="dream-keywords">
              {DREAM_KEYWORDS.map(kw => (
                <button key={kw.label}
                  className="dream-keyword-chip"
                  onClick={() => handleKeyword(kw.label)}>
                  <span className="dream-chip-emoji">{kw.emoji}</span>
                  <span className="dream-chip-label">{kw.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 꿈 설명 텍스트 */}
          <section className="dream-section">
            <h2 className="dream-section-title">
              <span className="dream-section-icon">💭</span>
              꿈 내용
            </h2>
            <div className="dream-textarea-wrap">
              <textarea
                ref={textareaRef}
                className="dream-textarea glass-card"
                placeholder="간밤에 꾼 꿈을 자유롭게 적어주세요...&#10;예: 하늘을 날고 있었는데 갑자기 바다가 보였고 그 속에서 금빛 물고기가 나왔다"
                value={dreamText}
                onChange={e => {
                  if (e.target.value.length <= MAX_CHARS) setDreamText(e.target.value);
                }}
                maxLength={MAX_CHARS}
                rows={5}
              />
              <div className="dream-char-count">
                <span className={dreamText.length >= MAX_CHARS ? 'dream-char-limit' : ''}>
                  {dreamText.length}
                </span>
                /{MAX_CHARS}
              </div>
            </div>
          </section>

          {/* 개인화 옵션 (선택) */}
          <section className="dream-section">
            {!showPersonal ? (
              <button className="dream-personal-toggle" onClick={() => setShowPersonal(true)}>
                + 생년월일/성별 입력 (맞춤 분석)
              </button>
            ) : (
              <div className="dream-personal-form glass-card fade-in">
                <h3 className="dream-personal-title">
                  맞춤 분석 <span className="dream-optional">(선택)</span>
                </h3>
                <div className="dream-form-group">
                  <label className="dream-label">생년월일</label>
                  <BirthDatePicker value={birthDate} onChange={setBirthDate} />
                </div>
                <div className="dream-form-group">
                  <label className="dream-label">성별</label>
                  <div className="dream-toggle">
                    <button
                      className={`dream-toggle-btn ${gender === 'M' ? 'active' : ''}`}
                      onClick={() => setGender(gender === 'M' ? '' : 'M')}>
                      <span className="g-circle g-male">♂</span>
                    </button>
                    <button
                      className={`dream-toggle-btn ${gender === 'F' ? 'active' : ''}`}
                      onClick={() => setGender(gender === 'F' ? '' : 'F')}>
                      <span className="g-circle g-female">♀</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 제출 버튼 */}
          <button
            className="dream-submit-btn"
            onClick={handleSubmit}
            disabled={!dreamText.trim()}>
            <span className="dream-submit-icon">🌙</span>
            <span>꿈 해석하기</span>
            <span className="dream-submit-glow" />
          </button>
        </div>
      )}

      {/* ═══ 매트릭스 오버레이 (로딩/스트리밍 중) ═══ */}
      {matrixShown && (step === 'loading' || step === 'streaming') && (
        <AnalysisMatrix theme="saju" label="AI가 꿈을 해석하고 있어요" streamText={streamText} exiting={matrixExiting} />
      )}

      {/* ═══ STEP: 결과 ═══ */}
      {step === 'result' && result && (() => {
        const rating = getRating(result.score);
        const scoreColor = getScoreColor(result.score);
        const dashArray = `${(result.score / 100) * 327} 327`;

        return (
          <div className="dream-result fade-in" ref={resultRef}>

            {/* ── 카테고리 + 점수 카드 ── */}
            <div className="dream-score-card glass-card">
              <div className="dream-category-badge" style={{ background: rating.bg, color: rating.color }}>
                <span className="dream-category-symbol">{result.symbol || '🌙'}</span>
                <span className="dream-category-text">{result.category || '일반'}</span>
              </div>

              <div className="dream-score-wrap">
                <svg viewBox="0 0 120 120" className="dream-score-circle">
                  <circle cx="60" cy="60" r="52" className="dream-score-bg" />
                  <circle cx="60" cy="60" r="52" className="dream-score-fill"
                    style={{ strokeDasharray: dashArray, stroke: scoreColor }} />
                </svg>
                <div className="dream-score-text">
                  <span className="dream-score-num">{result.score}</span>
                  <span className="dream-score-unit">점</span>
                </div>
              </div>

              <div className="dream-rating-badge" style={{ background: rating.bg, color: rating.color }}>
                {rating.label}
              </div>
            </div>

            {/* ── 해석 카드 ── */}
            <FortuneCard
              icon="🌙"
              title="꿈 해석"
              description={result.interpretation}
              delay={0}
            />

            {/* ── 심리 분석 ── */}
            {result.psychology && (
              <FortuneCard
                icon="🧠"
                title="심리 분석"
                description={result.psychology}
                delay={100}
              />
            )}

            {/* ── 운세 힌트 ── */}
            {result.fortuneHint && (
              <FortuneCard
                icon="🔮"
                title="운세 힌트"
                description={result.fortuneHint}
                delay={200}
              />
            )}

            {/* ── 행운 액션 + 숫자 ── */}
            {(result.luckyAction || result.luckyNumber) && (
              <div className="dream-lucky glass-card">
                {result.luckyAction && (
                  <div className="dream-lucky-item">
                    <span className="dream-lucky-label">행운의 행동</span>
                    <span className="dream-lucky-value">{result.luckyAction}</span>
                  </div>
                )}
                {result.luckyAction && result.luckyNumber && (
                  <div className="dream-lucky-divider" />
                )}
                {result.luckyNumber && (
                  <div className="dream-lucky-item">
                    <span className="dream-lucky-label">행운의 숫자</span>
                    <span className="dream-lucky-value dream-lucky-number">{result.luckyNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── 액션 버튼 ── */}
            <div className="dream-actions">
              <button className="dream-action-btn dream-share-btn" onClick={handleShare}>
                <span>📤</span> 공유하기
              </button>
              <button className="dream-action-btn dream-reset-btn" onClick={resetAll}>
                <span>🔄</span> 다시 해몽하기
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Dream;
