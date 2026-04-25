import { useEffect, useState } from 'react';
import './WaitMessages.css';

/**
 * AI 분석 대기 중 회전 멘트 컴포넌트.
 * - messages: 회전할 문장 배열
 * - interval: ms (기본 6000 = 6초, 사용자 요청은 ~20초이지만 메시지가 많으면 더 자주 회전해도 됨)
 * - variant: 'large' (분석 매트릭스용 큰 글씨) | 'inline' (스트리밍 헤더 옆 작은 칩)
 */
export default function WaitMessages({ messages = [], interval = 6000, variant = 'large' }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, interval);
    return () => clearInterval(id);
  }, [messages.length, interval]);

  if (!messages.length) return null;

  return (
    <div className={`wait-messages wait-messages--${variant}`} aria-live="polite">
      <span className="wait-messages-text" key={idx}>
        {messages[idx]}
      </span>
    </div>
  );
}
