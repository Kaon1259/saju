import { useNavigate } from 'react-router-dom';
import './TraditionalSaju.css';

const MAIN_MENUS = [
  { id: 'saju', path: '/saju', icon: '☯️', label: '사주분석', desc: '사주팔자 평생 분석', color: '#E879F9', cost: 5 },
  { id: 'compat', path: '/compatibility', icon: '💑', label: '사주궁합', desc: '나와 상대 궁합 분석', color: '#EC4899', cost: 5 },
  { id: 'tojeong', path: '/tojeong', icon: '📜', label: '토정비결', desc: '월별 운세 풀이', color: '#F472B6', cost: 5 },
  { id: 'manseryeok', path: '/manseryeok', icon: '📅', label: '만세력', desc: '천간 지지 조회', color: '#FBBF24', cost: 5 },
  { id: 'face', path: '/face-reading', icon: '👤', label: 'AI 관상', desc: '얼굴로 보는 운세', color: '#DAA520', cost: 5 },
  { id: 'bio', path: '/biorhythm', icon: '📊', label: '바이오리듬', desc: '오늘의 컨디션 체크', color: '#2196F3', cost: 5 },
  { id: 'star', path: '/constellation', icon: '⭐', label: '별자리 운세', desc: '12궁 별자리 운세', color: '#FF9800', cost: 1 },
  { id: 'dream', path: '/dream', icon: '🌙', label: '꿈해몽', desc: 'AI 꿈 해석', color: '#6C3483', cost: 5 },
];

const TIME_MENUS = [
  { id: 'year', path: '/year-fortune', icon: '🎊', label: '신년 운세', desc: '올해의 운세', color: '#E74C3C', cost: 5 },
  { id: 'monthly', path: '/monthly-fortune', icon: '📅', label: '월별 운세', desc: '12개월 분석', color: '#3498DB', cost: 5 },
  { id: 'weekly', path: '/weekly-fortune', icon: '📆', label: '주간 운세', desc: '이번 주 7일', color: '#27AE60', cost: 5 },
  { id: 'time', path: '/special?tab=time&mode=timeblock', icon: '🌅', label: '시간별 운세', desc: '시간대별 분석', color: '#9B59B6', cost: 5 },
];

const TYPE_MENUS = [
  { id: 'psych', path: '/psych-test', icon: '🎭', label: '심리테스트', desc: '내 마음속 연애 유형', color: '#EC4899', cost: 5 },
  { id: 'mbti', path: '/mbti', icon: '🧬', label: 'MBTI 운세', desc: 'MBTI로 보는 연애 궁합', color: '#4DD0E1', cost: 3 },
  { id: 'blood', path: '/bloodtype', icon: '🩸', label: '혈액형 운세', desc: '혈액형별 연애 스타일', color: '#E74C3C', cost: 3 },
];

function TraditionalSaju() {
  const navigate = useNavigate();

  return (
    <div className="traditional-saju">
      <section className="ts-hero">
        <div className="ts-hero-icon">☯️</div>
        <h1 className="ts-title">정통사주</h1>
        <p className="ts-subtitle">전통 사주명리학 기반 운세 분석</p>
      </section>

      <section className="ts-section">
        <h2 className="ts-section-title">사주 분석</h2>
        <div className="ts-menu-grid">
          {MAIN_MENUS.map((item) => (
            <button key={item.path} className="ts-menu-card" onClick={() => navigate(item.path)} style={{ '--ts-color': item.color }}>
              {item.cost && <span className="ts-cost-badge">💗{item.cost}</span>}
              <span className={`ts-menu-icon ts-anim--${item.id}`}>{item.icon}</span>
              <div className="ts-menu-info">
                <span className="ts-menu-label">{item.label}</span>
                <span className="ts-menu-desc">{item.desc}</span>
              </div>
              <span className="ts-menu-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ts-section">
        <h2 className="ts-section-title">운세 캘린더</h2>
        <div className="ts-menu-grid">
          {TIME_MENUS.map((item) => (
            <button key={item.path} className="ts-menu-card" onClick={() => navigate(item.path)} style={{ '--ts-color': item.color }}>
              {item.cost && <span className="ts-cost-badge">💗{item.cost}</span>}
              <span className={`ts-menu-icon ts-anim--${item.id}`}>{item.icon}</span>
              <div className="ts-menu-info">
                <span className="ts-menu-label">{item.label}</span>
                <span className="ts-menu-desc">{item.desc}</span>
              </div>
              <span className="ts-menu-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ts-section">
        <h2 className="ts-section-title">성격 · 유형 분석</h2>
        <div className="ts-menu-grid">
          {TYPE_MENUS.map((item) => (
            <button key={item.path} className="ts-menu-card" onClick={() => navigate(item.path)} style={{ '--ts-color': item.color }}>
              {item.cost && <span className="ts-cost-badge">💗{item.cost}</span>}
              <span className={`ts-menu-icon ts-anim--${item.id}`}>{item.icon}</span>
              <div className="ts-menu-info">
                <span className="ts-menu-label">{item.label}</span>
                <span className="ts-menu-desc">{item.desc}</span>
              </div>
              <span className="ts-menu-arrow">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default TraditionalSaju;
