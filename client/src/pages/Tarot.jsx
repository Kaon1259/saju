import { useState, useEffect, useRef, useCallback } from 'react';
import { getTarotReading, drawTarotCards } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import TarotCardArt from '../components/TarotCardArt';
import './Tarot.css';

// ═══════════════════════════════════════════════════
// 메이저 아르카나 22장 데이터
// ═══════════════════════════════════════════════════
const MAJOR_ARCANA = [
  { id: 0,  nameEn: 'The Fool',            nameKr: '광대',          color: '#FFD700', msg: '새로운 시작과 모험의 기운이 감돕니다. 두려움 없이 한 걸음을 내딛으세요.' },
  { id: 1,  nameEn: 'The Magician',        nameKr: '마법사',        color: '#FF6B35', msg: '당신에게는 원하는 것을 현실로 만들 힘이 있습니다.' },
  { id: 2,  nameEn: 'The High Priestess',  nameKr: '여사제',        color: '#4A90D9', msg: '내면의 목소리에 귀 기울이세요. 직관이 답을 알고 있습니다.' },
  { id: 3,  nameEn: 'The Empress',         nameKr: '여황제',        color: '#2ECC71', msg: '풍요와 창조의 에너지가 넘칩니다. 사랑이 꽃피는 시기입니다.' },
  { id: 4,  nameEn: 'The Emperor',         nameKr: '황제',          color: '#E74C3C', msg: '질서와 리더십을 발휘할 때입니다. 계획대로 진행하세요.' },
  { id: 5,  nameEn: 'The Hierophant',      nameKr: '교황',          color: '#8E44AD', msg: '전통과 가르침 안에서 답을 찾으세요. 좋은 멘토를 만나게 됩니다.' },
  { id: 6,  nameEn: 'The Lovers',          nameKr: '연인',          color: '#FF69B4', msg: '중요한 선택의 기로에 섰습니다. 마음이 이끄는 방향을 따르세요.' },
  { id: 7,  nameEn: 'The Chariot',         nameKr: '전차',          color: '#3498DB', msg: '강한 의지로 전진하세요. 승리가 기다리고 있습니다.' },
  { id: 8,  nameEn: 'Strength',            nameKr: '힘',            color: '#F39C12', msg: '부드러운 힘이 강한 힘을 이깁니다. 인내심이 보상받습니다.' },
  { id: 9,  nameEn: 'The Hermit',          nameKr: '은둔자',        color: '#7F8C8D', msg: '내면을 탐구하면 답을 찾게 됩니다. 조용한 지혜가 빛납니다.' },
  { id: 10, nameEn: 'Wheel of Fortune',    nameKr: '운명의 수레바퀴', color: '#9B59B6', msg: '운명의 전환점에 섰습니다. 변화를 받아들이세요.' },
  { id: 11, nameEn: 'Justice',             nameKr: '정의',          color: '#1ABC9C', msg: '정당한 결과를 받게 됩니다. 공정하게 행동하세요.' },
  { id: 12, nameEn: 'The Hanged Man',      nameKr: '매달린 사람',   color: '#2980B9', msg: '다른 관점에서 바라보세요. 전략적 기다림이 필요합니다.' },
  { id: 13, nameEn: 'Death',               nameKr: '죽음',          color: '#2C3E50', msg: '하나의 장이 끝나고 새로운 장이 열립니다. 변화가 성장을 가져옵니다.' },
  { id: 14, nameEn: 'Temperance',          nameKr: '절제',          color: '#16A085', msg: '균형과 조화를 유지하세요. 중용의 길이 답입니다.' },
  { id: 15, nameEn: 'The Devil',           nameKr: '악마',          color: '#C0392B', msg: '자신을 속박하는 것에서 벗어나세요. 자유를 되찾을 때입니다.' },
  { id: 16, nameEn: 'The Tower',           nameKr: '탑',            color: '#E67E22', msg: '예상치 못한 변화가 옵니다. 파괴 후에 재건이 있습니다.' },
  { id: 17, nameEn: 'The Star',            nameKr: '별',            color: '#F1C40F', msg: '희망의 빛이 비칩니다. 치유와 회복의 시간입니다.' },
  { id: 18, nameEn: 'The Moon',            nameKr: '달',            color: '#BDC3C7', msg: '숨겨진 것들이 드러나는 시기입니다. 직감을 믿으세요.' },
  { id: 19, nameEn: 'The Sun',             nameKr: '태양',          color: '#F4D03F', msg: '성공과 기쁨의 시기입니다. 자신감을 갖고 빛나세요.' },
  { id: 20, nameEn: 'Judgement',           nameKr: '심판',          color: '#8E44AD', msg: '과거를 돌아보고 새롭게 시작할 때입니다. 내면의 소명을 따르세요.' },
  { id: 21, nameEn: 'The World',           nameKr: '세계',          color: '#27AE60', msg: '하나의 순환이 완성됩니다. 목표를 달성하고 새로운 차원으로 나아갑니다.' },
];

