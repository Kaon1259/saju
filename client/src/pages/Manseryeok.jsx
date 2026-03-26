import { useState, useEffect } from 'react';
import { getManseryeok } from '../api/fortune';
import './Manseryeok.css';

const ELEMENT_COLORS = { '목': '#4ade80', '화': '#f87171', '토': '#fbbf24', '금': '#e2e8f0', '수': '#60a5fa' };

function Manseryeok() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!date) return;
    setLoading(true);
    try { setData(await getManseryeok(date)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Auto-load today
  useEffect(() => { getManseryeok(date).then(setData).catch(() => {}); }, []);

  const renderPillar = (p) => {
    if (!p) return null;
    return (
      <div className="ms-pillar">
        <span className="ms-pillar-label">{p.label}</span>
        <div className="ms-pillar-char" style={{ color: ELEMENT_COLORS[p.stemElement] }}>
          <span className="ms-pillar-hanja">{p.stemHanja}</span>
          <span className="ms-pillar-korean">{p.stem}</span>
        </div>
        <div className="ms-pillar-char" style={{ color: ELEMENT_COLORS[p.branchElement] }}>
          <span className="ms-pillar-hanja">{p.branchHanja}</span>
          <span className="ms-pillar-korean">{p.branch}</span>
        </div>
        <span className="ms-pillar-element">{p.stemElement}/{p.branchElement}</span>
        {p.animal && <span className="ms-pillar-animal">{p.animal}</span>}
      </div>
    );
  };

  return (
    <div className="ms-page">
      <section className="ms-hero">
        <h1 className="ms-title">만세력</h1>
        <p className="ms-subtitle">날짜별 천간지지 조회</p>
      </section>

      <div className="ms-search glass-card">
        <input type="date" className="ms-date-input" value={date} onChange={e => setDate(e.target.value)} />
        <button className="ms-search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>

      {data && (
        <div className="ms-result fade-in">
          <section className="ms-pillars glass-card">
            <h2 className="ms-section-title">📅 {data.date} ({data.zodiacAnimal}띠 해)</h2>
            <div className="ms-pillars-grid">
              {renderPillar(data.yearPillar)}
              {renderPillar(data.monthPillar)}
              {renderPillar(data.dayPillar)}
            </div>
          </section>

          <section className="ms-hours glass-card">
            <h2 className="ms-section-title">🕐 시주 (12시진)</h2>
            <div className="ms-hours-grid">
              {data.hours && data.hours.map((h, i) => (
                <div key={i} className="ms-hour-item">
                  <span className="ms-hour-name">{h.sijin}</span>
                  <span className="ms-hour-hanja" style={{ color: ELEMENT_COLORS[h.stemElement] }}>{h.stemHanja}</span>
                  <span className="ms-hour-hanja" style={{ color: ELEMENT_COLORS[h.branchElement] }}>{h.branchHanja}</span>
                  <span className="ms-hour-element">{h.stemElement}/{h.branchElement}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Manseryeok;
