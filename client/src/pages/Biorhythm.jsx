import { useState, useEffect, useRef } from 'react';
import { getBiorhythm, getBiorhythmStream } from '../api/fortune';
import StreamText from '../components/StreamText';
import BirthDatePicker from '../components/BirthDatePicker';
import parseAiJson from '../utils/parseAiJson';
import './Biorhythm.css';

// ═══════════════════════════════════════════════════
// 바이오리듬 사이클 정의
// ═══════════════════════════════════════════════════
const CYCLES = [
  { id: 'physical',     label: '신체',   period: 23, color: '#E74C3C', icon: '\uD83C\uDFCB' },
  { id: 'emotional',    label: '감정',   period: 28, color: '#2ECC71', icon: '\uD83D\uDC9A' },
  { id: 'intellectual', label: '지성',   period: 33, color: '#3498DB', icon: '\uD83E\uDDE0' },
  { id: 'intuition',    label: '직관',   period: 38, color: '#9B59B6', icon: '\uD83D\uDD2E' },
];

const PHASE_LABELS = {
  up: '상승기',
  down: '하강기',
  critical: '전환기',
};

// ─── 바이오리듬 계산 ───
function calcBiorhythm(birthDate, targetDate) {
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  const days = Math.floor((target - birth) / (1000 * 60 * 60 * 24));

  return CYCLES.map(cycle => {
    const value = Math.sin((2 * Math.PI * days) / cycle.period) * 100;
    const nextDayValue = Math.sin((2 * Math.PI * (days + 1)) / cycle.period) * 100;
    let phase;
    if (Math.abs(value) < 10) {
      phase = 'critical';
    } else if (nextDayValue > value) {
      phase = 'up';
    } else {
      phase = 'down';
    }
    return { ...cycle, value: Math.round(value), phase };
  });
}

// ─── 30일 데이터 생성 ───
function calc30DayData(birthDate) {
  const today = new Date();
  const data = [];
  for (let i = -15; i <= 15; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const values = calcBiorhythm(birthDate, dateStr);
    data.push({
      date: dateStr,
      dayOffset: i,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      values: Object.fromEntries(values.map(v => [v.id, v.value])),
    });
  }
  return data;
}

