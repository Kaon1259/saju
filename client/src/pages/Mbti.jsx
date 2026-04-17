import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMbtiTypes, getMbtiFortuneStream, getMbtiCompatibility, getUser, isGuest } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';

import StreamText from '../components/StreamText';
import PageTopBar from '../components/PageTopBar';
import parseAiJson from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost from '../components/HeartCost';
import './Mbti.css';

const TYPES_DATA = {
  INTJ: { nick: '전략가', icon: '🏰', desc: '독창적 완벽주의', color: '#6D28D9' },
  INTP: { nick: '논리술사', icon: '🔬', desc: '끝없는 호기심', color: '#7C3AED' },
  ENTJ: { nick: '통솔자', icon: '👑', desc: '타고난 리더', color: '#5B21B6' },
  ENTP: { nick: '변론가', icon: '⚡', desc: '재치있는 혁신가', color: '#8B5CF6' },
  INFJ: { nick: '옹호자', icon: '🌙', desc: '깊은 통찰력', color: '#059669' },
  INFP: { nick: '중재자', icon: '🦋', desc: '감성적 몽상가', color: '#10B981' },
  ENFJ: { nick: '선도자', icon: '🌟', desc: '따뜻한 카리스마', color: '#047857' },
  ENFP: { nick: '활동가', icon: '🌈', desc: '열정의 자유영혼', color: '#34D399' },
  ISTJ: { nick: '현실주의자', icon: '🛡️', desc: '믿음직한 책임감', color: '#1D4ED8' },
  ISFJ: { nick: '수호자', icon: '🏠', desc: '헌신적 보호자', color: '#2563EB' },
  ESTJ: { nick: '경영자', icon: '📋', desc: '체계적 리더십', color: '#1E40AF' },
  ESFJ: { nick: '집정관', icon: '🤝', desc: '배려의 화합', color: '#3B82F6' },
  ISTP: { nick: '장인', icon: '🔧', desc: '논리적 해결사', color: '#D97706' },
  ISFP: { nick: '모험가', icon: '🎨', desc: '감성적 예술가', color: '#F59E0B' },
  ESTP: { nick: '사업가', icon: '🎯', desc: '행동파 모험가', color: '#B45309' },
  ESFP: { nick: '연예인', icon: '🎭', desc: '에너지 엔터테이너', color: '#FBBF24' },
};

