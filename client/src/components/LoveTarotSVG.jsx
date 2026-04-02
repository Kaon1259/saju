/**
 * 연애 테마 메이저 아르카나 22장 SVG 카드
 * 핑크/로맨틱 스타일, 1:1연애 앱 전용
 */

const LOVE_CARDS = [
  { id: 0,  kr: '새로운 사랑', symbol: '🦋', bg: ['#FFB6C1','#FF69B4'], accent: '#FF1493', pattern: 'butterfly' },
  { id: 1,  kr: '사랑의 마법',  symbol: '✨', bg: ['#E8A0BF','#BA68C8'], accent: '#9C27B0', pattern: 'sparkle' },
  { id: 2,  kr: '비밀의 마음',  symbol: '🌙', bg: ['#B39DDB','#7E57C2'], accent: '#5C6BC0', pattern: 'moon' },
  { id: 3,  kr: '사랑의 여신',  symbol: '🌹', bg: ['#F48FB1','#EC407A'], accent: '#C2185B', pattern: 'rose' },
  { id: 4,  kr: '든든한 사랑',  symbol: '👑', bg: ['#FFAB91','#FF7043'], accent: '#E64A19', pattern: 'crown' },
  { id: 5,  kr: '운명의 인연',  symbol: '🔗', bg: ['#CE93D8','#AB47BC'], accent: '#8E24AA', pattern: 'destiny' },
  { id: 6,  kr: '영원한 사랑',  symbol: '💕', bg: ['#F06292','#E91E63'], accent: '#AD1457', pattern: 'hearts' },
  { id: 7,  kr: '사랑의 질주',  symbol: '💫', bg: ['#FF8A80','#FF5252'], accent: '#D50000', pattern: 'shooting' },
  { id: 8,  kr: '사랑의 힘',   symbol: '🌸', bg: ['#F8BBD0','#F06292'], accent: '#C2185B', pattern: 'blossom' },
  { id: 9,  kr: '기다리는 사랑', symbol: '🕯️', bg: ['#D1C4E9','#9575CD'], accent: '#512DA8', pattern: 'candle' },
  { id: 10, kr: '운명의 만남',  symbol: '🎡', bg: ['#F48FB1','#CE93D8'], accent: '#9C27B0', pattern: 'wheel' },
  { id: 11, kr: '사랑의 균형',  symbol: '⚖️', bg: ['#B2DFDB','#80CBC4'], accent: '#00897B', pattern: 'balance' },
  { id: 12, kr: '매달린 마음',  symbol: '🎐', bg: ['#90CAF9','#42A5F5'], accent: '#1565C0', pattern: 'hanging' },
  { id: 13, kr: '이별과 재탄생', symbol: '🥀', bg: ['#BCAAA4','#8D6E63'], accent: '#4E342E', pattern: 'rebirth' },
  { id: 14, kr: '조화로운 사랑', symbol: '🌈', bg: ['#C5E1A5','#AED581'], accent: '#689F38', pattern: 'harmony' },
  { id: 15, kr: '위험한 유혹',  symbol: '🔥', bg: ['#EF9A9A','#E57373'], accent: '#C62828', pattern: 'flame' },
  { id: 16, kr: '사랑의 시련',  symbol: '⚡', bg: ['#FFE082','#FFB74D'], accent: '#EF6C00', pattern: 'thunder' },
  { id: 17, kr: '희망의 별빛',  symbol: '⭐', bg: ['#FFF59D','#FFF176'], accent: '#F9A825', pattern: 'star' },
  { id: 18, kr: '달빛 고백',   symbol: '🌕', bg: ['#B39DDB','#9FA8DA'], accent: '#3F51B5', pattern: 'fullmoon' },
  { id: 19, kr: '눈부신 사랑',  symbol: '☀️', bg: ['#FFE0B2','#FFB74D'], accent: '#FB8C00', pattern: 'sun' },
  { id: 20, kr: '사랑의 결단',  symbol: '💎', bg: ['#E1BEE7','#BA68C8'], accent: '#7B1FA2', pattern: 'crystal' },
  { id: 21, kr: '완전한 사랑',  symbol: '🌍', bg: ['#F8BBD0','#F48FB1'], accent: '#E91E63', pattern: 'complete' },
];

// 하트 패스 (재사용)
const HEART_PATH = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

