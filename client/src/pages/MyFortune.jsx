import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyFortune, analyzeSaju } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import BirthDatePicker from '../components/BirthDatePicker';
import './MyFortune.css';

function MyFortune() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('saju');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('mine'); // 'mine' | 'other'
  const [otherBirthDate, setOtherBirthDate] = useState('');
  const [otherBirthTime, setOtherBirthTime] = useState('');
  const [otherGender, setOtherGender] = useState('');
  const [otherCalendarType, setOtherCalendarType] = useState('SOLAR');
  const [otherData, setOtherData] = useState(null);
  const [otherLoading, setOtherLoading] = useState(false);

  const handleShare = async () => {
    if (!data) return;
    const saju = data.saju;
    if (!saju) return;

    const shareText = [
      `[오늘의 사주 운세]`,
      `운세 점수: ${saju.score || 0}점`,
      '',
      `🌟 총운: ${saju.overall || ''}`,
      `💕 애정운: ${saju.love || ''}`,
      `💰 재물운: ${saju.money || ''}`,
      `💪 건강운: ${saju.health || ''}`,
      `💼 직장운: ${saju.work || ''}`,
      '',
      `🍀 행운의 숫자: ${saju.luckyNumber || '-'}`,
      `🎨 행운의 색상: ${saju.luckyColor || '-'}`,
      '',
      '- 사주운세 앱에서 확인하세요 -',
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: '오늘의 사주 운세', text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const result = await getMyFortune(userId);
        setData(result);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  if (!userId) {
    return (
      <div className="myf-page">
        <div className="myf-empty">
          <div className="myf-empty-icon">🔮</div>
          <h2>나만의 맞춤 운세</h2>
          <p>회원가입하면 사주 + 혈액형 + MBTI를<br />종합한 나만의 운세를 볼 수 있어요</p>
          <button className="myf-register-btn" onClick={() => navigate('/register', { state: { from: '/my' } })}>
            회원가입하기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="myf-page">
        <div className="myf-loading">
          <div className="myf-spinner" />
          <p>AI가 사주를 분석하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="myf-page">
      <div className="myf-empty">
        <div className="myf-empty-icon">⏳</div>
        <h2>운세를 불러오지 못했습니다</h2>
        <p>AI가 사주를 분석하는 데 시간이 걸릴 수 있습니다.<br />잠시 후 다시 시도해주세요.</p>
        <button className="myf-register-btn" onClick={() => window.location.reload()}>
          다시 시도
        </button>
      </div>
    </div>
  );

  const user = data.user || {};
  const saju = data.saju;
  const bt = data.bloodType;
  const mbti = data.mbti;

  const tabs = [
    { id: 'saju', label: '사주운세', icon: '☯️', data: saju },
  ];
  if (bt) tabs.push({ id: 'blood', label: `${user.bloodType}형`, icon: '🩸', data: bt });
  if (mbti) tabs.push({ id: 'mbti', label: user.mbtiType, icon: '🧬', data: mbti });

  const active = tabs.find(t => t.id === activeTab) || tabs[0];
  const f = active?.data;

  return (
    <div className="myf-page">
      {/* 최상단 모드 탭 */}
      <div className="myf-mode-tabs">
        <button className={`myf-mode-tab ${viewMode === 'mine' ? 'active' : ''}`} onClick={() => setViewMode('mine')}>
          내 운세
        </button>
        <button className={`myf-mode-tab ${viewMode === 'other' ? 'active' : ''}`} onClick={() => setViewMode('other')}>
          다른 사람 운세
        </button>
      </div>

      {viewMode === 'other' ? (
        /* ─── 다른 사람 운세 ─── */
        <div className="myf-other-view">
          {!otherData ? (
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
                  <button type="button" className={`form-toggle__btn ${otherGender === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherGender('M')}>남성</button>
                  <button type="button" className={`form-toggle__btn ${otherGender === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherGender('F')}>여성</button>
                </div>
              </div>
              <button className="btn-gold" style={{ width: '100%' }} disabled={!otherBirthDate || otherLoading}
                onClick={async () => {
                  setOtherLoading(true);
                  try {
                    const result = await analyzeSaju(otherBirthDate, otherBirthTime || undefined, otherCalendarType, otherGender || undefined);
                    setOtherData(result);
                  } catch (e) { console.error(e); }
                  finally { setOtherLoading(false); }
                }}>
                {otherLoading ? '분석중...' : '운세 보기'}
              </button>
            </div>
          ) : (
            <>
              <div className="myf-header">
                <h1 className="myf-title">운세 분석 결과</h1>
                {otherData.dayMaster && (
                  <div className="myf-badges">
                    <span className="myf-badge myf-badge--saju">{otherData.dayMasterHanja} {otherData.dayMaster} 일간</span>
                  </div>
                )}
              </div>
              <div className="myf-content fade-in">
                <div className="myf-score-wrap">
                  <svg viewBox="0 0 120 120" className="myf-score-circle">
                    <circle cx="60" cy="60" r="52" className="myf-score-bg" />
                    <circle cx="60" cy="60" r="52" className="myf-score-fill"
                      style={{ strokeDasharray: `${((otherData.todayFortune?.score || 70) / 100) * 327} 327` }} />
                  </svg>
                  <div className="myf-score-inner">
                    <span className="myf-score-num">{otherData.todayFortune?.score || 70}</span>
                    <span className="myf-score-unit">점</span>
                  </div>
                </div>
                {otherData.personalityReading && (
                  <div className="myf-analysis glass-card">
                    <span className="myf-analysis-icon">☯️</span>
                    <h4 className="myf-analysis-title">사주 성격 분석</h4>
                    <p>{otherData.personalityReading}</p>
                  </div>
                )}
                {otherData.todayFortune && (
                  <div className="myf-cards">
                    {otherData.todayFortune.overall && <FortuneCard icon="🌟" title="총운" description={otherData.todayFortune.overall} delay={0} />}
                    {otherData.todayFortune.love && <FortuneCard icon="💕" title="애정운" description={otherData.todayFortune.love} delay={80} />}
                    {otherData.todayFortune.money && <FortuneCard icon="💰" title="재물운" description={otherData.todayFortune.money} delay={160} />}
                    {otherData.todayFortune.health && <FortuneCard icon="💪" title="건강운" description={otherData.todayFortune.health} delay={240} />}
                    {otherData.todayFortune.work && <FortuneCard icon="💼" title="직장운" description={otherData.todayFortune.work} delay={320} />}
                  </div>
                )}
                {otherData.todayFortune?.luckyNumber && (
                  <div className="myf-lucky glass-card">
                    <div className="myf-lucky-item">
                      <span className="myf-lucky-label">행운의 숫자</span>
                      <span className="myf-lucky-value">{otherData.todayFortune.luckyNumber}</span>
                    </div>
                    <div className="myf-lucky-divider" />
                    <div className="myf-lucky-item">
                      <span className="myf-lucky-label">행운의 색</span>
                      <span className="myf-lucky-value">{otherData.todayFortune.luckyColor}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="myf-actions">
                <button className="myf-share-btn" onClick={() => { setOtherData(null); setOtherBirthDate(''); setOtherBirthTime(''); setOtherGender(''); }}>
                  다른 사람 운세 다시 보기
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
      <>
      {/* ─── 내 운세 ─── */}
      <div className="myf-header">
        <h1 className="myf-title">{userName || user.name}님의 운세</h1>
        <div className="myf-badges">
          <span className="myf-badge">{user.zodiacAnimal}띠</span>
          {saju?.dayMaster && <span className="myf-badge myf-badge--saju">{saju.dayMaster}일간</span>}
          {user.bloodType && <span className="myf-badge myf-badge--bt">{user.bloodType}형</span>}
          {user.mbtiType && <span className="myf-badge myf-badge--mbti">{user.mbtiType}</span>}
        </div>
        {/* 읽어주기 (상단 배치) */}
        {f && (
          <div className="myf-speech-top">
            <SpeechButton
              label="운세 읽어주기"
              text={[
                `${userName || user.name}님의 오늘의 ${active?.label || '운세'}입니다.`,
                `오늘의 점수는 ${f.score || 70}점입니다.`,
                f.overall ? `총운. ${f.overall}` : '',
                f.love ? `애정운. ${f.love}` : '',
                f.money ? `재물운. ${f.money}` : '',
                f.health ? `건강운. ${f.health}` : '',
                f.work ? `직장운. ${f.work}` : '',
                f.tip ? `오늘의 팁. ${f.tip}` : '',
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

      {/* 탭 */}
      {tabs.length > 1 && (
        <div className="myf-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`myf-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="myf-tab-icon">{tab.icon}</span>
              <span className="myf-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 점수 원형 */}
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

          {/* 사주 탭: 성격/년운 요약 */}
          {activeTab === 'saju' && saju?.personalityReading && (
            <div className="myf-analysis glass-card">
              <span className="myf-analysis-icon">☯️</span>
              <h4 className="myf-analysis-title">사주 성격 분석</h4>
              <p>{saju.personalityReading}</p>
            </div>
          )}

          {activeTab === 'saju' && saju?.yearFortune && (
            <div className="myf-analysis glass-card">
              <span className="myf-analysis-icon">📅</span>
              <h4 className="myf-analysis-title">2026년 운세</h4>
              <p>{saju.yearFortune}</p>
            </div>
          )}

          {/* 일진 분석 (혈액형) */}
          {activeTab === 'blood' && f.dayAnalysis && (
            <div className="myf-analysis glass-card">
              <span className="myf-analysis-icon">☯️</span>
              <p>{f.dayAnalysis}</p>
            </div>
          )}

          {/* 카테고리 운세 */}
          <div className="myf-cards">
            {f.overall && <FortuneCard icon="🌟" title="총운" description={f.overall} delay={0} />}
            {f.love && <FortuneCard icon="💕" title="애정운" description={f.love} delay={80} />}
            {f.money && <FortuneCard icon="💰" title="재물운" description={f.money} delay={160} />}
            {f.health && <FortuneCard icon="💪" title="건강운" description={f.health} delay={240} />}
            {f.work && <FortuneCard icon="💼" title="직장운" description={f.work} delay={320} />}
          </div>

          {/* 팁 (MBTI) */}
          {f.tip && (
            <div className="myf-tip glass-card">
              <span>💡</span>
              <p>{f.tip}</p>
            </div>
          )}

          {/* 럭키 */}
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
        </div>
      )}

      {/* 공유 */}
      {f && (
        <div className="myf-actions">
          <button className="myf-share-btn" onClick={handleShare}>
            {copied ? '✅ 복사 완료!' : '📤 운세 공유하기'}
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default MyFortune;
