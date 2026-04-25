import { useNavigate } from 'react-router-dom';
import './MySolo.css';

// 완전 솔로 대상 — 아직 관심 대상 없거나 인연을 찾는 중.
// 썸/짝사랑 4개는 /my-some-crush, 재회/재혼/회복/연락은 /again-meet 으로 이동.
const SOLO_MENUS = [
  { id: 'love_fortune',   icon: '💕',       label: '1:1연애운', sub: '오늘 연애 기운은?',      desc: '솔로를 위한 오늘의 연애 에너지',      path: '/love-fortune' },
  { id: 'ideal_type',     icon: '👩‍❤️‍👨', label: '이상형',    sub: '사주로 보는 나의 이상형', desc: '나와 잘 맞는 이상형 스타일 분석',     path: '/love/ideal_type' },
  { id: 'meeting_timing', icon: '🔮',       label: '만남시기',  sub: '언제 인연을 만날까?',     desc: '내게 다가올 인연의 시기 예측',        path: '/love/meeting_timing' },
  { id: 'blind_date',     icon: '🤝',       label: '소개팅',    sub: '새로운 인연이 올까요?',   desc: '소개팅 성공 가능성과 궁합',           path: '/love/blind_date' },
  { id: 'past_life',      icon: '🌌',       label: '전생인연',  sub: '전생에 어떤 사이였을까?', desc: '전생에서부터 이어지는 운명의 인연',   path: '/love/past_life' },
  { id: 'marriage',       icon: '💒',       label: '결혼운',    sub: '결혼 시기와 인연',        desc: '내 결혼 시점과 배우자 궁합 예측',     path: '/love/marriage' },
];

function MySolo() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('userId');

  return (
    <div className="mysolo-page">
      <button className="mysolo-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>

      {/* 히어로 */}
      <section className="mysolo-hero">
        <div className="mysolo-hero-sparkles">
          {[...Array(10)].map((_, i) => <span key={i} style={{ '--ms-i': i }}>✦</span>)}
        </div>
        <div className="mysolo-hero-icons">
          <span className="mysolo-hero-star">✨</span>
          <span className="mysolo-hero-face">🙋</span>
        </div>
        <h1 className="mysolo-hero-title">나는 솔로</h1>
        <p className="mysolo-hero-sub">연애운·이상형·만남시기·결혼운까지, 솔로를 위한 맞춤 운세</p>
      </section>

      {!isLoggedIn && (
        <section className="mysolo-login-cta">
          <button className="mysolo-login-btn" onClick={() => navigate('/register', { state: { from: '/my-solo' } })}>
            💕 로그인하고 맞춤 솔로 운세 받기
          </button>
        </section>
      )}

      {/* 메뉴 그리드 */}
      <section className="mysolo-menus">
        {SOLO_MENUS.map((item, idx) => (
          <button
            key={item.id}
            className="mysolo-menu-card"
            onClick={() => navigate(item.path)}
            style={{ '--card-idx': idx }}
          >
            <div className="mysolo-menu-icon-wrap">
              <span className="mysolo-menu-icon">{item.icon}</span>
            </div>
            <div className="mysolo-menu-text">
              <span className="mysolo-menu-label">{item.label}</span>
              <span className="mysolo-menu-sub">{item.sub}</span>
              <span className="mysolo-menu-desc">{item.desc}</span>
            </div>
            <span className="mysolo-menu-arrow">›</span>
          </button>
        ))}
      </section>

      <section className="mysolo-footer">
        <p className="mysolo-footer-text">
          💡 <strong>솔로 탈출</strong>의 첫걸음, 사주가 알려주는 인연의 방향
        </p>
      </section>
    </div>
  );
}

export default MySolo;