// ─── 전환기(0 교차) 찾기 ───
function findCriticalDays(birthDate) {
  const today = new Date();
  const criticals = [];
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const values = calcBiorhythm(birthDate, dateStr);
    values.forEach(v => {
      if (Math.abs(v.value) < 5) {
        criticals.push({
          date: dateStr,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          cycle: v.label,
          color: v.color,
          dayOffset: i,
        });
      }
    });
  }
  // 중복 제거 (같은 날, 같은 사이클)
  const seen = new Set();
  return criticals.filter(c => {
    const key = `${c.date}-${c.cycle}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

// ─── SVG 차트 패스 생성 ───
function buildSvgPath(data, cycleId, chartW, chartH, padX, padY) {
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;
  const step = plotW / (data.length - 1);

  let d = '';
  data.forEach((point, i) => {
    const x = padX + i * step;
    const val = point.values[cycleId] || 0;
    const y = padY + plotH / 2 - (val / 100) * (plotH / 2);
    if (i === 0) {
      d = `M ${x} ${y}`;
    } else {
      // 스무스 커브
      const prevX = padX + (i - 1) * step;
      const prevVal = data[i - 1].values[cycleId] || 0;
      const prevY = padY + plotH / 2 - (prevVal / 100) * (plotH / 2);
      const cpX = (prevX + x) / 2;
      d += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
    }
  });
  return d;
}

function Biorhythm() {
  // ─── 상태 ───
  const [birthDate, setBirthDate] = useState('');
  const [result, setResult] = useState(null);
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // AI 스트리밍 상태
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const cleanupRef = useRef(null);

  // 로그인 사용자 정보 가져오기
  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (profile.birthDate) setBirthDate(profile.birthDate);
    } catch { /* 무시 */ }
  }, []);

  // cleanup on unmount
  useEffect(() => () => cleanupRef.current?.(), []);

  const handleAutoFill = () => {
    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (profile.birthDate) {
        setBirthDate(profile.birthDate);
      } else {
        alert('프로필에 생년월일을 등록해주세요.');
      }
    } catch {
      alert('로그인이 필요합니다.');
    }
  };

  const handleAnalyze = async () => {
    if (!birthDate) return;
    setLoading(true);
    setStreamText('');
    setStreaming(false);
    setAiResult(null);
    cleanupRef.current?.();

    // 클라이언트 사이드 계산 (즉시)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayValues = calcBiorhythm(birthDate, todayStr);
    const chartData = calc30DayData(birthDate);
    const criticals = findCriticalDays(birthDate);

    setResult({
      today: todayValues,
      chartData,
      criticals,
      advice: generateAdvice(todayValues),
    });

    // AI 스트리밍 분석 시작
    cleanupRef.current = getBiorhythmStream(birthDate, {
      onChunk: (t) => { setStreaming(true); setStreamText(prev => prev + t); },
      onCached: (data) => {
        setAiResult(data);
        setStreaming(false);
        setStreamText('');
        setLoading(false);
      },
      onDone: (fullText) => {
        setStreaming(false);
        setStreamText('');
        const parsed = parseAiJson(fullText);
        if (parsed) setAiResult(parsed);
        setLoading(false);
      },
      onError: () => {
        setStreaming(false);
        setLoading(false);
      },
      onInsufficientHearts: () => {
        setStreaming(false);
        setLoading(false);
      },
    });

    // 서버 기본 데이터도 시도
    try {
      const data = await getBiorhythm(birthDate);
      if (data) setServerData(data);
    } catch {
      /* 클라이언트 계산으로 충분 */
    }
  };

  const generateAdvice = (values) => {
    const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    const critCount = values.filter(v => v.phase === 'critical').length;
    const upCount = values.filter(v => v.phase === 'up').length;

    if (critCount >= 2) {
      return '오늘은 전환기가 겹치는 날입니다. 중요한 결정은 내일로 미루고, 안정과 휴식에 집중하세요.';
    }
    if (avg > 40) {
      return '전반적으로 에너지가 높은 날입니다! 새로운 도전이나 중요한 일을 추진하기에 좋습니다.';
    }
    if (avg > 0) {
      return '무난한 하루가 예상됩니다. 꾸준한 루틴을 유지하며 차분하게 보내세요.';
    }
    if (upCount >= 2) {
      return '일부 영역이 상승세에 있습니다. 강점에 집중하고 약한 부분은 무리하지 마세요.';
    }
    return '에너지가 다소 낮은 시기입니다. 충분한 휴식과 가벼운 활동을 추천합니다.';
  };

  // SVG 차트 크기
  const CHART_W = 560;
  const CHART_H = 280;
  const PAD_X = 40;
  const PAD_Y = 30;

  // 클라이언트 계산 결과를 항상 기본으로 사용 (서버 데이터는 보조)
  const todayData = result?.today;
  const chartData = result?.chartData;
  const criticals = serverData?.criticalDays || result?.criticals;
  const advice = serverData?.todayAdvice || result?.advice;

  // 오늘 위치 인덱스
  const todayIdx = chartData ? chartData.findIndex(d => d.dayOffset === 0) : -1;

  // ═══ 렌더링 ═══
  return (
    <div className="bio-page">
      {/* 배경 */}
      <div className="bio-bg">
        <div className="bio-grid-lines" />
      </div>

      {/* ═══ 히어로 ═══ */}
      <div className="bio-hero fade-in">
        <div className="bio-hero-icon">{'\uD83D\uDCC8'}</div>
        <h1 className="bio-title">바이오리듬</h1>
        <p className="bio-subtitle">생체 리듬으로 알아보는 오늘의 컨디션</p>
        <div className="bio-hero-divider" />
      </div>

      {/* ═══ 입력 ═══ */}
      {!result && (
        <div className="bio-input-section fade-in">
          <div className="bio-input-card glass-card">
            <h3 className="bio-input-title">{'\uD83C\uDF82'} 생년월일 입력</h3>
            {localStorage.getItem('userId') && (
              <button className="sf-autofill-btn" style={{ marginBottom: 12 }} onClick={handleAutoFill}>
                ✨ 내 정보로 채우기
              </button>
            )}
            <div className="bio-input-row">
              <BirthDatePicker value={birthDate} onChange={setBirthDate} />
            </div>
            <button
              className="bio-analyze-btn"
              onClick={handleAnalyze}
              disabled={!birthDate || loading}
            >
              {loading ? 'AI 분석중...' : '\uD83D\uDCC8 바이오리듬 분석'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ 결과 ═══ */}
      {result && todayData && (
        <div className="bio-result fade-in">

          {/* 오늘의 게이지 */}
          <div className="bio-gauges">
            {todayData.map((cycle, i) => (
              <div key={cycle.id} className="bio-gauge-card glass-card" style={{ '--cycle-color': cycle.color, animationDelay: `${i * 100}ms` }}>
                <div className="bio-gauge-circle">
                  <svg viewBox="0 0 100 100" width="80" height="80">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke={cycle.color}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${(Math.abs(cycle.value) / 100) * 264} 264`}
                      transform="rotate(-90 50 50)"
                      className="bio-gauge-ring"
                      style={{ opacity: cycle.value >= 0 ? 1 : 0.5 }}
                    />
                  </svg>
                  <div className="bio-gauge-inner">
                    <span className="bio-gauge-val" style={{ color: cycle.color }}>
                      {cycle.value > 0 ? '+' : ''}{cycle.value}
                    </span>
                    <span className="bio-gauge-pct">%</span>
                  </div>
                </div>
                <div className="bio-gauge-info">
                  <span className="bio-gauge-icon">{cycle.icon}</span>
                  <span className="bio-gauge-label">{cycle.label}</span>
                  <span className={`bio-gauge-phase bio-phase--${cycle.phase}`}>
                    {PHASE_LABELS[cycle.phase]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 30일 차트 */}
          {chartData && (
            <div className="bio-chart-card glass-card">
              <h3 className="bio-chart-title">{'\uD83D\uDCC5'} 30일 바이오리듬</h3>
              <div className="bio-chart-wrap">
                <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="bio-chart-svg" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    {CYCLES.map(c => (
                      <linearGradient key={c.id} id={`grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c.color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={c.color} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* 가로선 */}
                  {[-100, -50, 0, 50, 100].map(val => {
                    const plotH = CHART_H - PAD_Y * 2;
                    const y = PAD_Y + plotH / 2 - (val / 100) * (plotH / 2);
                    return (
                      <g key={val}>
                        <line x1={PAD_X} y1={y} x2={CHART_W - PAD_X} y2={y}
                          stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                          strokeDasharray={val === 0 ? '0' : '4 4'}
                        />
                        <text x={PAD_X - 6} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* X축 라벨 */}
                  {chartData.filter((_, i) => i % 5 === 0).map(d => {
                    const idx = chartData.indexOf(d);
                    const plotW = CHART_W - PAD_X * 2;
                    const x = PAD_X + idx * (plotW / (chartData.length - 1));
                    return (
                      <text key={d.date} x={x} y={CHART_H - 5} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="middle">
                        {d.label}
                      </text>
                    );
                  })}

                  {/* 오늘 마커 */}
                  {todayIdx >= 0 && (() => {
                    const plotW = CHART_W - PAD_X * 2;
                    const x = PAD_X + todayIdx * (plotW / (chartData.length - 1));
                    return (
                      <g>
                        <line x1={x} y1={PAD_Y} x2={x} y2={CHART_H - PAD_Y}
                          stroke="rgba(251,191,36,0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
                        <text x={x} y={PAD_Y - 6} fill="#FBBF24" fontSize="11" fontWeight="700" textAnchor="middle">
                          오늘
                        </text>
                      </g>
                    );
                  })()}

                  {/* 라인 */}
                  {CYCLES.map(cycle => (
                    <path
                      key={cycle.id}
                      d={buildSvgPath(chartData, cycle.id, CHART_W, CHART_H, PAD_X, PAD_Y)}
                      fill="none"
                      stroke={cycle.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="bio-chart-line"
                    />
                  ))}

                  {/* 오늘 포인트 */}
                  {todayIdx >= 0 && todayData && todayData.map(cycle => {
                    const plotW = CHART_W - PAD_X * 2;
                    const plotH = CHART_H - PAD_Y * 2;
                    const x = PAD_X + todayIdx * (plotW / (chartData.length - 1));
                    const y = PAD_Y + plotH / 2 - (cycle.value / 100) * (plotH / 2);
                    return (
                      <circle key={cycle.id} cx={x} cy={y} r="4" fill={cycle.color} stroke="#fff" strokeWidth="1.5" />
                    );
                  })}
                </svg>
              </div>

              {/* 범례 */}
              <div className="bio-legend">
                {CYCLES.map(c => (
                  <div key={c.id} className="bio-legend-item">
                    <span className="bio-legend-color" style={{ background: c.color }} />
                    <span className="bio-legend-label">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 전환기 리스트 */}
          {criticals && criticals.length > 0 && (
            <div className="bio-criticals glass-card">
              <h3 className="bio-critical-title">{'\u26A0\uFE0F'} 주의 필요일 (전환기)</h3>
              <div className="bio-critical-list">
                {criticals.map((c, i) => (
                  <div key={i} className="bio-critical-item">
                    <span className="bio-critical-date">{c.label}</span>
                    <span className="bio-critical-badge" style={{ background: `${c.color}18`, color: c.color, borderColor: `${c.color}33` }}>
                      {c.cycle}
                    </span>
                    {c.dayOffset === 0 && <span className="bio-critical-today">오늘</span>}
                    {c.dayOffset > 0 && <span className="bio-critical-days">{c.dayOffset}일 후</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 스트리밍 분석 */}
          {streaming && streamText && (
            <StreamText text={streamText} icon="📈" label="AI가 바이오리듬을 분석하고 있어요..." color="#3498DB" />
          )}

          {/* AI 분석 결과 */}
          {aiResult && (
            <div className="bio-ai-result">
              <div className="bio-advice glass-card">
                <h3 className="bio-advice-title">{'\uD83E\uDD16'} AI 종합 분석</h3>
                <p className="bio-advice-text">{aiResult.overall}</p>
                {aiResult.score != null && (
                  <div className="bio-ai-score">
                    <span className="bio-ai-score-label">오늘의 컨디션</span>
                    <span className="bio-ai-score-value">{aiResult.score}<small>점</small></span>
                  </div>
                )}
              </div>

              <div className="bio-ai-cards">
                {aiResult.physical && (
                  <div className="bio-ai-card glass-card" style={{ '--ai-card-color': '#E74C3C' }}>
                    <h4 className="bio-ai-card-title">{'\uD83C\uDFCB'} 신체 리듬</h4>
                    <p className="bio-ai-card-text">{aiResult.physical}</p>
                  </div>
                )}
                {aiResult.emotional && (
                  <div className="bio-ai-card glass-card" style={{ '--ai-card-color': '#2ECC71' }}>
                    <h4 className="bio-ai-card-title">{'\uD83D\uDC9A'} 감정 리듬</h4>
                    <p className="bio-ai-card-text">{aiResult.emotional}</p>
                  </div>
                )}
                {aiResult.intellectual && (
                  <div className="bio-ai-card glass-card" style={{ '--ai-card-color': '#3498DB' }}>
                    <h4 className="bio-ai-card-title">{'\uD83E\uDDE0'} 지성 리듬</h4>
                    <p className="bio-ai-card-text">{aiResult.intellectual}</p>
                  </div>
                )}
                {aiResult.intuition && (
                  <div className="bio-ai-card glass-card" style={{ '--ai-card-color': '#9B59B6' }}>
                    <h4 className="bio-ai-card-title">{'\uD83D\uDD2E'} 직관 리듬</h4>
                    <p className="bio-ai-card-text">{aiResult.intuition}</p>
                  </div>
                )}
              </div>

              {aiResult.advice && (
                <div className="bio-advice glass-card">
                  <h3 className="bio-advice-title">{'\uD83D\uDCA1'} 오늘의 조언</h3>
                  <p className="bio-advice-text">{aiResult.advice}</p>
                </div>
              )}
            </div>
          )}

          {/* AI 결과 없으면 기본 조언 표시 */}
          {!aiResult && !streaming && advice && (
            <div className="bio-advice glass-card">
              <h3 className="bio-advice-title">{'\uD83D\uDCA1'} 오늘의 조언</h3>
              <p className="bio-advice-text">{advice}</p>
            </div>
          )}

          {/* 리셋 */}
          <button className="bio-reset-btn" onClick={() => {
            cleanupRef.current?.();
            setResult(null); setServerData(null); setAiResult(null); setStreamText(''); setStreaming(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            {'\uD83D\uDD04'} 다시 분석
          </button>
        </div>
      )}
    </div>
  );
}

export default Biorhythm;
