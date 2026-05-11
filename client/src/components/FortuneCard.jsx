import { useEffect, useRef, useState } from 'react';
import MenuIcon from './MenuIcon';
import './FortuneCard.css';

const categoryColors = {
  '총운': 'var(--color-primary-light)',
  '애정운': 'var(--color-love)',
  '재물운': 'var(--color-money)',
  '건강운': 'var(--color-health)',
  '직장운': 'var(--color-work)',
};

// 카테고리 라벨 → MenuIcon 키 자동 매핑 (이모지 대신 흰색 외곽선 SVG로 통일)
const TITLE_TO_ICON_KEY = {
  // ─── 기본 5운 ───
  '총운': 'overall',
  '애정운': 'love',
  '연애운': 'love',
  '재물운': 'money',
  '건강운': 'health',
  '직장운': 'work',
  '활동운': 'work',
  // ─── 학업·자기계발 ───
  '학업운': 'academic',
  '학업·자기계발운': 'academic',
  '자기계발운': 'academic',
  // ─── 대인관계 ───
  '대인관계운': 'handshake',
  // ─── 시기/조언/주의 ───
  '최적 시기': 'clock',
  '인연 만날 시기': 'clock',
  '조언': 'sparkle',
  '행동 조언': 'sparkle',
  '오늘의 조언': 'sparkle',
  '이번 주 조언': 'sparkle',
  '오늘의 행동 조언': 'sparkle',
  '주의사항': 'bell',
  '주의할 점': 'bell',
  // ─── 분석/심화 ───
  '심화 분석': 'search',
  '종합 분석': 'sparkleHeart',
  '성격분석': 'user',
  '성격 분석': 'user',
  // ─── 이상형 7카드 ───
  '이상형 외모/분위기': 'sparkle',
  '이상형 성격/가치관': 'gem',
  '잘 맞는 띠 TOP3': 'paw',
  '잘 맞는 MBTI': 'dna',
  '나와 궁합 좋은 연예인': 'star',
  '만남 장소 추천': 'pin',
  // ─── 멘탈/기타 ───
  '오늘의 멘탈 부스터': 'spark',
  '멘탈 부스터': 'spark',
};

function FortuneCard({ icon, iconKey, title, description, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const accentColor = categoryColors[title] || 'var(--color-primary-light)';
  const resolvedIconKey = iconKey || TITLE_TO_ICON_KEY[title];

  return (
    <div
      ref={cardRef}
      className={`fortune-card glass-card ${isVisible ? 'fortune-card--visible' : ''}`}
      style={{ '--accent': accentColor, '--delay': `${delay}ms` }}
    >
      <div className="fortune-card__header">
        <span className={`fortune-card__icon${resolvedIconKey ? ' fortune-card__icon--svg' : ''}`} style={resolvedIconKey ? { color: accentColor } : undefined}>
          {resolvedIconKey ? <MenuIcon name={resolvedIconKey} size={22} /> : icon}
        </span>
        <h3 className="fortune-card__title" style={{ color: accentColor }}>{title}</h3>
      </div>
      <p className="fortune-card__desc">{description}</p>
      <div className="fortune-card__accent-line" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
    </div>
  );
}

export default FortuneCard;
