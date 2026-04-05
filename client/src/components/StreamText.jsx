import { useEffect, useRef } from 'react';
import './StreamText.css';

/**
 * AI 스트리밍 텍스트 표시 컴포넌트
 * - 텍스트가 추가될 때마다 자동 스크롤
 * - 커서 깜빡임 애니메이션
 */
function StreamText({ text, icon = '🔮', label = 'AI가 분석하고 있어요...', color }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  // 텍스트가 업데이트될 때마다 하단으로 자동 스크롤
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
    // 페이지 레벨에서도 스트리밍 영역이 보이도록 스크롤
    if (containerRef.current && text?.length < 30) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [text]);

  if (!text) return null;

  return (
    <div className="stream-text-wrap glass-card" ref={containerRef} style={{ '--stream-color': color || '#FBBF24' }}>
      <div className="stream-text-header">
        <span className="stream-text-icon">{icon}</span>
        <span className="stream-text-label">{label}</span>
        <div className="stream-text-dots"><span /><span /><span /></div>
      </div>
      <div className="stream-text-body" ref={textRef}>
        <p className="stream-text-content">{text}<span className="stream-text-cursor">|</span></p>
      </div>
    </div>
  );
}

export default StreamText;
