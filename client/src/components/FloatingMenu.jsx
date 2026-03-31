import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './FloatingMenu.css';

const MENU_ITEMS = [
  { id: 'fortune', icon: '🔮', label: '오늘의 운세', path: '/my', cls: 'floating--fortune', state: { autoLoad: true } },
  { id: 'love-rel', icon: '💕', label: '연애운', path: '/', cls: 'floating--love', state: { openLove: 'relationship' } },
  { id: 'love-reu', icon: '💔', label: '재회운', path: '/', cls: 'floating--love', state: { openLove: 'reunion' } },
  { id: 'love-rem', icon: '💍', label: '재혼운', path: '/', cls: 'floating--love', state: { openLove: 'remarriage' } },
  { id: 'love-bld', icon: '💘', label: '소개팅', path: '/', cls: 'floating--love', state: { openLove: 'blind_date' } },
  { id: 'blood', icon: '🩸', label: '혈액형', path: '/bloodtype', cls: 'floating--blood', state: { autoLoad: true } },
  { id: 'mbti', icon: '🧬', label: 'MBTI', path: '/mbti', cls: 'floating--mbti', state: { autoLoad: true } },
  { id: 'dream', icon: '🌙', label: '꿈해몽', path: '/dream', cls: 'floating--dream' },
];

// 페이지별 표시할 메뉴 ID 목록
const PAGE_MENUS = {
  '/':            ['saju', 'blood', 'mbti', 'dream'],
  '/my':          ['love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti', 'dream'],
  '/saju':        ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti', 'dream'],
  '/tojeong':     ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti', 'dream'],
  '/bloodtype':   ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'mbti', 'dream'],
  '/mbti':        ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'dream'],
  '/dream':       ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti'],
  '/constellation': ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti', 'dream'],
  '/manseryeok':    ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti', 'dream'],
  '/compatibility': ['fortune', 'love-rel', 'love-reu', 'love-rem', 'love-bld', 'blood', 'mbti', 'dream'],
};

// 홈에서만 사주 버튼 표시 (별도 처리)
const SAJU_BTN = { id: 'saju', icon: '☯️', label: '오늘의 사주', path: '/my', cls: 'floating--saju', state: { autoLoad: true } };

function FloatingMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const userId = localStorage.getItem('userId');

  if (!userId) return null;

  const path = location.pathname;
  const menuIds = PAGE_MENUS[path] || ['fortune', 'blood', 'mbti', 'dream'];

  const items = menuIds.map(id => {
    if (id === 'saju') return SAJU_BTN;
    return MENU_ITEMS.find(m => m.id === id);
  }).filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className={`floating-menu ${collapsed ? 'collapsed' : ''}`}>
      <button className="floating-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <><span className="floating-toggle-icon">🔮</span><span className="floating-toggle-text">메뉴</span></> : <><span className="floating-toggle-icon">🔮</span><span className="floating-toggle-text">감추기</span></>}
      </button>
      {!collapsed && items.map((item) => (
        <button key={item.id} className={`floating-btn ${item.cls}`} onClick={() => navigate(item.path, { state: item.state })}>
          <span className="floating-icon">{item.icon}</span>
          <span className="floating-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default FloatingMenu;
