import { useNavigate } from 'react-router-dom';
import './MyAgainMeet.css';

// "다시 만날까?" — 옛 인연 / 이별 후 마음 정리에 관한 4개 묶음 메뉴
const AGAIN_MENUS = [
  { id: 'reunion',         icon: '💔', label: '재회운',      sub: '다시 만날 수 있을까?',     desc: '헤어진 인연과의 재회 가능성과 시기',     path: '/love/reunion' },
  { id: 'remarriage',      icon: '💍', label: '재혼운',      sub: '새로운 결혼의 가능성',     desc: '이혼 후 맞을 재혼 시기와 인연 분석',     path: '/love/remarriage' },
  { id: 'recovery',        icon: '🕯️', label: '이별 회복운', sub: '언제쯤 마음이 정리될까?',  desc: '회복 시기·자존감 회복 루틴 사주 분석',   path: '/love/recovery' },
  { id: 'contact_fortune', icon: '📞', label: '연락 타이밍', sub: '먼저 연락해도 될까?',      desc: '오늘 일진으로 보는 연락 길흉 시간대',    path: '/love/contact_fortune' },
];

function MyAgainMeet() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('userId');

  return (
    <div className="myagain-page">
      <button className="myagain-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>

      {/* 히어로 */}
      <section className="myagain-hero">
        <div className="myagain-hero-sparkles">
          {[...Array(10)].map((_, i) => <span key={i} style={{ '--ma-i': i }}>✦</span>)}
        </div>
        <div className="myagain-hero-icons">
          <span className="myagain-hero-moon">🌙</span>
          <span className="myagain-hero-heart">💔</span>
        </div>
        <h1 className="myagain-hero-title">다시 만날까?</h1>
        <p className="myagain-hero-sub">옛 인연·재회·회복까지, 마음 정리에 필요한 운세</p>
      </section>

      {!isLoggedIn && (
        <section className="myagain-login-cta">
          <button className="myagain-login-btn" onClick={() => navigate('/register', { state: { from: '/again-meet' } })}>
            🕯️ 로그인하고 맞춤 분석 받기
          </button>
        </section>
      )}

      {/* 메뉴 그리드 */}
      <section className="myagain-menus">
        {AGAIN_MENUS.map((item, idx) => (
          <button
            key={item.id}
            className="myagain-menu-card"
            onClick={() => navigate(item.path)}
            style={{ '--card-idx': idx }}
          >
            <div className="myagain-menu-icon-wrap">
              <span className="myagain-menu-icon">{item.icon}</span>
            </div>
            <div className="myagain-menu-text">
              <span className="myagain-menu-label">{item.label}</span>
              <span className="myagain-menu-sub">{item.sub}</span>
              <span className="myagain-menu-desc">{item.desc}</span>
            </div>
            <span className="myagain-menu-arrow">›</span>
          </button>
        ))}
      </section>

      <section className="myagain-footer">
        <p className="myagain-footer-text">
          🌙 다시 만날지, 놓아줄지 — <strong>사주가 알려주는 마음의 방향</strong>
        </p>
      </section>
    </div>
  );
}

export default MyAgainMeet;
