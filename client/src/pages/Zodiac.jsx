import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllZodiacs, getZodiacFortuneStream, getZodiacByDate, getUser, isGuest, getHistory } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';
import HistoryDrawer from '../components/HistoryDrawer';
import AnalysisMatrix from '../components/AnalysisMatrix';
import StreamingCard from '../components/StreamingCard';
import AnalysisComplete from '../components/AnalysisComplete';
import parseAiJson, { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import './Zodiac.css';

const ANIMAL_DATA = {
  '쥐':     { color: '#60A5FA', element: '수' },
  '소':     { color: '#10B981', element: '토' },
  '호랑이': { color: '#F59E0B', element: '목' },
  '토끼':   { color: '#F472B6', element: '목' },
  '용':     { color: '#FBBF24', element: '토' },
  '뱀':     { color: '#7C3AED', element: '화' },
  '말':     { color: '#EF4444', element: '화' },
  '양':     { color: '#A78BFA', element: '토' },
  '원숭이': { color: '#8B5CF6', element: '금' },
  '닭':     { color: '#EC4899', element: '금' },
  '개':     { color: '#6366F1', element: '토' },
  '돼지':   { color: '#DC2626', element: '수' },
};

// 양력 연도 → 띠 동물 (간단 매핑, 정확한 음력 설 기준은 서버에서)
const ANIMALS_BY_YEAR_MOD = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'];
function getAnimalFromBirthYear(year) {
  if (!year) return null;
  return ANIMALS_BY_YEAR_MOD[((year % 12) + 12) % 12];
}

function Zodiac() {
  const navigate = useNavigate();
  const location = useLocation();
  const [animals, setAnimals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamFields, setStreamFields] = useState({});
  const [doneFields, setDoneFields] = useState(new Set());
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [myAnimal, setMyAnimal] = useState(null);
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const resultRef = useRef(null);
  const streamCleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  useEffect(() => {
    if (fortune && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [fortune, matrixShown]);

  useEffect(() => {
    getAllZodiacs().then(setAnimals).catch(() => {});
    const userId = localStorage.getItem('userId');
    if (userId) {
      getUser(userId).then((u) => {
        if (u.birthDate) {
          if (u.calendarType === 'LUNAR') {
            getZodiacByDate(u.birthDate, 'LUNAR').then((r) => {
              if (r?.animal) {
                setMyAnimal(r.animal);
                setSelected(r.animal);
              }
            }).catch(() => {});
          } else {
            const year = parseInt(u.birthDate.split('-')[0]);
            const animal = getAnimalFromBirthYear(year);
            setMyAnimal(animal);
            if (animal) setSelected(animal);
          }
        }
      }).catch(() => {});
    }
    return () => { streamCleanupRef.current?.(); };
  }, []);

  const { guardedAction: guardZodiac } = useHeartGuard('ZODIAC');

  const handleSelect = (animal) => {
    setSelected(animal);
    setFortune(null);
    setStreamText('');
    setLoading(true);
    setMatrixShown(true);
    setMatrixExiting(false);
    streamCleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    setStreamFields({}); setDoneFields(new Set());
    let buffer = '';
    const PROG_FIELDS = ['overall', 'love', 'money', 'health', 'work'];
    const cleanup = getZodiacFortuneStream(animal, {
      onChunk: (chunk) => {
        buffer += chunk;
        setStreamText((prev) => prev + chunk);
        const partial = extractStreamingFieldsPartial(buffer, PROG_FIELDS);
        const next = {}; const newDone = [];
        for (const k of PROG_FIELDS) {
          const p = partial[k];
          if (p !== undefined) {
            next[k] = p.value;
            if (p.done) newDone.push(k);
          }
        }
        if (Object.keys(next).length > 0) setStreamFields(prev => ({ ...prev, ...next }));
        if (newDone.length > 0) setDoneFields(prev => {
          const n = new Set(prev); newDone.forEach(f => n.add(f)); return n;
        });
      },
      onCached: (data) => {
        setFortune(data);
        setStreamText('');
        setStreamFields({}); setDoneFields(new Set());
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      },
      onDone: (fullText) => {
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        const parsed = parseAiJson(fullText);
        if (parsed) {
          pendingResultRef.current = { animal, ...parsed };
          setMatrixShown(false);
          setCompleting(true);
        }
        setStreamText('');
        setStreamFields({}); setDoneFields(new Set());
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

  const autoStartedRef = useRef(false);
  useEffect(() => {
    const autoStart = location.state?.autoStart;
    if (!autoStart || autoStartedRef.current) return;
    if (!animals || animals.length === 0) return;
    autoStartedRef.current = true;
    handleSelect(autoStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animals, location.state?.autoStart]);

  const getColor = (animal) => ANIMAL_DATA[animal]?.color || '#7C3AED';

  return (
    <div className="zd-page">
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
      <div className="zd-hero">
        <h1 className="zd-title">띠 운세</h1>
        <p className="zd-subtitle">12지신으로 보는 오늘의 운세</p>
      </div>

      <div className="zd-grid">
        {animals.map((a, i) => {
          const isActive = selected === a.animal;
          const isMine = myAnimal === a.animal;
          const color = getColor(a.animal);
          return (
            <button key={a.animal}
              className={`zd-card ${isActive ? 'active' : ''}`}
              style={{ '--zd-color': color, animationDelay: `${i * 40}ms` }}
              onClick={() => handleSelect(a.animal)}
            >
              <span className="zd-card-emoji">{a.emoji}</span>
              <span className="zd-card-name">{a.animal}</span>
              <span className="zd-card-meta">{a.hanja} · {a.element}</span>
              {a.score && <span className="zd-card-score">{a.score}<small>점</small></span>}
              {isMine && <span className="zd-card-mine">MY</span>}
            </button>
          );
        })}
      </div>

      {selected && !fortune && !loading && localStorage.getItem('userId') && (
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center', marginTop: 16 }}>
          <button className="btn-gold" onClick={() => guardZodiac(() => handleSelect(selected))} style={{ width: '100%' }}>
            🐯 내 띠 운세 보기 <HeartCost category="ZODIAC" />
          </button>
        </div>
      )}

      {matrixShown && !fortune && (() => {
        const st = (key) => {
          if (doneFields.has(key)) return 'done';
          if (streamFields[key]) return 'streaming';
          return 'pending';
        };
        return (
          <div className="zd-streaming-wrap">
            <div className="zd-streaming-header">
              <span className="zd-streaming-orb">✨</span>
              <span className="zd-streaming-title">AI가 띠 운세를 분석중이에요</span>
              <span className="streaming-dots"><i/><i/><i/></span>
            </div>
            <div className="zd-streaming-cards">
              <StreamingCard icon="🌟" title="총운"   text={streamFields.overall || ''} status={st('overall')} delay={0}   />
              <StreamingCard icon="💕" title="애정운" text={streamFields.love    || ''} status={st('love')}    delay={80}  />
              <StreamingCard icon="💰" title="재물운" text={streamFields.money   || ''} status={st('money')}   delay={160} />
              <StreamingCard icon="💪" title="건강운" text={streamFields.health  || ''} status={st('health')}  delay={240} />
              <StreamingCard icon="💼" title="직장운" text={streamFields.work    || ''} status={st('work')}    delay={320} />
            </div>
          </div>
        );
      })()}

      {fortune && !loading && (
        <div className="zd-result" ref={resultRef}>
          <div className="zd-result-hero" style={{ '--zd-color': getColor(fortune.animal) }}>
            <div className="zd-result-stars">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="zd-tiny-star" style={{
                  left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                }}>✦</span>
              ))}
            </div>
            <span className="zd-result-emoji">{fortune.emoji}</span>
            <h2 className="zd-result-name">{fortune.animal}띠</h2>
            <p className="zd-result-meta">{fortune.hanja} · {fortune.element} 오행 · {fortune.hour}</p>
          </div>

          <div className="zd-personality glass-card">
            <p>{fortune.personality}</p>
          </div>

          <div className="zd-score-wrap">
            <svg viewBox="0 0 120 120" className="zd-score-svg">
              <circle cx="60" cy="60" r="52" className="zd-score-bg" />
              <circle cx="60" cy="60" r="52" className="zd-score-fill"
                style={{ strokeDasharray: `${(fortune.score / 100) * 327} 327`, stroke: getColor(fortune.animal) }} />
            </svg>
            <div className="zd-score-inner">
              <span className="zd-score-num">{fortune.score}</span>
              <span className="zd-score-unit">점</span>
            </div>
          </div>

          <div className="zd-fortunes">
            <FortuneCard icon="🌟" title="총운"   description={fortune.overall} delay={0}   />
            <FortuneCard icon="💕" title="애정운" description={fortune.love}    delay={80}  />
            <FortuneCard icon="💰" title="재물운" description={fortune.money}   delay={160} />
            <FortuneCard icon="💪" title="건강운" description={fortune.health}  delay={240} />
            <FortuneCard icon="💼" title="직장운" description={fortune.work}    delay={320} />
          </div>

          {fortune.elementInfluence && (
            <div className="zd-extra glass-card">
              <h4>🌀 오행의 흐름</h4>
              <p>{fortune.elementInfluence}</p>
            </div>
          )}
          {fortune.timeAdvice && (
            <div className="zd-extra glass-card">
              <h4>⏰ 시간대 조언</h4>
              <p>{fortune.timeAdvice}</p>
            </div>
          )}
          {fortune.emotionalTip && (
            <div className="zd-extra glass-card">
              <h4>💭 감정 케어</h4>
              <p>{fortune.emotionalTip}</p>
            </div>
          )}
          {fortune.advice && (
            <div className="zd-extra glass-card">
              <h4>💡 오늘의 조언</h4>
              <p>{fortune.advice}</p>
            </div>
          )}

          <div className="zd-lucky glass-card">
            <div className="zd-lucky-item">
              <span className="zd-lucky-label">행운의 숫자</span>
              <span className="zd-lucky-value">{fortune.luckyNumber}</span>
            </div>
            <div className="zd-lucky-divider" />
            <div className="zd-lucky-item">
              <span className="zd-lucky-label">행운의 색</span>
              <span className="zd-lucky-value">{fortune.luckyColor}</span>
            </div>
          </div>

          {selected && (() => {
            const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
            const bd = profile.birthDate;
            return bd ? (
              <DeepAnalysis type="zodiac" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={selected} previousResult={fortune} />
            ) : null;
          })()}
        </div>
      )}

      {!isGuest() && (
        <HistoryDrawer
          type="zodiac"
          label="📚 최근 본 띠 운세"
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              const p = full?.payload;
              if (!p) return;
              setSelected(p.animal || null);
              setFortune(p);
              setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            } catch {}
          }}
        />
      )}
    </div>
  );
}

export default Zodiac;
