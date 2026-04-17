import { useState, useEffect, useRef, useCallback } from 'react';
import { getDeepAnalysis, getDeepAnalysisStream } from '../api/fortune';
import AnalysisMatrix from './AnalysisMatrix';
import parseAiJson from '../utils/parseAiJson';
import HeartCost from './HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './DeepAnalysis.css';

// 필드별 표시 설정
const FIELD_CONFIG = {
  deepSummary: null, // 별도 렌더링
  type: null, birthDate: null, analysisDate: null, // 메타 필드 제외

  // today (기본 운세와 동일 구조로 심화)
  overallDeep: { icon: '🌟', title: '총운 심화' },
  loveDeep: { icon: '💕', title: '애정운 심화' },
  moneyDeep: { icon: '💰', title: '재물운 심화' },
  careerDeep: { icon: '💼', title: '직장운 심화' },
  healthDeep: { icon: '💪', title: '건강운 심화' },
  // 구버전 호환
  morningFortune: { icon: '🌅', title: '오전 운세' },
  afternoonFortune: { icon: '☀️', title: '오후 운세' },
  eveningFortune: { icon: '🌙', title: '저녁 운세' },
  elementAdvice: { icon: '🧭', title: '오행 조언' },
  emotionAnalysis: { icon: '💭', title: '감정/심리 분석' },
  relationshipAdvice: { icon: '🤝', title: '대인관계 조언' },
  wealthFlow: { icon: '💰', title: '재물 에너지' },
  healthGuide: { icon: '🏥', title: '건강 가이드' },
  actionGuide: { icon: '✅', title: '행동 지침' },
  avoidList: { icon: '⚠️', title: '주의사항' },
  hiddenMessage: null, // 별도 렌더링

  // love
  energyDiagnosis: { icon: '💫', title: '연애 에너지 진단' },
  timingAnalysis: { icon: '⏳', title: '최적 시기' },
  partnerProfile: { icon: '💑', title: '이상적 파트너' },
  psychAnalysis: { icon: '🧠', title: '심리 분석' },
  strategy: { icon: '✅', title: '행동 전략' },
  forecast: { icon: '🔮', title: '향후 전망' },
  caution: { icon: '⚠️', title: '주의사항' },

  // yearly
  q1Analysis: { icon: '🌸', title: '1~3월 분석' },
  q2Analysis: { icon: '☀️', title: '4~6월 분석' },
  q3Analysis: { icon: '🍂', title: '7~9월 분석' },
  q4Analysis: { icon: '❄️', title: '10~12월 분석' },
  wealthTiming: { icon: '💰', title: '재물운 시기' },
  healthWarning: { icon: '🏥', title: '건강 주의' },
  careerAdvice: { icon: '💼', title: '직업/사업운' },
  relationshipFlow: { icon: '🤝', title: '대인관계' },
  yearStrategy: { icon: '✅', title: '올해 핵심 전략' },

  // monthly
  week1: { icon: '1️⃣', title: '1주차' },
  week2: { icon: '2️⃣', title: '2주차' },
  week3: { icon: '3️⃣', title: '3주차' },
  week4: { icon: '4️⃣', title: '4주차' },
  wealthAdvice: { icon: '💰', title: '재물운' },
  healthAdvice: { icon: '🏥', title: '건강운' },
  socialAdvice: { icon: '🤝', title: '대인관계' },
  directionAdvice: { icon: '🧭', title: '행운 방위/아이템' },

  // weekly
  monTue: { icon: '📅', title: '월~화요일' },
  wedThu: { icon: '📅', title: '수~목요일' },
  friSatSun: { icon: '📅', title: '금~일요일' },
  peakTime: { icon: '🌟', title: '최고 행운 시점' },
  socialStrategy: { icon: '🤝', title: '대인관계 전략' },
  emotionalRhythm: { icon: '💭', title: '감정 리듬' },

  // default
  detailAnalysis: { icon: '📋', title: '상세 분석' },
};

