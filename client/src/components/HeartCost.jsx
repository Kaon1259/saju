import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useHearts } from '../context/HeartContext';
import './HeartCost.css';

export default function HeartCost({ category }) {
  const { getHeartCost, isGuest } = useApp();
  const { heartPoints } = useHearts();
  const cost = getHeartCost(category);
  if (!cost || cost <= 0) return null;
  // Guest는 항상 로그인 필요 표시
  if (isGuest) {
    return (
      <span className="heart-cost-badge heart-cost-badge--login">
        <span className="heart-cost-icon">🔒</span>
        <span className="heart-cost-num">로그인</span>
      </span>
    );
  }
  const sufficient = heartPoints == null || heartPoints >= cost;
  return (
    <span className={`heart-cost-badge ${sufficient ? '' : 'heart-cost-badge--low'}`}>
      <span className="heart-cost-icon">💗</span>
      <span className="heart-cost-num">{cost}</span>
    </span>
  );
}

/**
 * 하트 가드 훅 — 분석 버튼에서 사용
 * Guest → 로그인 페이지, 하트 부족 → 충전 페이지, 정상 → action 실행
 */
export function useHeartGuard(category) {
  const { getHeartCost, isGuest } = useApp();
  const { heartPoints } = useHearts();
  const navigate = useNavigate();
  const cost = getHeartCost(category);
  const canAfford = !isGuest && (heartPoints == null || heartPoints >= cost);

  const guardedAction = useCallback((action) => {
    if (isGuest) {
      navigate('/register', { state: { from: window.location.pathname } });
      return;
    }
    if (canAfford) {
      action();
    } else {
      navigate('/my-menu');
    }
  }, [isGuest, canAfford, navigate]);

  return { canAfford, isGuest, cost, guardedAction };
}
