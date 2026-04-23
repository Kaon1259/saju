import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBloodTypeFortuneStream, getBloodTypeCompatibility, getUser, isGuest } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';

import StreamText from '../components/StreamText';
import StreamingCard from '../components/StreamingCard';
import PageTopBar from '../components/PageTopBar';
import AnalysisComplete from '../components/AnalysisComplete';
import parseAiJson, { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import './BloodType.css';

const TYPES = [
  { id: 'A', label: 'A형', sub: '꼼꼼한 완벽주의자', icon: '💎', color: '#3B82F6', bg: 'linear-gradient(135deg, #1E3A5F, #3B82F6)' },
  { id: 'B', label: 'B형', sub: '자유로운 창의가', icon: '🔥', color: '#EF4444', bg: 'linear-gradient(135deg, #7F1D1D, #EF4444)' },
  { id: 'O', label: 'O형', sub: '리더십의 행동파', icon: '🌿', color: '#10B981', bg: 'linear-gradient(135deg, #064E3B, #10B981)' },
  { id: 'AB', label: 'AB형', sub: '이성적 천재형', icon: '✨', color: '#C084FC', bg: 'linear-gradient(135deg, #581C87, #C084FC)' },
];

function BloodType() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('fortune');
  const [selected, setSelected] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamFields, setStreamFields] = useState({});
  const [doneFields, setDoneFields] = useState(new Set());
  const [type1, setType1] = useState(null);
  const [type2, setType2] = useState(null);
  const [compat, setCompat] = useState(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const pendingCompatRef = useRef(null);
  const resultRef = useRef(null);
  const streamCleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      getUser(userId).then((u) => {
        if (u.bloodType) {
          setSelected(u.bloodType);
          setType1(u.bloodType);
        }
      }).catch(() => {});
    }
    return () => { streamCleanupRef.current?.(); };
  }, []);

  const { guardedAction: guardBlood } = useHeartGuard('BLOOD_TYPE');

  const handleSelect = (type) => {
    setSelected(type);
    setFortune(null);
    setStreamText('');
    setLoading(true);
    streamCleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    setStreamFields({}); setDoneFields(new Set());
    let buffer = '';
    const PROG_FIELDS = ['overall', 'love', 'money', 'health', 'work'];
    const cleanup = getBloodTypeFortuneStream(type, {
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
          pendingResultRef.current = { bloodType: type, ...parsed };
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
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
    streamCleanupRef.current = cleanup;
  };

  const handleReset = () => {
    streamCleanupRef.current?.();
    setSelected(null);
    setFortune(null);
    setStreamText('');
    setLoading(false);
    setType1(null);
    setType2(null);
    setCompat(null);
    setTab('fortune');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompat = async () => {
    if (!type1 || !type2) return;
    setCompat(null);
    setCompatLoading(true);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    try {
      const data = await getBloodTypeCompatibility(type1, type2);
      pendingCompatRef.current = data;
      setCompleting(true);
    } catch (e) { console.error(e); }
    finally {
      setCompatLoading(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const getTypeInfo = (id) => TYPES.find(t => t.id === id) || TYPES[0];

  return (
    <div className="bt-page">
      <AnalysisComplete
        show={completing}
        theme="blood"
        onDone={() => {
          setCompleting(false);
          if (pendingResultRef.current) {
            setFortune(pendingResultRef.current);
            pendingResultRef.current = null;
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }
          if (pendingCompatRef.current) {
            setCompat(pendingCompatRef.current);
            pendingCompatRef.current = null;
          }
        }}
      />
      <PageTopBar onReset={handleReset} color="#EF4444" />
      <div className="bt-hero">
        <h1 className="bt-title">혈액형 운세</h1>
        <p className="bt-subtitle">혈액형으로 보는 오늘의 운세와 궁합</p>
      </div>

      <div className="bt-tabs">
        <button className={`bt-tab ${tab === 'fortune' ? 'active' : ''}`} onClick={() => setTab('fortune')}>
          🔮 오늘의 운세
        </button>
        <button className={`bt-tab ${tab === 'compat' ? 'active' : ''}`} onClick={() => setTab('compat')}>
          💕 궁합
        </button>
      </div>

      {tab === 'fortune' && (
        <div className="bt-section">
          {/* 혈액형 카드 그리드 */}
          <div className="bt-card-grid">
            {TYPES.map((t) => (
              <button
                key={t.id}
                className={`bt-card ${selected === t.id ? 'active' : ''}`}
                style={{ '--bt-color': t.color, '--bt-bg': t.bg }}
                onClick={() => handleSelect(t.id)}
              >
                <div className="bt-card-bg" />
                <span className="bt-card-icon">{t.icon}</span>
                <span className="bt-card-label">{t.label}</span>
                <span className="bt-card-sub">{t.sub}</span>
              </button>
            ))}
          </div>

          {selected && !fortune && !loading && localStorage.getItem('userId') && (
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center', marginTop: 16 }}>
              <button className="btn-gold" onClick={() => guardBlood(() => handleSelect(selected))} style={{ width: '100%' }}>
                🔮 내 혈액형 운세 보기 <HeartCost category="BLOOD_TYPE" />
              </button>
            </div>
          )}

          {loading && !fortune && (() => {
            const st = (key) => {
              if (doneFields.has(key)) return 'done';
              if (streamFields[key]) return 'streaming';
              return 'pending';
            };
            return (
              <div className="bt-streaming-wrap">
                <div className="bt-streaming-header">
                  <span className="bt-streaming-orb">🩸</span>
                  <span className="bt-streaming-title">AI가 혈액형 운세를 분석중이에요</span>
                  <span className="streaming-dots"><i/><i/><i/></span>
                </div>
                <div className="bt-streaming-cards">
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
            <div className="bt-result fade-in" ref={resultRef}>

              <div className="bt-score-wrap">
                <svg viewBox="0 0 120 120" className="bt-score-circle">
                  <circle cx="60" cy="60" r="52" className="bt-score-bg" />
                  <circle cx="60" cy="60" r="52" className="bt-score-fill"
                    style={{ strokeDasharray: `${(fortune.score / 100) * 327} 327`, stroke: getTypeInfo(fortune.bloodType).color }} />
                </svg>
                <div className="bt-score-text">
                  <span className="bt-score-num">{fortune.score}</span>
                  <span className="bt-score-unit">점</span>
                </div>
              </div>

              <div className="bt-fortunes">
                <FortuneCard icon="🌟" title="총운" description={fortune.overall} delay={0} />
                <FortuneCard icon="💕" title="애정운" description={fortune.love} delay={80} />
                <FortuneCard icon="💰" title="재물운" description={fortune.money} delay={160} />
                <FortuneCard icon="💪" title="건강운" description={fortune.health} delay={240} />
                <FortuneCard icon="💼" title="직장운" description={fortune.work} delay={320} />
              </div>

              <div className="bt-personality glass-card">
                <div className="bt-personality-header">
                  <div className="bt-personality-badge" style={{ background: getTypeInfo(fortune.bloodType).bg }}>
                    <span>{getTypeInfo(fortune.bloodType).icon}</span>
                    <span>{fortune.bloodType}형</span>
                  </div>
                  <p className="bt-personality-label">성격 분석</p>
                </div>
                <p className="bt-personality-text">{fortune.personality}</p>
              </div>

              {fortune.dayAnalysis && (
                <div className="bt-day-analysis glass-card">
                  <span>☯️</span><p>{fortune.dayAnalysis}</p>
                </div>
              )}

              <div className="bt-lucky glass-card">
                <div className="bt-lucky-item">
                  <span className="bt-lucky-label">행운의 숫자</span>
                  <span className="bt-lucky-value">{fortune.luckyNumber}</span>
                </div>
                <div className="bt-lucky-divider" />
                <div className="bt-lucky-item">
                  <span className="bt-lucky-label">행운의 색</span>
                  <span className="bt-lucky-value">{fortune.luckyColor}</span>
                </div>
              </div>

              {/* 심화분석 */}
              {selected && (() => {
                const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
                const bd = profile.birthDate;
                return bd ? (
                  <DeepAnalysis type="bloodtype" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={selected} previousResult={result} />
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {tab === 'compat' && (
        <div className="bt-section">
          <p className="bt-compat-guide">두 혈액형을 선택하세요</p>
          <div className="bt-compat-select">
            {['나', '상대'].map((label, idx) => {
              const val = idx === 0 ? type1 : type2;
              const setter = idx === 0 ? setType1 : setType2;
              return (
                <div key={label} className="bt-compat-group">
                  <span className="bt-compat-label">{label}</span>
                  <div className="bt-compat-btns">
                    {TYPES.map((t) => (
                      <button key={t.id}
                        className={`bt-compat-btn ${val === t.id ? 'active' : ''}`}
                        style={{ '--bt-color': t.color }}
                        onClick={() => setter(t.id)}>
                        {t.icon} {t.id}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <button className="bt-compat-submit" onClick={() => guardBlood(handleCompat)} disabled={!type1 || !type2 || compatLoading}>
            {compatLoading ? 'AI 분석중...' : '💕 궁합 보기'} <HeartCost category="BLOOD_TYPE" />
          </button>
          {compat && !compatLoading && (
            <div className="bt-compat-result fade-in glass-card">
              <div className="bt-compat-header">
                <span className="bt-compat-type" style={{ color: getTypeInfo(compat.type1).color }}>{getTypeInfo(compat.type1).icon} {compat.type1}형</span>
                <span className="bt-compat-x">×</span>
                <span className="bt-compat-type" style={{ color: getTypeInfo(compat.type2).color }}>{getTypeInfo(compat.type2).icon} {compat.type2}형</span>
              </div>
              <div className="bt-compat-score">{compat.score}점</div>
              <div className="bt-compat-grade">{compat.grade}</div>
              <div className="bt-compat-bar"><div className="bt-compat-bar-fill" style={{ width: `${compat.score}%` }} /></div>
              <p className="bt-compat-desc">{compat.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BloodType;
