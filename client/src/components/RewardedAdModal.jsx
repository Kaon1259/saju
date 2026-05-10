import { useEffect, useState } from 'react';
import { showRewardedAd, AD_SIM_DURATION_SEC } from '../utils/adMob';
import './RewardedAdModal.css';

/**
 * 리워드 광고 모달 (시뮬레이션).
 * 5초 카운트다운 후 onReward 호출. 추후 AdMob 통합 시 동일 인터페이스로 교체.
 *
 * Props:
 *  - open       : boolean
 *  - title      : 광고 위 안내 문구
 *  - subtitle   : 보조 설명
 *  - slot       : analytics용 슬롯 키
 *  - onReward   : (reward) => void   완료 시 호출
 *  - onClose    : () => void         사용자가 닫기 요청 시 (보상 안 줌)
 */
export default function RewardedAdModal({
  open,
  title = '잠시 광고를 시청한 후 무료로 분석을 받아보세요',
  subtitle = '광고 시청 완료 시 운세 분석이 시작됩니다',
  slot = 'default',
  onReward,
  onClose,
}) {
  const [remaining, setRemaining] = useState(AD_SIM_DURATION_SEC);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRemaining(AD_SIM_DURATION_SEC);
    setRunning(true);
    let cancelled = false;
    showRewardedAd({
      slot,
      onTick: (s) => {
        if (!cancelled) setRemaining(Math.max(0, s));
      },
    }).then((reward) => {
      if (cancelled) return;
      setRunning(false);
      onReward?.(reward);
    });
    return () => { cancelled = true; setRunning(false); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const pct = ((AD_SIM_DURATION_SEC - remaining) / AD_SIM_DURATION_SEC) * 100;
  const canClose = !running; // 광고 실행 중에는 닫기 차단

  return (
    <div className="rad-overlay" role="dialog" aria-modal="true" aria-labelledby="rad-title">
      <div className="rad-sheet">
        <div className="rad-stage">
          <span className="rad-badge">광고</span>
          <div className="rad-stage-art" aria-hidden="true">
            <span className="rad-stage-emoji">🎬</span>
            <span className="rad-stage-rings" />
          </div>
          <p className="rad-stage-headline">Sponsored</p>
          <p className="rad-stage-sub">광고가 끝나면 운세 분석이 시작됩니다</p>
        </div>

        <div className="rad-info">
          <h3 id="rad-title" className="rad-title">{title}</h3>
          <p className="rad-subtitle">{subtitle}</p>
        </div>

        <div className="rad-progress">
          <div className="rad-progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="rad-progress-meta">
          <span>{running ? '광고 시청 중...' : '준비 완료!'}</span>
          <span className="rad-counter">{remaining}초</span>
        </div>

        <button
          className="rad-close"
          onClick={onClose}
          disabled={!canClose}
          aria-label="닫기"
        >
          {canClose ? '닫기' : `${remaining}초 후 닫을 수 있습니다`}
        </button>
      </div>
    </div>
  );
}
