import { useNavigate } from 'react-router-dom';
import MenuIcon from '../components/MenuIcon';
import './MyMenu.css';

function MyMenu() {
  const navigate = useNavigate();
  return (
    <div className="mymenu">
      {/* Header */}
      <section className="mymenu-hero">
        <span className="mymenu-hero-icon"><MenuIcon name="heart" size={36} /></span>
        <h1 className="mymenu-hero-title">하트 충전</h1>
        <p className="mymenu-hero-desc">하트를 충전하고 다양한 운세를 즐겨보세요</p>
      </section>

      {/* 메뉴 카드 */}
      <section className="mymenu-cards">
        <button className="mymenu-card mymenu-card--attendance" onClick={() => navigate('/attendance')}>
          <span className="mymenu-card-icon"><MenuIcon name="attendance" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">출석부</span>
            <span className="mymenu-card-sub">매일 출석하고 하트 보너스 받기</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
        <button className="mymenu-card mymenu-card--invite" onClick={() => navigate('/invite')}>
          <span className="mymenu-card-icon"><MenuIcon name="handshake" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">친구 초대</span>
            <span className="mymenu-card-sub">친구가 가입하면 둘 다 +30 하트</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
        <button className="mymenu-card mymenu-card--rating" onClick={() => navigate('/rating')}>
          <span className="mymenu-card-icon"><MenuIcon name="star" size={24} /></span>
          <div className="mymenu-card-body">
            <span className="mymenu-card-title">5점 평가</span>
            <span className="mymenu-card-sub">Play Store 후기 1회 +50 하트</span>
          </div>
          <span className="mymenu-card-arrow">›</span>
        </button>
      </section>
    </div>
  );
}

export default MyMenu;
