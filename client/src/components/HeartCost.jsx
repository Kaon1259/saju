import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useHearts } from '../context/HeartContext';
import './HeartCost.css';

export default function HeartCost({ category }) {
  const { getHeartCost } = useApp();
  const { heartPoints } = useHearts();
  const cost = getHeartCost(category);
  if (!cost || cost <= 0) return null;
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
 * @param {string} category 하트 비용 카테고리
 * @returns {{ canAfford: boolean, cost: number, guardedAction: (action) => void, ChargeButton: JSX }}
 */
export function useHeartGuard(category) {
  const { getHeartCost } = useApp();
  const { heartPoints } = useHearts();
  const navigate = useNavigate();
  const cost = getHeartCost(category);
  const canAfford = heartPoints == null || heartPoints >= cost;

  const guardedAction = useCallback((action) => {
    if (canAfford) {
      action();
    } else {
      navigate('/my-menu');
    }
  }, [canAfford, navigate]);

  return { canAfford, cost, guardedAction };
}
