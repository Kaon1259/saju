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
