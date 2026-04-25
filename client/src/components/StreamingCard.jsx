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

  // streaming으로 전환되는 순간 이 카드를 화면 중앙으로 스크롤 (카드별 1회만)
  // 모바일 WebView 성능: smooth scroll은 paint와 경쟁해 버벅임/흰 플래시 유발 → window.scrollTo 로 한 번에 이동
  useEffect(() => {
    if (!autoScroll) return;
    if (status !== 'streaming' || scrolledRef.current) return;
    if (!cardRef.current) return;
    scrolledRef.current = true;
    const t = setTimeout(() => {
      try {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
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
        <>
          {/* 회전 링과 스켈레톤만으로 "분석 중" 시각화 — 텍스트 라벨 제거 (헤더와 중복 방지) */}
          <div className="streaming-card-skeleton" aria-hidden="true">
            <span className="sc-skel-line sc-skel-line--1" />
            <span className="sc-skel-line sc-skel-line--2" />
            <span className="sc-skel-line sc-skel-line--3" />
          </div>
        </>
      ) : (
        <p className="streaming-card-text">
          {text}
          {status === 'streaming' && <span className="streaming-cursor">▍</span>}
        </p>
      )}
    </div>
  );
}
