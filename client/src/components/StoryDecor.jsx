import { useLocation } from 'react-router-dom';
import './StoryDecor.css';

/* 크레파스 손그림 데코 레이어
   — data-homestyle="story" 일 때 전 페이지 모서리 곳곳에 표시 (CSS로 노출 제어)
   — roughen 필터로 윤곽선이 크레파스처럼 울렁임
   — 5개 공통 데코(달·별·구름·반짝임·꽃) + 핵심 페이지별 테마 모티프 1개(우하단) */

const STAR = 'M0,-5 L1.4,-1.4 L5,0 L1.4,1.4 L0,5 L-1.4,1.4 L-5,0 L-1.4,-1.4 Z';
const HEART = 'M0,6 C-3,1 -11,-2 -11,-9 C-11,-15 -3,-16 0,-9 C3,-16 11,-15 11,-9 C11,-2 3,1 0,6 Z';

/* 라우트 → 페이지 테마 모티프 매칭 (startsWith 매칭) */
const FORTUNE_PATHS = [
  '/my', '/fortune', '/saju', '/year-fortune', '/monthly-fortune',
  '/weekly-fortune', '/tojeong', '/traditional', '/biorhythm', '/manseryeok',
];
const LOVE_PATHS = [
  '/compatibility', '/celeb-compatibility', '/celeb-match', '/love-fortune',
  '/love', '/my-love-compat', '/my-some-crush', '/my-solo', '/again-meet',
  '/star-fortune', '/my-star', '/weather-compat',
];

function motifFor(pathname) {
  if (pathname.startsWith('/tarot')) return 'tarot';
  if (LOVE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return 'love';
  if (FORTUNE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return 'fortune';
  return null;
}

function Petals() {
  return [0, 1, 2, 3, 4].map((i) => (
    <circle
      key={i}
      className="sd-petal"
      cx={(27 + Math.cos((i / 5) * 6.2832) * 8).toFixed(2)}
      cy={(22 + Math.sin((i / 5) * 6.2832) * 8).toFixed(2)}
      r="6"
    />
  ));
}

/* 운세 — 해 (광선 8개 + 둥근 본체) */
function SunMotif() {
  const rays = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * 6.2832;
    return (
      <line
        key={i}
        className="sd-sun-ray"
        x1={(32 + Math.cos(a) * 16).toFixed(2)}
        y1={(32 + Math.sin(a) * 16).toFixed(2)}
        x2={(32 + Math.cos(a) * 27).toFixed(2)}
        y2={(32 + Math.sin(a) * 27).toFixed(2)}
      />
    );
  });
  return (
    <svg className="story-decor-item sd-pos-motif" viewBox="0 0 64 64">
      <g filter="url(#story-rough)">
        {rays}
        <circle className="sd-sun-body" cx="32" cy="32" r="12.5" />
      </g>
    </svg>
  );
}

/* 타로 — 작은 타로 카드 (크림 카드 + 골드 별) */
function TarotMotif() {
  return (
    <svg className="story-decor-item sd-pos-motif" viewBox="0 0 56 66">
      <g filter="url(#story-rough)">
        <rect className="sd-card-body" x="13" y="8" width="30" height="50" rx="5" />
        <path className="sd-card-star" transform="translate(28 33) scale(1.5)" d={STAR} />
      </g>
    </svg>
  );
}

/* 궁합/연애 — 맞닿은 두 하트 */
function LoveMotif() {
  return (
    <svg className="story-decor-item sd-pos-motif" viewBox="0 0 70 56">
      <g filter="url(#story-rough)">
        <path className="sd-heart" transform="translate(25 28) scale(1.2)" d={HEART} />
        <path className="sd-heart" transform="translate(45 31) scale(0.95)" d={HEART} />
      </g>
    </svg>
  );
}

export default function StoryDecor() {
  const { pathname } = useLocation();
  const motif = motifFor(pathname);

  return (
    <div className="story-decor" aria-hidden="true">
      {/* 공유 roughen 필터 */}
      <svg className="story-decor-defs" width="0" height="0">
        <defs>
          <filter id="story-rough" x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="5" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 좌상단 — 달 */}
      <svg className="story-decor-item sd-pos-moon" viewBox="0 0 64 64">
        <g filter="url(#story-rough)">
          <circle className="sd-ring" cx="32" cy="32" r="25" />
          <circle className="sd-moon" cx="32" cy="32" r="18" />
        </g>
      </svg>

      {/* 우상단 — 별 무리 */}
      <svg className="story-decor-item sd-pos-stars" viewBox="0 0 70 56">
        <g className="sd-stars" filter="url(#story-rough)">
          <path transform="translate(17 19) scale(1.3)" d={STAR} />
          <path transform="translate(46 14) scale(0.9)" d={STAR} />
          <path transform="translate(35 41) scale(1.1)" d={STAR} />
        </g>
      </svg>

      {/* 좌중단 — 구름 */}
      <svg className="story-decor-item sd-pos-cloud" viewBox="0 0 72 44">
        <g className="sd-cloud" filter="url(#story-rough)">
          <ellipse cx="26" cy="28" rx="22" ry="13" />
          <ellipse cx="47" cy="24" rx="18" ry="14" />
        </g>
      </svg>

      {/* 우중단 — 반짝임 */}
      <svg className="story-decor-item sd-pos-spark" viewBox="0 0 48 60">
        <g className="sd-stars" filter="url(#story-rough)">
          <path transform="translate(20 21) scale(1.5)" d={STAR} />
          <path transform="translate(33 45) scale(0.85)" d={STAR} />
        </g>
      </svg>

      {/* 좌하단 — 꽃 */}
      <svg className="story-decor-item sd-pos-flower" viewBox="0 0 54 64">
        <g filter="url(#story-rough)">
          <line className="sd-stem" x1="27" y1="62" x2="27" y2="28" />
          <Petals />
          <circle className="sd-core" cx="27" cy="22" r="4.5" />
        </g>
      </svg>

      {/* 우하단 — 페이지 테마 모티프 (핵심 페이지에서만) */}
      {motif === 'fortune' && <SunMotif />}
      {motif === 'tarot' && <TarotMotif />}
      {motif === 'love' && <LoveMotif />}
    </div>
  );
}
