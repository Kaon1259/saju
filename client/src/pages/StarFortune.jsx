import { useNavigate } from 'react-router-dom';
import HeroIconButtons from '../components/HeroIconButtons';
import './StarFortune.css';

const STAR_MENUS = [
  { id: 'my-star', icon: '⭐', label: '나의 스타', desc: '즐겨찾기한 최애 스타 관리', path: '/my-star', color: '#FF9800' },
  { id: 'celeb-compat', icon: '💫', label: '스타와 나의 궁합', desc: '최애와 사주 궁합 분석', path: '/celeb-compatibility', color: '#E91E63' },
  { id: 'celeb-fortune', icon: '🌟', label: '보이그룹·걸그룹 궁합', desc: '좋아하는 그룹과 사주 궁합', path: '/celeb-fortune', color: '#9B59B6' },
  { id: 'celeb-match', icon: '🔮', label: '나와 궁합이 맞는 스타', desc: '사주로 찾는 운명의 스타', path: '/celeb-match', color: '#FF6B6B' },
];

const STAR_PARTICLES = 25;

function StarFortune() {
  const navigate = useNavigate();

  return (
    <div className="star-fortune-page">
      {/* 전체 화면 별 날아오르기 효과 */}
      <div className="star-fortune-flying-stars">
        {Array.from({ length: STAR_PARTICLES }).map((_, i) => (
          <span key={i} className="star-fortune-fly" style={{
            '--sf-x': `${3 + (i * 97 / STAR_PARTICLES) % 94}%`,
            '--sf-delay': `${i * 0.3}s`,
            '--sf-dur': `${2.5 + (i % 5) * 0.7}s`,
            '--sf-size': `${10 + (i % 4) * 5}px`,
            '--sf-drift': `${-15 + (i % 7) * 5}px`,
          }}>{i % 3 === 0 ? '✦' : i % 3 === 1 ? '⭐' : '✧'}</span>
        ))}
      </div>

      <div className="star-fortune-hero" style={{ position: 'relative', paddingLeft: 48, paddingRight: 48 }}>
        <HeroIconButtons color="#FF9800" onBack={() => navigate('/')} />
        <div className="star-fortune-hero-glow" />
        <span className="star-fortune-badge">✨ SPECIAL</span>
        <h1 className="star-fortune-title">나의 스타 운세</h1>
        <p className="star-fortune-desc">좋아하는 스타와 사주로 통하는 운명을 확인해보세요</p>
      </div>

      <div className="star-fortune-list">
        {STAR_MENUS.map((item, idx) => (
          <button key={item.id} className="star-fortune-card" onClick={() => navigate(item.path)} style={{ '--sf-color': item.color, '--card-delay': `${idx * 100}ms` }}>
            <div className={`star-fortune-card-icon sf-anim--${item.id}`}>
              <span>{item.icon}</span>
            </div>
            <div className="star-fortune-card-info">
              <span className="star-fortune-card-label">{item.label}</span>
              <span className="star-fortune-card-desc">{item.desc}</span>
            </div>
            <span className="star-fortune-card-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default StarFortune;
