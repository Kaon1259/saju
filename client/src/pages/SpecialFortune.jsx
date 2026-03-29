import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSpecialLoveFortune, getHourlyFortune, getTimeblockFortune } from '../api/fortune';
import SpeechButton from '../components/SpeechButton';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import './SpecialFortune.css';

const LOVE_TYPES = [
  { id: 'relationship', label: '연애운',   icon: '💕', desc: '연인과의 오늘 하루' },
  { id: 'reunion',      label: '재회운',   icon: '💔', desc: '다시 만날 수 있을까?' },
  { id: 'remarriage',   label: '재혼운',   icon: '💍', desc: '새로운 인연의 가능성' },
  { id: 'blind_date',   label: '소개팅운', icon: '💘', desc: '좋은 만남이 올까?' },
];

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  const sat = 30 + s * 0.7;
  const light = 85 - s * 0.4;
  return `hsl(340, ${sat}%, ${light}%)`;
}

function FloatingHearts({ score }) {
  const color = getHeartColor(score);
  const count = Math.max(3, Math.floor((score || 50) / 12));
  return (
    <div className="sf-hearts-container">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="sf-floating-heart" style={{
          '--heart-color': color,
          '--float-delay': `${i * 0.4}s`,
          '--float-duration': `${2 + Math.random() * 2}s`,
          '--heart-x': `${10 + Math.random() * 80}%`,
          '--heart-size': `${12 + Math.random() * 14}px`,
        }}>&#x2764;</span>
      ))}
    </div>
  );
}

