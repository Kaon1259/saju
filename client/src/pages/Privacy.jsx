import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderMarkdown } from '../utils/renderMarkdown.jsx';
import './Legal.css';

const PRIVACY_URL = '/legal/privacy-v1.md';

export default function Privacy() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(PRIVACY_URL)
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setContent)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <button className="legal-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <h1 className="legal-title">개인정보 처리방침</h1>
      </header>

      <div className="legal-card glass-card">
        {error && <p className="legal-meta">불러오기 실패: {error}</p>}
        {!content && !error && <p className="legal-meta">불러오는 중...</p>}
        {content && renderMarkdown(content)}
      </div>
    </div>
  );
}
