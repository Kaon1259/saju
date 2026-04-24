import { useNavigate } from 'react-router-dom';
import './MySomeCrush.css';

const SOME_CRUSH_MENUS = [
  { id: 'some_check',        icon: '🎯', label: '썸진단',     sub: '누가 먼저 끌리나요?',         desc: '이 썸, 연애로 발전할까?',          path: '/love/some_check' },
  { id: 'crush',             icon: '💘', label: '짝사랑',     sub: '내 마음이 이루어질까?',       desc: '짝사랑 상대 마음과 인연 가능성',   path: '/love/crush' },
  { id: 'confession_timing', icon: '💌', label: '고백타이밍', sub: '언제 마음을 전할까?',         desc: '고백 성공 확률 높은 타이밍 분석',  path: '/love/confession_timing' },
  { id: 'contact_fortune',   icon: '📱', label: '연락운',     sub: '먼저 연락해도 될까?',         desc: '연락할 타이밍과 상대의 반응 예측', path: '/love/contact_fortune' },
];

function MySomeCrush() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('userId');

  return (
    <div className="mysome-page">
      <button className="mysome-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>

      {/* 히어로 */}
      <section className="mysome-hero">
        <div className="mysome-hero-sparkles">
          {[...Array(10)].map((_, i) => <span key={i} style={{ '--msc-i': i }}>✦</span>)}
        </div>
        <div className="mysome-hero-icons">
          <span className="mysome-hero-heart">💘</span>
          <span className="mysome-hero-q">?</span>
        </div>
        <h1 className="mysome-hero-title">나의 썸·짝사랑</h1>
        <p className="mysome-hero-sub">좋아하는 사람과 이 관계, 발전할 수 있을까요?</p>
      </section>

      {!isLoggedIn && (
        <section className="mysome-login-cta">
          <button className="mysome-login-btn" onClick={() => navigate('/register', { state: { from: '/my-some-crush' } })}>
            💕 로그인하고 맞춤 썸 분석 받기
          </button>
        </section>
      )}

      {/* 메뉴 카드 */}
      <section className="mysome-menus">
        {SOME_CRUSH_MENUS.map((item, idx) => (
          <button
            key={item.id}
            className="mysome-menu-card"
            onClick={() => navigate(item.path)}
            style={{ '--card-idx': idx }}
          >
            <div className="mysome-menu-icon-wrap">
              <span className="mysome-menu-icon">{item.icon}</span>
            </div>
            <div className="mysome-menu-text">
              <span className="mysome-menu-label">{item.label}</span>
              <span className="mysome-menu-sub">{item.sub}</span>
              <span className="mysome-menu-desc">{item.desc}</span>
            </div>
            <span className="mysome-menu-arrow">›</span>
          </button>
        ))}
      </section>

      <section className="mysome-footer">
        <p className="mysome-footer-text">
          💡 <strong>썸에서 연애로</strong>, 사주가 읽어주는 그 사람의 마음
        </p>
      </section>
    </div>
  );
}

export default MySomeCrush;