function PatternDefs({ pattern, accent, id }) {
  return (
    <defs>
      <filter id={`glow-${id}`}>
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <radialGradient id={`center-glow-${id}`} cx="50%" cy="45%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function CardSymbol({ pattern, accent, id }) {
  const cx = 90, cy = 115;
  switch (pattern) {
    case 'butterfly':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M0 0 C-20-30 -45-25 -35 0 C-25 25 -5 20 0 5" fill={accent} opacity="0.7" />
        <path d="M0 0 C20-30 45-25 35 0 C25 25 5 20 0 5" fill={accent} opacity="0.7" />
        <ellipse cx="0" cy="-5" rx="2" ry="15" fill="#fff" opacity="0.5" />
      </g>;
    case 'sparkle':
      return <g transform={`translate(${cx},${cy})`}>
        {[0,45,90,135].map(a => <line key={a} x1="0" y1="-25" x2="0" y2="25" stroke="#fff" strokeWidth="2" opacity="0.6" transform={`rotate(${a})`} />)}
        <circle cx="0" cy="0" r="12" fill={accent} opacity="0.6" />
        <circle cx="0" cy="0" r="6" fill="#fff" opacity="0.8" />
      </g>;
    case 'moon':
      return <g transform={`translate(${cx},${cy})`}>
        <circle cx="0" cy="0" r="25" fill="#fff" opacity="0.3" />
        <circle cx="8" cy="-5" r="20" fill={`${accent}`} opacity="0.4" />
        {[0,1,2,3,4].map(i => <circle key={i} cx={-20+i*10} cy={-30+Math.abs(i-2)*8} r="1.5" fill="#fff" opacity="0.8" />)}
      </g>;
    case 'rose':
      return <g transform={`translate(${cx},${cy})`}>
        {[0,72,144,216,288].map(a => <ellipse key={a} cx="0" cy="-12" rx="10" ry="16" fill={accent} opacity="0.5" transform={`rotate(${a})`} />)}
        <circle cx="0" cy="0" r="8" fill="#fff" opacity="0.5" />
      </g>;
    case 'crown':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M-25 10 L-20-15 L-8-5 L0-20 L8-5 L20-15 L25 10 Z" fill={accent} opacity="0.6" stroke="#fff" strokeWidth="1" />
        <circle cx="-20" cy="-15" r="3" fill="#fff" opacity="0.7" />
        <circle cx="0" cy="-20" r="4" fill="#fff" opacity="0.7" />
        <circle cx="20" cy="-15" r="3" fill="#fff" opacity="0.7" />
      </g>;
    case 'destiny':
      return <g transform={`translate(${cx},${cy})`}>
        <circle cx="-12" cy="0" r="15" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <circle cx="12" cy="0" r="15" fill="none" stroke={accent} strokeWidth="2" opacity="0.5" />
        <path d="M0-10 Q0 0 0 10" fill="none" stroke="#fff" strokeWidth="2" opacity="0.7" />
      </g>;
    case 'hearts':
      return <g transform={`translate(${cx-12},${cy-12}) scale(0.9)`}>
        <path d={HEART_PATH} fill="#fff" opacity="0.7" />
        <g transform="translate(5,5) scale(0.6)"><path d={HEART_PATH} fill={accent} opacity="0.8" /></g>
      </g>;
    case 'shooting':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M-25-15 L20 5" stroke="#fff" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
        <circle cx="20" cy="5" r="8" fill={accent} opacity="0.6" />
        <path d="M-25-15 L-30-10 M-25-15 L-20-10 M-25-15 L-28-20" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
      </g>;
    case 'blossom':
      return <g transform={`translate(${cx},${cy})`}>
        {[0,60,120,180,240,300].map(a => <ellipse key={a} cx="0" cy="-14" rx="8" ry="14" fill="#fff" opacity="0.4" transform={`rotate(${a})`} />)}
        <circle cx="0" cy="0" r="7" fill={accent} opacity="0.6" />
      </g>;
    case 'candle':
      return <g transform={`translate(${cx},${cy})`}>
        <rect x="-5" y="-5" width="10" height="30" rx="3" fill="#fff" opacity="0.5" />
        <path d="M0-5 Q-8-18 0-28 Q8-18 0-5" fill={accent} opacity="0.7" />
        <circle cx="0" cy="-18" r="4" fill="#FFE082" opacity="0.8" />
      </g>;
    case 'wheel':
      return <g transform={`translate(${cx},${cy})`}>
        <circle cx="0" cy="0" r="25" fill="none" stroke="#fff" strokeWidth="2" opacity="0.4" />
        <circle cx="0" cy="0" r="8" fill={accent} opacity="0.5" />
        {[0,45,90,135,180,225,270,315].map(a => <line key={a} x1="0" y1="-8" x2="0" y2="-25" stroke="#fff" strokeWidth="1.5" opacity="0.4" transform={`rotate(${a})`} />)}
        <g transform="translate(-5,-5) scale(0.4)"><path d={HEART_PATH} fill="#fff" opacity="0.8" /></g>
      </g>;
    case 'balance':
      return <g transform={`translate(${cx},${cy})`}>
        <line x1="0" y1="-25" x2="0" y2="5" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <line x1="-25" y1="-10" x2="25" y2="-10" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <path d="M-25-10 L-30 5 L-20 5 Z" fill={accent} opacity="0.5" />
        <path d="M25-10 L20 5 L30 5 Z" fill={accent} opacity="0.5" />
        <circle cx="0" cy="-25" r="4" fill="#fff" opacity="0.7" />
      </g>;
    case 'hanging':
      return <g transform={`translate(${cx},${cy})`}>
        <line x1="0" y1="-28" x2="0" y2="-8" stroke="#fff" strokeWidth="2" opacity="0.4" />
        <g transform="translate(-5,-5) scale(0.45) rotate(180)"><path d={HEART_PATH} fill={accent} opacity="0.7" /></g>
        {[-10,0,10].map(x => <circle key={x} cx={x} cy={15} r="2" fill="#fff" opacity="0.5" />)}
      </g>;
    case 'rebirth':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M-8 15 Q-8-10 -20-5" fill="none" stroke="#4E342E" strokeWidth="2" opacity="0.5" />
        <path d="M8 15 Q8-10 20-5" fill="none" stroke="#4E342E" strokeWidth="2" opacity="0.5" />
        <circle cx="0" cy="-15" r="4" fill={accent} opacity="0.5" />
        <path d="M-3-12 Q0-20 3-12" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
        <circle cx="0" cy="20" r="3" fill="#A5D6A7" opacity="0.7" />
      </g>;
    case 'harmony':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M-25 10 Q-15-20 0-5 Q15-20 25 10" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.5" />
        <path d="M-20 15 Q-10-10 0 0 Q10-10 20 15" fill={accent} opacity="0.3" />
        {[-12,0,12].map(x => <circle key={x} cx={x} cy={-15+Math.abs(x)*0.3} r="3" fill="#fff" opacity="0.6" />)}
      </g>;
    case 'flame':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M0 15 Q-15-5 -8-20 Q-3-10 0-25 Q3-10 8-20 Q15-5 0 15" fill={accent} opacity="0.6" />
        <path d="M0 10 Q-6 0 -3-10 Q0-5 0-15 Q0-5 3-10 Q6 0 0 10" fill="#FFE082" opacity="0.6" />
      </g>;
    case 'thunder':
      return <g transform={`translate(${cx},${cy})`}>
        <path d="M-5-25 L5-5 L-3-5 L5 20 L-10 0 L0 0 Z" fill="#fff" opacity="0.6" />
        <path d="M-3-20 L3-5 L-1-5 L3 15 L-7 0 L1 0 Z" fill={accent} opacity="0.5" />
      </g>;
    case 'star':
      return <g transform={`translate(${cx},${cy})`}>
        {[0,72,144,216,288].map(a => <polygon key={a} points="0,-25 5,-8 0,0" fill="#fff" opacity="0.5" transform={`rotate(${a})`} />)}
        <circle cx="0" cy="0" r="10" fill={accent} opacity="0.4" />
        {[-18,18,-10,10,0].map((x,i) => <circle key={i} cx={x} cy={20+i*2} r="1.5" fill="#fff" opacity="0.6" />)}
      </g>;
    case 'fullmoon':
      return <g transform={`translate(${cx},${cy})`}>
        <circle cx="0" cy="0" r="22" fill="#fff" opacity="0.25" />
        <circle cx="0" cy="0" r="18" fill="#fff" opacity="0.15" />
        <circle cx="-3" cy="-2" r="14" fill={accent} opacity="0.3" />
        {[-15,-5,8,16].map((x,i) => <circle key={i} cx={x} cy={25} r="1" fill="#fff" opacity="0.7" />)}
      </g>;
    case 'sun':
      return <g transform={`translate(${cx},${cy})`}>
        <circle cx="0" cy="0" r="15" fill="#fff" opacity="0.4" />
        {Array.from({length:12}).map((_,i) => <line key={i} x1="0" y1="-18" x2="0" y2="-28" stroke={accent} strokeWidth="2" opacity="0.5" transform={`rotate(${i*30})`} />)}
        <circle cx="0" cy="0" r="10" fill={accent} opacity="0.4" />
      </g>;
    case 'crystal':
      return <g transform={`translate(${cx},${cy})`}>
        <polygon points="0,-28 15,-5 10,20 -10,20 -15,-5" fill="#fff" opacity="0.3" stroke="#fff" strokeWidth="1" />
        <polygon points="0,-20 10,-5 6,15 -6,15 -10,-5" fill={accent} opacity="0.35" />
        <line x1="-10" y1="-5" x2="10" y2="-5" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
      </g>;
    case 'complete':
      return <g transform={`translate(${cx},${cy})`}>
        <circle cx="0" cy="0" r="24" fill="none" stroke="#fff" strokeWidth="2" opacity="0.4" />
        <g transform="translate(-10,-10) scale(0.85)"><path d={HEART_PATH} fill={accent} opacity="0.5" /></g>
        {[0,90,180,270].map(a => <circle key={a} cx={0} cy={-24} r="3" fill="#fff" opacity="0.6" transform={`rotate(${a})`} />)}
      </g>;
    default:
      return <circle cx={cx} cy={cy} r="20" fill="#fff" opacity="0.3" />;
  }
}

function LoveTarotSVG({ cardId }) {
  const id = Math.min(Math.max(cardId || 0, 0), 21);
  const card = LOVE_CARDS[id];
  const num = String(id).padStart(2, '0');

  return (
    <svg viewBox="0 0 180 280" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
      <PatternDefs pattern={card.pattern} accent={card.accent} id={id} />

      {/* 배경 그라데이션 */}
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={card.bg[0]} />
          <stop offset="100%" stopColor={card.bg[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="180" height="280" rx="12" fill={`url(#bg-${id})`} />

      {/* 중앙 글로우 */}
      <ellipse cx="90" cy="115" rx="60" ry="50" fill={`url(#center-glow-${id})`} />

      {/* 장식 하트 (좌상/우하) */}
      <g transform="translate(12,16) scale(0.35)" opacity="0.25"><path d={HEART_PATH} fill="#fff" /></g>
      <g transform="translate(152,244) scale(0.35) rotate(180, 12, 12)" opacity="0.25"><path d={HEART_PATH} fill="#fff" /></g>

      {/* 프레임 */}
      <rect x="8" y="8" width="164" height="264" rx="8" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.35" />
      <rect x="14" y="14" width="152" height="252" rx="5" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.2" />

      {/* 상단 번호 */}
      <text x="90" y="38" textAnchor="middle" fontFamily="serif" fontSize="14" fontWeight="700" fill="#fff" opacity="0.7">
        {['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][id]}
      </text>

      {/* 메인 심볼 */}
      <CardSymbol pattern={card.pattern} accent={card.accent} id={id} />

      {/* 이모지 심볼 */}
      <text x="90" y="175" textAnchor="middle" fontSize="28" opacity="0.9">{card.symbol}</text>

      {/* 카드 이름 */}
      <text x="90" y="215" textAnchor="middle" fontFamily="sans-serif" fontSize="15" fontWeight="800" fill="#fff" opacity="0.95">
        {card.kr}
      </text>

      {/* 하단 장식선 */}
      <line x1="50" y1="228" x2="130" y2="228" stroke="#fff" strokeWidth="0.8" opacity="0.3" />

      {/* 하단 영문 */}
      <text x="90" y="245" textAnchor="middle" fontFamily="serif" fontSize="9" fill="#fff" opacity="0.45" letterSpacing="1">
        {['THE FOOL','THE MAGICIAN','HIGH PRIESTESS','THE EMPRESS','THE EMPEROR',
          'HIEROPHANT','THE LOVERS','THE CHARIOT','STRENGTH','THE HERMIT',
          'WHEEL OF FORTUNE','JUSTICE','HANGED MAN','DEATH','TEMPERANCE',
          'THE DEVIL','THE TOWER','THE STAR','THE MOON','THE SUN',
          'JUDGEMENT','THE WORLD'][id]}
      </text>

      {/* 반짝이는 별 파티클 */}
      <circle cx="30" cy="60" r="1" fill="#fff" opacity="0.6"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" /></circle>
      <circle cx="150" cy="80" r="1.2" fill="#fff" opacity="0.5"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.5s" repeatCount="indefinite" /></circle>
      <circle cx="45" cy="200" r="0.8" fill="#fff" opacity="0.4"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="140" cy="190" r="1" fill="#fff" opacity="0.5"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.8s" repeatCount="indefinite" /></circle>

      {/* 오버레이 쉬머 */}
      <rect x="0" y="0" width="180" height="280" rx="12" fill="url(#center-glow-${id})" opacity="0.15" />
    </svg>
  );
}

export default LoveTarotSVG;
export { LOVE_CARDS };
