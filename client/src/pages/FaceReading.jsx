import { useState, useRef, useEffect } from 'react';
import { analyzeFaceReadingStream } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import parseAiJson from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost from '../components/HeartCost';
import './FaceReading.css';

// ═══════════════════════════════════════════════════
// 관상 특징 데이터
// ═══════════════════════════════════════════════════
const FACE_FEATURES = [
  {
    id: 'faceShape',
    label: '얼굴형',
    icon: '🧑',
    options: [
      { value: '둥근형', emoji: '🟠', desc: '둥글고 부드러운' },
      { value: '긴형', emoji: '📐', desc: '길고 날렵한' },
      { value: '각진형', emoji: '⬜', desc: '각지고 단단한' },
      { value: '역삼각형', emoji: '🔻', desc: '이마 넓고 턱 좁은' },
      { value: '타원형', emoji: '🥚', desc: '균형 잡힌' },
    ],
  },
  {
    id: 'eyeShape',
    label: '눈',
    icon: '👁',
    options: [
      { value: '큰 눈', emoji: '👀', desc: '크고 선명한' },
      { value: '작은 눈', emoji: '🫣', desc: '작고 깊은' },
      { value: '긴 눈', emoji: '🌊', desc: '길게 뻗은' },
      { value: '둥근 눈', emoji: '🔵', desc: '동그란' },
      { value: '날카로운 눈', emoji: '🦅', desc: '날카로운' },
    ],
  },
  {
    id: 'noseShape',
    label: '코',
    icon: '👃',
    options: [
      { value: '높은 코', emoji: '🏔', desc: '높고 뚜렷한' },
      { value: '넓은 코', emoji: '🌄', desc: '넓고 안정적인' },
      { value: '오뚝한 코', emoji: '⛰', desc: '오뚝하고 세련된' },
      { value: '둥근 코', emoji: '🟡', desc: '둥글고 복스러운' },
      { value: '작은 코', emoji: '🔹', desc: '작고 앙증맞은' },
    ],
  },
  {
    id: 'mouthShape',
    label: '입',
    icon: '👄',
    options: [
      { value: '큰 입', emoji: '😃', desc: '크고 시원한' },
      { value: '작은 입', emoji: '🤏', desc: '작고 단정한' },
      { value: '두꺼운 입술', emoji: '💋', desc: '두툼한' },
      { value: '얇은 입술', emoji: '➖', desc: '얇고 날렵한' },
      { value: '입꼬리 올라감', emoji: '😊', desc: '입꼬리가 올라간' },
    ],
  },
  {
    id: 'foreheadShape',
    label: '이마',
    icon: '🧠',
    options: [
      { value: '넓은 이마', emoji: '📏', desc: '넓고 시원한' },
      { value: '좁은 이마', emoji: '📎', desc: '좁고 아담한' },
      { value: '볼록한 이마', emoji: '🌙', desc: '볼록하게 나온' },
      { value: '평평한 이마', emoji: '📋', desc: '평평하고 단정한' },
      { value: '높은 이마', emoji: '🗼', desc: '높고 넓은' },
    ],
  },
];

const ELEMENT_COLORS = {
  '목(木)': '#2ECC71', '화(火)': '#E74C3C', '토(土)': '#F4D03F',
  '금(金)': '#BDC3C7', '수(水)': '#3498DB',
};

