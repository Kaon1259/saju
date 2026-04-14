/**
 * 타로 78장 — 덱 선택 지원
 * - classic, skt, custom: 단일 이미지
 * - dark, romantic, oriental, western: 4벌 변형 (m00_v0~v3.jpg)
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
// 앱 시작 시 전체 프레임 프리로드
(function preloadAllFrames() {
  for (let s = 0; s < 10; s++) {
    for (let v = 0; v < 4; v++) {
      preloadFrame(`/tarot-frames/frame_${s}_${v}.png`);
    }
  }
})();

const DECK_PATHS = {
  classic: '/tarot',
  skt: '/tarot-skt',
  custom: '/tarot-custom',
  dark: '/tarot-dark',
  romantic: '/tarot-romantic',
  oriental: '/tarot-oriental',
  western: '/tarot-western',
  classic_rws: '/tarot-classic-rws',
  girl: '/tarot-girl',
  boy: '/tarot-boy',
  cartoon_girl: '/tarot-cartoon-girl',
  cats: '/tarot-cats',
  dogs: '/tarot-dogs',
};

// 4벌 변형 덱 (각 카드마다 _v0~v3)
const MULTI_VARIANT_DECKS = new Set(['oriental', 'western', 'dark', 'romantic', 'classic_rws', 'girl', 'boy', 'cartoon_girl', 'cats', 'dogs']);

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

function TarotCardArt({ cardId, deck = 'classic', variant: propVariant, frameSet: propFrameSet, frameV: propFrameV, noFrame = false }) {
  const id = Math.min(Math.max(cardId || 0, 0), 77);
  const isMajor = id <= 21;

  // 프레임 오버레이 — 상위에서 고정값을 받거나 폴백 랜덤
  const frameIdx = useMemo(() => {
    const set = propFrameSet ?? Math.floor(Math.random() * FRAME_SETS);
    const v = propFrameV ?? Math.floor(Math.random() * FRAME_VARIANTS);
    return { set, v };
  }, [propFrameSet, propFrameV]);
  const frameSrc = `/tarot-frames/frame_${frameIdx.set}_${frameIdx.v}.png`;

  // 덱별 이미지 없는 카드 — 심볼 폴백
  const MISSING_CUSTOM = new Set([28,29, 42,43, 56,57, 70,71]);
  const missingSet = deck === 'custom' ? MISSING_CUSTOM : new Set();

  if (!isMajor && missingSet.has(id)) {
    return <MinorArcanaCard info={getMinorInfo(id)} />;
  }

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

  const num = String(id).padStart(2, '0');
  const basePath = DECK_PATHS[deck] || DECK_PATHS.classic;

  // 4벌 변형 덱: prop으로 받으면 고정, 없으면 랜덤
  const randomVariant = useMemo(() => Math.floor(Math.random() * 4), [id, deck]);
  let variant = propVariant ?? randomVariant;
  const isMulti = MULTI_VARIANT_DECKS.has(deck);

  // classic_rws m77: v2 누락 → v0으로 폴백
  if (deck === 'classic_rws' && id === 77 && variant === 2) variant = 0;

  const imgSrc = isMulti
    ? `${basePath}/m${num}_v${variant}.jpg`
    : `${basePath}/m${num}.jpg`;

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
