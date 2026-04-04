import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState(localStorage.getItem('fontSize') || 'normal');
  const [autoLogin, setAutoLogin] = useState(localStorage.getItem('autoLogin') !== 'off');
  const [autoFortune, setAutoFortune] = useState(localStorage.getItem('autoFortune') === 'on');
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const [theme, setTheme] = useState(isDark ? 'dark' : 'light');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <div className="settings-page">
      <section className="settings-header animate-fade-in-up">
        <h1 className="settings-title">설정</h1>
      </section>

      {/* 화면 설정 */}
      <section className="settings-section glass-card animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <h3 className="settings-section-title">화면</h3>

        {/* 글자 크기 */}
        <div className="settings-row">
          <span className="settings-label">글자 크기</span>
        </div>
        <div className="settings-fontsize-picker">
          {[
            { key: 'small', label: '작게', sample: '가' },
            { key: 'normal', label: '보통', sample: '가' },
            { key: 'large', label: '크게', sample: '가' },
            { key: 'xlarge', label: '더크게', sample: '가' },
          ].map(opt => (
            <button key={opt.key}
              className={`settings-fontsize-btn ${fontSize === opt.key ? 'settings-fontsize-btn--active' : ''}`}
              onClick={() => {
                setFontSize(opt.key);
                localStorage.setItem('fontSize', opt.key);
                window.dispatchEvent(new Event('fontSizeChange'));
              }}>
              <span className={`settings-fontsize-sample settings-fontsize-sample--${opt.key}`}>{opt.sample}</span>
              <span className="settings-fontsize-label">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-divider" />

        {/* 다크/라이트 모드 */}
        <div className="settings-row">
          <span className="settings-label">{theme === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드'}</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
            <span className="settings-toggle-slider" />
          </label>
        </div>
        <p className="settings-desc">화면 테마를 전환합니다</p>
      </section>

      {/* 계정 설정 */}
      <section className="settings-section glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h3 className="settings-section-title">계정</h3>

        {/* 자동 로그인 */}
        <div className="settings-row">
          <span className="settings-label">자동 로그인</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={autoLogin}
              onChange={(e) => {
                const val = e.target.checked;
                setAutoLogin(val);
                localStorage.setItem('autoLogin', val ? 'on' : 'off');
              }} />
            <span className="settings-toggle-slider" />
          </label>
        </div>
        <p className="settings-desc">앱 시작 시 자동으로 로그인합니다</p>

        <div className="settings-divider" />

        {/* 로그아웃 */}
        <button className="settings-logout-btn" onClick={() => {
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          localStorage.removeItem('userProfile');
          localStorage.setItem('autoLogin', 'off');
          navigate('/register');
        }}>
          로그아웃
        </button>
      </section>

      {/* 운세 설정 */}
      <section className="settings-section glass-card animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <h3 className="settings-section-title">운세</h3>

        <div className="settings-row">
          <span className="settings-label">자동 운세 보기</span>
          <label className="settings-toggle">
            <input type="checkbox" checked={autoFortune}
              onChange={(e) => {
                const val = e.target.checked;
                setAutoFortune(val);
                localStorage.setItem('autoFortune', val ? 'on' : 'off');
                window.dispatchEvent(new Event('storage'));
              }} />
            <span className="settings-toggle-slider" />
          </label>
        </div>
        <p className="settings-desc">각 운세 페이지 진입 시 자동으로 운세를 조회합니다</p>
      </section>

      {/* 앱 정보 */}
      <section className="settings-section glass-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h3 className="settings-section-title">앱 정보</h3>
        <div className="settings-row">
          <span className="settings-label">버전</span>
          <span className="settings-value">1.0.0</span>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <span className="settings-label">문의</span>
          <span className="settings-value">1:1연애 운영팀</span>
        </div>
      </section>
    </div>
  );
}

export default Settings;
