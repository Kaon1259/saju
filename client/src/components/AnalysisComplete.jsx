import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './AnalysisComplete.css';

/**
 * AI 분석 완료 애니메이션 — matrix 페이드아웃 직후 1.6초 표시 → onDone 호출
 *
 * 사용 패턴:
 *   const [completing, setCompleting] = useState(false);
 *   onDone: () => {
 *     setMatrixShown(false);   // 매트릭스 즉시 종료 (또는 페이드아웃 후)
 *     setCompleting(true);
 *   }
 *
 *   <AnalysisComplete
 *     show={completing}
 *     theme="love"
 *     onDone={() => { setCompleting(false); setResult(finalData); }}
 *   />
 */
const THEME_COLORS = {
  love:  ['#fbbf24', '#ff3d7f'],
  star:  ['#ffd86b', '#fbbf24'],
  year:  ['#ffc07a', '#dc2626'],
  saju:  ['#a7f3d0', '#22c55e'],
  group: ['#d8b4fe', '#a855f7'],
  tarot: ['#f5d78e', '#c084fc'],
  blood: ['#ff9ec4', '#ec4899'],
  mbti:  ['#a78bfa', '#7c3aed'],
  star2: ['#60a5fa', '#3b82f6'],
  health:['#86efac', '#22c55e'],
};

export default function AnalysisComplete({
  show = false,
  theme = 'love',
  text = 'AI 분석이 완료됐어요!',
  sub = '결과를 보여드릴게요',
  duration = 1600,
  onDone,
}) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onDone]);

  if (!show) return null;
  const [c1, c2] = THEME_COLORS[theme] || THEME_COLORS.love;

  const content = (
    <div className="ana-complete" style={{ '--ac-c1': c1, '--ac-c2': c2 }}>
      <div className="ana-complete-burst">
        <span className="ana-complete-icon">✨</span>
        <span className="ana-complete-ring" />
        <span className="ana-complete-ring ana-complete-ring-2" />
      </div>
      <p className="ana-complete-text">{text}</p>
      <p className="ana-complete-sub">{sub}</p>
    </div>
  );
  return createPortal(content, document.body);
}
