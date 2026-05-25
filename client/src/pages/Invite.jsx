import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReferralStats } from '../api/fortune';
import MenuIcon from '../components/MenuIcon';
import { Skeleton } from '../components/Skeleton';
import StatusView from '../components/StatusView';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import { isGuest } from '../api/fortune';
import './Invite.css';

function Invite() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const guest = isGuest();

  useEffect(() => {
    if (guest) { setLoading(false); return; }
    let alive = true;
    getReferralStats()
      .then((s) => { if (alive) { setStats(s); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [guest]);

  const code = stats?.code || '';
  const invited = stats?.invitedCount ?? 0;
  const earned = stats?.totalEarned ?? 0;
  const per = stats?.rewardPerInvite ?? 20;
  const inviteeBonus = stats?.inviteeBonus ?? 20;

  const shareText = code
    ? `사주 연애운 앱 같이 해요! 가입할 때 초대코드 [${code}] 입력하면 둘 다 ${inviteeBonus}하트 받아요 💗`
    : '';
  const shareUrl = code ? `https://saju-production-ac3c.up.railway.app/?ref=${encodeURIComponent(code)}` : '';

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {}
    }
  };

  const shareKakao = () => {
    // Web Share API (모바일 우선)
    const payload = { title: '1:1 연애 — 사주 연애운', text: shareText, url: shareUrl };
    if (navigator.share) {
      navigator.share(payload).catch(() => {});
      return;
    }
    // fallback: 카카오톡 공유 SDK 없으면 텍스트 복사
    try {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  if (guest) {
    return (
      <div className="invite-page">
        <header className="invite-header">
          <button className="invite-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
          <h1 className="invite-title">친구 초대</h1>
        </header>
        <StatusView
          variant="info"
          icon="handshake"
          title="로그인하고 친구를 초대해보세요"
          message={`친구가 가입할 때 내 코드를 입력하면\n친구는 +${inviteeBonus}하트, 나는 +${per}하트 받아요`}
        />
        <div className="invite-guest-cta">
          <KakaoLoginCTA returnTo="/invite">카카오로 시작하기</KakaoLoginCTA>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <header className="invite-header">
        <button className="invite-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <h1 className="invite-title">친구 초대</h1>
      </header>

      {/* Hero */}
      <section className="invite-hero glass-card">
        <div className="invite-hero-icon">
          <MenuIcon name="sparkleHeart" size={56} />
        </div>
        <h2 className="invite-hero-title">친구도 나도 +{per} 하트</h2>
        <p className="invite-hero-sub">
          친구가 가입할 때 <strong>내 초대 코드</strong>를 입력하면<br />
          <strong>친구는 {inviteeBonus}하트</strong>, <strong>나는 {per}하트</strong> 받아요
        </p>
      </section>

      {/* 내 코드 카드 */}
      <section className="invite-code-card glass-card">
        <span className="invite-code-label">내 초대 코드</span>
        {loading ? (
          <Skeleton variant="line" width="60%" height={32} radius={10} className="invite-code-skel" />
        ) : (
          <button className={`invite-code-pill ${copied ? 'is-copied' : ''}`} onClick={copyCode} aria-label="코드 복사">
            <span className="invite-code-text">{code || '— — — — — — — —'}</span>
            <span className="invite-code-copy">
              {copied ? '복사됨!' : '복사'}
            </span>
          </button>
        )}
        <button className="invite-share-btn" onClick={shareKakao} disabled={!code}>
          <MenuIcon name="share" size={18} />
          <span>친구에게 공유하기</span>
        </button>
      </section>

      {/* 통계 */}
      <section className="invite-stats">
        <div className="invite-stat glass-card">
          <span className="invite-stat-label">초대한 친구</span>
          <span className="invite-stat-value">
            {loading ? <Skeleton variant="line" width={40} height={28} /> : <>{invited}<small>명</small></>}
          </span>
        </div>
        <div className="invite-stat glass-card">
          <span className="invite-stat-label">누적 보너스</span>
          <span className="invite-stat-value invite-stat-value--accent">
            {loading ? <Skeleton variant="line" width={56} height={28} /> : <>+{earned}<small>하트</small></>}
          </span>
        </div>
      </section>

      {/* 안내 */}
      <section className="invite-how glass-card">
        <h3 className="invite-how-title">이렇게 사용해요</h3>
        <ol className="invite-how-list">
          <li><span className="invite-how-step">1</span>위 코드를 복사하거나 공유해 친구에게 보내요</li>
          <li><span className="invite-how-step">2</span>친구가 카카오로 가입한 뒤 코드를 입력해요</li>
          <li><span className="invite-how-step">3</span>둘 다 즉시 보너스 하트를 받아요</li>
        </ol>
        <p className="invite-how-note">
          ※ 코드 입력은 신규 가입자만 1회 가능해요. 자기 코드는 사용 불가.
        </p>
      </section>
    </div>
  );
}

export default Invite;
