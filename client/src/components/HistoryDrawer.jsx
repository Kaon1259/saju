import { useState } from 'react';
import RecentHistory from './RecentHistory';
import './HistoryDrawer.css';

/**
 * 하단 pull-up 히스토리 drawer (Tarot 덱 선택 패턴 공용화).
 * - 하단 탭바 바로 위 50px 핸들 상시 노출
 * - 탭하면 48vh 슬라이드 업 → RecentHistory 리스트 노출
 * - 항목 탭 시 onOpen 호출 + drawer 자동 닫힘
 */
function HistoryDrawer({ type, label = '📚 최근 본 기록', onOpen, limit = 5 }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`history-drawer ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="history-drawer-handle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${label} 토글`}>
        <span className="history-drawer-grip" aria-hidden="true" />
        <span className="history-drawer-label">{label}</span>
        <span className={`history-drawer-chev ${open ? 'open' : ''}`} aria-hidden="true">▲</span>
      </button>
      <div className="history-drawer-content">
        <RecentHistory
          type={type}
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
