import { useState } from 'react';
import RecentHistory from './RecentHistory';
import MenuIcon from './MenuIcon';
import './HistoryDrawer.css';

// 호출처에서 label에 박은 📚 이모지를 제거 (SVG로 대체)
const stripLeadingEmoji = (s) => (typeof s === 'string' ? s.replace(/^[\s\u{1F4DA}\u{2728}\u{1F4D6}]+/u, '').trimStart() : s);

/**
 * 하단 pull-up 히스토리 drawer (Tarot 덱 선택 패턴 공용화).
 * - 하단 탭바 바로 위 50px 핸들 상시 노출
 * - 탭하면 48vh 슬라이드 업 → RecentHistory 리스트 노출
 * - 항목 탭 시 onOpen 호출 + drawer 자동 닫힘
 */
function HistoryDrawer({ type, subType, label = '최근 본 기록', onOpen, limit = 5 }) {
  const [open, setOpen] = useState(false);
  const cleanLabel = stripLeadingEmoji(label);

  return (
    <div className={`history-drawer ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="history-drawer-handle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${cleanLabel} 토글`}>
        <span className="history-drawer-grip" aria-hidden="true" />
        <span className="history-drawer-label">
          <MenuIcon name="book" size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {cleanLabel}
        </span>
        <span className={`history-drawer-chev ${open ? 'open' : ''}`} aria-hidden="true">▲</span>
      </button>
      <div className="history-drawer-content">
        <RecentHistory
          type={type}
          subType={subType}
          hideTitle
          limit={limit}
          onOpen={(item) => {
            setOpen(false);
            onOpen?.(item);
          }}
        />
      </div>
    </div>
  );
}

export default HistoryDrawer;
