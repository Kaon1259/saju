import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { analyzeSaju, analyzeSajuStream, getUserSaju, getDailyFortunes, isGuest } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import DeepAnalysis from '../components/DeepAnalysis';
import FortuneLoading from '../components/FortuneLoading';
import AnalysisMatrix from '../components/AnalysisMatrix';
import parseAiJson from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost from '../components/HeartCost';
import './SajuAnalysis.css';

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

const CATEGORY_CONFIG = [
  { key: 'overall', icon: '⭐', title: '총운', field: 'overall' },
  { key: 'love', icon: '💕', title: '애정운', field: 'love' },
  { key: 'money', icon: '💰', title: '재물운', field: 'money' },
  { key: 'health', icon: '💪', title: '건강운', field: 'health' },
  { key: 'work', icon: '💼', title: '직장운', field: 'work' },
];

const ELEMENT_COLORS = {
  '목': '#4ade80',
  '화': '#f87171',
  '토': '#fbbf24',
  '금': '#e2e8f0',
  '수': '#60a5fa',
};

const ELEMENT_EMOJI = {
  '목': '🌳',
  '화': '🔥',
  '토': '⛰️',
  '금': '⚔️',
  '수': '💧',
};

function SajuAnalysis() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [gender, setGender] = useState('');
  const [activeTab, setActiveTab] = useState('saju'); // saju, fortune, advanced
  const [dailyFortunes, setDailyFortunes] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 결과 등장 시 매트릭스 페이드아웃
  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);

  const location = useLocation();
  const autoLoad = localStorage.getItem('autoFortune') === 'on' || location.state?.autoLoad;

  const loadUserSaju = () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // 프로필에서 birthDate, birthTime, gender 추출
    let userBd = localStorage.getItem('userBirthDate');
    let userBt = '';
    let userGender = '';
    let userCalendar = 'SOLAR';
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) userBd = p.birthDate;
      if (p.birthTime) userBt = p.birthTime;
      if (p.gender) userGender = p.gender;
      if (p.calendarType) userCalendar = p.calendarType;
    } catch {}

    if (!userBd) {
      // birthDate 없으면 기존 REST 방식 폴백
      setShowInput(false);
      setLoading(true);
      getUserSaju(userId)
        .then((data) => {
          setResult(data);
          getDailyFortunes(userBd).then(setDailyFortunes).catch(() => {});
        })
        .catch((err) => {
          console.error('Failed to load user saju:', err);
          setShowInput(true);
        })
        .finally(() => setLoading(false));
      return;
    }

    // 스트리밍 방식
    setShowInput(false);
    setLoading(true);
    setStreaming(false);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    let firstChunk = true;
    cleanupRef.current = analyzeSajuStream(userBd, userBt || undefined, userCalendar, userGender || undefined, {
      onCached: (cached) => {
        setResult(cached);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        getDailyFortunes(userBd).then(setDailyFortunes).catch(() => {});
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        setStreamText(prev => prev + chunk);
      },
      onDone: () => {
        setStreaming(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        // 스트리밍 완료 후 서버 캐시에서 전체 결과 가져오기
        (async () => {
          try {
            const r = await analyzeSaju(userBd, userBt || undefined, userCalendar, userGender || undefined);
            setResult(r);
            getDailyFortunes(userBd).then(setDailyFortunes).catch(() => {});
          } catch (e) { console.error('사주 결과 로드 실패:', e); }
          finally { setLoading(false); setStreamText(''); }
        })();
      },
      onError: (err) => {
        console.error('사주 스트림 실패:', err);
        setStreaming(false);
        setMatrixShown(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        // 폴백: REST로 결과 가져오기
        (async () => {
          try {
            const r = await analyzeSaju(userBd, userBt || undefined, userCalendar, userGender || undefined);
            setResult(r);
            getDailyFortunes(userBd).then(setDailyFortunes).catch(() => {});
          } catch (e) { console.error(e); setShowInput(true); }
          finally { setLoading(false); setStreamText(''); }
        })();
      },
      onInsufficientHearts: () => {
        setLoading(false);
        setStreaming(false);
        setMatrixShown(false);
        setShowInput(true);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId && autoLoad) {
      loadUserSaju();
    }
  }, []);

  const handleAnalyze = () => {
    if (isGuest()) { navigate('/register'); return; }
    if (!birthDate) return;
    setLoading(true);
    setShowInput(false);
    setStreaming(false);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    let firstChunk = true;
    cleanupRef.current = analyzeSajuStream(birthDate, birthTime || undefined, calendarType, gender || undefined, {
      onCached: (cached) => {
        setResult(cached);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        getDailyFortunes(birthDate).then(setDailyFortunes).catch(() => {});
      },
      onChunk: (chunk) => {
        if (firstChunk) { firstChunk = false; setLoading(false); setStreaming(true); }
        setStreamText(prev => prev + chunk);
      },
      onDone: () => {
        setStreaming(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        // 스트리밍 완료 후 서버 캐시에서 전체 결과 가져오기
        (async () => {
          try {
            const r = await analyzeSaju(birthDate, birthTime || undefined, calendarType, gender || undefined);
            setResult(r);
            getDailyFortunes(birthDate).then(setDailyFortunes).catch(() => {});
          } catch (e) { console.error('사주 결과 로드 실패:', e); }
          finally { setLoading(false); setStreamText(''); }
        })();
      },
      onError: (err) => {
        console.error('사주 스트림 실패:', err);
        setStreaming(false);
        setMatrixShown(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        // 폴백: REST로 결과 가져오기
        (async () => {
          try {
            const r = await analyzeSaju(birthDate, birthTime || undefined, calendarType, gender || undefined);
            setResult(r);
            getDailyFortunes(birthDate).then(setDailyFortunes).catch(() => {});
          } catch (e) { console.error(e); setShowInput(true); }
          finally { setLoading(false); setStreamText(''); }
        })();
      },
      onInsufficientHearts: () => {
        setLoading(false);
        setStreaming(false);
        setMatrixShown(false);
        setShowInput(true);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
  };

  const handleReset = () => {
    cleanupRef.current?.();
    setResult(null);
    setShowInput(true);
    setStreaming(false);
    setStreamText('');
    setMatrixShown(false);
    setMatrixExiting(false);
    setBirthDate('');
    setBirthTime('');
  };

  // cleanup on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  if ((loading || streaming) && !result) {
    return (
      <div className="saju-page">
        {matrixShown ? (
          <AnalysisMatrix theme="saju" label="AI가 사주를 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
        ) : (
          <FortuneLoading type="default" />
        )}
      </div>
    );
  }

  if (showInput) {
    return (
      <div className="saju-page">
        <section className="saju-intro animate-fade-in-up">
          <div className="saju-intro__symbol">☯</div>
          <h1 className="saju-intro__title">사주팔자 분석</h1>
          <p className="saju-intro__desc">
            생년월일시를 입력하면 천간지지 기반의<br />
            정밀한 사주 분석 결과를 확인할 수 있습니다
          </p>
        </section>

        {localStorage.getItem('userId') && !autoLoad && (
          <div className="glass-card animate-fade-in-up" style={{ padding: '20px', textAlign: 'center', marginBottom: 16 }}>
            <button className="btn-gold" onClick={loadUserSaju} style={{ width: '100%' }}>
              🔮 내 사주 운세 보기 <HeartCost category="SAJU_ANALYSIS" />
            </button>
          </div>
        )}

        <div className="saju-input glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {localStorage.getItem('userId') && (
            <button className="sf-autofill-btn" style={{ marginBottom: 12 }} onClick={() => {
              try {
                const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
                if (p.birthDate) setBirthDate(p.birthDate);
                if (p.gender) setGender(p.gender);
                if (p.birthTime) setBirthTime(p.birthTime);
                if (p.calendarType) setCalendarType(p.calendarType);
              } catch {}
            }}>✨ 내 정보로 채우기</button>
          )}
          <div className="form-group">
            <label className="form-label">달력 구분</label>
            <div className="form-toggle">
              <button
                type="button"
                className={`form-toggle__btn ${calendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => setCalendarType('SOLAR')}
              >
                ☀️ 양력
              </button>
              <button
                type="button"
                className={`form-toggle__btn ${calendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => setCalendarType('LUNAR')}
              >
                🌙 음력
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              생년월일 ({calendarType === 'SOLAR' ? '양력' : '음력'})
            </label>
            <BirthDatePicker
              value={birthDate}
              onChange={setBirthDate}
              calendarType={calendarType}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sajuBirthTime">태어난 시간 (선택)</label>
            <select
              id="sajuBirthTime"
              className="form-input form-select"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            >
              {BIRTH_TIMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">성별 (대운 분석용)</label>
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${gender === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setGender('M')}><span className="g-circle g-male">♂</span></button>
              <button type="button" className={`form-toggle__btn ${gender === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setGender('F')}><span className="g-circle g-female">♀</span></button>
            </div>
          </div>
          <button
            className="btn-gold"
            onClick={handleAnalyze}
            disabled={!birthDate}
            style={{ opacity: birthDate ? 1 : 0.5 }}
          >
            ☯ 사주 분석하기 <HeartCost category="SAJU_ANALYSIS" />
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const pillars = [
    { label: '시주', pillar: result.hourPillar },
    { label: '일주', pillar: result.dayPillar },
    { label: '월주', pillar: result.monthPillar },
    { label: '년주', pillar: result.yearPillar },
  ];

  const totalElements = result.fiveElements
    ? Object.values(result.fiveElements).reduce((a, b) => a + b, 0)
    : 1;

  const todayFortune = result.todayFortune;
  const score = todayFortune?.score || 0;
  const circumference = 2 * Math.PI * 54;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <div className="saju-page">
      {/* Tab Navigation */}
      <div className="saju-tabs animate-fade-in-up">
        <button
          className={`saju-tab ${activeTab === 'saju' ? 'saju-tab--active' : ''}`}
          onClick={() => setActiveTab('saju')}
        >
          ☯ 사주 분석
        </button>
        <button
          className={`saju-tab ${activeTab === 'advanced' ? 'saju-tab--active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          🔍 심화분석
        </button>
        <button
          className={`saju-tab ${activeTab === 'fortune' ? 'saju-tab--active' : ''}`}
          onClick={() => setActiveTab('fortune')}
        >
          🔮 오늘의 운세
        </button>
      </div>

      {activeTab === 'saju' ? (
        <>
          {/* Four Pillars */}
          <section className="saju-pillars glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h2 className="saju-section-title">사주팔자 (四柱八字)</h2>
            <div className="pillars-grid">
              {pillars.map(({ label, pillar }) => (
                <div key={label} className={`pillar-col ${!pillar ? 'pillar-col--empty' : ''}`}>
                  <span className="pillar-label">{label}</span>
                  {pillar ? (
                    <>
                      <div className="pillar-char pillar-stem" style={{ color: ELEMENT_COLORS[pillar.stemElement] }}>
                        <span className="pillar-hanja">{pillar.stemHanja}</span>
                        <span className="pillar-korean">{pillar.stem}</span>
                      </div>
                      <div className="pillar-char pillar-branch" style={{ color: ELEMENT_COLORS[pillar.branchElement] }}>
                        <span className="pillar-hanja">{pillar.branchHanja}</span>
                        <span className="pillar-korean">{pillar.branch}</span>
                      </div>
                      <span className="pillar-element">
                        {pillar.stemElement}/{pillar.branchElement}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="pillar-char pillar-stem pillar-unknown">
                        <span className="pillar-hanja">?</span>
                        <span className="pillar-korean">-</span>
                      </div>
                      <div className="pillar-char pillar-branch pillar-unknown">
                        <span className="pillar-hanja">?</span>
                        <span className="pillar-korean">-</span>
                      </div>
                      <span className="pillar-element">미상</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="pillar-daymaster">
              일간(日干): <strong style={{ color: ELEMENT_COLORS[result.dayMasterElement] }}>
                {result.dayMasterHanja} {result.dayMaster}({result.dayMasterElement})
              </strong>
              {result.dayMasterYang ? ' 양(陽)' : ' 음(陰)'}
            </div>
          </section>

          {/* Five Elements Chart */}
          <section className="saju-elements glass-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h2 className="saju-section-title">오행 분포 (五行)</h2>
            <div className="elements-bars">
              {result.fiveElements && Object.entries(result.fiveElements).map(([name, count]) => (
                <div key={name} className="element-bar-row">
                  <span className="element-bar-label">
                    {ELEMENT_EMOJI[name]} {name}
                  </span>
                  <div className="element-bar-track">
                    <div
                      className="element-bar-fill"
                      style={{
                        width: `${(count / totalElements) * 100}%`,
                        backgroundColor: ELEMENT_COLORS[name],
                      }}
                    />
                  </div>
                  <span className="element-bar-count" style={{ color: ELEMENT_COLORS[name] }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
            <div className="elements-summary">
              <span className="elements-tag" style={{ borderColor: ELEMENT_COLORS[result.strongestElement] }}>
                최강: {ELEMENT_EMOJI[result.strongestElement]} {result.strongestElement}
              </span>
              <span className="elements-tag" style={{ borderColor: ELEMENT_COLORS[result.weakestElement] }}>
                보완: {ELEMENT_EMOJI[result.weakestElement]} {result.weakestElement}
              </span>
              <span className="elements-tag">
                양 {result.yangCount} : 음 {result.yinCount}
              </span>
            </div>
          </section>

          {/* Day Master Personality */}
          <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <h2 className="saju-section-title">
              {ELEMENT_EMOJI[result.dayMasterElement]} 일간 성격 분석
            </h2>
            <p className="saju-reading__text">{result.personalityReading}</p>
          </section>

          {/* Element Analysis */}
          <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <h2 className="saju-section-title">⚖️ 오행 균형 분석</h2>
            <p className="saju-reading__text saju-reading__text--pre">{result.elementAnalysis}</p>
          </section>

          {/* Year Fortune */}
          <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <h2 className="saju-section-title">📅 {new Date().getFullYear()}년 운세</h2>
            <p className="saju-reading__text saju-reading__text--pre">{result.yearFortune}</p>
          </section>
        </>
      ) : activeTab === 'advanced' ? (
        <>
          {/* 격국 */}
          {result.gyeokguk && (
            <section className="saju-reading glass-card animate-fade-in-up">
              <h2 className="saju-section-title">📋 격국 (格局)</h2>
              <div className="saju-gyeokguk">
                <span className="saju-gyeokguk__name">{result.gyeokguk}</span>
                {result.gyeokgukAnalysis ? (
                  <p className="saju-gyeokguk__desc">{result.gyeokgukAnalysis}</p>
                ) : (
                  <p className="saju-gyeokguk__desc">월간의 십성을 기준으로 판단한 사주의 구조적 분류입니다.</p>
                )}
              </div>
            </section>
          )}

          {/* 12운성 */}
          {result.twelveStages && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <h2 className="saju-section-title">🔄 12운성 (十二運星)</h2>
              <div className="saju-twelve-stages">
                {Object.entries(result.twelveStages).map(([pillar, stage]) => (
                  <div key={pillar} className="saju-stage-item">
                    <span className="saju-stage-pillar">{pillar}</span>
                    <span className={`saju-stage-name ${['장생','관대','건록','제왕'].includes(stage) ? 'saju-stage--strong' : ['사','묘','절'].includes(stage) ? 'saju-stage--weak' : ''}`}>
                      {stage}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 합충형해 */}
          {result.interactions && result.interactions.length > 0 && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h2 className="saju-section-title">⚡ 합충형해 (合沖刑害)</h2>
              <div className="saju-interactions">
                {result.interactions.map((inter, idx) => (
                  <div key={idx} className={`saju-inter-item saju-inter--${inter.type === '합' ? 'hap' : inter.type === '충' ? 'chung' : inter.type === '형' ? 'hyung' : 'hae'}`}>
                    <span className="saju-inter-type">{inter.type}</span>
                    <span className="saju-inter-detail">
                      {inter.pillar1}-{inter.pillar2}{inter.pillar3 ? `-${inter.pillar3}` : ''}
                    </span>
                    <span className="saju-inter-desc">{inter.description}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 신살 */}
          {result.sinsalList && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h2 className="saju-section-title">✨ 신살 ({result.sinsalList.filter(s => s.present).length}개 보유)</h2>
              <div className="saju-sinsal-list">
                {result.sinsalList.map((sinsal, idx) => (
                  <div key={idx} className={`saju-sinsal-item ${sinsal.present ? 'saju-sinsal--active' : 'saju-sinsal--inactive'}`}>
                    <div className="saju-sinsal-header">
                      <span className={`saju-sinsal-badge ${sinsal.positive ? 'saju-sinsal-badge--positive' : 'saju-sinsal-badge--negative'}`}>
                        {sinsal.positive ? '길' : '흉'}
                      </span>
                      <span className="saju-sinsal-name">{sinsal.name}</span>
                      {sinsal.present && <span className="saju-sinsal-found">{sinsal.foundInPillar} ({sinsal.branchName})</span>}
                      {!sinsal.present && <span className="saju-sinsal-absent">없음</span>}
                    </div>
                    <p className="saju-sinsal-desc">{sinsal.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 대운 */}
          {result.daeunList && result.daeunList.length > 0 && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <h2 className="saju-section-title">🌊 대운 (大運) 흐름</h2>
              <div className="saju-daeun-timeline">
                {result.daeunList.map((d, idx) => (
                  <div key={idx} className={`saju-daeun-item ${d.current ? 'saju-daeun--current' : ''}`}>
                    <div className="saju-daeun-age">{d.startAge}~{d.endAge}세</div>
                    <div className="saju-daeun-pillar">
                      <span className="saju-daeun-hanja">{d.fullHanja}</span>
                      <span className="saju-daeun-name">{d.fullName}</span>
                    </div>
                    <div className="saju-daeun-info">
                      <span className="saju-daeun-sipsung">{d.sipsung}</span>
                      <span className="saju-daeun-stage">{d.twelveStage}</span>
                    </div>
                    {d.current && <div className="saju-daeun-current-badge">현재</div>}
                  </div>
                ))}
              </div>
              {!result.daeunList.length && (
                <p className="saju-daeun-empty">성별을 입력하면 대운 분석을 확인할 수 있습니다.</p>
              )}
            </section>
          )}

          {/* 대운 상세 해석 */}
          {result.daeunAnalysis && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '450ms' }}>
              <h2 className="saju-section-title">📖 대운 상세 해석</h2>
              <p className="saju-reading__text saju-reading__text--pre">{result.daeunAnalysis}</p>
            </section>
          )}

          {/* 월운 */}
          {result.monthlyFortunes && result.monthlyFortunes.length > 0 && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <h2 className="saju-section-title">📅 월운 (月運)</h2>
              <div className="saju-monthly-grid">
                {result.monthlyFortunes.map((m) => {
                  const isNow = m.month === new Date().getMonth() + 1;
                  return (
                    <div key={m.month} className={`saju-month-item ${isNow ? 'saju-month--now' : ''}`}>
                      <div className="saju-month-head">
                        <span className="saju-month-num">{m.month}월</span>
                        <span className={`saju-month-rating saju-rating--${m.rating === '대길' ? 'best' : m.rating === '길' ? 'good' : m.rating === '보통' ? 'normal' : m.rating === '흉' ? 'bad' : 'worst'}`}>{m.rating}</span>
                        {isNow && <span className="saju-month-now-tag">NOW</span>}
                      </div>
                      <div className="saju-month-pillar">{m.fullName}</div>
                      <div className="saju-month-tags">
                        <span className="saju-month-sipsung">{m.sipsung}</span>
                        <span className="saju-month-stage">{m.twelveStage}</span>
                      </div>
                      <p className="saju-month-summary">{m.summary}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 일운 */}
          {dailyFortunes && dailyFortunes.length > 0 && (
            <section className="saju-reading glass-card animate-fade-in-up" style={{ animationDelay: '550ms' }}>
              <h2 className="saju-section-title">📆 일운 (30일간)</h2>
              <div className="saju-daily-list">
                {dailyFortunes.map((day) => (
                  <div key={day.date} className={`saju-daily-item ${day.isToday ? 'saju-daily--today' : ''}`}>
                    <div className="saju-daily-date">
                      <span className="saju-daily-day">{new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                      <span className="saju-daily-weekday">{new Date(day.date).toLocaleDateString('ko-KR', { weekday: 'short' })}</span>
                    </div>
                    <div className="saju-daily-pillar">{day.dayPillar}</div>
                    <div className="saju-daily-info">
                      <span className="saju-daily-sipsung">{day.sipsung}</span>
                      <span className={`saju-daily-rating saju-rating--${day.rating === '대길' ? 'best' : day.rating === '길' ? 'good' : day.rating === '보통' ? 'normal' : day.rating === '흉' ? 'bad' : 'worst'}`}>{day.rating}</span>
                    </div>
                    {day.isToday && <span className="saju-daily-today-tag">오늘</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {/* Today Fortune Score */}
          {todayFortune && (
            <>
              <section className="fortune-score animate-scale-in">
                <div className="fortune-score__circle">
                  <svg viewBox="0 0 120 120" className="fortune-score__svg">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="54" fill="none" stroke="url(#scoreGradient2)"
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                      transform="rotate(-90 60 60)" className="fortune-score__progress"
                    />
                    <defs>
                      <linearGradient id="scoreGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-accent-gold)" />
                        <stop offset="100%" stopColor="var(--color-primary-light)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="fortune-score__value">
                    <span className="fortune-score__number">{score}</span>
                    <span className="fortune-score__label">점</span>
                  </div>
                </div>
                <h2 className="fortune-score__zodiac">
                  {result.dayMasterHanja}{result.dayMaster} 일간 오늘의 운세
                </h2>
                <p className="fortune-score__date">
                  {new Date().toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
                  })}
                </p>
              </section>

              <section className="fortune-cards">
                {CATEGORY_CONFIG.map((cat, index) => (
                  <FortuneCard
                    key={cat.key}
                    icon={cat.icon}
                    title={cat.title}
                    description={todayFortune[cat.field] || ''}
                    delay={index * 100 + 200}
                  />
                ))}
              </section>

              {(todayFortune.luckyNumber || todayFortune.luckyColor) && (
                <section className="fortune-lucky glass-card animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                  <h3 className="fortune-lucky__title">🍀 행운 정보</h3>
                  <div className="fortune-lucky__items">
                    {todayFortune.luckyNumber != null && (
                      <div className="fortune-lucky__item">
                        <span className="fortune-lucky__item-label">행운의 숫자</span>
                        <span className="fortune-lucky__item-value fortune-lucky__number">{todayFortune.luckyNumber}</span>
                      </div>
                    )}
                    {todayFortune.luckyColor && (
                      <div className="fortune-lucky__item">
                        <span className="fortune-lucky__item-label">행운의 색상</span>
                        <span className="fortune-lucky__item-value fortune-lucky__color">{todayFortune.luckyColor}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* 심화분석 */}
      {result && (() => {
        const bd = birthDate || localStorage.getItem('userBirthDate');
        const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
        const useBd = bd || profile.birthDate;
        return useBd ? (
          <DeepAnalysis type="today" birthDate={useBd} birthTime={birthTime || profile.birthTime} gender={gender || profile.gender} calendarType={calendarType || profile.calendarType} previousResult={result} />
        ) : null;
      })()}

      {/* Reset Button */}
      <section className="saju-actions animate-fade-in-up" style={{ animationDelay: '600ms' }}>
        <button className="saju-reset-btn" onClick={handleReset}>
          🔄 다른 생년월일로 분석하기
        </button>
      </section>
    </div>
  );
}

export default SajuAnalysis;
