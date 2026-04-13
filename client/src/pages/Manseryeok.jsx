import { useState, useEffect, useRef } from 'react';
import { getManseryeok, getManseryeokStream } from '../api/fortune';
import BirthDatePicker from '../components/BirthDatePicker';
import StreamText from '../components/StreamText';
import parseAiJson from '../utils/parseAiJson';
import './Manseryeok.css';

const ELEMENT_COLORS = { '목': '#4ade80', '화': '#f87171', '토': '#fbbf24', '금': '#e2e8f0', '수': '#60a5fa' };

const AI_SECTIONS = [
  { key: 'dayMasterMeaning', icon: '☯️', label: '일간 해석' },
  { key: 'fiveElementBalance', icon: '🔄', label: '오행 균형 분석' },
  { key: 'pillarRelation', icon: '🏛️', label: '기둥 간 관계' },
  { key: 'todayEnergy', icon: '✨', label: '오늘의 기운' },
  { key: 'advice', icon: '💡', label: '조언' },
];

function Manseryeok() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // AI 스트리밍 상태
  const [aiResult, setAiResult] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const cleanupRef = useRef(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  // 사용자 생년월일 가져오기
  const getUserBirthDate = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.birthDate || null;
      }
    } catch { /* ignore */ }
    return null;
  };

  // AI 스트리밍 해석 시작
  const startAiStream = (queryDate, calType) => {
    cleanupRef.current?.();
    setAiResult(null);
    setStreamText('');
    setAiStreaming(false);
    setAiLoading(true);

    const birthDate = getUserBirthDate();

    const cleanup = getManseryeokStream(queryDate, calType, birthDate, {
      onCached: (cached) => {
        setAiResult(cached);
        setAiLoading(false);
      },
      onChunk: (text) => {
        setAiLoading(false);
        setAiStreaming(true);
        setStreamText(prev => prev + text);
      },
      onDone: (fullText) => {
        setAiStreaming(false);
        setStreamText('');
        const parsed = parseAiJson(fullText);
        if (parsed) {
          setAiResult(parsed);
        } else {
          // 파싱 실패 시 텍스트를 advice에 넣어서 표시
          setAiResult({ advice: fullText });
        }
        setAiLoading(false);
      },
      onError: () => {
        setAiStreaming(false);
        setStreamText('');
        setAiLoading(false);
      },
      onInsufficientHearts: () => {
        setAiLoading(false);
      },
    });
    cleanupRef.current = cleanup;
  };

  const handleSearch = async () => {
    if (!date) return;
    setLoading(true);
    setAiResult(null);
    setStreamText('');
    try {
      const result = await getManseryeok(date, calendarType);
      setData(result);
      // 기본 데이터 로드 후 AI 스트리밍 시작
      startAiStream(date, calendarType);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load today
  useEffect(() => {
    getManseryeok(date).then(result => {
      setData(result);
      startAiStream(date, 'SOLAR');
    }).catch(() => {});
  }, []);

  const renderPillar = (p) => {
    if (!p) return null;
    return (
      <div className="ms-pillar">
        <span className="ms-pillar-label">{p.label}</span>
        <div className="ms-pillar-char" style={{ color: ELEMENT_COLORS[p.stemElement] }}>
          <span className="ms-pillar-hanja">{p.stemHanja}</span>
          <span className="ms-pillar-korean">{p.stem}</span>
        </div>
        <div className="ms-pillar-char" style={{ color: ELEMENT_COLORS[p.branchElement] }}>
          <span className="ms-pillar-hanja">{p.branchHanja}</span>
          <span className="ms-pillar-korean">{p.branch}</span>
        </div>
        <span className="ms-pillar-element">{p.stemElement}/{p.branchElement}</span>
        {p.animal && <span className="ms-pillar-animal">{p.animal}</span>}
      </div>
    );
  };

  const renderAiScore = () => {
    if (!aiResult?.score) return null;
    const score = aiResult.score;
    return (
      <div className="ms-ai-score">
        <span className="ms-ai-score-label">오늘의 점수</span>
        <span className="ms-ai-score-value">{score}</span>
        <span className="ms-ai-score-max">/100</span>
      </div>
    );
  };

  return (
    <div className="ms-page">
      <section className="ms-hero">
        <h1 className="ms-title">만세력</h1>
        <p className="ms-subtitle">날짜별 천간지지 조회</p>
      </section>

      <div className="ms-search glass-card">
        <div className="form-group">
          <label className="form-label">달력 구분</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${calendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalendarType('SOLAR')}>양력</button>
            <button type="button" className={`form-toggle__btn ${calendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setCalendarType('LUNAR')}>음력</button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">조회할 날짜</label>
          <BirthDatePicker value={date} onChange={setDate} calendarType={calendarType} />
        </div>
        <button className="ms-search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? '조회 중...' : '만세력 조회'}
        </button>
      </div>

      {data && (
        <div className="ms-result fade-in">

          <section className="ms-pillars glass-card">
            <h2 className="ms-section-title">📅 {data.date} ({data.zodiacAnimal}띠 해)</h2>
            <div className="ms-pillars-grid">
              {renderPillar(data.yearPillar)}
              {renderPillar(data.monthPillar)}
              {renderPillar(data.dayPillar)}
            </div>
          </section>

          {/* AI 스트리밍 해석 */}
          {aiStreaming && streamText && (
            <StreamText
              text={streamText}
              icon="📖"
              label="만세력 AI 해석 중..."
            />
          )}

          {/* AI 해석 완료 결과 */}
          {aiResult && !aiStreaming && (
            <section className="ms-ai-interp glass-card fade-in">
              <h2 className="ms-section-title">📖 AI 만세력 해석</h2>
              {renderAiScore()}
              {AI_SECTIONS.map(({ key, icon, label }) =>
                aiResult[key] ? (
                  <div key={key} className="ms-interp-item">
                    <span className="ms-interp-icon">{icon}</span>
                    <div>
                      <h4 className="ms-interp-label">{label}</h4>
                      <p>{aiResult[key]}</p>
                    </div>
                  </div>
                ) : null
              )}
            </section>
          )}

          {/* AI 로딩 중 (스트리밍 시작 전) */}
          {aiLoading && !aiStreaming && (
            <div className="ms-ai-loading glass-card">
              <div className="ms-ai-loading-spinner" />
              <span>AI 해석을 준비하고 있어요...</span>
            </div>
          )}

          {/* 기존 서버 해석 (AI 스트리밍 결과가 없을 때 폴백) */}
          {!aiResult && !aiStreaming && !aiLoading && data.interpretation && (
            <section className="ms-interp glass-card">
              <h2 className="ms-section-title">📖 만세력 해석</h2>
              {data.interpretation.dayAnalysis && (
                <div className="ms-interp-item">
                  <span className="ms-interp-icon">☯️</span>
                  <div><h4 className="ms-interp-label">일간 특성</h4><p>{data.interpretation.dayAnalysis}</p></div>
                </div>
              )}
              {data.interpretation.elementBalance && (
                <div className="ms-interp-item">
                  <span className="ms-interp-icon">🔄</span>
                  <div><h4 className="ms-interp-label">오행 분석</h4><p>{data.interpretation.elementBalance}</p></div>
                </div>
              )}
              {data.interpretation.luckyTime && (
                <div className="ms-interp-item">
                  <span className="ms-interp-icon">🕐</span>
                  <div><h4 className="ms-interp-label">길한 시간대</h4><p>{data.interpretation.luckyTime}</p></div>
                </div>
              )}
              {data.interpretation.advice && (
                <div className="ms-interp-item">
                  <span className="ms-interp-icon">💡</span>
                  <div><h4 className="ms-interp-label">총평 및 조언</h4><p>{data.interpretation.advice}</p></div>
                </div>
              )}
            </section>
          )}

          <section className="ms-hours glass-card">
            <h2 className="ms-section-title">🕐 시주 (12시진)</h2>
            <div className="ms-hours-grid">
              {data.hours && data.hours.map((h, i) => (
                <div key={i} className="ms-hour-item">
                  <span className="ms-hour-name">{h.sijin}</span>
                  <span className="ms-hour-hanja" style={{ color: ELEMENT_COLORS[h.stemElement] }}>{h.stemHanja}</span>
                  <span className="ms-hour-hanja" style={{ color: ELEMENT_COLORS[h.branchElement] }}>{h.branchHanja}</span>
                  <span className="ms-hour-element">{h.stemElement}/{h.branchElement}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Manseryeok;
