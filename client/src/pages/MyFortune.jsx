import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyFortune, getMyFortuneStream, analyzeSaju, analyzeSajuStream } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import BirthDatePicker from '../components/BirthDatePicker';
import DeepAnalysis from '../components/DeepAnalysis';
import StreamText from '../components/StreamText';
import FortuneLoading from '../components/FortuneLoading';
import parseAiJson from '../utils/parseAiJson';
import './MyFortune.css';

function MyFortune() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('saju');
  const [copied, setCopied] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const cleanupRef = useRef(null);
  const [viewMode, setViewMode] = useState('mine'); // 'mine' | 'partner' | 'other'
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'tomorrow' | 'pick'
  const [pickDate, setPickDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 연인 운세
  const [partnerData, setPartnerData] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerStreamText, setPartnerStreamText] = useState('');
  const [partnerStreaming, setPartnerStreaming] = useState(false);
  const partnerCleanupRef = useRef(null);

  // 다른 사람 운세
  const [otherBirthDate, setOtherBirthDate] = useState('');
  const [otherBirthTime, setOtherBirthTime] = useState('');
  const [otherGender, setOtherGender] = useState('');
  const [otherCalendarType, setOtherCalendarType] = useState('SOLAR');
  const [otherData, setOtherData] = useState(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherStreamText, setOtherStreamText] = useState('');
  const [otherStreaming, setOtherStreaming] = useState(false);
  const otherCleanupRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  // 날짜 계산
  const getTargetDate = () => {
    if (dateMode === 'tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    if (dateMode === 'pick' && pickDate) return pickDate;
    return null; // today = null (서버 기본값)
  };
  const getDateLabel = () => {
    if (dateMode === 'tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
    if (dateMode === 'pick' && pickDate) {
      const [, m, day] = pickDate.split('-');
      return `${parseInt(m)}월 ${parseInt(day)}일`;
    }
    return '오늘';
  };

  // 프로필에서 연인 정보 가져오기
  const getPartnerInfo = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!p.partnerBirthDate) return null;
      return {
        birthDate: p.partnerBirthDate,
        birthTime: p.partnerBirthTime || '',
        gender: p.gender === 'M' ? 'F' : p.gender === 'F' ? 'M' : '',
      };
    } catch { return null; }
  };

  // 스트리밍 분석 공통 함수
  const startAnalysis = (birthDate, birthTime, calendarType, gender, setters) => {
    const { setLoading: sL, setStreamText: sST, setStreaming: sS, setData: sD, cleanupRef: cRef } = setters;
    sL(true); sST(''); sS(false);
    cRef.current?.();
    cRef.current = analyzeSajuStream(birthDate, birthTime || undefined, calendarType, gender || undefined, {
      onCached: (cached) => { sD(cached); sL(false); },
      onChunk: (text) => { sS(true); sST(prev => prev + text); },
      onDone: () => {
        sS(false);
        (async () => {
          try { const r = await analyzeSaju(birthDate, birthTime || undefined, calendarType, gender || undefined); sD(r); }
          catch (e) { console.error(e); }
          finally { sL(false); sST(''); }
        })();
      },
      onError: () => {
        sS(false);
        (async () => {
          try { const r = await analyzeSaju(birthDate, birthTime || undefined, calendarType, gender || undefined); sD(r); }
          catch (e) { console.error(e); }
          finally { sL(false); sST(''); }
        })();
      },
    });
  };

  const handleShare = async (fortuneData, title) => {
    const tf = fortuneData?.todayFortune || fortuneData;
    const shareText = [
      `[${title || '사주 운세 분석'}]`,
      `운세 점수: ${tf?.score || 70}점`,
      '', `🌟 총운: ${tf?.overall || ''}`, `💕 애정운: ${tf?.love || ''}`,
      `💰 재물운: ${tf?.money || ''}`, `💪 건강운: ${tf?.health || ''}`, `💼 직장운: ${tf?.work || ''}`,
      '', `🍀 행운의 숫자: ${tf?.luckyNumber || '-'}`, `🎨 행운의 색상: ${tf?.luckyColor || '-'}`,
      '', '- 연애 앱에서 확인하세요 -',
    ].join('\n');
    try {
      if (navigator.share) { await navigator.share({ title, text: shareText }); return; }
      await navigator.clipboard.writeText(shareText);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    }
  };

  const loadMyFortune = (targetDate) => {
    if (!userId) { setLoading(false); return; }
    setData(null); setLoading(true); setStreamText(''); setStreaming(false);
    cleanupRef.current?.();
    cleanupRef.current = getMyFortuneStream(userId, {
      onCached: (d) => { setData(d); setLoading(false); },
      onChunk: (t) => { setStreaming(true); setStreamText(prev => prev + t); },
      onDone: (fullText) => {
        setStreaming(false); setStreamText('');
        // 스트리밍 텍스트에서 직접 파싱 → 즉시 표시
        const parsed = parseAiJson(fullText);
        if (parsed) {
          const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
          setData({
            user: { name: profile.name || '', zodiacAnimal: profile.zodiacAnimal || '', bloodType: profile.bloodType || '', mbtiType: profile.mbtiType || '' },
            saju: { overall: parsed.overall, love: parsed.love, money: parsed.money, health: parsed.health, work: parsed.work, score: parsed.score || 70, luckyNumber: parsed.luckyNumber, luckyColor: parsed.luckyColor }
          });
        }
        setLoading(false);
      },
      onError: () => {
        setStreaming(false); setStreamText('');
        setLoading(false);
      },
    }, targetDate);
    return () => cleanupRef.current?.();
  };

  useEffect(() => {
    loadMyFortune(getTargetDate());
    return () => cleanupRef.current?.();
  }, [userId, dateMode, pickDate]);

  if (!userId) {
    return (
      <div className="myf-page">
        <div className="myf-empty">
          <div className="myf-empty-icon">🔮</div>
          <h2>나만의 맞춤 운세</h2>
          <p>회원가입하면 사주 + 혈액형 + MBTI를<br />종합한 나만의 운세를 볼 수 있어요</p>
          <button className="myf-register-btn" onClick={() => navigate('/register', { state: { from: '/my' } })}>회원가입하기</button>
        </div>
      </div>
    );
  }

  if (loading || streaming) {
    return (
      <div className="myf-page">
        {!streamText && <FortuneLoading type="default" />}
        {streamText && <StreamText text={streamText} icon="🔮" label="AI가 사주를 분석하고 있어요..." color="#FBBF24" />}
      </div>
    );
  }

  if (!data) return (
    <div className="myf-page">
      <div className="myf-empty">
        <div className="myf-empty-icon">⏳</div>
        <h2>운세를 불러오지 못했습니다</h2>
        <p>AI가 사주를 분석하는 데 시간이 걸릴 수 있습니다.<br />잠시 후 다시 시도해주세요.</p>
        <button className="myf-register-btn" onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    </div>
  );

  const user = data.user || {};
  const saju = data.saju;
  const tabs = [{ id: 'saju', label: '사주 운세', icon: '☯️', data: saju }];
  const active = tabs.find(t => t.id === activeTab) || tabs[0];
  const f = active?.data;
  const partnerInfo = getPartnerInfo();

  /* ── 결과 렌더링 공통 ── */
  const renderResult = (rd, onReset, onShare, label, birthInfo) => (
    <>
      <div className="myf-header">
        <h1 className="myf-title">{label}</h1>
        {rd.dayMaster && (
          <div className="myf-badges">
            <span className="myf-badge myf-badge--saju">{rd.dayMasterHanja} {rd.dayMaster} 일간</span>
          </div>
        )}
      </div>
      <div className="myf-content fade-in">
        <div className="myf-score-wrap">
          <svg viewBox="0 0 120 120" className="myf-score-circle">
            <circle cx="60" cy="60" r="52" className="myf-score-bg" />
            <circle cx="60" cy="60" r="52" className="myf-score-fill"
              style={{ strokeDasharray: `${((rd.todayFortune?.score || 70) / 100) * 327} 327` }} />
          </svg>
          <div className="myf-score-inner">
            <span className="myf-score-num">{rd.todayFortune?.score || 70}</span>
            <span className="myf-score-unit">점</span>
          </div>
        </div>
        {rd.todayFortune && (
          <div className="myf-cards">
            {rd.todayFortune.overall && <FortuneCard icon="🌟" title="총운" description={rd.todayFortune.overall} delay={0} />}
            {rd.todayFortune.love && <FortuneCard icon="💕" title="애정운" description={rd.todayFortune.love} delay={80} />}
            {rd.todayFortune.money && <FortuneCard icon="💰" title="재물운" description={rd.todayFortune.money} delay={160} />}
            {rd.todayFortune.health && <FortuneCard icon="💪" title="건강운" description={rd.todayFortune.health} delay={240} />}
            {rd.todayFortune.work && <FortuneCard icon="💼" title="직장운" description={rd.todayFortune.work} delay={320} />}
          </div>
        )}
        {rd.personalityReading && (
          <div className="myf-analysis glass-card">
            <span className="myf-analysis-icon">☯️</span>
            <h4 className="myf-analysis-title">사주 성격 분석</h4>
            <p>{rd.personalityReading}</p>
          </div>
        )}
        {rd.todayFortune?.luckyNumber && (
          <div className="myf-lucky glass-card">
            <div className="myf-lucky-item">
              <span className="myf-lucky-label">행운의 숫자</span>
              <span className="myf-lucky-value">{rd.todayFortune.luckyNumber}</span>
            </div>
            <div className="myf-lucky-divider" />
            <div className="myf-lucky-item">
              <span className="myf-lucky-label">행운의 색</span>
              <span className="myf-lucky-value">{rd.todayFortune.luckyColor}</span>
            </div>
          </div>
        )}
      </div>
      {birthInfo?.birthDate && (
        <DeepAnalysis type="today" birthDate={birthInfo.birthDate} birthTime={birthInfo.birthTime} gender={birthInfo.gender} calendarType={birthInfo.calendarType} />
      )}
      <div className="myf-actions">
        <button className="myf-share-btn" onClick={onShare}>{copied ? '✅ 복사 완료!' : '📤 공유하기'}</button>
        <button className="myf-share-btn" onClick={onReset}>🔄 다시 보기</button>
      </div>
    </>
  );

  /* ── 스트리밍/로딩 표시 공통 ── */
  const renderLoading = (isLoading, isStreaming, sText, hasData) => {
    if ((isLoading || isStreaming) && !hasData) {
      return sText
        ? <StreamText text={sText} icon="🔮" label="AI가 사주를 분석하고 있어요..." color="#FBBF24" />
        : <FortuneLoading type="default" />;
    }
    return null;
  };

  return (
    <div className="myf-page">
      {/* 최상단 모드 탭 */}
      <div className="myf-mode-tabs">
        <button className={`myf-mode-tab ${viewMode === 'mine' ? 'active' : ''}`} onClick={() => setViewMode('mine')}>내 운세</button>
        <button className={`myf-mode-tab ${viewMode === 'partner' ? 'active' : ''}`} onClick={() => setViewMode('partner')}>연인 운세</button>
        <button className={`myf-mode-tab ${viewMode === 'other' ? 'active' : ''}`} onClick={() => setViewMode('other')}>다른 사람</button>
      </div>

      {/* 날짜 선택 (내 운세 탭) */}
      {viewMode === 'mine' && (
        <>
          {dateMode === 'today' ? (
            <div className="myf-date-actions">
              <button className="myf-date-action-btn" onClick={() => { setDateMode('tomorrow'); setPickDate(''); }}>
                🌙 내일의 운세 보기
              </button>
              <button className="myf-date-action-btn myf-date-action-btn--pick" onClick={() => setShowDatePicker(true)}>
                📅 날짜 지정 운세 보기
              </button>
            </div>
          ) : (
            <div className="myf-date-actions">
              <button className="myf-date-action-btn" onClick={() => { setDateMode('today'); setPickDate(''); }}>
                ☀️ 오늘의 운세로 돌아가기
              </button>
            </div>
          )}
          {showDatePicker && (
            <div className="myf-date-picker-overlay" onClick={() => setShowDatePicker(false)}>
              <div className="myf-date-picker-popup glass-card" onClick={e => e.stopPropagation()}>
                <h3 style={{ textAlign: 'center', marginBottom: 12, fontSize: 16, fontWeight: 800 }}>📅 날짜 선택</h3>
                <input type="date" className="myf-date-picker-input"
                  value={pickDate}
                  min={(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })()}
                  max={(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })()}
                  onChange={(e) => { setPickDate(e.target.value); setDateMode('pick'); setShowDatePicker(false); }} />
                <button className="myf-date-picker-close" onClick={() => setShowDatePicker(false)}>닫기</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ 연인 운세 ════════ */}
      {viewMode === 'partner' && (
        <div className="myf-other-view">
          {renderLoading(partnerLoading, partnerStreaming, partnerStreamText, partnerData) || (
            !partnerData ? (
              <div className="myf-other-form glass-card" style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: 12 }}>💕 연인 운세</h2>
                {partnerInfo ? (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      프로필에 등록된 연인 정보로 운세를 분석합니다
                    </p>
                    <div className="myf-badges" style={{ justifyContent: 'center', marginBottom: 20 }}>
                      <span className="myf-badge">{partnerInfo.birthDate}</span>
                      {partnerInfo.birthTime && <span className="myf-badge">{partnerInfo.birthTime}</span>}
                      {partnerInfo.gender && <span className="myf-badge">{partnerInfo.gender === 'M' ? '♂ 남성' : '♀ 여성'}</span>}
                    </div>
                    <button className="btn-gold" style={{ width: '100%', marginBottom: 8 }}
                      onClick={() => startAnalysis(partnerInfo.birthDate, partnerInfo.birthTime, 'SOLAR', partnerInfo.gender, {
                        setLoading: setPartnerLoading, setStreamText: setPartnerStreamText, setStreaming: setPartnerStreaming,
                        setData: setPartnerData, cleanupRef: partnerCleanupRef,
                      })}>
                      💕 연인 운세 보기
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 48, margin: '20px 0' }}>💔</div>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                      등록된 연인 정보가 없습니다.<br />프로필에서 연인 정보를 먼저 입력해주세요.
                    </p>
                    <button className="btn-gold" style={{ width: '100%' }} onClick={() => navigate('/profile/edit')}>
                      프로필에서 연인 등록하기
                    </button>
                  </>
                )}
              </div>
            ) : (
              renderResult(partnerData, () => {
                partnerCleanupRef.current?.(); setPartnerData(null); setPartnerStreamText(''); setPartnerStreaming(false);
              }, () => handleShare(partnerData, '연인 운세'), '연인 운세 분석 결과', partnerInfo ? { birthDate: partnerInfo.birthDate, birthTime: partnerInfo.birthTime, gender: partnerInfo.gender } : null)
            )
          )}
        </div>
      )}

      {/* ════════ 다른 사람 운세 ════════ */}
      {viewMode === 'other' && (
        <div className="myf-other-view">
          {renderLoading(otherLoading, otherStreaming, otherStreamText, otherData) || (
            !otherData ? (
              <div className="myf-other-form glass-card">
                <h2 style={{ textAlign: 'center', marginBottom: 20 }}>다른 사람 운세 보기</h2>
                <div className="form-group">
                  <label className="form-label">달력 구분</label>
                  <div className="form-toggle">
                    <button type="button" className={`form-toggle__btn ${otherCalendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherCalendarType('SOLAR')}>양력</button>
                    <button type="button" className={`form-toggle__btn ${otherCalendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherCalendarType('LUNAR')}>음력</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">생년월일</label>
                  <BirthDatePicker value={otherBirthDate} onChange={setOtherBirthDate} calendarType={otherCalendarType} />
                </div>
                <div className="form-group">
                  <label className="form-label">태어난 시간 (선택)</label>
                  <select className="form-input form-select" value={otherBirthTime} onChange={(e) => setOtherBirthTime(e.target.value)}>
                    <option value="">모름 / 선택안함</option>
                    <option value="자시">자시 (23:00~01:00)</option>
                    <option value="축시">축시 (01:00~03:00)</option>
                    <option value="인시">인시 (03:00~05:00)</option>
                    <option value="묘시">묘시 (05:00~07:00)</option>
                    <option value="진시">진시 (07:00~09:00)</option>
                    <option value="사시">사시 (09:00~11:00)</option>
                    <option value="오시">오시 (11:00~13:00)</option>
                    <option value="미시">미시 (13:00~15:00)</option>
                    <option value="신시">신시 (15:00~17:00)</option>
                    <option value="유시">유시 (17:00~19:00)</option>
                    <option value="술시">술시 (19:00~21:00)</option>
                    <option value="해시">해시 (21:00~23:00)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">성별</label>
                  <div className="form-toggle">
                    <button type="button" className={`form-toggle__btn ${otherGender === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherGender('M')}><span className="g-circle g-male">♂</span></button>
                    <button type="button" className={`form-toggle__btn ${otherGender === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherGender('F')}><span className="g-circle g-female">♀</span></button>
                  </div>
                </div>
                <button className="btn-gold" style={{ width: '100%', marginTop: 16, marginBottom: 24 }} disabled={!otherBirthDate || otherLoading || otherStreaming}
                  onClick={() => startAnalysis(otherBirthDate, otherBirthTime, otherCalendarType, otherGender, {
                    setLoading: setOtherLoading, setStreamText: setOtherStreamText, setStreaming: setOtherStreaming,
                    setData: setOtherData, cleanupRef: otherCleanupRef,
                  })}>
                  {otherLoading || otherStreaming ? 'AI 분석중...' : '운세 보기'}
                </button>
              </div>
            ) : (
              renderResult(otherData, () => {
                otherCleanupRef.current?.(); setOtherData(null); setOtherBirthDate(''); setOtherBirthTime(''); setOtherGender(''); setOtherStreamText(''); setOtherStreaming(false);
              }, () => handleShare(otherData, '사주 운세 분석'), '운세 분석 결과', otherBirthDate ? { birthDate: otherBirthDate, birthTime: otherBirthTime, gender: otherGender, calendarType: otherCalendarType } : null)
            )
          )}
        </div>
      )}

      {/* ════════ 내 운세 ════════ */}
      {viewMode === 'mine' && (
      <>
      <div className="myf-header">
        <h1 className="myf-title">{userName || user.name}님의 {dateMode === 'today' ? '오늘의' : dateMode === 'tomorrow' ? '내일의' : getDateLabel()} 운세</h1>
        <div className="myf-badges">
          <span className="myf-badge">{user.zodiacAnimal}띠</span>
          {saju?.dayMaster && <span className="myf-badge myf-badge--saju">{saju.dayMaster}일간</span>}
          {user.bloodType && <span className="myf-badge myf-badge--bt">{user.bloodType}형</span>}
          {user.mbtiType && <span className="myf-badge myf-badge--mbti">{user.mbtiType}</span>}
        </div>
        {f && (
          <div className="myf-speech-top">
            <SpeechButton
              label="운세 읽어주기"
              text={[
                `${userName || user.name}님의 오늘의 ${active?.label || '운세'}입니다.`,
                `오늘의 점수는 ${f.score || 70}점입니다.`,
                f.overall ? `총운. ${f.overall}` : '', f.love ? `애정운. ${f.love}` : '',
                f.money ? `재물운. ${f.money}` : '', f.health ? `건강운. ${f.health}` : '',
                f.work ? `직장운. ${f.work}` : '', f.tip ? `오늘의 팁. ${f.tip}` : '',
                f.luckyNumber ? `행운의 숫자는 ${f.luckyNumber}이고` : '',
                f.luckyColor ? `행운의 색은 ${f.luckyColor}입니다.` : '',
              ].filter(Boolean).join(' ')}
              summaryText={[
                `${userName || user.name}님, ${active?.label || '운세'} 점수 ${f.score || 70}점.`,
                f.overall ? `총운. ${f.overall.split('.').slice(0, 2).join('.')}.` : '',
                f.luckyNumber ? `행운의 숫자 ${f.luckyNumber},` : '',
                f.luckyColor ? `행운의 색 ${f.luckyColor}.` : '',
              ].filter(Boolean).join(' ')}
            />
          </div>
        )}
      </div>

      {tabs.length > 1 && (
        <div className="myf-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`myf-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span className="myf-tab-icon">{tab.icon}</span>
              <span className="myf-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {f && (
        <div className="myf-content fade-in" key={activeTab}>
          <div className="myf-score-wrap">
            <svg viewBox="0 0 120 120" className="myf-score-circle">
              <circle cx="60" cy="60" r="52" className="myf-score-bg" />
              <circle cx="60" cy="60" r="52" className="myf-score-fill"
                style={{ strokeDasharray: `${((f.score || 70) / 100) * 327} 327` }} />
            </svg>
            <div className="myf-score-inner">
              <span className="myf-score-num">{f.score || 70}</span>
              <span className="myf-score-unit">점</span>
            </div>
          </div>

          {activeTab === 'blood' && f.dayAnalysis && (
            <div className="myf-analysis glass-card"><span className="myf-analysis-icon">☯️</span><p>{f.dayAnalysis}</p></div>
          )}

          <div className="myf-cards">
            {f.overall && <FortuneCard icon="🌟" title="총운" description={f.overall} delay={0} />}
            {f.love && <FortuneCard icon="💕" title="애정운" description={f.love} delay={80} />}
            {f.money && <FortuneCard icon="💰" title="재물운" description={f.money} delay={160} />}
            {f.health && <FortuneCard icon="💪" title="건강운" description={f.health} delay={240} />}
            {f.work && <FortuneCard icon="💼" title="직장운" description={f.work} delay={320} />}
          </div>

          {activeTab === 'saju' && saju?.personalityReading && (
            <div className="myf-analysis glass-card">
              <span className="myf-analysis-icon">☯️</span>
              <h4 className="myf-analysis-title">사주 성격 분석</h4>
              <p>{saju.personalityReading}</p>
            </div>
          )}

          {f.tip && (<div className="myf-tip glass-card"><span>💡</span><p>{f.tip}</p></div>)}

          <div className="myf-lucky glass-card">
            <div className="myf-lucky-item">
              <span className="myf-lucky-label">행운의 숫자</span>
              <span className="myf-lucky-value">{f.luckyNumber}</span>
            </div>
            <div className="myf-lucky-divider" />
            <div className="myf-lucky-item">
              <span className="myf-lucky-label">행운의 색</span>
              <span className="myf-lucky-value">{f.luckyColor}</span>
            </div>
          </div>

          {activeTab === 'saju' && (() => {
            try {
              const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
              if (!profile.birthDate) return null;
              return <DeepAnalysis key={dateMode + pickDate} type="today" birthDate={profile.birthDate} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={getTargetDate() || new Date().toISOString().slice(0, 10)} />;
            } catch { return null; }
          })()}
        </div>
      )}

      {f && (
        <>
        <div className="myf-actions">
          <button className="myf-share-btn" onClick={() => handleShare(data, '오늘의 사주 운세')}>
            {copied ? '✅ 복사 완료!' : '📤 운세 공유하기'}
          </button>
        </div>

        </>
      )}
      </>
      )}
    </div>
  );
}

export default MyFortune;
