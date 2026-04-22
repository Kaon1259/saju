import { useEffect, useRef, useState } from 'react';
import './StreamingCard.css';

/**
 * 스트리밍 카드 — 분석 시작 시 placeholder로 미리 노출 → AI 텍스트 도착하면 카드 안에 typewriter 효과로 채워짐.
 * 현재 스트리밍 중인 카드는 자동으로 화면 중앙으로 부드럽게 스크롤.
 *
 * @param {string} icon       - 아이콘
 * @param {string} title      - 카드 제목
 * @param {string} text       - 현재까지 받은 텍스트 (빈 문자열이면 placeholder)
 * @param {'pending'|'streaming'|'done'} status
 * @param {number} delay      - mount 후 fade-in 딜레이 (ms)
 * @param {string} accent     - placeholder 펄스 색상 (선택)
 * @param {boolean} autoScroll - 카드가 streaming으로 전환될 때 자동 스크롤 (기본 true)
 */
export default function StreamingCard({ icon, title, text, status, delay = 0, accent = '#fbbf24', autoScroll = true }) {
  const [visible, setVisible] = useState(delay === 0);
  const cardRef = useRef(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  // streaming으로 전환되는 순간 이 카드를 화면 중앙으로 부드럽게 스크롤 (카드별 1회만)
  useEffect(() => {
    if (!autoScroll) return;
    if (status !== 'streaming' || scrolledRef.current) return;
    if (!cardRef.current) return;
    scrolledRef.current = true;
    // fade-in 완료 후 스크롤 (delay 이후)
    const t = setTimeout(() => {
      try {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [status, autoScroll]);

  return (
    <div
      ref={cardRef}
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
