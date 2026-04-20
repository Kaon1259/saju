import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllConstellations, getConstellationFortuneStream, getUser, isGuest, getHistory } from '../api/fortune';
import ConstellationMap from '../components/ConstellationMap';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';
import HistoryDrawer from '../components/HistoryDrawer';

import AnalysisMatrix from '../components/AnalysisMatrix';
import AnalysisComplete from '../components/AnalysisComplete';
import parseAiJson from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import './Constellation.css';

const SIGN_DATA = {
  '물병자리': { color: '#60A5FA', element: '공기' },
  '물고기자리': { color: '#A78BFA', element: '물' },
  '양자리': { color: '#EF4444', element: '불' },
  '황소자리': { color: '#10B981', element: '흙' },
  '쌍둥이자리': { color: '#FBBF24', element: '공기' },
  '게자리': { color: '#F472B6', element: '물' },
  '사자자리': { color: '#F59E0B', element: '불' },
  '처녀자리': { color: '#8B5CF6', element: '흙' },
  '천칭자리': { color: '#EC4899', element: '공기' },
  '전갈자리': { color: '#DC2626', element: '물' },
  '사수자리': { color: '#7C3AED', element: '불' },
  '염소자리': { color: '#6366F1', element: '흙' },
};

function getSignFromDate(birthDate) {
  if (!birthDate) return null;
  const p = birthDate.split('-');
  const m = parseInt(p[1]), d = parseInt(p[2]), md = m * 100 + d;
  if (md >= 120 && md <= 218) return '물병자리';
  if (md >= 219 && md <= 320) return '물고기자리';
  if (md >= 321 && md <= 419) return '양자리';
  if (md >= 420 && md <= 520) return '황소자리';
  if (md >= 521 && md <= 621) return '쌍둥이자리';
  if (md >= 622 && md <= 722) return '게자리';
  if (md >= 723 && md <= 822) return '사자자리';
  if (md >= 823 && md <= 922) return '처녀자리';
  if (md >= 923 && md <= 1022) return '천칭자리';
  if (md >= 1023 && md <= 1121) return '전갈자리';
  if (md >= 1122 && md <= 1221) return '사수자리';
  return '염소자리';
}