const TYPE_TO_LOADING = {
  love: 'love', reunion: 'love', remarriage: 'love', blind_date: 'love',
  today: 'default', yearly: 'default', monthly: 'default', weekly: 'default',
};

function renderValue(val) {
  if (val == null) return null;
  if (typeof val === 'string') return <p>{val}</p>;
  if (Array.isArray(val)) return (
    <ul className="deep-list">
      {val.map((item, i) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
    </ul>
  );
  if (typeof val === 'object') {
    return Object.entries(val).map(([k, v]) => (
      <p key={k}><strong>{k}:</strong> {typeof v === 'string' ? v : JSON.stringify(v)}</p>
    ));
  }
  return <p>{String(val)}</p>;
}

function summarizeResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return '';
  try {
    const skip = new Set(['type', 'birthDate', 'analysisDate', 'month', 'score', 'grade', 'pillar', 'theme', 'luckyDay', 'bestWeek', 'cautionWeek', 'overallScore']);
    const parts = [];
    for (const [key, val] of Object.entries(result)) {
      if (skip.has(key) || !val) continue;
      if (typeof val === 'string' && val.length > 5) parts.push(val);
      else if (typeof val === 'object' && !Array.isArray(val)) {
        for (const v of Object.values(val)) {
          if (typeof v === 'string' && v.length > 5) parts.push(v);
        }
      }
    }
    return parts.join(' ').slice(0, 1500);
  } catch { return ''; }
}

// 캐시 키 생성
function deepCacheKey(type, birthDate, extra) {
  const today = new Date().toISOString().slice(0, 10);
  return `deep_${type}_${birthDate}_${extra || today}`;
}

// 캐시에서 심화분석 결과 읽기
function getDeepCache(type, birthDate, extra) {
  try {
    const key = deepCacheKey(type, birthDate, extra);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    // 당일 캐시만 유효 (날짜 바뀌면 만료)
    if (savedAt !== new Date().toISOString().slice(0, 10)) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch { return null; }
}

// 캐시에 저장
function setDeepCache(type, birthDate, extra, data) {
  try {
    const key = deepCacheKey(type, birthDate, extra);
    localStorage.setItem(key, JSON.stringify({ data, savedAt: new Date().toISOString().slice(0, 10) }));
  } catch {}
}

// 심화분석 완료 여부 확인 (외부에서 사용)
export function hasDeepResult(type, birthDate, extra) {
  return !!getDeepCache(type, birthDate, extra);
}

function DeepAnalysis({ type, birthDate, birthTime, gender, calendarType, extra, autoOpen = false, previousResult }) {
  const [data, setData] = useState(() => getDeepCache(type, birthDate, extra));
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [visibleCards, setVisibleCards] = useState(0);
  const calledRef = useRef(false);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  const alreadyDone = !!data;

  // 결과 카드 순차 노출
  useEffect(() => {
    if (!data) return;
    const entries = Object.entries(data).filter(([key, val]) => {
      const config = FIELD_CONFIG[key];
      return val && config !== null && config !== undefined;
    });
    // 캐시에서 로드한 경우 즉시 모두 표시
    if (alreadyDone && !loading) {
      setVisibleCards(entries.length);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCards(i);
      if (i >= entries.length) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [data]);

  // 데이터 로드 후 캐시 저장
  const saveAndSet = useCallback((parsed) => {
    setData(parsed);
    setDeepCache(type, birthDate, extra, parsed);
  }, [type, birthDate, extra]);

  const loadData = useCallback(() => {
    if (calledRef.current || !birthDate) return;
    calledRef.current = true;
    setLoading(true);
    setStreamText('');

    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const stopAmbient = () => { try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null; };

    const context = summarizeResult(previousResult);

    cleanupRef.current = getDeepAnalysisStream(
      type, birthDate, birthTime, gender, calendarType, extra,
      {
        context,
        onChunk: (text) => {
          setStreamText(prev => prev + text);
        },
        onCached: (cachedData) => {
          saveAndSet(cachedData);
          setLoading(false);
          stopAmbient();
        },
        onDone: (fullText) => {
          const parsed = parseAiJson(fullText);
          if (parsed) {
            parsed.type = type;
            parsed.birthDate = birthDate;
            saveAndSet(parsed);
          } else {
            saveAndSet({ type, birthDate, detailAnalysis: fullText });
          }
          setLoading(false);
          setStreamText('');
          stopAmbient();
        },
        onError: () => {
          setStreamText('');
          (async () => {
            try {
              const result = await getDeepAnalysis(type, birthDate, birthTime, gender, calendarType, extra, context);
              saveAndSet(result);
            } catch {
              setData({ detailAnalysis: '심화분석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
            }
            setLoading(false);
            stopAmbient();
          })();
        },
      }
    );
  }, [type, birthDate, birthTime, gender, calendarType, extra, previousResult, saveAndSet]);

  useEffect(() => {
    if (autoOpen && birthDate && !calledRef.current && !data) {
      loadData();
    }
    return () => {
      cleanupRef.current?.();
      try { stopAmbientRef.current?.(); } catch {}
      stopAmbientRef.current = null;
    };
  }, [autoOpen, birthDate, loadData]);

  // 이미 심화분석 완료 → 카드만 렌더링 (버튼 없음)
  if (alreadyDone && !loading) {
    return (
      <div className="deep-wrap deep-inline">
        <div className="deep-inline-divider">
          <span className="deep-inline-badge">✨ 심화분석</span>
        </div>
        {data.deepSummary && (
          <div className="deep-summary deep-card-visible">{data.deepSummary}</div>
        )}
        {Object.entries(data).map(([key, val], idx) => {
          if (!val) return null;
          const config = FIELD_CONFIG[key];
          if (config === null || !config) return null;
          return (
            <div key={key} className="deep-section deep-card-visible">
              <h4 className="deep-section-title">{config.icon} {config.title}</h4>
              {renderValue(val)}
            </div>
          );
        })}
        {data.hiddenMessage && (
          <div className="deep-hidden deep-card-visible">
            <span>🔮</span>
            <p>{data.hiddenMessage}</p>
          </div>
        )}
      </div>
    );
  }

  // 아직 심화분석 안 함 → 버튼 + 로딩/스트리밍
  return (
    <div className="deep-wrap">
      {!loading && !data && (
        <button className="deep-toggle-btn" onClick={loadData}>
          <span>🔍 심화분석 보기</span> <HeartCost category={`DEEP_${(type || 'today').toUpperCase()}`} />
        </button>
      )}
      {loading && (
        <div className="deep-content glass-card fade-in">
          <AnalysisMatrix theme={type === 'love' || type === 'reunion' || type === 'remarriage' || type === 'blind_date' ? 'love' : 'saju'} label="AI가 심화분석을 진행하고 있어요" streamText={streamText} />
        </div>
      )}
      {data && !loading && (
        <div className="deep-content fade-in">
          <div className="deep-inline-divider">
            <span className="deep-inline-badge">✨ 심화분석</span>
          </div>
          <div className="deep-result">
            {data.deepSummary && (
              <div className="deep-summary deep-card-reveal deep-card-visible">{data.deepSummary}</div>
            )}
            {Object.entries(data).map(([key, val], idx) => {
              if (!val) return null;
              const config = FIELD_CONFIG[key];
              if (config === null || !config) return null;
              return (
                <div key={key}
                  className={`deep-section deep-card-reveal ${idx < visibleCards ? 'deep-card-visible' : ''}`}
                  style={{ transitionDelay: `${idx * 80}ms` }}>
                  <h4 className="deep-section-title">{config.icon} {config.title}</h4>
                  {renderValue(val)}
                </div>
              );
            })}
            {data.hiddenMessage && (
              <div className="deep-hidden deep-card-reveal deep-card-visible">
                <span>🔮</span>
                <p>{data.hiddenMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeepAnalysis;
