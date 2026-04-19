import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getLoveFortuneBasic, getLoveFortuneStream, saveLoveFortuneCache, isGuest, getHistory } from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import parseAiJson from '../utils/parseAiJson';
import { shareResult } from '../utils/share';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './LoveTypeFortune.css';

const LOVE_TYPES = {
  relationship:      { label: '연애 진단',   icon: '💕', desc: '지금 연애 상태 총 진단', color: '#EC4899', particles: ['💕','💗','✨','💖','💘'] },
  some_check:        { label: '썸진단',     icon: '🎯', desc: '이 썸, 연애로 발전할까?', color: '#FF9800', particles: ['💗','💭','✨','🎯','💫'] },
  past_life:         { label: '전생인연',   icon: '🌌', desc: '전생에서의 우리 이야기', color: '#8B5CF6', particles: ['🌌','✨','⭐','💫','🔮'] },
  crush:             { label: '짝사랑',     icon: '💘', desc: '내 마음이 이루어질까?', color: '#F472B6', particles: ['💘','💗','💓','💞','✨'] },
  blind_date:        { label: '소개팅',     icon: '🤝', desc: '좋은 만남이 올까?', color: '#34D399', particles: ['🤝','💐','🌸','✨','💫'] },
  couple_fortune:    { label: '데이트운',   icon: '💑', desc: '오늘 연인과의 하루', color: '#E91E63', particles: ['💑','💕','🌹','✨','💖'] },
  confession_timing: { label: '고백타이밍', icon: '💌', desc: '언제 마음을 전할까?', color: '#EC4899', particles: ['💌','💘','💗','✨','🌹'] },
  meeting_timing:    { label: '만남시기',   icon: '🔮', desc: '언제 인연을 만날까?', color: '#A78BFA', particles: ['🔮','✨','💫','⭐','🌙'] },
  reunion:           { label: '재회운',     icon: '💔', desc: '다시 만날 수 있을까?', color: '#94A3B8', particles: ['💔','💧','✨','💫','🌙'] },
  contact_fortune:   { label: '연락운',     icon: '📱', desc: '먼저 연락해도 될까?', color: '#3B82F6', particles: ['📱','💬','💭','✨','💗'] },
  marriage:          { label: '결혼운',     icon: '💒', desc: '결혼 시기와 인연', color: '#F472B6', particles: ['💒','💍','💐','✨','👰'] },
  remarriage:        { label: '재혼운',     icon: '💍', desc: '새로운 인연의 가능성', color: '#A78BFA', particles: ['💍','💒','✨','🌹','💫'] },
  ideal_type:        { label: '이상형',     icon: '👩‍❤️‍👨', desc: '사주로 보는 나의 이상형', color: '#E91E63', particles: ['💕','💗','✨','💖','💘'] },
  skinship:          { label: '스킨십궁합', icon: '💋', desc: '우리 스킨십 케미는?', color: '#F43F5E', particles: ['💋','💕','✨','💗','💓'] },
};

const HEART_MAP = {
  relationship: 'LOVE_RELATIONSHIP',
  crush: 'LOVE_CRUSH',
  some_check: 'LOVE_SOME_CHECK',
  blind_date: 'LOVE_BLIND_DATE',
  couple_fortune: 'LOVE_COUPLE',
  confession_timing: 'LOVE_CONFESSION',
  ideal_type: 'LOVE_IDEAL_TYPE',
  reunion: 'LOVE_REUNION',
  remarriage: 'LOVE_REMARRIAGE',
  marriage: 'LOVE_MARRIAGE',
  past_life: 'LOVE_PAST_LIFE',
  meeting_timing: 'LOVE_MEETING_TIMING',
  contact_fortune: 'LOVE_CONTACT',
  skinship: 'LOVE_COUPLE',
};

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  return `hsl(340, ${30 + s * 0.7}%, ${85 - s * 0.4}%)`;
}

