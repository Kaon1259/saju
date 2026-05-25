import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '../components/MenuIcon';
import RewardedAdModal from '../components/RewardedAdModal';
import { getAdRewardStatus, claimAdReward } from '../api/fortune';
import { useToast } from '../components/Toast';
import './MyMenu.css';

function MyMenu() {
  const navigate = useNavigate();
  const toast = useToast();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const isGuest = !userId || localStorage.getItem('userName') === 'Guest';

  const [adStatus, setAdStatus] = useState(null); // { dailyLimit, todayCount, remaining, rewardPerAd }
  const [adOpen, setAdOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const loadStatus = useCallback(async () => {
    if (isGuest) return;
    try { setAdStatus(await getAdRewardStatus()); } catch { /* ignore */ }
  }, [isGuest]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const rewardPerAd = adStatus?.rewardPerAd ?? 5;
  const remaining = adStatus?.remaining ?? null;
  const dailyLimit = adStatus?.dailyLimit ?? 5;
  const soldOut = remaining === 0;

  const handleAdClick = () => {
    if (isGuest) { navigate('/register', { state: { from: '/my-menu' } }); return; }
    if (soldOut || claiming) return;
    setAdOpen(true);
  };

  // 광고 시청 완료 → 서버에 보상 요청
  const handleReward = async (reward) => {
    setAdOpen(false);
    if (!reward?.rewarded) return; // 중간 이탈 — 미지급
    setClaiming(true);
    try {
      const res = await claimAdReward();
      if (res?.rewarded) {
        setAdStatus((prev) => ({
          ...(prev || {}), dailyLimit: res.dailyLimit, todayCount: res.todayCount, remaining: res.remaining,
          rewardPerAd: prev?.rewardPerAd ?? 5,
        }));
        window.dispatchEvent(new CustomEvent('heart:refresh'));
        toast(`+${res.amount}하트 지급됐어요! (오늘 ${res.todayCount}/${res.dailyLimit})`, 'success');
      } else if (res?.reason === 'daily_limit') {
        setAdStatus((prev) => ({ ...(prev || {}), remaining: 0, todayCount: res.todayCount, dailyLimit: res.dailyLimit }));
        toast('오늘 광고 보상을 모두 받았어요. 내일 다시 받을 수 있어요!', 'info');
      }
    } catch {
      toast('보상 지급에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mymenu">
      {/* Header */}
      <section className="mymenu-hero">
        <span className="mymenu-hero-icon"><MenuIcon name="heart" size={36} /></span>
        <h1 className="mymenu-hero-title">하트 충전</h1>
        <p className="mymenu-hero-desc">하트를 충전하고 다양한 운세를 즐겨보세요</p>
      </section>

      {/* 메뉴 카드 */}
      <section className="mymenu-cards">
        {/* 리워드 광고 — 무과금 충전 */}
        <button
          className={`mymenu-card mymenu-card--ad ${soldOut ? 'mymenu-card--disabled' : ''}`}
          onClick={handleAdClick}
          disabled={soldOut || claiming}
        >
          <span className="mymenu-card-icon"><MenuIcon name="gift" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">광고 보고 하트 받기</span>
            <span className="mymenu-card-sub">
              {isGuest
                ? `광고 시청 1회당 +${rewardPerAd} 하트 (로그인 필요)`
                : soldOut
                  ? '오늘 보상 완료 · 내일 다시 받기'
                  : `광고 1회 시청 +${rewardPerAd} 하트${remaining != null ? ` · 오늘 ${dailyLimit - remaining}/${dailyLimit}` : ''}`}
            </span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>

        <button className="mymenu-card mymenu-card--attendance" onClick={() => navigate('/attendance')}>
          <span className="mymenu-card-icon"><MenuIcon name="attendance" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">출석부</span>
            <span className="mymenu-card-sub">매일 출석하고 하트 보너스 받기</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
        <button className="mymenu-card mymenu-card--invite" onClick={() => navigate('/invite')}>
          <span className="mymenu-card-icon"><MenuIcon name="handshake" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">친구 초대</span>
            <span className="mymenu-card-sub">친구가 가입하면 둘 다 +20 하트</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
        <button className="mymenu-card mymenu-card--rating" onClick={() => navigate('/rating')}>
          <span className="mymenu-card-icon"><MenuIcon name="star" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">5점 평가</span>
            <span className="mymenu-card-sub">Play Store 후기 1회 +30 하트</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
      </section>

      <RewardedAdModal
        open={adOpen}
        slot="heart_charge"
        title={`광고를 시청하면 +${rewardPerAd} 하트를 받아요`}
        subtitle="시청 완료 시 하트가 지급됩니다"
        onReward={handleReward}
        onClose={() => setAdOpen(false)}
      />
    </div>
  );
}

export default MyMenu;
