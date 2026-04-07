import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransition } from '../components/PageTransition';
import { getLoveFortuneBasic, getLoveFortuneStream, saveLoveFortuneCache } from '../api/fortune';
import BirthDatePicker from '../components/BirthDatePicker';
import StreamText from '../components/StreamText';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import parseAiJson from '../utils/parseAiJson';
import { shareResult } from '../utils/share';
import {
  playCrystalBall, playTarotReveal, playStarTwinkle, playHarmony,
  playDreamWave, playPsychPop, playMbtiPop, playBloodDrop, playOriental,
  playShutter, playLovebeat
} from '../utils/sounds';
import './MyMenu.css';

const SHORTCUT_ITEMS = [
  { path: '/my', icon: '🔮', label: '오늘운세', color: '#FBBF24', sound: playCrystalBall },
  { path: '/tarot', icon: '🃏', label: '타로카드', color: '#9B59B6', sound: playTarotReveal },
  { path: '/constellation', icon: '⭐', label: '별자리', color: '#FF9800', sound: playStarTwinkle },
  { path: '/dream', icon: '🌙', label: '꿈해몽', color: '#6C3483', sound: playDreamWave },
  { path: '/psych-test', icon: '🎭', label: '심리테스트', color: '#E91E63', sound: playPsychPop },
  { path: '/mbti', icon: '🧬', label: 'MBTI', color: '#34D399', sound: playMbtiPop },
  { path: '/bloodtype', icon: '🩸', label: '혈액형', color: '#F472B6', sound: playBloodDrop },
  { path: '/traditional', icon: '☯️', label: '정통사주', color: '#E879F9', sound: playOriental },
  { path: '/face-reading', icon: '👤', label: 'AI관상', color: '#DAA520', sound: playShutter },
];

const VIRAL_ITEMS = [
  { path: '/celeb-compatibility', icon: '💫', label: '스타궁합', color: '#9B59B6', isRoute: true },
  { id: 'meeting_timing', icon: '🔮', label: '만남시기', color: '#FF6B6B' },
  { id: 'contact_fortune', icon: '📱', label: '연락운', color: '#3B82F6' },
  { id: 'marriage', icon: '💒', label: '결혼운', color: '#F472B6' },
  { id: 'remarriage', icon: '💍', label: '재혼운', color: '#A78BFA' },
  { id: 'past_life', icon: '🌌', label: '전생인연', color: '#6C3483' },
];

const COUPLE_ITEMS = [
  { id: 'couple_fortune', icon: '💑', label: '오늘운세', color: '#E91E63' },
  { id: 'some_check', icon: '🎯', label: '썸진단', color: '#FF9800' },
];

const GENERAL_ITEMS = [
  { id: 'crush', icon: '💘', label: '짝사랑', color: '#F472B6' },
  { id: 'confession_timing', icon: '💌', label: '고백운', color: '#E91E63' },
  { id: 'blind_date', icon: '🤝', label: '소개팅', color: '#34D399' },
  { id: 'reunion', icon: '💔', label: '재회운', color: '#94A3B8' },
];

const LOVE_TYPE_INFO = {
  meeting_timing: { label: '만남시기', icon: '🔮', desc: '언제 인연을 만날까' },
  contact_fortune: { label: '연락운', icon: '📱', desc: '먼저 연락해도 될까?' },
  marriage: { label: '결혼운', icon: '💒', desc: '결혼 시기와 인연' },
  remarriage: { label: '재혼운', icon: '💍', desc: '새로운 인연의 가능성' },
  past_life: { label: '전생인연', icon: '🌌', desc: '전생에서의 우리 이야기' },
  couple_fortune: { label: '데이트운', icon: '💑', desc: '오늘 연인과의 하루' },
  some_check: { label: '썸진단', icon: '🎯', desc: '이 썸, 연애로 발전할까?' },
  crush: { label: '짝사랑', icon: '💘', desc: '내 마음이 이루어질까?' },
  confession_timing: { label: '고백운', icon: '💌', desc: '고백 타이밍은?' },
  blind_date: { label: '소개팅', icon: '🤝', desc: '좋은 만남이 올까?' },
  reunion: { label: '재회운', icon: '💔', desc: '다시 만날 수 있을까?' },
};

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getLoveHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  return `hsl(340, ${30 + s * 0.7}%, ${85 - s * 0.4}%)`;
}

