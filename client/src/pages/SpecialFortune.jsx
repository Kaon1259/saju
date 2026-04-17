import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSpecialLoveFortune, getHourlyFortune, getTimeblockFortune } from '../api/fortune';
import DeepAnalysis from '../components/DeepAnalysis';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './SpecialFortune.css';

const LOVE_TYPES = [
  { id: 'relationship', label: '연애운',   icon: '💕', desc: '연인과의 오늘 하루' },
  { id: 'reunion',      label: '재회운',   icon: '💔', desc: '다시 만날 수 있을까?' },
  { id: 'remarriage',   label: '재혼운',   icon: '💍', desc: '새로운 인연의 가능성' },
  { id: 'blind_date',   label: '소개팅운', icon: '💘', desc: '좋은 만남이 올까?' },
];

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

const BIRTH_TIMES = [
  { value: '', label: '모름 / 선택안함' },
  { value: '자시', label: '자시 (23:00~01:00)' },
  { value: '축시', label: '축시 (01:00~03:00)' },
  { value: '인시', label: '인시 (03:00~05:00)' },
  { value: '묘시', label: '묘시 (05:00~07:00)' },
  { value: '진시', label: '진시 (07:00~09:00)' },
  { value: '사시', label: '사시 (09:00~11:00)' },
  { value: '오시', label: '오시 (11:00~13:00)' },
  { value: '미시', label: '미시 (13:00~15:00)' },
  { value: '신시', label: '신시 (15:00~17:00)' },
  { value: '유시', label: '유시 (17:00~19:00)' },
  { value: '술시', label: '술시 (19:00~21:00)' },
  { value: '해시', label: '해시 (21:00~23:00)' },
];

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
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [birthTime, setBirthTime] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [partnerGender, setPartnerGender] = useState('');
  const [meetDate, setMeetDate] = useState('');
  const [breakupDate, setBreakupDate] = useState('');
  const [showPartner, setShowPartner] = useState(false);
  const [showStarPicker, setShowStarPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

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
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    try {
      let data;
      if (tab === 'love' && loveType) {
        data = await getSpecialLoveFortune(loveType, birthDate, birthTime || null, gender || null, calendarType || null,
          showPartner && partnerDate ? partnerDate : null,
          showPartner && partnerGender ? partnerGender : null,
          loveType === 'reunion' && breakupDate ? breakupDate : null,
          loveType === 'blind_date' && meetDate ? meetDate : null);
      } else if (tab === 'time' && timeMode === 'timeblock') {
        data = await getTimeblockFortune(birthDate, birthTime || null, gender || null, calendarType || null);
      } else if (tab === 'time' && timeMode === 'hourly') {
        data = await getHourlyFortune(birthDate, birthTime || null, gender || null, calendarType || null);
      }
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) { console.error(e); }
    finally {
      setLoading(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
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
                    if (p.calendarType) setCalendarType(p.calendarType);
                    if (p.birthTime) setBirthTime(p.birthTime);
                  } catch {}
                }}>✨ 내 정보로 채우기</button>
              )}
              <div className="sf-form-group">
                <label className="sf-label">달력 구분</label>
                <div className="sf-toggle">
                  <button type="button" className={`sf-toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button>
                  <button type="button" className={`sf-toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button>
                </div>
              </div>
              <div className="sf-form-group">
                <label className="sf-label">생년월일</label>
                <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
              </div>
              <div className="sf-form-group">
                <label className="sf-label">성별</label>
                <div className="sf-toggle">
                  <button className={`sf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}><span className="g-circle g-male">♂</span></button>
                  <button className={`sf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}><span className="g-circle g-female">♀</span></button>
                </div>
              </div>
              <div className="sf-form-group">
                <label className="sf-label">태어난 시간 (선택)</label>
                <select className="sf-input sf-select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>
                  {BIRTH_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
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
                  {(() => {
                    const prof = (() => { try { return JSON.parse(localStorage.getItem('userProfile')||'{}'); } catch { return {}; } })();
                    const stars = (() => { try { return JSON.parse(localStorage.getItem('myStarList')||'[]'); } catch { return []; } })();
                    return (prof.partnerBirthDate || stars.length > 0) ? (
                      <div className="compat-autofill-row">
                        {prof.partnerBirthDate && (
                          <button className="sf-autofill-btn" onClick={() => { setPartnerDate(prof.partnerBirthDate); if (prof.gender === 'M') setPartnerGender('F'); else setPartnerGender('M'); }}>💕 연인 정보로 채우기</button>
                        )}
                        {stars.length > 0 && (
                          <button className="sf-autofill-btn" onClick={() => setShowStarPicker(true)}>⭐ 스타 정보로 채우기</button>
                        )}
                      </div>
                    ) : null;
                  })()}
                  {showStarPicker && (
                    <div className="star-picker-overlay" onClick={() => setShowStarPicker(false)}>
                      <div className="star-picker-popup" onClick={e => e.stopPropagation()}>
                        <div className="star-picker-header">
                          <h3 className="star-picker-title">⭐ 나의 스타 선택</h3>
                          <button className="star-picker-close" onClick={() => setShowStarPicker(false)}>✕</button>
                        </div>
                        <div className="star-picker-list">
                          {(() => { try { return JSON.parse(localStorage.getItem('myStarList')||'[]'); } catch { return []; } })().map((s, i) => (
                            <button key={i} className="star-picker-item" onClick={() => { setPartnerDate(s.birth); if (s.gender) setPartnerGender(s.gender); setShowStarPicker(false); }}>
                              <span className={`star-picker-sym ${s.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>{s.gender === 'M' ? '♂' : '♀'}</span>
                              <div className="star-picker-info"><span className="star-picker-name">{s.name}</span>{s.group && <span className="star-picker-group">{s.group}</span>}</div>
                              <span className="star-picker-birth">{s.birth?.slice(0, 4)}년생</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="sf-form-group">
                    <label className="sf-label">상대방 생년월일</label>
                    <BirthDatePicker value={partnerDate} onChange={setPartnerDate} />
                  </div>
                  <div className="sf-form-group">
                    <label className="sf-label">상대방 성별</label>
                    <div className="sf-toggle">
                      <button className={`sf-toggle-btn ${partnerGender === 'M' ? 'active' : ''}`} onClick={() => setPartnerGender('M')}><span className="g-circle g-male">♂</span></button>
                      <button className={`sf-toggle-btn ${partnerGender === 'F' ? 'active' : ''}`} onClick={() => setPartnerGender('F')}><span className="g-circle g-female">♀</span></button>
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

              {birthDate && loveType && (
                <DeepAnalysis type={loveType === 'relationship' ? 'love' : loveType} birthDate={birthDate} birthTime={birthTime} gender={gender} calendarType={calendarType} previousResult={result} />
              )}

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
                    if (p.calendarType) setCalendarType(p.calendarType);
                    if (p.birthTime) setBirthTime(p.birthTime);
                  } catch {}
                }}>✨ 내 정보로 채우기</button>
              )}
              <div className="sf-form-group">
                <label className="sf-label">달력 구분</label>
                <div className="sf-toggle">
                  <button type="button" className={`sf-toggle-btn ${calendarType === 'SOLAR' ? 'active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button>
                  <button type="button" className={`sf-toggle-btn ${calendarType === 'LUNAR' ? 'active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button>
                </div>
              </div>
              <div className="sf-form-group">
                <label className="sf-label">생년월일</label>
                <BirthDatePicker value={birthDate} onChange={setBirthDate} calendarType={calendarType} />
              </div>
              <div className="sf-form-group">
                <label className="sf-label">성별</label>
                <div className="sf-toggle">
                  <button className={`sf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}><span className="g-circle g-male">♂</span></button>
                  <button className={`sf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}><span className="g-circle g-female">♀</span></button>
                </div>
              </div>
              <div className="sf-form-group">
                <label className="sf-label">태어난 시간 (선택)</label>
                <select className="sf-input sf-select" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>
                  {BIRTH_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
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
