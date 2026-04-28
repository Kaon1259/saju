/**
 * 타로 78장 — 덱 선택 지원 (DECK_LIST 8개 + love SVG)
 * - 모든 덱이 4벌 변형 (m00_v0~v3.jpg)
 */

import { useMemo, useEffect } from 'react';
import LoveTarotSVG from './LoveTarotSVG';

// ── 프레임 이미지 프리로드 캐시 ──
const frameCache = new Map();
function preloadFrame(src) {
  if (frameCache.has(src)) return;
  const img = new Image();
  img.src = src;
  frameCache.set(src, img);
}
import { FRAME_POOL } from '../utils/tarotFrames';
// 앱 시작 시 사용 가능한 프레임만 프리로드
(function preloadAllFrames() {
  FRAME_POOL.forEach(({ set, v }) => preloadFrame(`/tarot-frames/frame_${set}_${v}.webp`));
})();

const DECK_PATHS = {
  newclassic: '/tarot-newclassic',
  jester: '/tarot-jester',
  masterpiece: '/tarot-masterpiece',
  cartoon_girl: '/tarot-cartoon-girl',
  cartoon_boy: '/tarot-cartoon-boy',
  kdrama: '/tarot-kdrama',
  celestial: '/tarot-celestial',
  lady: '/tarot-lady',
};

// 4벌 변형 덱 (각 카드마다 _v0~v3)
const MULTI_VARIANT_DECKS = new Set(['newclassic', 'jester', 'masterpiece', 'cartoon_girl', 'cartoon_boy', 'kdrama', 'celestial', 'lady']);

// 메이저 아르카나 이름
const MAJOR_NAMES = [
  'THE FOOL','THE MAGICIAN','THE HIGH PRIESTESS','THE EMPRESS','THE EMPEROR',
  'THE HIEROPHANT','THE LOVERS','THE CHARIOT','STRENGTH','THE HERMIT',
  'WHEEL OF FORTUNE','JUSTICE','THE HANGED MAN','DEATH','TEMPERANCE',
  'THE DEVIL','THE TOWER','THE STAR','THE MOON','THE SUN',
  'JUDGEMENT','THE WORLD'
];

// 마이너 아르카나: 슈트 + 랭크
const SUITS = ['wands', 'cups', 'swords', 'pentacles'];
const SUIT_LABELS = { wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };
const SUIT_SYMBOLS = { wands: '🔥', cups: '💧', swords: '🌬️', pentacles: '🌍' };
const SUIT_COLORS = { wands: '#FF6D00', cups: '#E91E63', swords: '#1E88E5', pentacles: '#43A047' };
const RANKS = ['Ace','2','3','4','5','6','7','8','9','10','Page','Knight','Queen','King'];

function getMinorInfo(id) {
  const minorIdx = id - 22;
  const suitIdx = Math.floor(minorIdx / 14);
  const rankIdx = minorIdx % 14;
  const suit = SUITS[suitIdx];
  return {
    suit,
    rank: RANKS[rankIdx],
    label: `${SUIT_LABELS[suit]} ${RANKS[rankIdx]}`,
    symbol: SUIT_SYMBOLS[suit],
    color: SUIT_COLORS[suit],
    name: `${RANKS[rankIdx]} OF ${suit.toUpperCase()}`,
  };
}

function MinorArcanaCard({ info }) {
  const isCourt = ['Page','Knight','Queen','King'].includes(info.rank);
  const courtIcons = { Page: '📜', Knight: '🐎', Queen: '👑', King: '🏰' };
  return (
    <div className="tarot-card-art tarot-minor-card" style={{ background: `linear-gradient(135deg, ${info.color}22, ${info.color}44)`, border: `2px solid ${info.color}66` }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: isCourt ? '32px' : '36px', marginBottom: '6px' }}>
          {isCourt ? courtIcons[info.rank] : info.symbol}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: info.color, letterSpacing: '0.5px', marginBottom: '4px' }}>
          {info.label}
        </div>
        <div style={{ fontSize: '9px', color: '#999', letterSpacing: '1px' }}>
          {info.name}
        </div>
      </div>
      <div className="tarot-card-art-frame" />
      <div className="tarot-card-art-shine" />
    </div>
  );
}

// 프레임 오버레이: 10세트 x 4장
const FRAME_SETS = 10;
const FRAME_VARIANTS = 4;

function TarotCardArt({ cardId, deck = 'newclassic', variant: propVariant, frameSet: propFrameSet, frameV: propFrameV, noFrame = false }) {
  const id = Math.min(Math.max(cardId || 0, 0), 77);
  const isMajor = id <= 21;

  // 프레임 오버레이 — 상위에서 고정값을 받거나 폴백 랜덤
  const frameIdx = useMemo(() => {
    const set = propFrameSet ?? Math.floor(Math.random() * FRAME_SETS);
    const v = propFrameV ?? Math.floor(Math.random() * FRAME_VARIANTS);
    return { set, v };
  }, [propFrameSet, propFrameV]);
  const frameSrc = `/tarot-frames/frame_${frameIdx.set}_${frameIdx.v}.webp`;

  // love 덱은 SVG 렌더링 (메이저만)
  if (isMajor && deck === 'love') {
    return (
      <div className="tarot-card-art">
        <LoveTarotSVG cardId={id} />
        {!noFrame && <img src={frameSrc} alt="" className="tarot-card-frame-overlay" draggable={false} />}
        <div className="tarot-card-art-shine" />
      </div>
    );
  }

  // jester 덱: 76장만 존재 (m00~m75) → id 76/77은 id%76으로 폴백
  let effectiveId = id;
  if (deck === 'jester' && id >= 76) effectiveId = id % 76;
  const num = String(effectiveId).padStart(2, '0');
  const basePath = DECK_PATHS[deck] || DECK_PATHS.newclassic;

  // 4벌 변형 덱: prop으로 받으면 고정, 없으면 랜덤
  const randomVariant = useMemo(() => Math.floor(Math.random() * 4), [id, deck]);
  const variant = propVariant ?? randomVariant;
  const isMulti = MULTI_VARIANT_DECKS.has(deck);

  const imgSrc = isMulti
    ? `${basePath}/m${num}_v${variant}.webp`
    : `${basePath}/m${num}.webp`;

  return (
    <div className="tarot-card-art">
      <img
        src={imgSrc}
        alt={isMajor ? MAJOR_NAMES[id] : getMinorInfo(id).name}
        className="tarot-card-art-img"
        draggable={false}
        loading="eager"
      />
      {!noFrame && <img src={frameSrc} alt="" className="tarot-card-frame-overlay" draggable={false} />}
      <div className="tarot-card-art-shine" />
    </div>
  );
}

export default TarotCardArt;
