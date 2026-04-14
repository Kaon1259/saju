import './MyMenu.css';

function MyMenu() {
  return (
    <div className="mymenu">
      {/* Header */}
      <section className="mymenu-hero">
        <span className="mymenu-hero-icon">💗</span>
        <h1 className="mymenu-hero-title">하트 충전</h1>
        <p className="mymenu-hero-desc">하트를 충전하고 다양한 운세를 즐겨보세요</p>
      </section>
    </div>
  );
}

export default MyMenu;