function MyMenu() {
  const navigate = useNavigate();
  const { triggerTransition } = useTransition();
  const userId = localStorage.getItem('userId');

  // love modal state
  const [loveModal, setLoveModal] = useState(null);
  const [loveBirth, setLoveBirth] = useState('');
  const [loveGender, setLoveGender] = useState('');
  const [lovePartnerDate, setLovePartnerDate] = useState('');
  const [lovePartnerGender, setLovePartnerGender] = useState('');
  const [loveMeetDate, setLoveMeetDate] = useState('');
  const [loveBreakupDate, setLoveBreakupDate] = useState('');
  const [loveShowPartner, setLoveShowPartner] = useState(false);
  const [loveLoading, setLoveLoading] = useState(false);
  const [loveResult, setLoveResult] = useState(null);
  const [loveStreamText, setLoveStreamText] = useState('');
  const [loveStreaming, setLoveStreaming] = useState(false);
  const loveResultRef = useRef(null);
  const loveCleanupRef = useRef(null);

  const openLoveModal = (typeId) => {
    setLoveModal(typeId);
    setLoveResult(null);
    setLoveLoading(false);
    setLoveBirth('');
    setLoveGender('');
    setLovePartnerDate('');
    setLovePartnerGender('');
    setLoveMeetDate('');
    setLoveBreakupDate('');
    setLoveShowPartner(false);
    setLoveStreamText('');
    setLoveStreaming(false);
  };

  const closeLoveModal = () => {
    setLoveModal(null);
    setLoveResult(null);
    setLoveLoading(false);
    setLoveStreamText('');
    setLoveStreaming(false);
    loveCleanupRef.current?.();
  };

  const handleLoveAnalyze = async () => {
    if (!loveBirth || !loveModal) return;
    setLoveLoading(true);
    setLoveResult(null);
    setLoveStreamText('');

    const pDate = loveShowPartner && lovePartnerDate ? lovePartnerDate : null;
    const pGender = loveShowPartner && lovePartnerGender ? lovePartnerGender : null;
    const bDate = loveModal === 'reunion' && loveBreakupDate ? loveBreakupDate : null;
    const mDate = loveModal === 'blind_date' && loveMeetDate ? loveMeetDate : null;

    try {
      const basic = await getLoveFortuneBasic(loveModal, loveBirth, null, loveGender || null, null, pDate, pGender, bDate, mDate, null);
      if (basic.score && basic.overall) {
        setLoveResult(basic);
        setLoveLoading(false);
        return;
      }

      setLoveLoading(false);
      setLoveStreaming(true);

      loveCleanupRef.current = getLoveFortuneStream(
        loveModal, loveBirth, '', loveGender || '', '', pDate || '', pGender || '', bDate || '', mDate || '', '',
        {
          onCached: (cachedData) => {
            setLoveStreaming(false);
            setLoveStreamText('');
            setLoveResult(cachedData);
          },
          onChunk: (text) => {
            setLoveStreamText(prev => {
              if (!prev) setTimeout(() => loveResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              return prev + text;
            });
          },
          onDone: (fullText) => {
            setLoveStreaming(false);
            setLoveStreamText('');
            const parsed = parseAiJson(fullText);
            if (parsed) {
              const finalResult = { ...basic, ...parsed, score: parsed.score || basic.score || 65, grade: parsed.grade || basic.grade || '보통', overall: parsed.overall || '' };
              setLoveResult(finalResult);
              saveLoveFortuneCache({ ...finalResult, type: loveModal, birthDate: loveBirth, gender: loveGender }).catch(() => {});
            } else {
              setLoveResult({ ...basic, score: 65, grade: '보통', overall: fullText });
            }
          },
          onError: () => { setLoveStreaming(false); setLoveStreamText(''); },
        }
      );
    } catch (e) {
      console.error(e);
      setLoveLoading(false);
    }
  };

  const loveInfo = LOVE_TYPE_INFO[loveModal];
  const loveHeartColor = loveResult?.score ? getLoveHeartColor(loveResult.score) : '#ffc0cb';

  const handleShortcut = (item) => {
    if (item.sound) item.sound();
    triggerTransition('fortune', item.path);
  };

  const handleViralClick = (item) => {
    if (item.isRoute) {
      navigate(item.path);
    } else {
      openLoveModal(item.id);
    }
  };

  return (
    <div className="mymenu">
      {/* Header */}
      <section className="mymenu-hero">
        <span className="mymenu-hero-icon">📋</span>
        <h1 className="mymenu-hero-title">마이 메뉴</h1>
        <p className="mymenu-hero-desc">다양한 운세를 한눈에 모아보세요</p>
      </section>

      {/* 1. 바로가기 섹션 - 유료 콘텐츠 */}
      <section className="mymenu-section">
        <h2 className="mymenu-section-title">
          <span className="mymenu-section-icon">🔮</span>
          바로가기
        </h2>
        <div className="mymenu-shortcut-grid">
          {SHORTCUT_ITEMS.map((item) => (
            <button
              key={item.path}
              className="mymenu-shortcut-item"
              onClick={() => handleShortcut(item)}
              style={{ '--mi-color': item.color }}
            >
              <span className="mymenu-shortcut-icon">{item.icon}</span>
              <span className="mymenu-shortcut-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Viral Contents */}
      <section className="mymenu-section">
        <h2 className="mymenu-section-title">
          <span className="mymenu-section-icon">🔥</span>
          Viral Contents
        </h2>
        <div className="mymenu-viral-scroll">
          {VIRAL_ITEMS.map((item, i) => (
            <button
              key={item.id || item.path}
              className="mymenu-viral-card"
              onClick={() => handleViralClick(item)}
              style={{ '--vc-color': item.color, animationDelay: `${i * 0.05}s` }}
            >
              <span className="mymenu-viral-icon">{item.icon}</span>
              <span className="mymenu-viral-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. 커플 콘텐츠 */}
      <section className="mymenu-section">
        <h2 className="mymenu-section-title">
          <span className="mymenu-section-icon">💕</span>
          커플 콘텐츠
        </h2>
        <div className="mymenu-couple-grid">
          {COUPLE_ITEMS.map((item) => (
            <button
              key={item.id}
              className="mymenu-couple-card"
              onClick={() => openLoveModal(item.id)}
              style={{ '--cc-color': item.color }}
            >
              <span className="mymenu-couple-icon">{item.icon}</span>
              <span className="mymenu-couple-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. 일반 콘텐츠 */}
      <section className="mymenu-section">
        <h2 className="mymenu-section-title">
          <span className="mymenu-section-icon">✨</span>
          일반 콘텐츠
        </h2>
        <div className="mymenu-general-grid">
          {GENERAL_ITEMS.map((item) => (
            <button
              key={item.id}
              className="mymenu-general-card"
              onClick={() => openLoveModal(item.id)}
              style={{ '--gc-color': item.color }}
            >
              <span className="mymenu-general-icon">{item.icon}</span>
              <span className="mymenu-general-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 연애 운세 모달 */}
      {loveModal && loveInfo && (
        <div className="love-modal-overlay" onClick={closeLoveModal}>
          <div className="love-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="love-modal-handle" />
            <div className="love-modal-header">
              <span className="love-modal-icon">{loveInfo.icon}</span>
              <h2 className="love-modal-title">{loveInfo.label}</h2>
              <span className="love-modal-desc">{loveInfo.desc}</span>
              <button className="love-modal-close" onClick={closeLoveModal}>✕</button>
            </div>

            <div className="love-modal-body">
              {!loveResult && !loveLoading && !loveStreaming && (
                <div className="love-modal-form fade-in">
                  {userId && (
                    <button className="love-modal-autofill" onClick={() => {
                      try {
                        const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                        if (p.birthDate) setLoveBirth(p.birthDate);
                        if (p.gender) setLoveGender(p.gender);
                      } catch {}
                    }}>내 정보로 채우기</button>
                  )}
                  <div className="love-modal-field">
                    <label className="love-modal-label">생년월일</label>
                    <BirthDatePicker value={loveBirth} onChange={setLoveBirth} />
                  </div>
                  <div className="love-modal-field">
                    <label className="love-modal-label">성별</label>
                    <div className="love-modal-toggle">
                      <button className={`love-modal-toggle-btn ${loveGender === 'M' ? 'active' : ''}`} onClick={() => setLoveGender('M')}><span className="g-circle g-male">♂</span></button>
                      <button className={`love-modal-toggle-btn ${loveGender === 'F' ? 'active' : ''}`} onClick={() => setLoveGender('F')}><span className="g-circle g-female">♀</span></button>
                    </div>
                  </div>

                  {loveModal === 'reunion' && (
                    <div className="love-modal-field">
                      <label className="love-modal-label">헤어진 시기 <span className="love-modal-opt">(선택)</span></label>
                      <BirthDatePicker value={loveBreakupDate} onChange={setLoveBreakupDate} />
                    </div>
                  )}
                  {loveModal === 'blind_date' && (
                    <div className="love-modal-field">
                      <label className="love-modal-label">소개팅 날짜 <span className="love-modal-opt">(선택)</span></label>
                      <BirthDatePicker value={loveMeetDate} onChange={setLoveMeetDate} />
                    </div>
                  )}

                  <button className="love-modal-partner-btn" onClick={() => setLoveShowPartner(!loveShowPartner)}>
                    {loveShowPartner ? '상대방 정보 접기' : '상대방 정보 추가 (선택)'}
                  </button>
                  {loveShowPartner && (
                    <div className="love-modal-partner fade-in">
                      <div className="love-modal-field">
                        <label className="love-modal-label">상대방 생년월일</label>
                        <BirthDatePicker value={lovePartnerDate} onChange={setLovePartnerDate} />
                      </div>
                      <div className="love-modal-field">
                        <label className="love-modal-label">상대방 성별</label>
                        <div className="love-modal-toggle">
                          <button className={`love-modal-toggle-btn ${lovePartnerGender === 'M' ? 'active' : ''}`} onClick={() => setLovePartnerGender('M')}><span className="g-circle g-male">♂</span></button>
                          <button className={`love-modal-toggle-btn ${lovePartnerGender === 'F' ? 'active' : ''}`} onClick={() => setLovePartnerGender('F')}><span className="g-circle g-female">♀</span></button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button className="love-modal-submit" onClick={handleLoveAnalyze} disabled={!loveBirth}>
                    {loveInfo.icon} {loveInfo.label} 보기
                  </button>
                </div>
              )}

              {(loveLoading || loveStreaming) && !loveResult && (
                <div className="love-modal-loading fade-in">
                  {!loveStreamText && (
                    <>
                      <div className="love-modal-loading-hearts">
                        {[0,1,2].map(i => <span key={i} className="love-modal-loading-heart" style={{ animationDelay: `${i * 0.3}s` }}>💗</span>)}
                      </div>
                      <p>AI가 {loveInfo.label}을 분석하고 있습니다...</p>
                    </>
                  )}
                  {loveStreamText && (
                    <div ref={loveResultRef}>
                      <StreamText text={loveStreamText} icon="💕" label="AI가 분석하고 있어요..." color="#F472B6" />
                    </div>
                  )}
                </div>
              )}

              {loveResult && (
                <div className="love-modal-result fade-in" ref={loveResultRef} style={{ '--heart-color': loveHeartColor }}>
                  <SpeechButton label={`${loveInfo.label} 읽어주기`}
                    text={[`${loveInfo.label} 결과입니다.`, `점수는 ${loveResult.score}점, ${loveResult.grade}입니다.`, loveResult.overall, loveResult.timing, loveResult.advice, loveResult.caution].filter(Boolean).join(' ')}
                    summaryText={`${loveInfo.label} ${loveResult.score}점, ${loveResult.grade}. ${(loveResult.overall||'').split('.').slice(0,2).join('.')}.`} />

                  <div className="love-modal-score-card">
                    <div className="love-modal-heart-aura" style={{ background: `radial-gradient(circle, ${loveHeartColor}, transparent 70%)` }} />
                    <div className="love-modal-heart-center">
                      <span className="love-modal-heart-big" style={{ color: loveHeartColor }}>&#x2764;</span>
                      <span className="love-modal-heart-num">{loveResult.score}</span>
                      <span className="love-modal-heart-unit">점</span>
                    </div>
                    <span className="love-modal-heart-grade" style={{ color: GRADE_COLORS[loveResult.grade] || loveHeartColor }}>{loveResult.grade}</span>
                  </div>

                  <FortuneCard icon={loveInfo.icon} title="종합 분석" description={loveResult.overall} delay={0} />
                  {loveResult.timing && <FortuneCard icon="📅" title="최적 시기" description={loveResult.timing} delay={80} />}
                  {loveResult.advice && <FortuneCard icon="💡" title="행동 조언" description={loveResult.advice} delay={160} />}
                  {loveResult.caution && <FortuneCard icon="⚠️" title="주의사항" description={loveResult.caution} delay={240} />}

                  {(loveResult.luckyDay || loveResult.luckyPlace || loveResult.luckyColor) && (
                    <div className="love-modal-lucky glass-card">
                      {loveResult.luckyDay && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 날</span><span className="love-modal-lucky-value">{loveResult.luckyDay}</span></div>}
                      {loveResult.luckyPlace && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 장소</span><span className="love-modal-lucky-value">{loveResult.luckyPlace}</span></div>}
                      {loveResult.luckyColor && <div className="love-modal-lucky-item"><span className="love-modal-lucky-label">행운의 색</span><span className="love-modal-lucky-value">{loveResult.luckyColor}</span></div>}
                    </div>
                  )}

                  <button className="love-modal-share" onClick={async () => {
                    const text = `[1:1연애 ${loveInfo.label}]\n점수: ${loveResult.score}점 (${loveResult.grade})\n${(loveResult.overall||'').split('.').slice(0,2).join('.')}.\n\nhttps://recipepig.kr`;
                    const res = await shareResult({ title: `${loveInfo.label} 결과`, text });
                    if (res === 'copied') alert('클립보드에 복사되었습니다!');
                  }}>공유하기</button>
                  <button className="love-modal-reset" onClick={() => { setLoveResult(null); setLoveBirth(''); }}>다시 보기</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyMenu;