function Constellation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [signs, setSigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [mySign, setMySign] = useState(null);
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const resultRef = useRef(null);
  const streamCleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 운세 등장 시 매트릭스 페이드아웃
  useEffect(() => {
    if (fortune && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [fortune, matrixShown]);

  useEffect(() => {
    getAllConstellations().then(setSigns).catch(() => {});
    const userId = localStorage.getItem('userId');
    if (userId) {
      getUser(userId).then((u) => {
        if (u.birthDate) {
          const sign = getSignFromDate(u.birthDate);
          setMySign(sign);
          if (sign) setSelected(sign);
        }
      }).catch(() => {});
    }
    return () => { streamCleanupRef.current?.(); };
  }, []);

  const { guardedAction: guardConst } = useHeartGuard('CONSTELLATION');

  const handleSelect = (sign) => {
    setSelected(sign);
    setFortune(null);
    setStreamText('');
    setLoading(true);
    setMatrixShown(true);
    setMatrixExiting(false);
    streamCleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const cleanup = getConstellationFortuneStream(sign, {
      onChunk: (chunk) => setStreamText((prev) => prev + chunk),
      onCached: (data) => {
        setFortune(data);
        setStreamText('');
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      },
      onDone: (fullText) => {
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        const parsed = parseAiJson(fullText);
        if (parsed) {
          pendingResultRef.current = { sign, ...parsed };
          setMatrixShown(false);
          setCompleting(true);
        }
        setStreamText('');
        setLoading(false);
      },
      onError: (err) => {
        console.error('stream error', err);
        setLoading(false);
        setStreamText('');
        setMatrixShown(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
    streamCleanupRef.current = cleanup;
  };

  // MyFortune 별자리 탭에서 navigate state.autoStart로 진입 시 자동 분석
  // signs 로드 완료 후 1회만 실행 (race condition 방지)
  const autoStartedRef = useRef(false);
  useEffect(() => {
    const autoStart = location.state?.autoStart;
    if (!autoStart || autoStartedRef.current) return;
    if (!signs || signs.length === 0) return; // signs 로드 대기
    autoStartedRef.current = true;
    handleSelect(autoStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signs, location.state?.autoStart]);

  const getColor = (sign) => SIGN_DATA[sign]?.color || '#7C3AED';

  return (
    <div className="cs-page">
      <AnalysisComplete
        show={completing}
        theme="star2"
        onDone={() => {
          setCompleting(false);
          if (pendingResultRef.current) {
            setFortune(pendingResultRef.current);
            pendingResultRef.current = null;
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }
        }}
      />
      <div className="cs-hero">
        <h1 className="cs-title">별자리 운세</h1>
        <p className="cs-subtitle">12별자리로 보는 오늘의 운세</p>
      </div>

      {/* 별자리 선택 그리드 */}
      <div className="cs-grid">
        {signs.map((s, i) => {
          const isActive = selected === s.sign;
          const isMine = mySign === s.sign;
          const color = getColor(s.sign);
          const twinkleDelay = `${(i * 0.4) % 3}s`;
          return (
            <button key={s.sign}
              className={`cs-card ${isActive ? 'active' : ''}`}
              style={{ '--cs-color': color, animationDelay: `${i * 40}ms`, '--twinkle-delay': twinkleDelay }}
              onClick={() => handleSelect(s.sign)}
            >
              <span className="cs-card-symbol">{s.symbol}</span>
              <span className="cs-card-name">{s.sign}</span>
              <span className="cs-card-element">{s.element}</span>
              {s.score && <span className="cs-card-score">{s.score}<small>점</small></span>}
              {isMine && <span className="cs-card-mine">MY</span>}
            </button>
          );
        })}
      </div>

      {selected && !fortune && !loading && localStorage.getItem('userId') && (
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center', marginTop: 16 }}>
          <button className="btn-gold" onClick={() => guardConst(() => handleSelect(selected))} style={{ width: '100%' }}>
            🔮 내 별자리 운세 보기 <HeartCost category="CONSTELLATION" />
          </button>
        </div>
      )}

      {matrixShown && (
        <AnalysisMatrix theme="star" label="AI가 별자리 운세를 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
      )}

      {fortune && !loading && (
        <div className="cs-result" ref={resultRef}>
          {/* 별자리 비주얼 헤더 */}
          <div className="cs-result-hero" style={{ '--cs-color': getColor(fortune.sign) }}>
            <div className="cs-result-stars">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="cs-tiny-star" style={{
                  left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                }}>✦</span>
              ))}
            </div>
            <ConstellationMap name={fortune.sign} color={getColor(fortune.sign)} size={160} />
            <h2 className="cs-result-name">{fortune.sign}</h2>
            <p className="cs-result-meta">{fortune.symbol} {fortune.dates} · {fortune.element} 원소</p>
          </div>

          {/* 성격 */}
          <div className="cs-personality glass-card">
            <p>{fortune.personality}</p>
          </div>

          {/* 점수 */}
          <div className="cs-score-wrap">
            <svg viewBox="0 0 120 120" className="cs-score-svg">
              <circle cx="60" cy="60" r="52" className="cs-score-bg" />
              <circle cx="60" cy="60" r="52" className="cs-score-fill"
                style={{ strokeDasharray: `${(fortune.score / 100) * 327} 327`, stroke: getColor(fortune.sign) }} />
            </svg>
            <div className="cs-score-inner">
              <span className="cs-score-num">{fortune.score}</span>
              <span className="cs-score-unit">점</span>
            </div>
          </div>

          {/* 운세 카드 */}
          <div className="cs-fortunes">
            <FortuneCard icon="🌟" title="총운" description={fortune.overall} delay={0} />
            <FortuneCard icon="💕" title="애정운" description={fortune.love} delay={80} />
            <FortuneCard icon="💰" title="재물운" description={fortune.money} delay={160} />
            <FortuneCard icon="💪" title="건강운" description={fortune.health} delay={240} />
          </div>

          {/* 럭키 */}
          <div className="cs-lucky glass-card">
            <div className="cs-lucky-item">
              <span className="cs-lucky-label">행운의 숫자</span>
              <span className="cs-lucky-value">{fortune.luckyNumber}</span>
            </div>
            <div className="cs-lucky-divider" />
            <div className="cs-lucky-item">
              <span className="cs-lucky-label">행운의 색</span>
              <span className="cs-lucky-value">{fortune.luckyColor}</span>
            </div>
          </div>

          {/* 심화분석 */}
          {selected && (() => {
            const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
            const bd = profile.birthDate;
            return bd ? (
              <DeepAnalysis type="constellation" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={selected} previousResult={fortune} />
            ) : null;
          })()}
        </div>
      )}

      {!isGuest() && (
        <HistoryDrawer
          type="constellation"
          label="📚 최근 본 별자리 운세"
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              const p = full?.payload;
              if (!p) return;
              setSelected(p.sign || null);
              setFortune(p);
              setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            } catch {}
          }}
        />
      )}
    </div>
  );
}

export default Constellation;
