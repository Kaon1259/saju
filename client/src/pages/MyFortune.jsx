import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyFortune } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import './MyFortune.css';

function MyFortune() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('saju');
  const [copied, setCopied] = useState(false);

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
          <button className="myf-register-btn" onClick={() => navigate('/register')}>
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

  if (!data) return null;

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
      {/* 헤더 */}
      <div className="myf-header">
        <h1 className="myf-title">{userName || user.name}님의 운세</h1>
        <div className="myf-badges">
          <span className="myf-badge">{user.zodiacAnimal}띠</span>
          {saju?.dayMaster && <span className="myf-badge myf-badge--saju">{saju.dayMaster}일간</span>}
          {user.bloodType && <span className="myf-badge myf-badge--bt">{user.bloodType}형</span>}
          {user.mbtiType && <span className="myf-badge myf-badge--mbti">{user.mbtiType}</span>}
        </div>
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
      <div className="myf-share">
        <button className="myf-share-btn" onClick={handleShare}>
          {copied ? '✅ 복사 완료!' : '📤 운세 공유하기'}
        </button>
      </div>
    </div>
  );
}

export default MyFortune;
