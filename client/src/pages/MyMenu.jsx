import { useNavigate } from 'react-router-dom';
import './MyMenu.css';

function MyMenu() {
  const navigate = useNavigate();
  return (
    <div className="mymenu">
      {/* Header */}
      <section className="mymenu-hero">
        <span className="mymenu-hero-icon">💗</span>
        <h1 className="mymenu-hero-title">하트 충전</h1>
        <p className="mymenu-hero-desc">하트를 충전하고 다양한 운세를 즐겨보세요</p>
      </section>

      {/* 메뉴 카드 */}
      <section className="mymenu-cards">
        <button className="mymenu-card mymenu-card--attendance" onClick={() => navigate('/attendance')}>
          <span className="mymenu-card-icon">📆</span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">출석부</span>
            <span className="mymenu-card-sub">매일 출석하고 하트 보너스 받기</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
      </section>
    </div>
  );
}

export default MyMenu;