const GROUPS = [
  { name: '분석가 NT', types: ['INTJ','INTP','ENTJ','ENTP'], gradient: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' },
  { name: '외교관 NF', types: ['INFJ','INFP','ENFJ','ENFP'], gradient: 'linear-gradient(135deg, #047857, #34D399)' },
  { name: '관리자 SJ', types: ['ISTJ','ISFJ','ESTJ','ESFJ'], gradient: 'linear-gradient(135deg, #1E40AF, #3B82F6)' },
  { name: '탐험가 SP', types: ['ISTP','ISFP','ESTP','ESFP'], gradient: 'linear-gradient(135deg, #B45309, #FBBF24)' },
];

function Mbti() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('fortune');
  const [allTypes, setAllTypes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [type1, setType1] = useState(null);
  const [type2, setType2] = useState(null);
  const [compat, setCompat] = useState(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const resultRef = useRef(null);
  const streamCleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  const location = useLocation();
  const autoLoad = localStorage.getItem('autoFortune') === 'on' || location.state?.autoLoad;

  useEffect(() => {
    getMbtiTypes().then(setAllTypes).catch(() => {});
    const userId = localStorage.getItem('userId');
    if (userId) {
      getUser(userId).then((u) => {
        if (u.mbtiType) {
          setSelected(u.mbtiType);
          setType1(u.mbtiType);
          if (autoLoad) handleSelect(u.mbtiType);
        }
      }).catch(() => {});
    }
    return () => { streamCleanupRef.current?.(); };
  }, []);

  const handleSelect = (type) => {
    if (isGuest()) { navigate('/register'); return; }
    setSelected(type);
    setFortune(null);
    setStreamText('');
    setLoading(true);
    streamCleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const cleanup = getMbtiFortuneStream(type, {
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
          setFortune({ mbtiType: type, ...parsed });
        }
        setStreamText('');
        setLoading(false);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
    if (isGuest()) { navigate('/register'); return; }
    if (!type1 || !type2) return;
    setCompat(null);
    setCompatLoading(true);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    try {
      const data = await getMbtiCompatibility(type1, type2);
      setCompat(data);
    } catch (e) { console.error(e); }
    finally {
      setCompatLoading(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  return (
    <div className="mbti-page">
      <PageTopBar onReset={handleReset} color="#8B5CF6" />
      <div className="mbti-hero">
        <h1 className="mbti-title">MBTI 운세</h1>
        <p className="mbti-subtitle">16가지 성격 유형으로 보는 오늘의 운세</p>
      </div>

      <div className="mbti-tabs">
        <button className={`mbti-tab ${tab === 'fortune' ? 'active' : ''}`} onClick={() => setTab('fortune')}>🔮 오늘의 운세</button>
        <button className={`mbti-tab ${tab === 'compat' ? 'active' : ''}`} onClick={() => setTab('compat')}>💕 궁합</button>
      </div>

      {tab === 'fortune' && (
        <div className="mbti-section">
          {GROUPS.map((group) => (
            <div key={group.name} className="mbti-group">
              <div className="mbti-group-label" style={{ background: group.gradient }}>{group.name}</div>
              <div className="mbti-type-grid">
                {group.types.map((t) => {
                  const info = TYPES_DATA[t];
                  const scoreData = allTypes.find(a => a.type === t);
                  const isActive = selected === t;
                  return (
                    <button key={t} className={`mbti-card ${isActive ? 'active' : ''}`}
                      style={{ '--m-color': info.color }}
                      onClick={() => handleSelect(t)}>
                      <div className="mbti-card-glow" />
                      <span className="mbti-card-icon">{info.icon}</span>
                      <span className="mbti-card-code">{t}</span>
                      <span className="mbti-card-nick">{info.nick}</span>
                      {scoreData?.score && <span className="mbti-card-score">{scoreData.score}점</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {selected && !fortune && !loading && !autoLoad && localStorage.getItem('userId') && (
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center', marginTop: 16 }}>
              <button className="btn-gold" onClick={() => handleSelect(selected)} style={{ width: '100%' }}>
                🔮 내 MBTI 운세 보기 <HeartCost category="MBTI" />
              </button>
            </div>
          )}

          {loading && !streamText && (
            <div className="mbti-loading"><div className="mbti-spinner" /><p>AI가 운세를 분석하고 있어요</p></div>
          )}

          {loading && streamText && (
            <StreamText text={streamText} icon="🧬" label="AI가 MBTI 운세를 분석하고 있어요..." color="#34D399" />
          )}

          {fortune && !loading && (
            <div className="mbti-result fade-in" ref={resultRef}>
              <div className="mbti-result-header glass-card">
                <div className="mbti-result-badge" style={{ background: TYPES_DATA[fortune.mbtiType]?.color }}>
                  <span className="mbti-result-icon">{TYPES_DATA[fortune.mbtiType]?.icon}</span>
                  <div>
                    <span className="mbti-result-code">{fortune.mbtiType}</span>
                    <span className="mbti-result-nick">{TYPES_DATA[fortune.mbtiType]?.nick}</span>
                  </div>
                </div>
                <p className="mbti-result-personality">{fortune.personality}</p>
              </div>

              <div className="mbti-score-wrap">
                <svg viewBox="0 0 120 120" className="mbti-score-circle">
                  <circle cx="60" cy="60" r="52" className="mbti-score-bg" />
                  <circle cx="60" cy="60" r="52" className="mbti-score-fill"
                    style={{ strokeDasharray: `${(fortune.score / 100) * 327} 327`, stroke: TYPES_DATA[fortune.mbtiType]?.color }} />
                </svg>
                <div className="mbti-score-text">
                  <span className="mbti-score-num">{fortune.score}</span>
                  <span className="mbti-score-unit">점</span>
                </div>
              </div>

              <div className="mbti-fortunes">
                <FortuneCard icon="🌟" title="총운" description={fortune.overall} delay={0} />
                <FortuneCard icon="💕" title="애정운" description={fortune.love} delay={80} />
                <FortuneCard icon="💰" title="재물운" description={fortune.money} delay={160} />
                <FortuneCard icon="💪" title="건강운" description={fortune.health} delay={240} />
                <FortuneCard icon="💼" title="직장운" description={fortune.work} delay={320} />
              </div>

              {fortune.tip && (
                <div className="mbti-tip glass-card">
                  <span>💡</span><p>{fortune.tip}</p>
                </div>
              )}

              <div className="mbti-lucky glass-card">
                <div className="mbti-lucky-item">
                  <span className="mbti-lucky-label">행운의 숫자</span>
                  <span className="mbti-lucky-value">{fortune.luckyNumber}</span>
                </div>
                <div className="mbti-lucky-divider" />
                <div className="mbti-lucky-item">
                  <span className="mbti-lucky-label">행운의 색</span>
                  <span className="mbti-lucky-value">{fortune.luckyColor}</span>
                </div>
              </div>

              {/* 심화분석 */}
              {selected && (() => {
                const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
                const bd = profile.birthDate;
                return bd ? (
                  <DeepAnalysis type="mbti" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={selected} previousResult={result} />
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {tab === 'compat' && (
        <div className="mbti-section">
          <p className="mbti-compat-guide">두 MBTI를 선택하세요</p>
          {['나', '상대'].map((label, idx) => {
            const val = idx === 0 ? type1 : type2;
            const setter = idx === 0 ? setType1 : setType2;
            return (
              <div key={label} className="mbti-compat-group">
                <span className="mbti-compat-label">{label}의 MBTI</span>
                <div className="mbti-compat-grid">
                  {Object.entries(TYPES_DATA).map(([t, info]) => (
                    <button key={t} className={`mbti-compat-btn ${val === t ? 'active' : ''}`}
                      style={{ '--m-color': info.color }} onClick={() => setter(t)}>
                      <span>{info.icon}</span> {t}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button className="mbti-compat-submit" onClick={handleCompat} disabled={!type1 || !type2 || compatLoading}>
            {compatLoading ? 'AI 분석중...' : '💕 궁합 보기'} <HeartCost category="MBTI" />
          </button>
          {compat && !compatLoading && (
            <div className="mbti-compat-result fade-in glass-card">
              <div className="mbti-compat-header">
                <div className="mbti-compat-type-badge" style={{ background: TYPES_DATA[compat.type1]?.color }}>
                  {TYPES_DATA[compat.type1]?.icon} {compat.type1}
                </div>
                <span className="mbti-compat-x">×</span>
                <div className="mbti-compat-type-badge" style={{ background: TYPES_DATA[compat.type2]?.color }}>
                  {TYPES_DATA[compat.type2]?.icon} {compat.type2}
                </div>
              </div>
              <div className="mbti-compat-score">{compat.score}점</div>
              <div className="mbti-compat-grade">{compat.grade}</div>
              <div className="mbti-compat-bar"><div className="mbti-compat-bar-fill" style={{ width: `${compat.score}%`, background: TYPES_DATA[compat.type1]?.color }} /></div>
              <p className="mbti-compat-advice">{compat.advice}</p>
              {compat.bestMatch && (
                <div className="mbti-best-match">🏆 {compat.type1}의 베스트 매치: <strong>{compat.bestMatch} ({TYPES_DATA[compat.bestMatch]?.nick})</strong></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Mbti;
