import { useApp } from '../context/AppContext';
import './HeartCost.css';

export default function HeartCost({ category }) {
  const { getHeartCost } = useApp();
  const cost = getHeartCost(category);
  if (!cost || cost <= 0) return null;
  return (
    <span className="heart-cost-badge">
      <span className="heart-cost-icon">💗</span>
      <span className="heart-cost-num">{cost}</span>
    </span>
  );
}
