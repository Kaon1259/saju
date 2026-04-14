import './StarHero.css';

function StarHero({ icon = '⭐', title, desc, color = '#FF9800', particles = ['⭐','✨','💫','🌟','✦'] }) {
  const style = { '--sh-color': color };
  return (
    <div className="star-hero" style={style}>
      <div className="star-hero-bg" />
      <div className="star-hero-particles">
        {particles.map((p, i) => (
          <span key={i} className="star-hero-particle" style={{ '--p-i': i }}>{p}</span>
        ))}
      </div>
      <div className="star-hero-iconwrap">
        <div className="star-hero-aura" />
        <div className="star-hero-aura star-hero-aura--2" />
        <span className="star-hero-icon">{icon}</span>
      </div>
      <h1 className="star-hero-title">{title}</h1>
      {desc && <p className="star-hero-desc">{desc}</p>}
    </div>
  );
}

export default StarHero;
