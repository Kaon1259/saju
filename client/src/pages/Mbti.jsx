import { useState, useEffect, useRef } from 'react';
import { getMbtiTypes, getMbtiFortune, getMbtiCompatibility, getUser } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
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
  const [tab, setTab] = useState('fortune');
  const [allTypes, setAllTypes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type1, setType1] = useState(null);
  const [type2, setType2] = useState(null);
  const [compat, setCompat] = useState(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    getMbtiTypes().then(setAllTypes).catch(() => {});
    // 로그인 시 내 MBTI 자동 선택
    const userId = localStorage.getItem('userId');
    if (userId) {
      getUser(userId).then((u) => {
        if (u.mbtiType) {
          setSelected(u.mbtiType);
          setType1(u.mbtiType);
          handleSelect(u.mbtiType);
        }
      }).catch(() => {});
    }
  }, []);

  const handleSelect = async (type) => {
    setSelected(type);
    setFortune(null);
    setLoading(true);
    try {
      const data = await getMbtiFortune(type);
      setFortune(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCompat = async () => {
    if (!type1 || !type2) return;
    setCompat(null);
    setCompatLoading(true);
    try {
      const data = await getMbtiCompatibility(type1, type2);
      setCompat(data);
    } catch (e) { console.error(e); }
    finally { setCompatLoading(false); }
  };

  return (
    <div className="mbti-page">
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

          {loading && (
            <div className="mbti-loading"><div className="mbti-spinner" /><p>운세를 분석중...</p></div>
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

              {/* Speech Button */}
              <div style={{ margin: '12px 0' }}>
                <SpeechButton
                  label="운세 읽어주기"
                  text={[
                    fortune.mbtiType ? `${fortune.mbtiType} ${TYPES_DATA[fortune.mbtiType]?.nick || ''} 오늘의 운세입니다.` : '',
                    fortune.personality ? `성격 분석입니다. ${fortune.personality}` : '',
                    fortune.score ? `운세 점수는 ${fortune.score}점입니다.` : '',
                    fortune.overall ? `총운입니다. ${fortune.overall}` : '',
                    fortune.love ? `애정운입니다. ${fortune.love}` : '',
                    fortune.work ? `직장운입니다. ${fortune.work}` : '',
                    fortune.tip ? `오늘의 팁입니다. ${fortune.tip}` : '',
                    fortune.luckyNumber ? `행운의 숫자는 ${fortune.luckyNumber}입니다.` : '',
                    fortune.luckyColor ? `행운의 색상은 ${fortune.luckyColor}입니다.` : '',
                  ].filter(Boolean).join(' ')}
                  summaryText={[
                    fortune.mbtiType ? `${fortune.mbtiType} ${TYPES_DATA[fortune.mbtiType]?.nick || ''} 오늘의 운세입니다.` : '',
                    fortune.score ? `운세 점수는 ${fortune.score}점입니다.` : '',
                    fortune.overall ? `총운: ${fortune.overall.split('.').slice(0,2).join('.')}.` : '',
                    fortune.luckyNumber ? `행운의 숫자 ${fortune.luckyNumber},` : '',
                    fortune.luckyColor ? `행운의 색상 ${fortune.luckyColor}.` : '',
                  ].filter(Boolean).join(' ')}
                />
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
                <FortuneCard icon="💼" title="직장운" description={fortune.work} delay={160} />
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
            {compatLoading ? '분석중...' : '💕 궁합 보기'}
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