function FloatingHearts({ score, color }) {
  const heartColor = color || getHeartColor(score);
  const count = Math.max(4, Math.floor((score || 50) / 10));
  return (
    <div className="ltf-hearts-container">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="ltf-floating-heart" style={{
          '--heart-color': heartColor,
          '--float-delay': `${i * 0.35}s`,
          '--float-duration': `${2.2 + Math.random() * 1.8}s`,
          '--heart-x': `${8 + Math.random() * 84}%`,
          '--heart-size': `${12 + Math.random() * 14}px`,
        }}>&#x2764;</span>
      ))}
    </div>
  );
}

function LoveTypeFortune() {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('userId');
  const info = LOVE_TYPES[type];

  const [birth, setBirth] = useState('');
  const [gender, setGender] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [partnerGender, setPartnerGender] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [breakupDate, setBreakupDate] = useState('');
  const [showPartner, setShowPartner] = useState(false);
  useEffect(() => { if (type === 'skinship') setShowPartner(true); }, [type]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  // 홈 드로어에서 넘어온 restoreHistoryId 복원
  useEffect(() => {
    const hid = location.state?.restoreHistoryId;
    if (!hid) return;
    (async () => {
      try {
        const full = await getHistory(hid);
        if (full?.payload) setResult(full.payload);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.restoreHistoryId]);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);

  // 타입 전환 시 상태 초기화
  useEffect(() => {
    setResult(null);
    setBirth('');
    setGender('');
    setPartnerDate('');
    setPartnerGender('');
    setShowPartner(false);
    setStreamText('');
    setMatrixShown(false);
    setMatrixExiting(false);
  }, [type]);

  const handleReset = () => {
    setResult(null);
    setBirth('');
    setGender('');
    setPartnerDate('');
    setPartnerGender('');
    setShowPartner(false);
    setStreamText('');
    setMatrixShown(false);
    setMatrixExiting(false);
    cleanupRef.current?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!info) {
    return (
      <div className="ltf-page">
        <div className="ltf-topbar">
          <button className="ltf-topbtn ltf-topbtn--back" onClick={() => navigate(-1)}>‹ 뒤로</button>
        </div>
        <div className="ltf-notfound">
          <span style={{ fontSize: 48 }}>❓</span>
          <h2>존재하지 않는 운세입니다</h2>
          <button className="ltf-submit" onClick={() => navigate('/')}>홈으로</button>
        </div>
      </div>
    );
  }

  const handleAutoFill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBirth(p.birthDate);
      if (p.gender) setGender(p.gender);
    } catch {}
  };

  const loveCategory = HEART_MAP[type] || 'LOVE_RELATIONSHIP';
  const { guardedAction: guardLoveType } = useHeartGuard(loveCategory);

  const handleAnalyze = async () => {
    if (!birth) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const pDate = showPartner && partnerDate ? partnerDate : null;
    const pGender = showPartner && partnerGender ? partnerGender : null;
    const bDate = type === 'reunion' && breakupDate ? breakupDate : null;
    const mDate = type === 'blind_date' && meetDate ? meetDate : null;

    try {
      const basic = await getLoveFortuneBasic(type, birth, null, gender || null, null, pDate, pGender, bDate, mDate, null);
      if (basic.score && basic.overall) {
        setResult(basic);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        return;
      }

      setStreaming(true);
      cleanupRef.current = getLoveFortuneStream(
        type, birth, '', gender || '', '', pDate || '', pGender || '', bDate || '', mDate || '', '',
        {
          onCached: (cachedData) => {
            setStreaming(false); setLoading(false); setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
            setResult(cachedData);
          },
          onChunk: (text) => setStreamText(prev => prev + text),
          onDone: (fullText) => {
            setStreaming(false); setLoading(false);
            setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
            const parsed = parseAiJson(fullText || '');
            if (parsed) {
              const finalResult = { ...basic, ...parsed, score: parsed.score || basic.score || 65, grade: parsed.grade || basic.grade || '보통', overall: parsed.overall || '' };
              setResult(finalResult);
              saveLoveFortuneCache({ ...finalResult, type, birthDate: birth, gender }).catch(() => {});
            } else {
              setResult({ ...basic, score: 65, grade: '보통', overall: fullText || '' });
            }
          },
          onError: () => {
            setStreaming(false); setLoading(false); setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (e) {
      console.error(e);
      setLoading(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const heartColor = result?.score ? getHeartColor(result.score) : info.color;
  const themeStyle = { '--ltf-color': info.color };

  return (
    <div className="ltf-page" style={themeStyle}>
      {/* 상단 버튼 */}
      <div className="ltf-topbar">
        <button className="ltf-topbtn ltf-topbtn--back" onClick={() => navigate(-1)} aria-label="뒤로">
          <span>‹</span> 뒤로
        </button>
        <button className="ltf-topbtn ltf-topbtn--reset" onClick={handleReset} aria-label="다시하기">
          다시하기 <span>↻</span>
        </button>
      </div>

      {/* ═══ 히어로 ═══ */}
      <div className="ltf-hero">
        <div className="ltf-hero-bg" />
        <div className="ltf-hero-particles">
          {info.particles.map((p, i) => (
            <span key={i} className="ltf-hero-particle" style={{ '--p-i': i, '--p-delay': `${i * 0.4}s` }}>{p}</span>
          ))}
        </div>
        <div className="ltf-hero-iconwrap">
          <div className="ltf-hero-aura" />
          <div className="ltf-hero-aura ltf-hero-aura--2" />
          <span className="ltf-hero-icon">{info.icon}</span>
        </div>
        <h1 className="ltf-hero-title">{info.label}</h1>
        <p className="ltf-hero-desc">{info.desc}</p>
      </div>

      {/* ═══ 최근 본 기록 ═══ (하단 pull-up drawer — 로딩/스트리밍 중엔 숨김) */}
      {userId && !loading && !streaming && (
        <HistoryDrawer
          type="love_11"
          label="📚 최근 본 연애 운세"
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              if (full?.payload) setResult(full.payload);
            } catch {}
          }}
        />
      )}

      {/* ═══ 입력 폼 ═══ */}
      {!result && !loading && !streaming && (
        <div className="ltf-form fade-in">
          {userId && (
            <button className="ltf-autofill" onClick={handleAutoFill}>✨ 내 정보로 채우기</button>
          )}
          <div className="ltf-field">
            <label className="ltf-label">생년월일</label>
            <BirthDatePicker value={birth} onChange={setBirth} />
          </div>
          <div className="ltf-field">
            <label className="ltf-label">성별</label>
            <div className="ltf-toggle">
              <button className={`ltf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>
                <span className="ltf-g-circle ltf-g-male">♂</span>
                <span>남성</span>
              </button>
              <button className={`ltf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>
                <span className="ltf-g-circle ltf-g-female">♀</span>
                <span>여성</span>
              </button>
            </div>
          </div>

          {type === 'reunion' && (
            <div className="ltf-field">
              <label className="ltf-label">헤어진 시기 <span className="ltf-opt">(선택)</span></label>
              <BirthDatePicker value={breakupDate} onChange={setBreakupDate} />
            </div>
          )}
          {type === 'blind_date' && (
            <div className="ltf-field">
              <label className="ltf-label">소개팅 날짜 <span className="ltf-opt">(선택)</span></label>
              <BirthDatePicker value={meetDate} onChange={setMeetDate} />
            </div>
          )}

          {type !== 'ideal_type' && (
            <button className="ltf-partner-btn" onClick={() => setShowPartner(!showPartner)}>
              {showPartner ? '상대방 정보 접기 ▲' : '상대방 정보 추가 (선택) ▼'}
            </button>
          )}
          {showPartner && (
            <div className="ltf-partner fade-in">
              <div className="ltf-field">
                <label className="ltf-label">상대방 생년월일</label>
                <BirthDatePicker value={partnerDate} onChange={setPartnerDate} />
              </div>
              <div className="ltf-field">
                <label className="ltf-label">상대방 성별</label>
                <div className="ltf-toggle">
                  <button className={`ltf-toggle-btn ${partnerGender === 'M' ? 'active' : ''}`} onClick={() => setPartnerGender('M')}>
                    <span className="ltf-g-circle ltf-g-male">♂</span>
                    <span>남성</span>
                  </button>
                  <button className={`ltf-toggle-btn ${partnerGender === 'F' ? 'active' : ''}`} onClick={() => setPartnerGender('F')}>
                    <span className="ltf-g-circle ltf-g-female">♀</span>
                    <span>여성</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <button className="ltf-submit" onClick={() => guardLoveType(handleAnalyze)} disabled={!birth}>
            {info.icon} {info.label} 보기 <HeartCost category={loveCategory} />
          </button>
        </div>
      )}

      {/* ═══ 매트릭스 로딩 ═══ */}
      {matrixShown && (
        <AnalysisMatrix theme="love" label={`AI가 ${info.label}을 분석하고 있어요`} streamText={streamText} exiting={matrixExiting} />
      )}

      {/* ═══ 결과 ═══ */}
      {result && (
        <div className="ltf-result ltf-result-reveal" ref={resultRef} style={{ '--heart-color': heartColor }}>
          {type === 'ideal_type' ? (
            <div className="ltf-ideal-header">
              <span className="ltf-ideal-emoji">👩‍❤️‍👨</span>
              <h3 className="ltf-ideal-title">나의 이상형 분석</h3>
            </div>
          ) : (
            <div className="ltf-heart-score-card">
              <FloatingHearts score={result.score} color={heartColor} />
              <div className="ltf-heart-aura" style={{ background: `radial-gradient(circle, ${heartColor}, transparent 70%)` }} />
              <div className="ltf-heart-center">
                <span className="ltf-heart-big" style={{ color: heartColor }}>&#x2764;</span>
                <span className="ltf-heart-num">{result.score}</span>
                <span className="ltf-heart-unit">점</span>
              </div>
              <span className="ltf-heart-grade" style={{ color: GRADE_COLORS[result.grade] || heartColor }}>{result.grade}</span>
            </div>
          )}

          <FortuneCard icon={info.icon} title={type === 'ideal_type' ? '사주로 본 나의 이상형' : '종합 분석'} description={result.overall} delay={0} />
          {type !== 'ideal_type' && result.timing && <FortuneCard icon="📅" title="최적 시기" description={result.timing} delay={80} />}
          {type !== 'ideal_type' && result.advice && <FortuneCard icon="💡" title="행동 조언" description={result.advice} delay={160} />}
          {result.caution && <FortuneCard icon="⚠️" title="주의사항" description={result.caution} delay={240} />}

          {(result.luckyDay || result.luckyPlace || result.luckyColor) && (
            <div className="ltf-lucky">
              {result.luckyDay && <div className="ltf-lucky-item"><span className="ltf-lucky-label">행운의 날</span><span className="ltf-lucky-value">{result.luckyDay}</span></div>}
              {result.luckyPlace && <div className="ltf-lucky-item"><span className="ltf-lucky-label">행운의 장소</span><span className="ltf-lucky-value">{result.luckyPlace}</span></div>}
              {result.luckyColor && <div className="ltf-lucky-item"><span className="ltf-lucky-label">행운의 색</span><span className="ltf-lucky-value">{result.luckyColor}</span></div>}
            </div>
          )}

          <button className="ltf-share" onClick={async () => {
            const text = `[${info.label}]\n점수: ${result.score}점 (${result.grade})\n${(result.overall||'').split('.').slice(0,2).join('.')}.\n\nhttps://recipepig.kr`;
            const res = await shareResult({ title: `${info.label} 결과`, text });
            if (res === 'copied') alert('클립보드에 복사되었습니다!');
          }}>📤 공유하기</button>
          <button className="ltf-reset" onClick={handleReset}>다시 보기</button>
        </div>
      )}
    </div>
  );
}

export default LoveTypeFortune;
