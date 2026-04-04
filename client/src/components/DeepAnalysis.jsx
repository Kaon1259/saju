import { useState, useEffect, useRef, useCallback } from 'react';
import { getDeepAnalysis, getDeepAnalysisStream } from '../api/fortune';
import FortuneLoading from './FortuneLoading';
import './DeepAnalysis.css';

// 필드별 표시 설정
const FIELD_CONFIG = {
  deepSummary: null, // 별도 렌더링
  type: null, birthDate: null, analysisDate: null, // 메타 필드 제외

  // today
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

function DeepAnalysis({ type, birthDate, birthTime, gender, calendarType, extra, autoOpen = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(autoOpen);
  const [streamText, setStreamText] = useState('');
  const [visibleCards, setVisibleCards] = useState(0);
  const calledRef = useRef(false);
  const cleanupRef = useRef(null);

  // 결과 카드 순차 노출
  useEffect(() => {
    if (!data) return;
    const entries = Object.entries(data).filter(([key, val]) => {
      const config = FIELD_CONFIG[key];
      return val && config !== null && config !== undefined;
    });
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCards(i);
      if (i >= entries.length) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [data]);

  const loadData = useCallback(() => {
    if (calledRef.current || !birthDate) return;
    calledRef.current = true;
    setLoading(true);
    setStreamText('');

    // 스트리밍으로 시도
    cleanupRef.current = getDeepAnalysisStream(
      type, birthDate, birthTime, gender, calendarType, extra,
      {
        onChunk: (text) => {
          setStreamText(prev => prev + text);
        },
        onCached: (cachedData) => {
          setData(cachedData);
          setLoading(false);
        },
        onDone: (fullText) => {
          // 스트리밍 완료 → JSON 파싱 시도
          try {
            let json = fullText;
            if (json.includes('```')) {
              const start = json.indexOf('\n', json.indexOf('```'));
              const end = json.lastIndexOf('```');
              if (start > 0 && end > start) json = json.substring(start + 1, end);
            }
            const braceStart = json.indexOf('{');
            const braceEnd = json.lastIndexOf('}');
            if (braceStart >= 0 && braceEnd > braceStart) {
              json = json.substring(braceStart, braceEnd + 1);
            }
            const parsed = JSON.parse(json);
            parsed.type = type;
            parsed.birthDate = birthDate;
            setData(parsed);
          } catch {
            // JSON 파싱 실패 → 일반 텍스트로 표시
            setData({ type, birthDate, detailAnalysis: fullText });
          }
          setLoading(false);
          setStreamText('');
        },
        onError: () => {
          // 스트리밍 실패 → 기존 방식 fallback
          setStreamText('');
          (async () => {
            try {
              const result = await getDeepAnalysis(type, birthDate, birthTime, gender, calendarType, extra);
              setData(result);
            } catch {
              setData({ detailAnalysis: '심화분석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
            }
            setLoading(false);
          })();
        },
      }
    );
  }, [type, birthDate, birthTime, gender, calendarType, extra]);

  useEffect(() => {
    if (autoOpen && birthDate && !calledRef.current) {
      loadData();
    }
    return () => cleanupRef.current?.();
  }, [autoOpen, birthDate, loadData]);

  const handleLoad = () => {
    if (data) { setOpen(!open); return; }
    setOpen(true);
    loadData();
  };

  const loadingType = TYPE_TO_LOADING[type] || 'default';

  return (
    <div className="deep-wrap">
      {!autoOpen && (
        <button className="deep-toggle-btn" onClick={handleLoad}>
          {open ? '심화분석 접기 ▲' : '🔍 심화분석 보기 ▼'}
        </button>
      )}
      {(open || autoOpen) && (
        <div className="deep-content glass-card fade-in">
          {loading && !data ? (
            <FortuneLoading type={loadingType} streaming={!!streamText} streamText={streamText} />
          ) : data ? (
            <div className="deep-result">
              {/* 핵심 요약 */}
              {data.deepSummary && (
                <div className="deep-summary deep-card-reveal">{data.deepSummary}</div>
              )}

              {/* 모든 필드를 순서대로 렌더링 (순차 노출) */}
              {Object.entries(data).map(([key, val], idx) => {
                if (!val) return null;
                const config = FIELD_CONFIG[key];
                if (config === null) return null;
                if (config === undefined && key === 'hiddenMessage') return null;
                if (!config) return null;
                return (
                  <div key={key}
                    className={`deep-section deep-card-reveal ${idx < visibleCards ? 'deep-card-visible' : ''}`}
                    style={{ transitionDelay: `${idx * 80}ms` }}>
                    <h4 className="deep-section-title">{config.icon} {config.title}</h4>
                    {renderValue(val)}
                  </div>
                );
              })}

              {/* 숨겨진 메시지 (하단) */}
              {data.hiddenMessage && (
                <div className="deep-hidden deep-card-reveal deep-card-visible">
                  <span>🔮</span>
                  <p>{data.hiddenMessage}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default DeepAnalysis;