const SPREADS = [
  { id: 'one',   label: '원카드',   count: 1, icon: '🎴', desc: '핵심 메시지 한 장' },
  { id: 'three', label: '쓰리카드', count: 3, icon: '🃏', desc: '과거 · 현재 · 미래' },
  { id: 'five',  label: '켈틱',     count: 5, icon: '✨', desc: '상황 · 장애 · 잠재 · 조언 · 결과' },
];

const CATEGORIES = [
  { id: 'general', label: '종합운', icon: '🔮', color: '#9B59B6' },
  { id: 'love',    label: '연애운', icon: '💕', color: '#E91E63' },
  { id: 'money',   label: '재물운', icon: '💰', color: '#F4D03F' },
  { id: 'career',  label: '직업운', icon: '💼', color: '#3498DB' },
  { id: 'health',  label: '건강운', icon: '💚', color: '#2ECC71' },
  { id: 'study',   label: '학업운', icon: '📚', color: '#FF9800' },
];

const POSITION_LABELS = {
  one: ['현재의 메시지'],
  three: ['과거', '현재', '미래'],
  five: ['현재 상황', '장애물', '잠재의식', '조언', '결과'],
};

// ── 인트로: 카드 앞면 바로 등장 → 글로우 → 페이드아웃 ──
function TarotIntro({ onDone, heroCardId, deck }) {
  const [phase, setPhase] = useState(0); // 0=등장, 1=글로우, 2=페이드아웃

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`tarot-intro ${phase >= 2 ? 'fade-out' : ''}`}>
      <div className="tarot-intro-bg">
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} className="tarot-intro-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            fontSize: `${1 + Math.random() * 3}px`,
          }}>✦</span>
        ))}
      </div>
      <div className={`tarot-intro-card-wrap ${phase >= 1 ? 'glow' : ''}`}>
        <TarotCardArt cardId={heroCardId} deck={deck} />
      </div>
    </div>
  );
}

