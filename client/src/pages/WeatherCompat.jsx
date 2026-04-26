import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FortuneCard from '../components/FortuneCard';
import StreamText from '../components/StreamText';
import AnalysisMatrix from '../components/AnalysisMatrix';
import HeartCost from '../components/HeartCost';
import parseAiJson from '../utils/parseAiJson';
import { shareResult } from '../utils/share';
import { getWeatherCompatBasic, getWeatherCompatStream, getMyFortune } from '../api/fortune';
import { getCurrentWeather, getTimeBand } from '../utils/weather';
import './WeatherCompat.css';

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

export default function WeatherCompat() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const [weather, setWeather] = useState(null);
  const [timeBand, setTimeBandState] = useState(() => getTimeBand());
  const [dayMaster, setDayMaster] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState(null);
  const cleanupRef = useRef(null);

  // 비로그인 차단
  useEffect(() => {
    if (!userId) navigate('/');
  }, [userId, navigate]);

  // 날씨 + 시간대
  useEffect(() => {
    let cancelled = false;
    getCurrentWeather()
      .then(w => { if (!cancelled) setWeather(w); })
      .catch(() => {});
    const id = setInterval(() => setTimeBandState(getTimeBand()), 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // 사주 일간(dayMaster) 로드 — myData.saju 활용
  useEffect(() => {
    if (!userId) return;
    getMyFortune(userId)
      .then(f => { setDayMaster(f?.saju?.dayMaster || ''); })
      .catch(() => {});
  }, [userId]);

  // 날씨가 준비되면 자동으로 캐시 확인 → 히트면 결과, 미스면 버튼 노출
  useEffect(() => {
    if (!weather?.condition) return;
    let cancelled = false;
    getWeatherCompatBasic(weather.condition)
      .then(data => {
        if (cancelled) return;
        if (data && data.score) setResult(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [weather?.condition]);

  const handleAnalyze = () => {
    if (!weather?.condition) return;
    setLoading(true);
    setStreaming(true);
    setStreamText('');
    setResult(null);

    cleanupRef.current = getWeatherCompatStream(
      {
        condition: weather.condition,
        dayMaster,
        timeBand: timeBand.id,
        temp: weather.temp,
      },
      {
        onCached: (cachedData) => {
          setStreaming(false);
          setLoading(false);
          setStreamText('');
          setResult(cachedData);
        },
        onChunk: (text) => setStreamText(prev => prev + text),
        onDone: (fullText) => {
          setStreaming(false);
          setLoading(false);
          const text = fullText || '';
          setStreamText('');
          const parsed = parseAiJson(text);
          if (parsed) {
            setResult({
              ...parsed,
              condition: weather.condition,
              conditionKo: weather.conditionLabel || weather.condition,
              dayMaster,
              date: new Date().toISOString().slice(0, 10),
            });
          }
        },
        onError: () => { setStreaming(false); setLoading(false); setStreamText(''); },
        onInsufficientHearts: () => { setStreaming(false); setLoading(false); navigate('/my-menu'); },
      }
    );
  };

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const heroBg = useMemo(() => {
    if (!weather) return { from: '#7dd3fc', to: '#fbbf24' };
    return { from: weather.bgFrom || '#7dd3fc', to: weather.bgTo || '#fbbf24' };
  }, [weather]);

  if (!userId) return null;

  return (
    <div className="wc-page">
      {/* 상단 날씨 요약 */}
      <section
        className={`wc-hero wc-hero--${timeBand.id}`}
        style={{ '--w-from': heroBg.from, '--w-to': heroBg.to, '--w-overlay': timeBand.overlay }}
      >
        <button className="wc-back-btn" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <div className="wc-hero-orb wc-hero-orb--1" />
        <div className="wc-hero-orb wc-hero-orb--2" />
        <div className="wc-hero-top">
          <span className="wc-hero-city">📍 {weather?.city || '서울'}</span>
          <span className="wc-hero-time">{timeBand.icon} {timeBand.label}</span>
        </div>
        <div className="wc-hero-title-wrap">
          <h1 className="wc-hero-title">날씨와 나의 궁합</h1>
          <p className="wc-hero-sub">오늘 날씨의 오행과 내 사주 일간의 만남</p>
        </div>
        <div className="wc-hero-center">
          <span className="wc-hero-icon">{weather?.icon || '☀️'}</span>
          <div className="wc-hero-info">
            <span className="wc-hero-cond">{weather?.conditionLabel || weather?.condition || '맑음'}</span>
            {weather?.temp != null && <span className="wc-hero-temp">{Math.round(weather.temp)}°</span>}
          </div>
        </div>
        {dayMaster && (
          <div className="wc-hero-daymaster">
            <span className="wc-hero-dm-label">내 일간(日干)</span>
            <span className="wc-hero-dm-value">{dayMaster}</span>
          </div>
        )}
      </section>

      {/* 분석 영역 */}
      <section className="wc-body">
        {!result && !loading && weather && (
          <div className="wc-cta-card glass-card fade-in">
            <span className="wc-cta-icon">🔮</span>
            <h2 className="wc-cta-title">오늘 날씨와 내 사주, 얼마나 잘 맞을까?</h2>
            <p className="wc-cta-desc">
              오늘은 <b>{weather.conditionLabel || weather.condition}</b>이에요.<br/>
              날씨가 가진 오행과 내 일간의 상생/상극으로 오늘의 운세를 봐드릴게요.
            </p>
            <button className="wc-analyze-btn" onClick={handleAnalyze} disabled={!weather?.condition}>
              ✨ 날씨 궁합 분석받기
              <HeartCost category="WEATHER_COMPAT" />
            </button>
          </div>
        )}

        {loading && (
          <AnalysisMatrix
            theme="love"
            label={`AI가 오늘의 날씨×사주 궁합을 분석하고 있어요`}
            streamText={streamText}
          />
        )}

        {result && (
          <div className="wc-result fade-in">
            <div className="wc-score-card">
              <div className="wc-score-orb" style={{ background: `radial-gradient(circle, ${GRADE_COLORS[result.grade] || '#ff6b9d'}, transparent 70%)` }} />
              <div className="wc-score-center">
                <span className="wc-score-num">{result.score}</span>
                <span className="wc-score-unit">점</span>
              </div>
              <span className="wc-score-grade" style={{ color: GRADE_COLORS[result.grade] || '#ff6b9d' }}>{result.grade}</span>
              {result.summary && <p className="wc-score-summary">{result.summary}</p>}
            </div>

            <FortuneCard icon="🔮" title="종합 분석" description={result.overall} delay={0} />
            {result.advice && <FortuneCard icon="💡" title="오늘의 행동 조언" description={result.advice} delay={80} />}
            {result.caution && <FortuneCard icon="⚠️" title="주의할 점" description={result.caution} delay={160} />}

            {(result.luckyActivity || result.luckyPlace || result.luckyColor) && (
              <div className="wc-lucky glass-card">
                {result.luckyActivity && (
                  <div className="wc-lucky-item">
                    <span className="wc-lucky-label">행운의 활동</span>
                    <span className="wc-lucky-value">{result.luckyActivity}</span>
                  </div>
                )}
                {result.luckyPlace && (
                  <div className="wc-lucky-item">
                    <span className="wc-lucky-label">행운의 장소</span>
                    <span className="wc-lucky-value">{result.luckyPlace}</span>
                  </div>
                )}
                {result.luckyColor && (
                  <div className="wc-lucky-item">
                    <span className="wc-lucky-label">행운의 색</span>
                    <span className="wc-lucky-value">{result.luckyColor}</span>
                  </div>
                )}
              </div>
            )}

            <div className="wc-actions">
              <button className="wc-share-btn" onClick={async () => {
                const text = `[날씨 궁합 🌤️]\n오늘 ${result.conditionKo || result.condition} × 내 일간 ${result.dayMaster}\n점수: ${result.score}점 (${result.grade})\n${(result.overall || '').split('.').slice(0, 2).join('.')}.\n\nhttps://recipepig.kr`;
                const r = await shareResult({ title: '날씨 궁합 결과', text });
                if (r === 'copied') alert('클립보드에 복사되었습니다!');
              }}>📤 공유하기</button>
              <button className="wc-reset-btn" onClick={() => { setResult(null); }}>다시 보기</button>
            </div>
          </div>
        )}

        {streaming && !loading && streamText && (
          <div className="wc-stream-preview">
            <StreamText text={streamText} />
          </div>
        )}
      </section>
    </div>
  );
}
