import MenuIcon from './MenuIcon';
import './CelebAvatar.css';

// 카테고리별 시그니처 컬러 + 외곽선 아이콘 (스타 페이지 전역 공용)
export const CATEGORY_COLORS = {
  idol:        { from: '#ec4899', to: '#a855f7', label: '아이돌',     icon: 'star' },
  actor:       { from: '#f59e0b', to: '#ef4444', label: '배우',       icon: 'face' },
  singer:      { from: '#06b6d4', to: '#3b82f6', label: '가수',       icon: 'mic' },
  entertainer: { from: '#10b981', to: '#22d3ee', label: '예능인',     icon: 'chat' },
  athlete:     { from: '#84cc16', to: '#22c55e', label: '운동선수',   icon: 'target' },
  model:       { from: '#d946ef', to: '#ec4899', label: '모델',       icon: 'shirt' },
  influencer:  { from: '#f43f5e', to: '#fb7185', label: '인플루언서', icon: 'camera' },
  trot:        { from: '#fbbf24', to: '#f59e0b', label: '트로트',     icon: 'mic' },
  custom:      { from: '#a855f7', to: '#ec4899', label: '스타',       icon: 'sparkleHeart' },
};

// 그룹 아바타 — 보이/걸 톤 + 사람들 아이콘
const GROUP_COLORS = {
  boy:  { from: '#60a5fa', to: '#3b82f6', icon: 'people' },
  girl: { from: '#f472b6', to: '#ec4899', icon: 'people' },
};

export function catColor(celeb) {
  const k = celeb?.category || 'custom';
  return CATEGORY_COLORS[k] || CATEGORY_COLORS.custom;
}

const ICON_PX = { sm: 19, md: 22, lg: 30 };

/**
 * 스타/그룹 카테고리 외곽선 아이콘 타일 (스타 페이지 전역 공용).
 * 홈 화면 hn-card 아이콘과 동일한 톤 — 외곽선 MenuIcon + 카테고리 컬러.
 * - 개인: category 별 외곽선 아이콘 (가수→마이크, 배우→얼굴 …)
 * - 그룹: groupType('boy'|'girl') 컬러 + 사람들 아이콘
 */
export default function CelebAvatar({ category, groupType, size = 'md', className = '' }) {
  let color, icon;
  if (groupType) {
    const g = GROUP_COLORS[groupType] || GROUP_COLORS.girl;
    color = g.from; icon = g.icon;
  } else {
    const cc = catColor({ category });
    color = cc.from; icon = cc.icon;
  }
  return (
    <span className={`cav cav--${size} ${className}`} style={{ '--cc': color }}>
      <MenuIcon name={icon} size={ICON_PX[size] || 22} />
    </span>
  );
}
