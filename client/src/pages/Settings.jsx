import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

      {/* 하트 비용 관리 (관리자 전용) */}
      <HeartConfigSection />

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

function HeartConfigSection() {
  const [configs, setConfigs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(null); // { category, cost }
  const [saving, setSaving] = useState(false);
  const baseURL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    if (expanded && configs.length === 0) {
      axios.get(`${baseURL}/hearts/config`).then(r => setConfigs(r.data)).catch(() => {});
    }
  }, [expanded]);

  const handleSave = async (category, newCost) => {
    setSaving(true);
    try {
      await axios.put(`${baseURL}/hearts/config?category=${category}&cost=${newCost}`);
      setConfigs(prev => prev.map(c => c.category === category ? { ...c, cost: newCost } : c));
      setEditing(null);
    } catch (e) {
      alert('저장 실패: ' + (e.response?.data?.error || e.message));
    }
    setSaving(false);
  };

  // 그룹별 정리
  const groups = {};
  configs.forEach(c => {
    const g = c.group || '기타';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });

  return (
    <section className="settings-section glass-card animate-fade-in-up" style={{ animationDelay: '175ms' }}>
      <div className="settings-row" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <h3 className="settings-section-title" style={{ margin: 0 }}>💗 하트 비용 설정</h3>
        <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 6, letterSpacing: 0.5 }}>{groupName}</div>
              {items.filter(c => c.category !== 'SIGNUP_BONUS').map(c => (
                <div key={c.category} className="settings-row" style={{ padding: '4px 0', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || c.category}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{c.category}</div>
                  </div>
                  {editing?.category === c.category ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="number" min="0" max="999" value={editing.cost}
                        onChange={e => setEditing({ ...editing, cost: parseInt(e.target.value) || 0 })}
                        style={{ width: 50, padding: '4px 6px', borderRadius: 8, border: '1px solid rgba(244,114,182,0.4)', background: 'rgba(0,0,0,0.2)', color: '#f472b6', fontSize: 14, fontWeight: 700, textAlign: 'center' }}
                      />
                      <button onClick={() => handleSave(c.category, editing.cost)} disabled={saving}
                        style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {saving ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditing({ category: c.category, cost: c.cost })}
                      style={{ padding: '4px 12px', borderRadius: 10, border: '1px solid rgba(244,114,182,0.3)', background: 'rgba(244,114,182,0.1)', color: '#f472b6', fontSize: 14, fontWeight: 800, cursor: 'pointer', minWidth: 44, textAlign: 'center' }}>
                      {c.cost}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
            비용을 탭하면 수정할 수 있습니다
          </div>
        </div>
      )}
    </section>
  );
}

export default Settings;