function Tarot() {
  // ─── 상태 ───
  const [heroCardId] = useState(() => Math.floor(Math.random() * 22));
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState('setup');
  const [deck, setDeck] = useState(() => localStorage.getItem('tarotDeck') || 'classic');
  const [spread, setSpread] = useState('three');
  const [category, setCategory] = useState('general');
  const [question, setQuestion] = useState('');
  const [shuffledCards, setShuffledCards] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [revealedCards, setRevealedCards] = useState([]);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shuffleAnim, setShuffleAnim] = useState(false);
  const [flipIndex, setFlipIndex] = useState(-1);
  const [focusCard, setFocusCard] = useState(null); // 클릭한 카드 인덱스
  const resultRef = useRef(null);

  const requiredCount = SPREADS.find(s => s.id === spread)?.count || 3;

  // ─── 카드 셔플 ───
  const startShuffle = useCallback(() => {
    setStep('shuffle');
    setShuffleAnim(true);
    setSelectedIndices([]);
    setRevealedCards([]);
    setReading(null);
    setFlipIndex(-1);

    const indices = Array.from({ length: 22 }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const cards = indices.map(idx => ({
      ...MAJOR_ARCANA[idx],
      reversed: Math.random() > 0.5,
    }));

    setTimeout(() => {
      setShuffledCards(cards);
      setShuffleAnim(false);
      setStep('pick');
    }, 2000);
  }, []);

  const handleCardPick = (index) => {
    if (step !== 'pick') return;
    if (selectedIndices.includes(index)) {
      setSelectedIndices(prev => prev.filter(i => i !== index));
      return;
    }
    if (selectedIndices.length >= requiredCount) return;
    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);
    if (newSelected.length === requiredCount) {
      setTimeout(() => revealCards(newSelected), 600);
    }
  };

  const revealCards = async (indices) => {
    setStep('reveal');
    const cards = indices.map(i => shuffledCards[i]);
    setRevealedCards(cards);

    for (let i = 0; i < cards.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setFlipIndex(i);
    }

    await new Promise(r => setTimeout(r, 800));
    setLoading(true);
    try {
      const cardIds = cards.map(c => c.id).join(',');
      const reversals = cards.map(c => c.reversed ? '1' : '0').join(',');
      const data = await getTarotReading(cardIds, reversals, spread, category, question);
      setReading(data);
      setStep('result');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) {
      console.error('타로 리딩 실패:', e);
      setReading({
        cards: cards.map((c, i) => ({
          ...c,
          position: POSITION_LABELS[spread]?.[i] || '카드',
          meaning: c.reversed
            ? '내면의 성찰이 필요한 시기입니다.'
            : '긍정적인 에너지가 당신을 감싸고 있습니다.',
        })),
        interpretation: '카드가 당신에게 보내는 메시지를 깊이 느껴보세요.',
        overallMessage: '카드의 지혜를 믿고 한 걸음 나아가세요.',
        advice: '마음을 열고 카드의 메시지에 귀 기울이세요.',
        luckyElement: '불(火)',
      });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const handleDeckChange = (d) => {
    setDeck(d);
    localStorage.setItem('tarotDeck', d);
  };

  const resetAll = () => {
    setStep('setup');
    setSpread('three');
    setCategory('general');
    setQuestion('');
    setShuffledCards([]);
    setSelectedIndices([]);
    setRevealedCards([]);
    setReading(null);
    setFlipIndex(-1);
    setFocusCard(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (!reading) return;
    const text = `🔮 타로 리딩 결과\n\n` +
      revealedCards.map((c, i) => {
        const pos = POSITION_LABELS[spread]?.[i] || '';
        return `${pos}: ${c.nameKr} ${c.reversed ? '(역)' : '(정)'}`;
      }).join('\n') +
      `\n\n${reading.overallMessage}\n\n연애 앱에서 나만의 타로를 뽑아보세요!`;
    if (navigator.share) {
      navigator.share({ title: '타로 리딩 결과', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('결과가 복사되었습니다!');
    }
  };

  // ═══ 인트로 ═══
  if (showIntro) {
    return <TarotIntro heroCardId={heroCardId} deck={deck} onDone={() => setShowIntro(false)} />;
  }

  // ═══ 렌더링 ═══
  return (
    <div className="tarot-page">

      {/* ── 신비로운 배경 ── */}
      <div className="tarot-mystical-bg">
        {/* 떠다니는 카드 실루엣 */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`fc-${i}`} className="tarot-float-card" style={{
            left: `${10 + i * 20}%`,
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${8 + i * 2}s`,
            opacity: 0.04 + i * 0.01,
          }}>
            <TarotCardArt cardId={i * 4} deck={deck} />
          </div>
        ))}
        {/* 별 파티클 */}
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="tarot-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${Math.random() * 4 + 2}px`,
          }}>✦</span>
        ))}
        {/* 안개 레이어 */}
        <div className="tarot-mist tarot-mist--1" />
        <div className="tarot-mist tarot-mist--2" />
      </div>

      {/* ── 히어로: 오늘의 카드 (setup에서만 표시) ── */}
      {step === 'setup' && (
        <div className="tarot-hero">
          <div className="tarot-hero-glow" />
          <p className="tarot-hero-badge">Today's Card</p>
          <div className="tarot-hero-card">
            <div className="tarot-hero-card-inner">
              <TarotCardArt cardId={heroCardId} deck={deck} />
            </div>
            <div className="tarot-hero-card-shine" />
          </div>
          <h1 className="tarot-title">{MAJOR_ARCANA[heroCardId].nameKr}</h1>
          <p className="tarot-subtitle">{MAJOR_ARCANA[heroCardId].nameEn}</p>
          <p className="tarot-hero-msg">{MAJOR_ARCANA[heroCardId].msg}</p>
          <div className="tarot-hero-divider" />
        </div>
      )}

      {/* ═══ STEP 1: 설정 ═══ */}
      {step === 'setup' && (
        <div className="tarot-setup fade-in">
          {/* 덱 선택 */}
          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">🃏</span>
              덱 선택
            </h2>
            <div className="tarot-deck-grid">
              <button
                className={`tarot-deck-btn ${deck === 'classic' ? 'active' : ''}`}
                onClick={() => handleDeckChange('classic')}
              >
                <div className="tarot-deck-preview">
                  <img src="/tarot/m01.jpg" alt="Classic" className="tarot-deck-thumb" />
                </div>
                <span className="tarot-deck-name">클래식</span>
                <span className="tarot-deck-sub">Rider-Waite</span>
              </button>
              <button
                className={`tarot-deck-btn ${deck === 'skt' ? 'active' : ''}`}
                onClick={() => handleDeckChange('skt')}
              >
                <div className="tarot-deck-preview">
                  <img src="/tarot-skt/m01.jpg" alt="SKT" className="tarot-deck-thumb" />
                </div>
                <span className="tarot-deck-name">비트루비안</span>
                <span className="tarot-deck-sub">SKT Vitruvian</span>
              </button>
            </div>
          </section>

          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">🎴</span>
              스프레드 선택
            </h2>
            <div className="tarot-spread-grid">
              {SPREADS.map(s => (
                <button key={s.id}
                  className={`tarot-spread-card glass-card ${spread === s.id ? 'active' : ''}`}
                  onClick={() => setSpread(s.id)}>
                  <span className="tarot-spread-icon">{s.icon}</span>
                  <span className="tarot-spread-label">{s.label}</span>
                  <span className="tarot-spread-count">{s.count}장</span>
                  <span className="tarot-spread-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">✨</span>
              궁금한 분야
            </h2>
            <div className="tarot-cat-grid">
              {CATEGORIES.map(cat => (
                <button key={cat.id}
                  className={`tarot-cat-btn ${category === cat.id ? 'active' : ''}`}
                  style={{ '--cat-color': cat.color }}
                  onClick={() => setCategory(cat.id)}>
                  <span className="tarot-cat-icon">{cat.icon}</span>
                  <span className="tarot-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">💭</span>
              질문 <span className="tarot-optional">(선택)</span>
            </h2>
            <textarea
              className="tarot-question glass-card"
              placeholder="카드에게 물어보고 싶은 것을 자유롭게 적어주세요..."
              value={question} onChange={e => setQuestion(e.target.value)}
              maxLength={200} rows={3}
            />
            {question && <div className="tarot-question-count">{question.length}/200</div>}
          </section>

          <button className="tarot-start-btn" onClick={startShuffle}>
            <span className="tarot-start-icon">🔮</span>
            <span>카드 셔플 시작</span>
            <span className="tarot-start-glow" />
          </button>
        </div>
      )}

      {/* ═══ STEP 2: 셔플 ═══ */}
      {step === 'shuffle' && (
        <div className="tarot-shuffle-stage">
          <div className="tarot-shuffle-deck">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i}
                className={`tarot-shuffle-card ${shuffleAnim ? 'shuffling' : ''}`}
                style={{ '--shuffle-i': i, animationDelay: `${i * 0.1}s` }}>
                <div className="tarot-card-back">
                  <div className="tarot-card-back-inner">
                    <div className="tarot-card-back-star">✦</div>
                    <div className="tarot-card-back-border" />
                    <div className="tarot-card-back-pattern">
                      <span>☽</span><span>✦</span><span>☾</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="tarot-shuffle-text">카드를 섞고 있습니다<span className="tarot-dots" /></p>
          <p className="tarot-shuffle-hint">마음을 가라앉히고 질문에 집중하세요</p>
        </div>
      )}

      {/* ═══ STEP 3: 카드 선택 ═══ */}
      {step === 'pick' && (
        <div className="tarot-pick-stage fade-in">
          <div className="tarot-pick-header">
            <p className="tarot-pick-instruction">
              마음이 이끄는 카드 <strong>{requiredCount}장</strong>을 선택하세요
            </p>
            <div className="tarot-pick-counter">
              {selectedIndices.length} / {requiredCount}
            </div>
          </div>

          <div className="tarot-card-fan">
            {shuffledCards.slice(0, 12).map((card, index) => {
              const isSelected = selectedIndices.includes(index);
              const selOrder = selectedIndices.indexOf(index);
              return (
                <button key={card.id}
                  className={`tarot-fan-card ${isSelected ? 'selected' : ''}`}
                  style={{ '--fan-i': index, '--fan-total': 12, '--sel-order': selOrder }}
                  onClick={() => handleCardPick(index)}
                  disabled={!isSelected && selectedIndices.length >= requiredCount}>
                  <div className="tarot-card-back">
                    <div className="tarot-card-back-inner">
                      <div className="tarot-card-back-star">✦</div>
                      <div className="tarot-card-back-border" />
                    </div>
                  </div>
                  {isSelected && (
                    <div className="tarot-card-selected-badge">{selOrder + 1}</div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="tarot-pick-hint">직감을 믿으세요. 당신의 무의식이 올바른 카드로 인도합니다.</p>
        </div>
      )}

      {/* ═══ STEP 4: 리빌 + 결과 ═══ */}
      {(step === 'reveal' || step === 'result') && (
        <div className="tarot-reveal-stage fade-in">
          <div className={`tarot-reveal-cards spread-${spread} ${loading ? 'cards-floating' : 'cards-landed'}`}>
            {revealedCards.map((card, i) => {
              const isFlipped = i <= flipIndex;
              const posLabel = POSITION_LABELS[spread]?.[i] || '';
              const readingCard = reading?.cards?.[i];
              return (
                <div key={card.id} className="tarot-reveal-slot" style={{ '--reveal-i': i }}
                onClick={() => step === 'result' && isFlipped && setFocusCard(i)}>
                  <div className="tarot-position-label">{posLabel}</div>
                  <div className={`tarot-reveal-card ${isFlipped ? 'flipped' : ''} ${card.reversed ? 'reversed-card' : ''} ${step === 'result' && isFlipped ? 'clickable' : ''}`}>
                    {/* 뒷면 */}
                    <div className="tarot-card-face tarot-card-back-face">
                      <div className="tarot-card-back-inner">
                        <div className="tarot-card-back-star">✦</div>
                        <div className="tarot-card-back-border" />
                      </div>
                    </div>
                    {/* 앞면 — SVG 아트 */}
                    <div className={`tarot-card-face tarot-card-front-face ${card.reversed ? 'reversed-front' : ''}`}>
                      <TarotCardArt cardId={card.id} deck={deck} />
                      {card.reversed && (
                        <div className="tarot-card-reversed-tag">역방향</div>
                      )}
                    </div>
                  </div>
                  {isFlipped && step === 'result' && (
                    <div className="tarot-card-name-tag fade-in">{card.nameKr}{card.reversed ? ' (역)' : ''}</div>
                  )}
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="tarot-loading">
              <div className="tarot-loading-orb">
                <div className="tarot-loading-ring" />
                <svg viewBox="0 0 80 80" width="50" height="50">
                  <defs>
                    <radialGradient id="loadCrystal" cx="40%" cy="35%">
                      <stop offset="0%" stopColor="#E8D5F5" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#9B59B6" stopOpacity="0.4" />
                    </radialGradient>
                  </defs>
                  <circle cx="40" cy="40" r="30" fill="url(#loadCrystal)" />
                </svg>
              </div>
              <p className="tarot-loading-text">카드의 메시지를 해석하고 있습니다<span className="tarot-dots" /></p>
            </div>
          )}

          {reading && step === 'result' && (
            <div className="tarot-result fade-in" ref={resultRef}>
              <div className="tarot-overall glass-card">
                <div className="tarot-overall-icon">🌟</div>
                <p className="tarot-overall-text">{reading.overallMessage}</p>
                {reading.luckyElement && (
                  <div className="tarot-lucky-element">
                    행운의 원소: <strong>{reading.luckyElement}</strong>
                  </div>
                )}
              </div>

              <div className="tarot-interpretation glass-card">
                <h3 className="tarot-interp-title"><span>📜</span> 타로 마스터의 해석</h3>
                <div className="tarot-interp-body">
                  {reading.interpretation.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>

              {reading.advice && (
                <FortuneCard icon="💡" title="오늘의 조언" description={reading.advice} delay={200} />
              )}

              <div className="tarot-actions-speech">
                <SpeechButton
                  label="리딩 읽어주기"
                  text={[
                    '타로 리딩 결과입니다.',
                    reading.overallMessage,
                    reading.interpretation,
                    reading.advice ? `오늘의 조언. ${reading.advice}` : '',
                  ].filter(Boolean).join(' ')}
                  summaryText={[
                    '타로 요약입니다.',
                    reading.overallMessage,
                    reading.advice ? `조언. ${reading.advice}` : '',
                  ].filter(Boolean).join(' ')}
                />
              </div>

              <div className="tarot-actions">
                <button className="tarot-action-btn tarot-share-btn" onClick={handleShare}>
                  <span>📤</span> 공유하기
                </button>
                <button className="tarot-action-btn tarot-reset-btn" onClick={resetAll}>
                  <span>🔄</span> 다시 뽑기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 카드 포커스 모달 ═══ */}
      {focusCard !== null && (() => {
        const card = revealedCards[focusCard];
        const readingCard = reading?.cards?.[focusCard];
        const posLabel = POSITION_LABELS[spread]?.[focusCard] || '';
        if (!card) return null;
        return (
          <div className="tarot-focus-overlay" onClick={() => setFocusCard(null)}>
            <div className="tarot-focus-content" onClick={e => e.stopPropagation()}>
              <div className="tarot-focus-card-wrap">
                <div className={`tarot-focus-card ${card.reversed ? 'reversed-front' : ''}`}>
                  <TarotCardArt cardId={card.id} deck={deck} />
                  {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                </div>
              </div>
              <div className="tarot-focus-info">
                <span className="tarot-focus-pos">{posLabel}</span>
                <h3 className="tarot-focus-name">{card.nameKr} {card.reversed ? '(역방향)' : '(정방향)'}</h3>
                <p className="tarot-focus-name-en">{card.nameEn}</p>
                {readingCard?.meaning && (
                  <p className="tarot-focus-meaning">{readingCard.meaning}</p>
                )}
                {!readingCard?.meaning && card.msg && (
                  <p className="tarot-focus-meaning">{card.msg}</p>
                )}
              </div>
              <button className="tarot-focus-close" onClick={() => setFocusCard(null)}>닫기</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Tarot;
