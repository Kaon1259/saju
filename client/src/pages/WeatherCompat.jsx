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

  // localStorage 의 userProfile 에서 사주 정보 직접 로드 (서버 호출 실패해도 동작)
  const profile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); }
    catch { return {}; }
  }, []);
  const hasBirth = !!(profile?.birthDate);

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

  // 사주 일간(dayMaster) 캐시 로드 — 서버 호출 실패해도 birthDate 만 있으면 분석 가능
  useEffect(() => {
    if (!userId) return;
    getMyFortune(userId)
      .then(f => { setDayMaster(f?.saju?.dayMaster || ''); })
      .catch(() => {});
  }, [userId]);

  // condition 결정되면 캐시 확인 (실패해도 무시 — CTA 는 항상 노출)
  useEffect(() => {
    const cond = weather?.condition;
    if (!cond) return;
    let cancelled = false;
    getWeatherCompatBasic(cond)
      .then(data => {
        if (cancelled) return;
        if (data && data.score) setResult(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [weather?.condition]);

  const handleAnalyze = () => {
    if (!effectiveWeather?.condition) return;
    setLoading(true);
    setStreaming(true);
    setStreamText('');
    setResult(null);

    // 누적 buffer — onDone 의 fullText 가 비어 있을 때 fallback 으로 사용
    let buffer = '';

    cleanupRef.current = getWeatherCompatStream(
      {
        condition: effectiveWeather.condition,
        dayMaster,
        birthDate: profile.birthDate,
        calendarType: profile.calendarType || 'SOLAR',
        birthTime: profile.birthTime,
        timeBand: timeBand.id,
        temp: effectiveWeather.temp,
      },
      {
        onCached: (cachedData) => {
          setStreaming(false);
          setLoading(false);
          setStreamText('');
          setResult(cachedData);
        },
        onChunk: (text) => {
          buffer += text;
          setStreamText(prev => prev + text);
        },
        onDone: (fullText) => {
          setStreaming(false);
          setLoading(false);
          const text = (fullText && fullText.trim()) ? fullText : buffer;
          setStreamText('');
          const parsed = parseAiJson(text);
          const baseMeta = {
            condition: weather.condition,
            conditionKo: weather.conditionLabel || weather.condition,
            dayMaster,
            date: new Date().toISOString().slice(0, 10),
          };
          const baseMetaResolved = {
            ...baseMeta,
            condition: effectiveWeather.condition,
            conditionKo: effectiveWeather.conditionLabel || effectiveWeather.condition,
          };
          if (parsed && (parsed.overall || parsed.summary)) {
            setResult({ ...parsed, ...baseMetaResolved });
          } else {
            // 파싱 실패 시에도 raw text 를 종합 분석으로 노출 (빈 화면 방지)
            setResult({
              score: 70,
              grade: '보통',
              overall: text || '오늘의 날씨와 사주 궁합 분석을 다시 시도해주세요.',
              ...baseMetaResolved,
            });
          }
        },
        onError: () => { setStreaming(false); setLoading(false); setStreamText(''); },
        onInsufficientHearts: () => { setStreaming(false); setLoading(false); navigate('/my-menu'); },
      }
    );
  };

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  // 위치 권한 거부 / 네트워크 실패 시에도 분석 진행 가능하도록 fallback
  const effectiveWeather = useMemo(() => {
    if (weather) return weather;
    return {
      condition: 'Clear',
      conditionLabel: '맑음',
      icon: '☀️',
      city: '서울',
      temp: null,
      bgFrom: '#7dd3fc',
      bgTo: '#fbbf24',
    };
  }, [weather]);

  const heroBg = useMemo(() => ({
    from: effectiveWeather.bgFrom || '#7dd3fc',
    to: effectiveWeather.bgTo || '#fbbf24',
  }), [effectiveWeather]);

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
          <span className="wc-hero-city">📍 {effectiveWeather.city || '서울'}</span>
          <span className="wc-hero-time">{timeBand.icon} {timeBand.label}</span>
        </div>
        <div className="wc-hero-title-wrap">
          <h1 className="wc-hero-title">날씨와 나의 궁합</h1>
          <p className="wc-hero-sub">오늘 날씨의 오행과 내 사주 일간의 만남</p>
        </div>
        <div className="wc-hero-center">
          <span className="wc-hero-icon">{effectiveWeather.icon || '☀️'}</span>
          <div className="wc-hero-info">
            <span className="wc-hero-cond">{effectiveWeather.conditionLabel || effectiveWeather.condition || '맑음'}</span>
            {effectiveWeather.temp != null && <span className="wc-hero-temp">{Math.round(effectiveWeather.temp)}°</span>}
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
        {!result && !loading && (
          <div className="wc-cta-card glass-card fade-in">
            <span className="wc-cta-icon">🔮</span>
            <h2 className="wc-cta-title">오늘 날씨와 내 사주, 얼마나 잘 맞을까?</h2>
            <p className="wc-cta-desc">
              오늘은 <b>{effectiveWeather.conditionLabel || effectiveWeather.condition}</b>이에요.<br/>
              날씨가 가진 오행과 내 일간의 상생/상극으로 오늘의 운세를 봐드릴게요.
            </p>
            {!weather && (
              <p className="wc-cta-desc" style={{ color: '#94a3b8', fontSize: '12px', marginTop: '-8px' }}>
                ⚠️ 위치 권한이 없어 기본값(맑음)으로 분석합니다.
              </p>
            )}
            {!hasBirth ? (
              <>
                <p className="wc-cta-desc" style={{ color: '#ec4899', fontWeight: 700 }}>
                  먼저 사주 정보(생년월일)를 등록해주세요.
                </p>
                <button className="wc-analyze-btn" onClick={() => navigate('/profile/edit')}>
                  ✨ 내 정보 등록하기
                </button>
              </>
            ) : (
              <button className="wc-analyze-btn" onClick={handleAnalyze}>
                ✨ 날씨 궁합 분석받기
                <HeartCost category="WEATHER_COMPAT" />
              </button>
            )}
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
