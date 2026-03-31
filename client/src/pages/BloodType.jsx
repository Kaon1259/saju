import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getBloodTypeFortune, getBloodTypeCompatibility, getUser } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import DeepAnalysis from '../components/DeepAnalysis';
import SpeechButton from '../components/SpeechButton';
import './BloodType.css';

const TYPES = [
  { id: 'A', label: 'A형', sub: '꼼꼼한 완벽주의자', icon: '💎', color: '#3B82F6', bg: 'linear-gradient(135deg, #1E3A5F, #3B82F6)' },
  { id: 'B', label: 'B형', sub: '자유로운 창의가', icon: '🔥', color: '#EF4444', bg: 'linear-gradient(135deg, #7F1D1D, #EF4444)' },
  { id: 'O', label: 'O형', sub: '리더십의 행동파', icon: '🌿', color: '#10B981', bg: 'linear-gradient(135deg, #064E3B, #10B981)' },
  { id: 'AB', label: 'AB형', sub: '이성적 천재형', icon: '✨', color: '#C084FC', bg: 'linear-gradient(135deg, #581C87, #C084FC)' },
];

function BloodType() {
  const [tab, setTab] = useState('fortune');
  const [selected, setSelected] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type1, setType1] = useState(null);
  const [type2, setType2] = useState(null);
  const [compat, setCompat] = useState(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const resultRef = useRef(null);

  const location = useLocation();
  const autoLoad = localStorage.getItem('autoFortune') === 'on' || location.state?.autoLoad;

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      getUser(userId).then((u) => {
        if (u.bloodType) {
          setSelected(u.bloodType);
          setType1(u.bloodType);
          if (autoLoad) handleSelect(u.bloodType);
        }
      }).catch(() => {});
    }
  }, []);

  const handleSelect = async (type) => {
    setSelected(type);
    setFortune(null);
    setLoading(true);
    try {
      const data = await getBloodTypeFortune(type);
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
      const data = await getBloodTypeCompatibility(type1, type2);
      setCompat(data);
    } catch (e) { console.error(e); }
    finally { setCompatLoading(false); }
  };

  const getTypeInfo = (id) => TYPES.find(t => t.id === id) || TYPES[0];

  return (
    <div className="bt-page">
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

          {selected && !fortune && !loading && !autoLoad && localStorage.getItem('userId') && (
            <div className="glass-card" style={{ padding: '20px', textAlign: 'center', marginTop: 16 }}>
              <button className="btn-gold" onClick={() => handleSelect(selected)} style={{ width: '100%' }}>
                🔮 내 혈액형 운세 보기
              </button>
            </div>
          )}

          {loading && (
            <div className="bt-loading"><div className="bt-spinner" /><p>운세를 분석중...</p></div>
          )}

          {fortune && !loading && (
            <div className="bt-result fade-in" ref={resultRef}>
              {/* Speech Button */}
              <div style={{ margin: '12px 0' }}>
                <SpeechButton
                  label="운세 읽어주기"
                  text={[
                    fortune.bloodType ? `${fortune.bloodType}형 오늘의 운세입니다.` : '',
                    fortune.score ? `운세 점수는 ${fortune.score}점입니다.` : '',
                    fortune.overall ? `총운입니다. ${fortune.overall}` : '',
                    fortune.love ? `애정운입니다. ${fortune.love}` : '',
                    fortune.money ? `재물운입니다. ${fortune.money}` : '',
                    fortune.health ? `건강운입니다. ${fortune.health}` : '',
                    fortune.work ? `직장운입니다. ${fortune.work}` : '',
                    fortune.personality ? `성격 분석입니다. ${fortune.personality}` : '',
                    fortune.dayAnalysis ? `오늘의 분석입니다. ${fortune.dayAnalysis}` : '',
                    fortune.luckyNumber ? `행운의 숫자는 ${fortune.luckyNumber}입니다.` : '',
                    fortune.luckyColor ? `행운의 색상은 ${fortune.luckyColor}입니다.` : '',
                  ].filter(Boolean).join(' ')}
                  summaryText={[
                    fortune.bloodType ? `${fortune.bloodType}형 오늘의 운세입니다.` : '',
                    fortune.score ? `운세 점수는 ${fortune.score}점입니다.` : '',
                    fortune.overall ? `총운: ${fortune.overall.split('.').slice(0,2).join('.')}.` : '',
                    fortune.luckyNumber ? `행운의 숫자 ${fortune.luckyNumber},` : '',
                    fortune.luckyColor ? `행운의 색상 ${fortune.luckyColor}.` : '',
                  ].filter(Boolean).join(' ')}
                />
              </div>

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
                  <DeepAnalysis type="bloodtype" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={selected} />
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
          <button className="bt-compat-submit" onClick={handleCompat} disabled={!type1 || !type2 || compatLoading}>
            {compatLoading ? '분석중...' : '💕 궁합 보기'}
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
