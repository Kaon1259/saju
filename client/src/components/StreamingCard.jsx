import { useEffect, useState } from 'react';
import './StreamingCard.css';

/**
 * 스트리밍 카드 — 분석 시작 시 placeholder로 미리 노출 → AI 텍스트 도착하면 카드 안에 typewriter 효과로 채워짐.
 *
 * @param {string} icon       - 아이콘
 * @param {string} title      - 카드 제목
 * @param {string} text       - 현재까지 받은 텍스트 (빈 문자열이면 placeholder)
 * @param {'pending'|'streaming'|'done'} status
 * @param {number} delay      - mount 후 fade-in 딜레이 (ms)
 * @param {string} accent     - placeholder 펄스 색상 (선택)
 */
export default function StreamingCard({ icon, title, text, status, delay = 0, accent = '#fbbf24' }) {
  const [visible, setVisible] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`streaming-card streaming-card--${status} ${visible ? 'streaming-card--visible' : ''}`}
      style={{ '--streaming-accent': accent }}
    >
      <div className="streaming-card-header">
        <span className="streaming-card-icon">{icon}</span>
        <h3 className="streaming-card-title">{title}</h3>
      </div>
      {status === 'pending' ? (
        <p className="streaming-card-pending">
          <span className="streaming-pulse">✨</span>
          <span>분석 중</span>
          <span className="streaming-dots"><i/><i/><i/></span>
        </p>
      ) : (
        <p className="streaming-card-text">
          {text}
          {status === 'streaming' && <span className="streaming-cursor">▍</span>}
        </p>
      )}
    </div>
  );
}
