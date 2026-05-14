import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRatingStatus, claimRatingReward, isGuest } from '../api/fortune';
import MenuIcon from '../components/MenuIcon';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import StatusView from '../components/StatusView';
import './RatingClaim.css';

// Play Store 페이지 — 안드로이드 패키지명 com.love.onetoone
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.love.onetoone';
const STORAGE_KEY_OPENED = 'ratingStoreOpenedAt';

function RatingClaim() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [opened, setOpened] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY_OPENED)));
  const [doneMessage, setDoneMessage] = useState('');
  const guest = isGuest();

  useEffect(() => {
    if (guest) { setLoading(false); return; }
    let alive = true;
    getRatingStatus()
      .then((s) => { if (alive) { setStatus(s); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [guest]);

  const reward = status?.reward ?? 50;
  const claimed = Boolean(status?.claimed);

  const openStore = () => {
    try { localStorage.setItem(STORAGE_KEY_OPENED, String(Date.now())); } catch {}
    setOpened(true);
    // 모바일/앱 환경에선 새 탭이 아니라 외부 브라우저 또는 앱 스토어로 이동
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
  };

  const submitClaim = async () => {
    if (claimed || claiming) return;
    setClaiming(true);
    try {
      const res = await claimRatingReward();
      if (res?.ok) {
        setStatus((prev) => ({ ...(prev || {}), claimed: true, reward: res.reward ?? reward }));
        setDoneMessage(`+${res.reward ?? reward}하트 지급됐어요!`);
      } else if (res?.reason === 'already_claimed') {
        setStatus((prev) => ({ ...(prev || {}), claimed: true }));
        setDoneMessage('이미 받으셨어요');
      } else {
        setDoneMessage('지급에 실패했어요. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setClaiming(false);
    }
  };

  if (guest) {
    return (
      <div className="rating-page">
        <header className="rating-header">
          <button className="rating-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
          <h1 className="rating-title">평점 후기 보너스</h1>
        </header>
        <StatusView
          variant="info"
          icon="star"
          title="로그인 후 받을 수 있어요"
          message={`Play Store에 5점 후기를 남기면\n+${reward}하트를 1회 지급해드려요`}
        />
        <div className="rating-guest-cta">
          <KakaoLoginCTA returnTo="/rating">카카오로 시작하기</KakaoLoginCTA>
        </div>
      </div>
    );
  }

  return (
    <div className="rating-page">
      <header className="rating-header">
        <button className="rating-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <h1 className="rating-title">평점 후기 보너스</h1>
      </header>

      {/* Hero */}
      <section className="rating-hero glass-card">
        <div className="rating-hero-icon">
          <MenuIcon name="star" size={56} />
        </div>
        <h2 className="rating-hero-title">+{reward} 하트</h2>
        <p className="rating-hero-sub">
          Play Store에서 <strong>5점 후기</strong>를 남겨주시면<br />
          1회 한정 <strong>+{reward}하트</strong>를 드려요
        </p>
      </section>

      {/* 진행 단계 */}
      <section className="rating-steps glass-card">
        <div className={`rating-step ${opened ? 'rating-step--done' : 'rating-step--active'}`}>
          <span className="rating-step-num">{opened ? '✓' : '1'}</span>
          <div className="rating-step-body">
            <span className="rating-step-title">Play Store에서 평가 페이지 열기</span>
            <span className="rating-step-sub">새 탭으로 스토어로 이동해요</span>
          </div>
        </div>
        <div className={`rating-step ${claimed ? 'rating-step--done' : (opened ? 'rating-step--active' : '')}`}>
          <span className="rating-step-num">{claimed ? '✓' : '2'}</span>
          <div className="rating-step-body">
            <span className="rating-step-title">5점 + 후기 남기고 돌아오기</span>
            <span className="rating-step-sub">짧게 한 줄도 좋아요</span>
          </div>
        </div>
        <div className={`rating-step ${claimed ? 'rating-step--done' : ''}`}>
          <span className="rating-step-num">{claimed ? '✓' : '3'}</span>
          <div className="rating-step-body">
            <span className="rating-step-title">아래 보상 받기 버튼 누르기</span>
            <span className="rating-step-sub">{reward}하트 지급</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rating-cta">
        {claimed ? (
          <StatusView
            variant="info"
            size="inline"
            icon="sparkleHeart"
            title="이미 받으셨어요"
            message="평점 후기 보너스는 1회만 지급돼요. 응원해주셔서 감사합니다 🙏"
          />
        ) : !opened ? (
          <button className="rating-cta-store" onClick={openStore} disabled={loading}>
            <MenuIcon name="share" size={20} />
            <span>Play Store에서 평가하기</span>
          </button>
        ) : (
          <>
            <button className="rating-cta-claim" onClick={submitClaim} disabled={claiming}>
              {claiming ? '지급 중…' : `+${reward}하트 받기`}
            </button>
            <button className="rating-cta-restore" onClick={openStore}>
              평가 페이지 다시 열기
            </button>
          </>
        )}
        {doneMessage && (
          <p className={`rating-done ${claimed ? 'rating-done--ok' : ''}`}>{doneMessage}</p>
        )}
      </section>

      <p className="rating-note">
        ※ 평점 후기는 자율이며, 보상은 1회 한정입니다. 후기 페이지 이동 후 돌아와서 "보상 받기" 버튼을 눌러야 지급됩니다.
      </p>
    </div>
  );
}

export default RatingClaim;
