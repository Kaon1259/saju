import { useEffect, useRef, useState } from 'react';
import './FortuneCard.css';

const categoryColors = {
  '총운': 'var(--color-primary-light)',
  '애정운': 'var(--color-love)',
  '재물운': 'var(--color-money)',
  '건강운': 'var(--color-health)',
  '직장운': 'var(--color-work)',
};

function FortuneCard({ icon, title, description, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const accentColor = categoryColors[title] || 'var(--color-primary-light)';

  return (
    <div
      ref={cardRef}
      className={`fortune-card glass-card ${isVisible ? 'fortune-card--visible' : ''}`}
      style={{ '--accent': accentColor, '--delay': `${delay}ms` }}
    >
      <div className="fortune-card__header">
        <span className="fortune-card__icon">{icon}</span>
        <h3 className="fortune-card__title" style={{ color: accentColor }}>{title}</h3>
      </div>
      <p className="fortune-card__desc">{description}</p>
      <div className="fortune-card__accent-line" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
    </div>
  );
}

export default FortuneCard;
