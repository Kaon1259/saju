import { useState, useEffect, useRef } from 'react';
import { getDeepAnalysis } from '../api/fortune';
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
  const calledRef = useRef(false);

  const loadData = async () => {
    if (calledRef.current || !birthDate) return;
    calledRef.current = true;
    setLoading(true);
    try {
      const result = await getDeepAnalysis(type, birthDate, birthTime, gender, calendarType, extra);
      setData(result);
    } catch (e) {
      console.error('심화분석 실패:', e);
      setData({ detailAnalysis: '심화분석을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (autoOpen && birthDate && !calledRef.current) {
      loadData();
    }
  }, [autoOpen, birthDate]);

  const handleLoad = async () => {
    if (data) { setOpen(!open); return; }
    setOpen(true);
    loadData();
  };

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
            <div className="deep-loading">
              <div className="deep-spinner" />
              <p>AI가 프리미엄 심층 분석 중입니다...</p>
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.5 }}>약 20~30초 소요됩니다</p>
            </div>
          ) : data ? (
            <div className="deep-result">
              {/* 핵심 요약 */}
              {data.deepSummary && (
                <div className="deep-summary">{data.deepSummary}</div>
              )}

              {/* 모든 필드를 순서대로 렌더링 */}
              {Object.entries(data).map(([key, val]) => {
                if (!val) return null;
                const config = FIELD_CONFIG[key];
                if (config === null) return null; // 제외 필드
                if (config === undefined && key === 'hiddenMessage') return null; // 별도 렌더링
                if (!config) return null; // 알 수 없는 필드 무시
                return (
                  <div key={key} className="deep-section">
                    <h4 className="deep-section-title">{config.icon} {config.title}</h4>
                    {renderValue(val)}
                  </div>
                );
              })}

              {/* 숨겨진 메시지 (하단) */}
              {data.hiddenMessage && (
                <div className="deep-hidden">
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
