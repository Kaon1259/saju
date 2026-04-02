import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './FloatingMenu.css';

function FloatingMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const userId = localStorage.getItem('userId');
  const menuRef = useRef(null);

  // 저장된 위치: { side: 'left'|'right', y: 숫자(px) }
  const [snapPos, setSnapPos] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('floatingMenuPos'));
      if (s && s.side) return s;
    } catch {}
    return { side: 'right', y: -1 };
  });

  // 드래그 중 실시간 위치 (null = 드래그 아님)
  const [dragPos, setDragPos] = useState(null);
  const drag = useRef({ active: false, moved: false, ox: 0, oy: 0, offX: 0, offY: 0, elW: 0, elH: 0 });

  const startDrag = useCallback((cx, cy) => {
    const el = menuRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { active: true, moved: false, ox: cx, oy: cy, offX: cx - r.left, offY: cy - r.top, elW: r.width, elH: r.height };
  }, []);

  const moveDrag = useCallback((cx, cy) => {
    const d = drag.current;
    if (!d.active) return;
    if (!d.moved && (Math.abs(cx - d.ox) > 4 || Math.abs(cy - d.oy) > 4)) d.moved = true;
    if (!d.moved) return;
    setDragPos({
      left: Math.max(0, Math.min(window.innerWidth - d.elW, cx - d.offX)),
      top: Math.max(50, Math.min(window.innerHeight - d.elH - 60, cy - d.offY)),
    });
  }, []);

  const endDrag = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.moved) {
      setDragPos(prev => {
        if (!prev) return null;
        const centerX = prev.left + d.elW / 2;
        const side = centerX < window.innerWidth / 2 ? 'left' : 'right';
        const y = prev.top + d.elH / 2;
        const snap = { side, y };
        setSnapPos(snap);
        localStorage.setItem('floatingMenuPos', JSON.stringify(snap));
        return null;
      });
      setTimeout(() => { drag.current.moved = false; }, 60);
    } else {
      setDragPos(null);
    }
  }, []);

  useEffect(() => {
    const tm = (e) => { if (drag.current.active) { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); } };
    const te = () => endDrag();
    const mm = (e) => moveDrag(e.clientX, e.clientY);
    const mu = () => endDrag();
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('touchend', te);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, [moveDrag, endDrag]);

  if (!userId) return null;

  const path = location.pathname;
  const items = [
    path !== '/my' && { id: 'fortune', icon: '🔮', label: '오늘운세', path: '/my', state: { autoLoad: true } },
    path !== '/' && { id: 'love', icon: '💕', label: '연애운', path: '/', state: { openLove: 'relationship' } },
    path !== '/compatibility' && { id: 'compat', icon: '💑', label: '궁합', path: '/compatibility' },
  ].filter(Boolean);

  if (items.length === 0) return null;

  const isDragging = dragPos !== null;
  const isLeft = isDragging
    ? (dragPos.left + (drag.current.elW || 80) / 2) < window.innerWidth / 2
    : snapPos.side === 'left';

  let style;
  if (isDragging) {
    style = { left: dragPos.left, top: dragPos.top, right: 'auto', transform: 'none', transition: 'none' };
  } else if (snapPos.side === 'left') {
    style = { left: 8, right: 'auto', top: snapPos.y > 0 ? snapPos.y : '50%', transform: 'translateY(-50%)', transition: 'all 0.3s ease' };
  } else {
    style = { right: 8, left: 'auto', top: snapPos.y > 0 ? snapPos.y : '50%', transform: 'translateY(-50%)', transition: 'all 0.3s ease' };
  }

  const handleClick = (fn) => (e) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); return; }
    fn();
  };

  return (
    <div
      ref={menuRef}
      className={`floating-menu ${collapsed ? 'collapsed' : ''} ${isLeft ? 'floating-menu--left' : ''} ${isDragging ? 'floating-menu--dragging' : ''}`}
      style={style}
    >
      <button
        className="floating-toggle"
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
        onClick={handleClick(() => setCollapsed(!collapsed))}
      >
        {collapsed
          ? <><span className="floating-toggle-icon">💕</span><span className="floating-toggle-text">메뉴</span></>
          : <><span className="floating-toggle-icon">💕</span><span className="floating-toggle-text">감추기</span></>
        }
      </button>
      {!collapsed && items.map((item) => (
        <button key={item.id} className="floating-btn floating--love"
          onClick={handleClick(() => navigate(item.path, { state: item.state }))}>
          <span className="floating-icon">{item.icon}</span>
          <span className="floating-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default FloatingMenu;
