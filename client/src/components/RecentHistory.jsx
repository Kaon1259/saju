import { useEffect, useState, useCallback } from 'react';
import { listHistory, deleteHistory } from '../api/fortune';
import './RecentHistory.css';

const TYPE_ICON = {
  tarot: '🔮',
  today_fortune: '☀️',
  love_11: '💕',
  compatibility: '💑',
  my_love_compat: '💗',
  partner_fortune: '👫',
  other_fortune: '👤',
};

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `오늘 ${hh}:${mm}`;
    }
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch {
    return '';
  }
}

/**
 * 최근 본 운세/타로 목록.
 * - type: 'tarot' / 'today_fortune' / 'love_11' / 'compatibility' / ...
 * - onOpen(item): 항목 탭 시 호출 (상세 재현은 페이지 쪽에서 처리)
 * - title: 섹션 제목 (기본 "최근 본 운세")
 * - emptyText: 아직 기록 없을 때 노출할 안내 (없으면 섹션 자체 숨김)
 * - limit: 표시 개수 (기본 5)
 */
function RecentHistory({ type, onOpen, title = '최근 본 기록', emptyText, limit = 5, hideTitle = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listHistory(type, limit)
      .then(rs => setItems(Array.isArray(rs) ? rs : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('이 기록을 삭제할까요?')) return;
    try { await deleteHistory(id); } catch {}
    setItems(prev => prev.filter(x => x.id !== id));
  };

  if (loading) return null; // 짧은 조회이므로 로딩 중엔 섹션 숨김
  if (items.length === 0) {
    if (!emptyText) return null;
    return (
      <div className="recent-history glass-card">
        {!hideTitle && <h3 className="recent-history-title">{title}</h3>}
        <p className="recent-history-empty">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="recent-history glass-card">
      {!hideTitle && <h3 className="recent-history-title">{title}</h3>}
      <ul className="recent-history-list">
        {items.map(item => (
          <li key={item.id} className="recent-history-item" onClick={() => onOpen?.(item)}>
            <span className="recent-history-icon">{TYPE_ICON[item.type] || '✨'}</span>
            <div className="recent-history-body">
              <div className="recent-history-head">
                <span className="recent-history-title-row">{item.title}</span>
                <span className="recent-history-date">{formatDate(item.createdAt)}</span>
              </div>
              {item.summary && (
                <p className="recent-history-summary">{item.summary}</p>
              )}
            </div>
            <button
              className="recent-history-del"
              onClick={(e) => handleDelete(e, item.id)}
              aria-label="삭제">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentHistory;
