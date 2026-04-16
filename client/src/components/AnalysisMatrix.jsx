import { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import './AnalysisMatrix.css';

const THEMES = {
  love: {
    color: '#ff9ec4',
    glow1: 'rgba(236, 72, 153, 0.7)',
    glow2: 'rgba(236, 72, 153, 0.35)',
    bgStart: 'rgba(40, 10, 30, 0.92)',
    bgEnd: 'rgba(10, 2, 15, 0.98)',
    labelBg: 'rgba(20, 5, 15, 0.75)',
    labelBorder: 'rgba(236, 72, 153, 0.5)',
    labelText: '#ffd4e5',
    labelGrad: 'linear-gradient(90deg, #ffc0d8, #ff79b0, #ffc0d8)',
    innerShadow: 'rgba(236, 72, 153, 0.2)',
    icon: '💕',
    keywords: '사랑연애운명인연설렘두근떨림마음끌림호감첫눈밀당썸고백애정로맨스데이트커플약속추억함께영원진심행복미소포옹',
  },
  star: {
    color: '#ffd86b',
    glow1: 'rgba(251, 191, 36, 0.75)',
    glow2: 'rgba(251, 191, 36, 0.35)',
    bgStart: 'rgba(35, 20, 50, 0.92)',
    bgEnd: 'rgba(10, 5, 25, 0.98)',
    labelBg: 'rgba(20, 10, 30, 0.75)',
    labelBorder: 'rgba(251, 191, 36, 0.5)',
    labelText: '#fff0c4',
    labelGrad: 'linear-gradient(90deg, #ffe8a3, #ffcf5a, #ffe8a3)',
    innerShadow: 'rgba(251, 191, 36, 0.2)',
    icon: '⭐',
    keywords: '스타운명인연팬덤반짝최애덕질앨범콘서트무대조명별빛영원응원감동사랑마음설렘운명별빛영롱찬란',
  },
  year: {
    color: '#ffc07a',
    glow1: 'rgba(255, 170, 60, 0.8)',
    glow2: 'rgba(220, 38, 38, 0.35)',
    bgStart: 'rgba(50, 15, 10, 0.92)',
    bgEnd: 'rgba(15, 3, 5, 0.98)',
    labelBg: 'rgba(30, 8, 5, 0.75)',
    labelBorder: 'rgba(255, 170, 60, 0.55)',
    labelText: '#ffe8c4',
    labelGrad: 'linear-gradient(90deg, #ffe0a3, #ffb347, #ffe0a3)',
    innerShadow: 'rgba(255, 170, 60, 0.22)',
    icon: '🎊',
    keywords: '신년새해운세복길상병오년청룡황금행복성공재물건강사랑가족승진합격대박대길만사형통소원성취번영',
  },
  saju: {
    color: '#a7f3d0',
    glow1: 'rgba(52, 211, 153, 0.7)',
    glow2: 'rgba(52, 211, 153, 0.3)',
    bgStart: 'rgba(10, 30, 25, 0.92)',
    bgEnd: 'rgba(5, 15, 12, 0.98)',
    labelBg: 'rgba(5, 20, 15, 0.75)',
    labelBorder: 'rgba(52, 211, 153, 0.5)',
    labelText: '#d4ffe5',
    labelGrad: 'linear-gradient(90deg, #c4f0d4, #6ee7b7, #c4f0d4)',
    innerShadow: 'rgba(52, 211, 153, 0.18)',
    icon: '☯️',
    keywords: '사주팔자천간지지음양오행갑을병정무기경신임계자축인묘진사오미신유술해목화토금수일간월주년주시주대운세운',
  },
  group: {
    color: '#d8b4fe',
    glow1: 'rgba(168, 85, 247, 0.75)',
    glow2: 'rgba(168, 85, 247, 0.35)',
    bgStart: 'rgba(30, 15, 50, 0.92)',
    bgEnd: 'rgba(10, 3, 20, 0.98)',
    labelBg: 'rgba(20, 5, 30, 0.75)',
    labelBorder: 'rgba(168, 85, 247, 0.5)',
    labelText: '#e6d4ff',
    labelGrad: 'linear-gradient(90deg, #e9d5ff, #c084fc, #e9d5ff)',
    innerShadow: 'rgba(168, 85, 247, 0.2)',
    icon: '💫',
    keywords: '그룹보이그룹걸그룹아이돌멤버무대팬덤최애덕질운명인연궁합에너지시너지조화케미스타별빛콘서트앨범',
  },
  tarot: {
    color: '#f5d78e',
    glow1: 'rgba(222, 169, 87, 0.8)',
    glow2: 'rgba(147, 51, 234, 0.4)',
    bgStart: 'rgba(30, 12, 45, 0.94)',
    bgEnd: 'rgba(8, 3, 18, 0.98)',
    labelBg: 'rgba(20, 8, 30, 0.78)',
    labelBorder: 'rgba(222, 169, 87, 0.55)',
    labelText: '#fef0c7',
    labelGrad: 'linear-gradient(90deg, #fef0c7, #f5d78e, #c084fc, #f5d78e, #fef0c7)',
    innerShadow: 'rgba(222, 169, 87, 0.22)',
    icon: '🔮',
    keywords: '타로카드운명인연메시지직감신비마법예언상징미래과거현재죽음연인마법사은둔자여사제별달태양심판세계바보전차',
  },
};

function sanitize(text) {
  if (!text) return '';
  return text.replace(/[\s\n\r\t`"'{}\[\]:,.\-_()]/g, '');
}

export default function AnalysisMatrix({
  theme = 'love',
  label = 'AI가 분석하고 있어요',
  streamText = '',
  columns = 10,
  exiting = false,
  variant = 'page',
}) {
  const t = THEMES[theme] || THEMES.love;

  const colConfigRef = useRef(null);
  if (!colConfigRef.current) {
    colConfigRef.current = Array.from({ length: columns }, (_, col) => ({
      left: `${(col / columns) * 100 + (col % 2 === 0 ? 1.5 : -1.5)}%`,
      duration: 7 + (col % 3) * 1.5,
      delay: -col * 0.6,
      opacity: 0.6 + ((col * 37) % 40) / 100,
      fontSize: 14 + (col % 4) * 2,
    }));
  }
  const cols = colConfigRef.current;

  const source = useMemo(() => {
    const clean = sanitize(streamText);
    return clean.length > 20 ? clean : t.keywords;
  }, [streamText, t.keywords]);

  const colChars = useMemo(() => {
    return cols.map((_, col) => {
      const chars = [];
      for (let i = 0; i < 22; i++) {
        const idx = (i * cols.length + col) % source.length;
        chars.push(source[idx]);
      }
      return chars;
    });
  }, [source, cols.length]);

  const styleVars = {
    '--am-color': t.color,
    '--am-glow1': t.glow1,
    '--am-glow2': t.glow2,
    '--am-bg-start': t.bgStart,
    '--am-bg-end': t.bgEnd,
    '--am-label-bg': t.labelBg,
    '--am-label-border': t.labelBorder,
    '--am-label-text': t.labelText,
    '--am-label-grad': t.labelGrad,
    '--am-inner-shadow': t.innerShadow,
  };

  const content = (
    <div
      className={`analysis-matrix analysis-matrix--${variant}${exiting ? ' analysis-matrix-exit' : ''}`}
      style={styleVars}
    >
      <div className="analysis-matrix-rain">
        {cols.map((c, i) => (
          <div
            key={i}
            className="analysis-matrix-col"
            style={{
              left: c.left,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
              opacity: c.opacity,
              fontSize: `${c.fontSize}px`,
            }}
          >
            {colChars[i].map((ch, j) => (
              <span key={j}>{ch}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="analysis-matrix-label">
        <span className="analysis-matrix-label-icon">{t.icon}</span>
        <span className="analysis-matrix-label-text">{label}</span>
        <span className="analysis-matrix-dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );

  // Portal로 body에 직접 렌더링 — 부모 stacking context 영향 제거
  return createPortal(content, document.body);
}
