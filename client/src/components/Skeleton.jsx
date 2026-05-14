import './Skeleton.css';

/**
 * 공용 스켈레톤 — shimmer 애니메이션 박스.
 * variant: line(텍스트 한 줄) / box(직사각) / circle(원형) / pill(라운드 캡슐)
 */
export function Skeleton({ variant = 'line', width, height, radius, className = '', style = {} }) {
  const mergedStyle = { ...style };
  if (width != null) mergedStyle.width = typeof width === 'number' ? `${width}px` : width;
  if (height != null) mergedStyle.height = typeof height === 'number' ? `${height}px` : height;
  if (radius != null) mergedStyle.borderRadius = typeof radius === 'number' ? `${radius}px` : radius;
  return <span className={`sk sk--${variant} ${className}`} style={mergedStyle} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, lastWidth = '64%', gap = 8, lineHeight = 12 }) {
  const items = Array.from({ length: lines });
  return (
    <div className="sk-text" style={{ gap: `${gap}px` }} aria-hidden="true">
      {items.map((_, i) => {
        const isLast = i === items.length - 1;
        const w = isLast ? lastWidth : `${88 - i * 4}%`;
        return <Skeleton key={i} variant="line" width={w} height={lineHeight} />;
      })}
    </div>
  );
}

export function SkeletonCard({ titleWidth = '38%', lines = 3, iconSize = 22 }) {
  return (
    <div className="sk-card glass-card" aria-hidden="true">
      <div className="sk-card-header">
        <Skeleton variant="circle" width={iconSize} height={iconSize} />
        <Skeleton variant="line" width={titleWidth} height={14} />
      </div>
      <SkeletonText lines={lines} />
    </div>
  );
}

export function SkeletonScore({ label = '오늘의 운세' }) {
  return (
    <div className="sk-score glass-card" aria-hidden="true">
      <div className="sk-score-label">{label}</div>
      <Skeleton variant="circle" width={120} height={120} className="sk-score-orb" />
      <Skeleton variant="line" width="46%" height={14} className="sk-score-sub" />
    </div>
  );
}

/**
 * 운세 페이지 표준 스켈레톤 — 점수 카드 + 본문 카드 N개.
 * 캐시 체크 / AI 진입 직전 빈 화면 자리를 채워서 layout shift 방지.
 */
export default function FortuneSkeleton({ scoreLabel = '운세 점수', cards = 3 }) {
  return (
    <div className="sk-page" aria-busy="true" aria-label="운세 불러오는 중">
      <SkeletonScore label={scoreLabel} />
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} titleWidth={`${42 - i * 4}%`} lines={3 - (i % 2 === 0 ? 0 : 1)} />
      ))}
    </div>
  );
}
