import { useState, useEffect } from 'react';
import { getDeepAnalysis } from '../api/fortune';
import './DeepAnalysis.css';

function DeepAnalysis({ type, birthDate, birthTime, gender, calendarType, extra, autoOpen = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(autoOpen);

  const loadData = async () => {
    if (data || loading || !birthDate) return;
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
    if (autoOpen && birthDate && !data && !loading) {
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
              <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.5 }}>약 1분 정도 소요됩니다</p>
            </div>
          ) : data ? (
            <div className="deep-result">
              {data.deepSummary && (
                <div className="deep-summary">{data.deepSummary}</div>
              )}

              {/* 시간대별 분석 (today) */}
              {data.timeAnalysis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">⏰ 시간대별 운세</h4>
                  {Object.entries(data.timeAnalysis).map(([key, val]) => (
                    <div key={key} className="deep-time-item">
                      <span className="deep-time-label">{key === 'morning' ? '🌅 오전' : key === 'afternoon' ? '☀️ 오후' : '🌙 저녁'}</span>
                      <p>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 오행 조언 (today) */}
              {data.elementAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🧭 오행 조언</h4>
                  {data.elementAdvice.direction && <p>📍 <strong>방위:</strong> {data.elementAdvice.direction}</p>}
                  {data.elementAdvice.food && <p>🍽️ <strong>음식:</strong> {data.elementAdvice.food}</p>}
                  {data.elementAdvice.color && <p>🎨 <strong>색상:</strong> {data.elementAdvice.color}</p>}
                  {data.elementAdvice.activity && <p>🏃 <strong>활동:</strong> {data.elementAdvice.activity}</p>}
                </div>
              )}

              {/* 대인관계별 조언 (today) */}
              {data.relationshipAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🤝 대인관계별 조언</h4>
                  {data.relationshipAdvice.boss && <div className="deep-time-item"><span className="deep-time-label">👔 직장 상사</span><p>{data.relationshipAdvice.boss}</p></div>}
                  {data.relationshipAdvice.colleague && <div className="deep-time-item"><span className="deep-time-label">🧑‍💼 동료</span><p>{data.relationshipAdvice.colleague}</p></div>}
                  {data.relationshipAdvice.lover && <div className="deep-time-item"><span className="deep-time-label">💕 연인/배우자</span><p>{data.relationshipAdvice.lover}</p></div>}
                  {data.relationshipAdvice.family && <div className="deep-time-item"><span className="deep-time-label">👨‍👩‍👧 가족</span><p>{data.relationshipAdvice.family}</p></div>}
                  {data.relationshipAdvice.friend && <div className="deep-time-item"><span className="deep-time-label">🫂 친구</span><p>{data.relationshipAdvice.friend}</p></div>}
                </div>
              )}

              {/* 재물 에너지 흐름 */}
              {data.wealthFlow && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💰 재물 에너지 흐름</h4>
                  <p>{data.wealthFlow}</p>
                </div>
              )}

              {/* 건강 가이드 */}
              {data.healthGuide && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🏥 건강 가이드</h4>
                  <p>{data.healthGuide}</p>
                </div>
              )}

              {/* 연애 에너지 진단 (love) */}
              {data.energyDiagnosis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💫 연애 에너지 진단</h4>
                  <p>{data.energyDiagnosis}</p>
                </div>
              )}

              {/* 단계별 가이드 (love) */}
              {data.stageGuide && (
                <div className="deep-section">
                  <h4 className="deep-section-title">📈 단계별 관계 전략</h4>
                  {Object.entries(data.stageGuide).map(([key, val]) => (
                    <div key={key} className="deep-quarter-item">
                      <span className="deep-quarter-label">{val.split(':')[0]}</span>
                      <p>{val.includes(':') ? val.split(':').slice(1).join(':') : val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 귀인 정보 (yearly) */}
              {data.noblePersons && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🌟 귀인 정보</h4>
                  <p>{data.noblePersons}</p>
                </div>
              )}

              {/* 직업/사업운 */}
              {data.careerAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💼 직업/사업운</h4>
                  <p>{data.careerAdvice}</p>
                </div>
              )}

              {/* 방위 조언 (monthly) */}
              {data.directionAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🧭 방위별 길흉</h4>
                  <p>{data.directionAdvice}</p>
                </div>
              )}

              {/* 행운 아이템 (monthly) */}
              {data.luckyItems && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🍀 행운 아이템</h4>
                  {data.luckyItems.food && <p>🍽️ <strong>음식:</strong> {data.luckyItems.food}</p>}
                  {data.luckyItems.color && <p>🎨 <strong>색상:</strong> {data.luckyItems.color}</p>}
                  {data.luckyItems.number && <p>🔢 <strong>숫자:</strong> {data.luckyItems.number}</p>}
                  {data.luckyItems.activity && <p>🏃 <strong>활동:</strong> {data.luckyItems.activity}</p>}
                </div>
              )}

              {/* 월별 재물운 (yearly) */}
              {data.monthlyWealth && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💰 월별 재물운</h4>
                  <p>{data.monthlyWealth}</p>
                </div>
              )}

              {/* 월별 건강 (yearly) */}
              {data.monthlyHealth && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🏥 월별 건강</h4>
                  <p>{data.monthlyHealth}</p>
                </div>
              )}

              {/* 생활 가이드 (yearly) */}
              {data.lifestyleGuide && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🌿 행운 극대화 생활 습관</h4>
                  <ul className="deep-list">
                    {data.lifestyleGuide.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* 감정 분석 */}
              {data.emotionAnalysis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💭 감정/심리 분석</h4>
                  <p>{data.emotionAnalysis}</p>
                </div>
              )}

              {/* 심리 분석 (default) */}
              {data.psychAnalysis && !data.partnerProfile && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🧠 심리 분석</h4>
                  <p>{data.psychAnalysis}</p>
                </div>
              )}

              {/* 감정 리듬 (weekly) */}
              {data.emotionalRhythm && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💭 감정 리듬</h4>
                  <p>{data.emotionalRhythm}</p>
                </div>
              )}

              {/* 분기별 분석 (yearly) */}
              {data.quarterAnalysis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">📊 분기별 분석</h4>
                  {Object.entries(data.quarterAnalysis).map(([key, val]) => (
                    <div key={key} className="deep-quarter-item">
                      <span className="deep-quarter-label">{key === 'q1' ? '1~3월' : key === 'q2' ? '4~6월' : key === 'q3' ? '7~9월' : '10~12월'}</span>
                      <p>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 주차별 분석 (monthly) */}
              {data.weeklyFlow && (
                <div className="deep-section">
                  <h4 className="deep-section-title">📅 주차별 분석</h4>
                  {Object.entries(data.weeklyFlow).map(([key, val]) => (
                    <div key={key} className="deep-time-item">
                      <span className="deep-time-label">{key === 'week1' ? '1주차' : key === 'week2' ? '2주차' : key === 'week3' ? '3주차' : '4주차'}</span>
                      <p>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 요일별 에너지 (weekly) */}
              {data.dailyEnergy && (
                <div className="deep-section">
                  <h4 className="deep-section-title">📆 요일별 에너지</h4>
                  {Object.entries(data.dailyEnergy).map(([key, val]) => {
                    const dayNames = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
                    return (
                      <div key={key} className="deep-time-item">
                        <span className="deep-time-label">{dayNames[key]}요일</span>
                        <p>{val}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 시기 분석 (love) */}
              {data.timingAnalysis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">⏳ 시기 분석</h4>
                  <p>{data.timingAnalysis}</p>
                </div>
              )}

              {/* 파트너 분석 (love) */}
              {data.partnerProfile && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💑 파트너 분석</h4>
                  <p>{data.partnerProfile}</p>
                </div>
              )}

              {/* 심리 분석 (love) */}
              {data.psychAnalysis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🧠 심리 분석</h4>
                  <p>{data.psychAnalysis}</p>
                </div>
              )}

              {/* 재물 시기 (yearly) */}
              {data.wealthTiming && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💰 재물운 시기</h4>
                  <p>{data.wealthTiming}</p>
                </div>
              )}
              {data.wealthAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">💰 재물운 상세</h4>
                  <p>{data.wealthAdvice}</p>
                </div>
              )}

              {/* 건강 (yearly/monthly) */}
              {data.healthWarning && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🏥 건강 주의</h4>
                  <p>{data.healthWarning}</p>
                </div>
              )}
              {data.healthAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🏥 건강운 상세</h4>
                  <p>{data.healthAdvice}</p>
                </div>
              )}

              {/* 대인관계 */}
              {data.relationshipFlow && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🤝 대인관계</h4>
                  <p>{data.relationshipFlow}</p>
                </div>
              )}
              {data.socialAdvice && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🤝 대인관계</h4>
                  <p>{data.socialAdvice}</p>
                </div>
              )}
              {data.socialStrategy && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🤝 대인관계 전략</h4>
                  <p>{data.socialStrategy}</p>
                </div>
              )}

              {/* 전망 (love) */}
              {data.forecast && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🔮 향후 전망</h4>
                  <p>{data.forecast}</p>
                </div>
              )}

              {/* 상세 분석 (기본) */}
              {data.detailAnalysis && (
                <div className="deep-section">
                  <h4 className="deep-section-title">📋 상세 분석</h4>
                  <p>{data.detailAnalysis}</p>
                </div>
              )}

              {/* 텍스트 분석 (폴백) */}
              {data.analysis && typeof data.analysis === 'string' && (
                <div className="deep-section">
                  <p>{data.analysis}</p>
                </div>
              )}

              {/* 행동 지침 리스트 */}
              {(data.actionGuide || data.strategy || data.yearStrategy || data.monthStrategy || data.weekStrategy) && (
                <div className="deep-section">
                  <h4 className="deep-section-title">✅ 행동 지침</h4>
                  <ul className="deep-list">
                    {(data.actionGuide || data.strategy || data.yearStrategy || data.monthStrategy || data.weekStrategy || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 전환점 (yearly) */}
              {data.turningPoints && (
                <div className="deep-section">
                  <h4 className="deep-section-title">⚡ 전환점</h4>
                  <ul className="deep-list">
                    {data.turningPoints.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* 주의사항 리스트 */}
              {(data.avoidList || data.caution) && (
                <div className="deep-section">
                  <h4 className="deep-section-title">⚠️ 주의사항</h4>
                  <ul className="deep-list deep-list--caution">
                    {(data.avoidList || data.caution || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 주요 날짜 (monthly) */}
              {data.keyDates && (
                <div className="deep-section">
                  <h4 className="deep-section-title">📌 주요 날짜</h4>
                  <ul className="deep-list">
                    {data.keyDates.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* 행운 포인트 (weekly) */}
              {data.peakTime && (
                <div className="deep-section">
                  <h4 className="deep-section-title">🌟 최고 행운 시점</h4>
                  <p>{data.peakTime}</p>
                </div>
              )}

              {/* 숨겨진 메시지 */}
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
