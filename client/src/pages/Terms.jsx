import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderMarkdown } from '../utils/renderMarkdown.jsx';
import './Legal.css';

const TERMS_URL = '/legal/terms-v1.md';

export default function Terms() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(TERMS_URL)
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setContent)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <button className="legal-back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <h1 className="legal-title">이용약관</h1>
      </header>

      <div className="legal-card glass-card">
        {error && <p className="legal-meta">불러오기 실패: {error}</p>}
        {!content && !error && <p className="legal-meta">불러오는 중...</p>}
        {content && renderMarkdown(content)}
      </div>
    </div>
  );
}