function SpecialFortune() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'love');
  const [loveType, setLoveType] = useState(null);
  const [timeMode, setTimeMode] = useState('timeblock');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [partnerGender, setPartnerGender] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [breakupDate, setBreakupDate] = useState('');
  const [showPartner, setShowPartner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'love' || t === 'time') setTab(t);
    const tp = searchParams.get('type');
    if (tp && ['reunion', 'remarriage', 'blind_date'].includes(tp)) setLoveType(tp);
    const m = searchParams.get('mode');
    if (m === 'timeblock' || m === 'hourly') setTimeMode(m);
  }, [searchParams]);

  const resetResult = () => { setResult(null); setLoading(false); };

  const handleAnalyze = async () => {
    if (!birthDate) return;
    setLoading(true); setResult(null);
    try {
      let data;
      if (tab === 'love' && loveType) {
        data = await getSpecialLoveFortune(loveType, birthDate, null, gender || null, null,
          showPartner && partnerDate ? partnerDate : null,
          showPartner && partnerGender ? partnerGender : null,
          loveType === 'reunion' && breakupDate ? breakupDate : null,
          loveType === 'blind_date' && meetDate ? meetDate : null);
      } else if (tab === 'time' && timeMode === 'timeblock') {
        data = await getTimeblockFortune(birthDate, null, gender || null);
      } else if (tab === 'time' && timeMode === 'hourly') {
        data = await getHourlyFortune(birthDate, null, gender || null);
      }
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const switchTab = (t) => { setTab(t); setResult(null); setLoveType(null); };

  const loveInfo = LOVE_TYPES.find(l => l.id === loveType);
  const heartColor = result?.score ? getHeartColor(result.score) : '#ffc0cb';

  return (
    <div className="sf-page">
      {/* 히어로 */}
      <div className="sf-hero">
        <div className="sf-hero-bg" />
        <h1 className="sf-title">{tab === 'love' ? '연애 특수 운세' : '시간별 운세'}</h1>
        <p className="sf-subtitle">{tab === 'love' ? '재회 · 재혼 · 소개팅, AI가 분석합니다' : '아침부터 저녁까지, 시간별 기운을 읽습니다'}</p>
      </div>

      {/* 상단 탭 */}
      <div className="sf-tabs">
        <button className={`sf-tab ${tab === 'love' ? 'active sf-tab--love' : ''}`} onClick={() => switchTab('love')}>
          💝 연애 운세
        </button>
        <button className={`sf-tab ${tab === 'time' ? 'active sf-tab--time' : ''}`} onClick={() => switchTab('time')}>
          🕐 시간별 운세
        </button>
      </div>

      {/* ═══ 연애 운세 탭 ═══ */}
      {tab === 'love' && (
        <div className="sf-love-section fade-in">
          {/* 연애 타입 선택 */}
          <div className="sf-love-types">
            {LOVE_TYPES.map(lt => (
              <button key={lt.id}
                className={`sf-love-chip ${loveType === lt.id ? 'active' : ''}`}
                onClick={() => { setLoveType(lt.id); resetResult(); }}>
                <span className="sf-chip-icon">{lt.icon}</span>
                <span className="sf-chip-label">{lt.label}</span>
                <span className="sf-chip-desc">{lt.desc}</span>
              </button>
            ))}
          </div>

          {/* 입력 폼 */}
          {loveType && !result && (
            <div className="sf-form glass-card fade-in">
              {/* 내 정보 */}
              <h3 className="sf-form-section-title">내 정보</h3>
              {localStorage.getItem('userId') && (
                <button className="sf-autofill-btn" onClick={() => {
                  try {
                    const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                    if (p.birthDate) setBirthDate(p.birthDate);
                    if (p.gender) setGender(p.gender);
                  } catch {}
                }}>✨ 내 정보로 채우기</button>
              )}
              <div className="sf-form-group">
                <label className="sf-label">생년월일</label>
                <BirthDatePicker value={birthDate} onChange={setBirthDate} />
              </div>
              <div className="sf-form-group">
                <label className="sf-label">성별</label>
                <div className="sf-toggle">
                  <button className={`sf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>♂ 남성</button>
                  <button className={`sf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>♀ 여성</button>
                </div>
              </div>

              {/* 재회: 헤어진 시기 */}
              {loveType === 'reunion' && (
                <div className="sf-form-group">
                  <label className="sf-label">헤어진 시기 <span className="sf-optional">(선택)</span></label>
                  <BirthDatePicker value={breakupDate} onChange={setBreakupDate} />
                </div>
              )}

              {/* 소개팅: 만나는 날짜 */}
              {loveType === 'blind_date' && (
                <div className="sf-form-group">
                  <label className="sf-label">소개팅 날짜 <span className="sf-optional">(선택)</span></label>
                  <BirthDatePicker value={meetDate} onChange={setMeetDate} />
                </div>
              )}

              {/* 상대방 정보 토글 */}
              <button className="sf-partner-toggle" onClick={() => setShowPartner(!showPartner)}>
                {showPartner ? '▲ 상대방 정보 접기' : '▼ 상대방 정보 추가 (알고 있다면)'}
              </button>

              {showPartner && (
                <div className="sf-partner-section fade-in">
                  <h3 className="sf-form-section-title">상대방 정보 <span className="sf-optional">(더 정밀한 분석)</span></h3>
                  <div className="sf-form-group">
                    <label className="sf-label">상대방 생년월일</label>
                    <BirthDatePicker value={partnerDate} onChange={setPartnerDate} />
                  </div>
                  <div className="sf-form-group">
                    <label className="sf-label">상대방 성별</label>
                    <div className="sf-toggle">
                      <button className={`sf-toggle-btn ${partnerGender === 'M' ? 'active' : ''}`} onClick={() => setPartnerGender('M')}>♂ 남성</button>
                      <button className={`sf-toggle-btn ${partnerGender === 'F' ? 'active' : ''}`} onClick={() => setPartnerGender('F')}>♀ 여성</button>
                    </div>
                  </div>
                </div>
              )}

              <button className="sf-submit sf-submit--love" onClick={handleAnalyze} disabled={!birthDate || loading}>
                {loading ? 'AI 분석 중...' : `${loveInfo?.icon} ${loveInfo?.label} 보기`}
              </button>
            </div>
          )}

          {/* 로딩 */}
          {loading && tab === 'love' && (
            <div className="sf-loading">
              <div className="sf-loading-hearts">
                {[0,1,2].map(i => <span key={i} className="sf-loading-heart" style={{ animationDelay: `${i * 0.3}s` }}>💗</span>)}
              </div>
              <p>AI가 {loveInfo?.label}을 분석하고 있습니다...</p>
            </div>
          )}

          {/* 연애 결과 — 하트 강도 UI */}
          {result && tab === 'love' && (
            <div className="sf-love-result fade-in" ref={resultRef} style={{ '--heart-color': heartColor }}>
              <div className="sf-speech-area">
                <SpeechButton label={`${loveInfo?.label} 읽어주기`}
                  text={[`${loveInfo?.label} 결과입니다.`, `점수는 ${result.score}점, ${result.grade}입니다.`, result.overall, result.timing, result.advice, result.caution].filter(Boolean).join(' ')}
                  summaryText={`${loveInfo?.label} ${result.score}점, ${result.grade}. ${(result.overall||'').split('.').slice(0,2).join('.')}.`} />
              </div>

              {/* 하트 점수 */}
              <div className="sf-heart-score-card">
                <FloatingHearts score={result.score} />
                <div className="sf-heart-aura" style={{ background: `radial-gradient(circle, ${heartColor}, transparent 70%)` }} />
                <div className="sf-heart-center">
                  <span className="sf-heart-big" style={{ color: heartColor }}>&#x2764;</span>
                  <span className="sf-heart-num">{result.score}</span>
                  <span className="sf-heart-unit">점</span>
                </div>
                <span className="sf-heart-grade" style={{ color: GRADE_COLORS[result.grade] || heartColor }}>{result.grade}</span>
              </div>

              <FortuneCard icon={loveInfo?.icon} title="종합 분석" description={result.overall} delay={0} />
              {result.timing && <FortuneCard icon="📅" title="최적 시기" description={result.timing} delay={80} />}
              {result.advice && <FortuneCard icon="💡" title="행동 조언" description={result.advice} delay={160} />}
              {result.caution && <FortuneCard icon="⚠️" title="주의사항" description={result.caution} delay={240} />}

              <div className="sf-lucky glass-card">
                {result.luckyDay && <div className="sf-lucky-item"><span className="sf-lucky-label">행운의 날</span><span className="sf-lucky-value">{result.luckyDay}</span></div>}
                {result.luckyPlace && <div className="sf-lucky-item"><span className="sf-lucky-label">행운의 장소</span><span className="sf-lucky-value">{result.luckyPlace}</span></div>}
                {result.luckyColor && <div className="sf-lucky-item"><span className="sf-lucky-label">행운의 색</span><span className="sf-lucky-value">{result.luckyColor}</span></div>}
              </div>

              <button className="sf-reset" onClick={() => { setResult(null); setBirthDate(''); }}>🔄 다시 보기</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ 시간별 운세 탭 ═══ */}
      {tab === 'time' && (
        <div className="sf-time-section fade-in">
          {/* 모드 전환 */}
          <div className="sf-time-modes">
            <button className={`sf-mode-btn ${timeMode === 'timeblock' ? 'active' : ''}`}
              onClick={() => { setTimeMode('timeblock'); resetResult(); }}>
              🌅 아침 · 점심 · 저녁
            </button>
            <button className={`sf-mode-btn ${timeMode === 'hourly' ? 'active' : ''}`}
              onClick={() => { setTimeMode('hourly'); resetResult(); }}>
              🕐 12시진 상세
            </button>
          </div>

          {/* 입력 */}
          {!result && (
            <div className="sf-form glass-card fade-in">
              {localStorage.getItem('userId') && (
                <button className="sf-autofill-btn" onClick={() => {
                  try {
                    const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                    if (p.birthDate) setBirthDate(p.birthDate);
                    if (p.gender) setGender(p.gender);
                  } catch {}
                }}>✨ 내 정보로 채우기</button>
              )}
              <div className="sf-form-group">
                <label className="sf-label">생년월일</label>
                <BirthDatePicker value={birthDate} onChange={setBirthDate} />
              </div>
              <div className="sf-form-group">
                <label className="sf-label">성별</label>
                <div className="sf-toggle">
                  <button className={`sf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>♂ 남성</button>
                  <button className={`sf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>♀ 여성</button>
                </div>
              </div>
              <button className="sf-submit sf-submit--time" onClick={handleAnalyze} disabled={!birthDate || loading}>
                {loading ? 'AI 분석 중...' : `⏰ ${timeMode === 'timeblock' ? '아침/점심/저녁' : '12시진'} 운세 보기`}
              </button>
            </div>
          )}

          {loading && tab === 'time' && (
            <div className="sf-loading">
              <div className="sf-loading-clock">🕐</div>
              <p>AI가 시간별 운세를 분석하고 있습니다...</p>
            </div>
          )}

          {/* 아침/점심/저녁 결과 */}
          {result && timeMode === 'timeblock' && result.blocks && (
            <div className="sf-timeblock-result fade-in" ref={resultRef}>
              <div className="sf-speech-area">
                <SpeechButton label="시간별 운세 읽어주기"
                  text={[result.summary, ...(result.blocks||[]).map(b => `${b.name}. ${b.fortune} ${b.advice}`)].filter(Boolean).join(' ')}
                  summaryText={`${result.summary || ''} 최고 시간대 ${result.bestBlock}.`} />
              </div>

              {result.summary && <div className="sf-time-summary glass-card"><p>{result.summary}</p></div>}

              <div className="sf-blocks">
                {(result.blocks || []).map((b, i) => {
                  const isBest = b.name === result.bestBlock;
                  const gradients = [
                    'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.05))',
                    'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.05))',
                    'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(76,29,149,0.05))',
                  ];
                  return (
                    <div key={i} className={`sf-block-card glass-card ${isBest ? 'sf-block--best' : ''}`}
                      style={{ background: gradients[i] || gradients[0] }}>
                      {isBest && <span className="sf-block-best-badge">BEST</span>}
                      <div className="sf-block-header">
                        <span className="sf-block-icon">{b.icon}</span>
                        <div>
                          <span className="sf-block-name">{b.name}</span>
                          <span className="sf-block-time">{b.timeRange}</span>
                        </div>
                        <div className="sf-block-score-bar">
                          <div className="sf-block-score-fill" style={{ width: `${b.score}%` }} />
                          <span className="sf-block-score-num">{b.score}점</span>
                        </div>
                      </div>
                      <p className="sf-block-fortune">{b.fortune}</p>
                      <p className="sf-block-advice">💡 {b.advice}</p>
                      {b.luckyAction && <span className="sf-block-action">추천: {b.luckyAction}</span>}
                    </div>
                  );
                })}
              </div>
              <button className="sf-reset" onClick={() => { setResult(null); setBirthDate(''); }}>🔄 다시 보기</button>
            </div>
          )}

          {/* 12시진 결과 */}
          {result && timeMode === 'hourly' && result.hours && (
            <div className="sf-hourly-result fade-in" ref={resultRef}>
              <div className="sf-speech-area">
                <SpeechButton label="12시진 읽어주기"
                  text={[result.summary, ...(result.hours||[]).map(h => `${h.name} ${h.time}. ${h.fortune}`)].filter(Boolean).join(' ')}
                  summaryText={`${result.summary || ''}`} />
              </div>

              {result.summary && (
                <div className="sf-time-summary glass-card">
                  <p>{result.summary}</p>
                  <div className="sf-best-worst">
                    <span className="sf-best">✨ 최고: {result.bestHour}</span>
                    <span className="sf-worst">⚠️ 주의: {result.worstHour}</span>
                  </div>
                </div>
              )}

              <div className="sf-hourly-grid">
                {(result.hours || []).map((h, i) => {
                  const isBest = h.name === result.bestHour;
                  const isWorst = h.name === result.worstHour;
                  return (
                    <div key={i} className={`sf-hour-card glass-card ${isBest ? 'sf-hour--best' : ''} ${isWorst ? 'sf-hour--worst' : ''}`}>
                      <div className="sf-hour-header">
                        <span className="sf-hour-name">{h.name}</span>
                        <span className="sf-hour-time">{h.time}</span>
                        <span className={`sf-hour-score ${h.score >= 75 ? 'high' : h.score >= 55 ? 'mid' : 'low'}`}>{h.score}점</span>
                      </div>
                      <p className="sf-hour-fortune">{h.fortune}</p>
                      {h.action && <p className="sf-hour-action">💡 {h.action}</p>}
                    </div>
                  );
                })}
              </div>
              <button className="sf-reset" onClick={() => { setResult(null); setBirthDate(''); }}>🔄 다시 보기</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpecialFortune;