function FaceReading() {
  // ─── 상태 ───
  const [step, setStep] = useState('select'); // select | loading | result
  const [currentFeature, setCurrentFeature] = useState(0);
  const [selections, setSelections] = useState({});
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanPhase, setScanPhase] = useState(0);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const resultRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  // cleanup on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 결과 등장 시 매트릭스 페이드아웃
  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);

  const allSelected = FACE_FEATURES.every(f => selections[f.id]);

  const handleSelect = (featureId, value) => {
    const newSelections = { ...selections, [featureId]: value };
    setSelections(newSelections);
    // 자동 다음 단계
    if (currentFeature < FACE_FEATURES.length - 1) {
      setTimeout(() => setCurrentFeature(prev => prev + 1), 400);
    }
  };

  const handleAnalyze = () => {
    if (!allSelected) return;
    setStep('loading');
    setLoading(true);
    setScanPhase(0);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    // 스캔 애니메이션 단계 (로딩 중 표시)
    let phaseIdx = 0;
    const phaseTimer = setInterval(() => {
      phaseIdx++;
      if (phaseIdx < 4) setScanPhase(phaseIdx);
      else clearInterval(phaseTimer);
    }, 800);

    const cleanup = analyzeFaceReadingStream(
      selections.faceShape,
      selections.eyeShape,
      selections.noseShape,
      selections.mouthShape,
      selections.foreheadShape,
      birthDate || undefined,
      gender || undefined,
      {
        onChunk: (chunk) => {
          clearInterval(phaseTimer);
          setStreamText(prev => prev + chunk);
          setStep('streaming');
        },
        onCached: (data) => {
          clearInterval(phaseTimer);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          // 서버 필드명 → 프론트 필드명 매핑
          const mapped = {
            overallType: data.overallType,
            emoji: data.overallEmoji || data.emoji,
            element: data.faceElement || data.element,
            score: data.score,
            grade: data.grade,
            personality: data.personality,
            wealth: data.moneyFortune || data.wealth,
            love: data.loveFortune || data.love,
            career: data.careerFortune || data.career,
            health: data.healthFortune || data.health,
            strengths: data.strengths,
            improvements: data.improvements,
            luckyColor: data.luckyColor,
            luckyDirection: data.luckyDirection,
            luckyNumber: data.luckyNumber,
          };
          setResult(mapped);
          setStep('result');
          setLoading(false);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onDone: (fullText) => {
          clearInterval(phaseTimer);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          const data = parseAiJson(fullText);
          if (data) {
            const mapped = {
              overallType: data.overallType,
              emoji: data.overallEmoji || data.emoji,
              element: data.faceElement || data.element,
              score: data.score,
              grade: data.grade,
              personality: data.personality,
              wealth: data.moneyFortune || data.wealth,
              love: data.loveFortune || data.love,
              career: data.careerFortune || data.career,
              health: data.healthFortune || data.health,
              strengths: data.strengths,
              improvements: data.improvements,
              luckyColor: data.luckyColor,
              luckyDirection: data.luckyDirection,
              luckyNumber: data.luckyNumber,
            };
            setResult(mapped);
          } else {
            setResult({ overallType: '분석 완료', personality: fullText, score: 75, grade: 'B' });
          }
          setStep('result');
          setLoading(false);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onError: (err) => {
          clearInterval(phaseTimer);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          console.error('관상 분석 실패:', err);
          setMatrixShown(false);
          setResult({
            overallType: '복덕상',
            emoji: '😊',
            element: '목(木)',
            score: 82,
            grade: 'A',
            personality: '타고난 인복이 있으며, 주변 사람들에게 편안한 인상을 줍니다. 따뜻한 성품과 강한 책임감이 조화를 이루고 있습니다.',
            wealth: '안정적인 재물운을 가지고 있습니다. 꾸준한 노력이 큰 성과로 돌아옵니다.',
            love: '매력적인 인상으로 좋은 인연을 만날 가능성이 높습니다. 진심 어린 대화가 관계를 깊게 합니다.',
            career: '리더십과 협동심이 조화를 이루어 직장에서 인정받을 수 있습니다.',
            health: '전반적으로 건강한 체질이지만, 스트레스 관리에 신경 쓰세요.',
            strengths: ['타고난 인복', '안정적인 재운', '좋은 대인관계'],
            improvements: ['때로 우유부단한 면', '과도한 걱정'],
            luckyColor: '초록색',
            luckyDirection: '동쪽',
            luckyNumber: 7,
          });
          setStep('result');
          setLoading(false);
        },
      }
    );
    cleanupRef.current = cleanup;
  };

  const resetAll = () => {
    setStep('select');
    setCurrentFeature(0);
    setSelections({});
    setBirthDate('');
    setGender('');
    setResult(null);
    setScanPhase(0);
    setMatrixShown(false);
    setMatrixExiting(false);
    setStreamText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (!result) return;
    const text = `👤 AI 관상 분석 결과\n\n` +
      `유형: ${result.emoji} ${result.overallType}\n` +
      `점수: ${result.score}점 (${result.grade}등급)\n\n` +
      `${result.personality}\n\n` +
      `연애 앱에서 나만의 관상을 분석해보세요!`;
    if (navigator.share) {
      navigator.share({ title: 'AI 관상 분석 결과', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('결과가 복사되었습니다!');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#FFD700';
    if (score >= 70) return '#2ECC71';
    if (score >= 50) return '#3498DB';
    return '#E67E22';
  };

  const scanMessages = [
    '얼굴 윤곽을 분석하고 있습니다...',
    '이목구비 조화를 측정합니다...',
    '관상학적 의미를 해석합니다...',
    '운세를 종합하고 있습니다...',
  ];

  // ═══ 렌더링 ═══
  return (
    <div className="fr-page">
      {/* 배경 효과 */}
      <div className="fr-bg">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="fr-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${Math.random() * 3 + 2}px`,
          }}>&#10022;</span>
        ))}
      </div>

      {/* ═══ 히어로 ═══ */}
      {step === 'select' && (
        <div className="fr-hero fade-in">
          <div className="fr-hero-glow" />
          <div className="fr-hero-icon">&#128100;</div>
          <h1 className="fr-title">AI 관상 분석</h1>
          <p className="fr-subtitle">당신의 이목구비로 알아보는 운명의 메시지</p>
          <div className="fr-hero-divider" />
        </div>
      )}

      {/* ═══ STEP 1: 특징 선택 ═══ */}
      {step === 'select' && (
        <div className="fr-select fade-in">
          {/* 진행 표시 */}
          <div className="fr-progress">
            {FACE_FEATURES.map((f, i) => (
              <button
                key={f.id}
                className={`fr-progress-dot ${i === currentFeature ? 'active' : ''} ${selections[f.id] ? 'done' : ''}`}
                onClick={() => setCurrentFeature(i)}
              >
                <span className="fr-progress-icon">{f.icon}</span>
                <span className="fr-progress-label">{f.label}</span>
              </button>
            ))}
          </div>

          {/* 현재 특징 선택 */}
          {FACE_FEATURES.map((feature, fIdx) => (
            fIdx === currentFeature && (
              <div key={feature.id} className="fr-feature-section fade-in">
                <h2 className="fr-feature-title">
                  <span className="fr-feature-icon">{feature.icon}</span>
                  {feature.label} 선택
                  <span className="fr-feature-step">{fIdx + 1}/{FACE_FEATURES.length}</span>
                </h2>
                <div className="fr-options-grid">
                  {feature.options.map(opt => (
                    <button
                      key={opt.value}
                      className={`fr-option glass-card ${selections[feature.id] === opt.value ? 'active' : ''}`}
                      onClick={() => handleSelect(feature.id, opt.value)}
                    >
                      <span className="fr-option-emoji">{opt.emoji}</span>
                      <span className="fr-option-value">{opt.value}</span>
                      <span className="fr-option-desc">{opt.desc}</span>
                      {selections[feature.id] === opt.value && (
                        <span className="fr-option-check">&#10003;</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}

          {/* 선택 요약 */}
          {Object.keys(selections).length > 0 && (
            <div className="fr-summary glass-card fade-in">
              <h3 className="fr-summary-title">선택한 특징</h3>
              <div className="fr-summary-tags">
                {FACE_FEATURES.map(f => selections[f.id] ? (
                  <span key={f.id} className="fr-summary-tag">
                    {f.icon} {selections[f.id]}
                  </span>
                ) : null)}
              </div>
            </div>
          )}

          {/* 추가 정보 (선택) */}
          {allSelected && (
            <div className="fr-extra fade-in">
              <h3 className="fr-extra-title">
                추가 정보 <span className="fr-optional">(선택)</span>
              </h3>
              <div className="fr-extra-fields">
                <div className="fr-field">
                  <label className="fr-label">생년월일</label>
                  <BirthDatePicker value={birthDate} onChange={setBirthDate} />
                </div>
                <div className="fr-field">
                  <label className="fr-label">성별</label>
                  <div className="fr-toggle">
                    <button
                      className={`fr-toggle-btn ${gender === 'male' ? 'active' : ''}`}
                      onClick={() => setGender(gender === 'male' ? '' : 'male')}
                    ><span className="g-circle g-male">♂</span></button>
                    <button
                      className={`fr-toggle-btn ${gender === 'female' ? 'active' : ''}`}
                      onClick={() => setGender(gender === 'female' ? '' : 'female')}
                    ><span className="g-circle g-female">♀</span></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 분석 버튼 */}
          <button
            className="fr-analyze-btn"
            onClick={handleAnalyze}
            disabled={!allSelected}
          >
            <span className="fr-analyze-icon">&#128100;</span>
            <span>{allSelected ? '관상 분석 시작' : `${FACE_FEATURES.length - Object.keys(selections).length}개 더 선택해주세요`}</span>
            {allSelected && <HeartCost category="FACE_READING" />}
            {allSelected && <span className="fr-analyze-glow" />}
          </button>
        </div>
      )}

      {/* ═══ STEP 2: 로딩 (스캔 애니메이션) ═══ */}
      {step === 'loading' && (
        <div className="fr-loading fade-in">
          <div className="fr-scan-container">
            <div className="fr-scan-face">
              <div className="fr-scan-outline">
                <svg viewBox="0 0 120 150" width="120" height="150">
                  <ellipse cx="60" cy="75" rx="50" ry="65" fill="none" stroke="rgba(218,165,32,0.3)" strokeWidth="2" />
                  {/* 눈 */}
                  <ellipse cx="40" cy="60" rx="10" ry="6" fill="none" stroke="rgba(218,165,32,0.4)" strokeWidth="1.5" className="fr-scan-eye" />
                  <ellipse cx="80" cy="60" rx="10" ry="6" fill="none" stroke="rgba(218,165,32,0.4)" strokeWidth="1.5" className="fr-scan-eye" />
                  {/* 코 */}
                  <path d="M55 70 Q60 90 65 70" fill="none" stroke="rgba(218,165,32,0.3)" strokeWidth="1.5" className="fr-scan-nose" />
                  {/* 입 */}
                  <path d="M42 100 Q60 115 78 100" fill="none" stroke="rgba(218,165,32,0.3)" strokeWidth="1.5" className="fr-scan-mouth" />
                </svg>
                <div className="fr-scan-line" />
              </div>
            </div>
            <div className="fr-scan-rings">
              <div className="fr-scan-ring fr-scan-ring--1" />
              <div className="fr-scan-ring fr-scan-ring--2" />
              <div className="fr-scan-ring fr-scan-ring--3" />
            </div>
          </div>
          <p className="fr-scan-text">{scanMessages[scanPhase]}</p>
          <div className="fr-scan-progress">
            <div className="fr-scan-progress-fill" style={{ width: `${((scanPhase + 1) / scanMessages.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ═══ 매트릭스 오버레이 (로딩/스트리밍 중) ═══ */}
      {matrixShown && (step === 'loading' || step === 'streaming') && (
        <AnalysisMatrix theme="saju" label="AI가 관상을 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
      )}

      {/* ═══ STEP 3: 결과 ═══ */}
      {step === 'result' && result && (
        <div className="fr-result fade-in" ref={resultRef}>
          {/* 전체 유형 */}
          <div className="fr-type-card glass-card">
            <div className="fr-type-aura" style={{ background: `radial-gradient(circle, ${ELEMENT_COLORS[result.element] || '#DAA520'}22, transparent 70%)` }} />
            <div className="fr-type-emoji">{result.emoji || '😊'}</div>
            <h2 className="fr-type-name">{result.overallType}</h2>
            {result.element && (
              <span className="fr-element-badge" style={{ background: `${ELEMENT_COLORS[result.element] || '#DAA520'}22`, color: ELEMENT_COLORS[result.element] || '#DAA520' }}>
                {result.element}
              </span>
            )}
          </div>

          {/* 점수 */}
          <div className="fr-score-card glass-card">
            <div className="fr-score-circle">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke={getScoreColor(result.score || 75)}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${((result.score || 75) / 100) * 327} 327`}
                  transform="rotate(-90 60 60)"
                  className="fr-score-ring"
                />
              </svg>
              <div className="fr-score-value">
                <span className="fr-score-num">{result.score || 75}</span>
                <span className="fr-score-unit">점</span>
              </div>
            </div>
            <div className="fr-score-grade" style={{ color: getScoreColor(result.score || 75) }}>
              {result.grade || 'A'} 등급
            </div>
          </div>

          {/* 성격 분석 */}
          <div className="fr-personality glass-card">
            <h3 className="fr-section-title"><span>&#128203;</span> 성격 분석</h3>
            <p className="fr-personality-text">{result.personality}</p>
          </div>

          {/* 운세 카드 */}
          <div className="fr-fortune-cards">
            <FortuneCard icon="&#128176;" title="재물운" description={result.wealth || '안정적인 재물운을 가지고 있습니다.'} delay={0} />
            <FortuneCard icon="&#128149;" title="애정운" description={result.love || '좋은 인연을 만날 가능성이 높습니다.'} delay={100} />
            <FortuneCard icon="&#128188;" title="직장운" description={result.career || '직장에서 인정받을 수 있습니다.'} delay={200} />
            <FortuneCard icon="&#128154;" title="건강운" description={result.health || '건강 관리에 신경 쓰세요.'} delay={300} />
          </div>

          {/* 장점 & 개선점 */}
          <div className="fr-lists">
            {result.strengths && result.strengths.length > 0 && (
              <div className="fr-list-card glass-card">
                <h3 className="fr-list-title fr-list-title--strength">&#127775; 강점</h3>
                <div className="fr-list-items">
                  {result.strengths.map((s, i) => (
                    <span key={i} className="fr-list-badge fr-badge--strength">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {result.improvements && result.improvements.length > 0 && (
              <div className="fr-list-card glass-card">
                <h3 className="fr-list-title fr-list-title--improve">&#128161; 개선점</h3>
                <div className="fr-list-items">
                  {result.improvements.map((s, i) => (
                    <span key={i} className="fr-list-badge fr-badge--improve">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 행운 정보 */}
          <div className="fr-lucky glass-card">
            <h3 className="fr-section-title"><span>&#127808;</span> 행운 정보</h3>
            <div className="fr-lucky-grid">
              {result.luckyColor && (
                <div className="fr-lucky-item">
                  <span className="fr-lucky-label">행운의 색</span>
                  <span className="fr-lucky-value">{result.luckyColor}</span>
                </div>
              )}
              {result.luckyDirection && (
                <div className="fr-lucky-item">
                  <span className="fr-lucky-label">행운의 방향</span>
                  <span className="fr-lucky-value">{result.luckyDirection}</span>
                </div>
              )}
              {result.luckyNumber !== undefined && (
                <div className="fr-lucky-item">
                  <span className="fr-lucky-label">행운의 숫자</span>
                  <span className="fr-lucky-value">{result.luckyNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* 액션 */}
          <div className="fr-actions">
            <button className="fr-action-btn fr-share-btn" onClick={handleShare}>
              <span>&#128228;</span> 공유하기
            </button>
            <button className="fr-action-btn fr-reset-btn" onClick={resetAll}>
              <span>&#128260;</span> 다시 분석
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaceReading;
