import { useNavigate } from 'react-router-dom';
import './TraditionalSaju.css';

const MAIN_MENUS = [
  { path: '/saju', icon: '☯️', label: '사주분석', desc: '사주팔자 평생 분석', color: '#E879F9' },
  { path: '/tojeong', icon: '📜', label: '토정비결', desc: '월별 운세 풀이', color: '#F472B6' },
  { path: '/manseryeok', icon: '📅', label: '만세력', desc: '천간 지지 조회', color: '#FBBF24' },
  { path: '/face-reading', icon: '👤', label: 'AI 관상', desc: '얼굴로 보는 운세', color: '#DAA520' },
  { path: '/biorhythm', icon: '📊', label: '바이오리듬', desc: '오늘의 컨디션 체크', color: '#2196F3' },
];

const TIME_MENUS = [
  { path: '/year-fortune', icon: '🎊', label: '신년 운세', desc: '올해의 운세', color: '#E74C3C' },
  { path: '/monthly-fortune', icon: '📅', label: '월별 운세', desc: '12개월 분석', color: '#3498DB' },
  { path: '/weekly-fortune', icon: '📆', label: '주간 운세', desc: '이번 주 7일', color: '#27AE60' },
  { path: '/special?tab=time&mode=timeblock', icon: '🌅', label: '시간별 운세', desc: '시간대별 분석', color: '#9B59B6' },
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
              <span className="ts-menu-icon">{item.icon}</span>
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
              <span className="ts-menu-icon">{item.icon}</span>
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
