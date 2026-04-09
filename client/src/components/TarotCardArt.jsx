/**
 * 타로 78장 — 덱 선택 지원
 * - classic: Rider-Waite-Smith (1909, 퍼블릭 도메인)
 * - skt: SKT Vitruvian (CC-BY, Benebell Wen)
 * - love: 1:1연애 오리지널 (SVG, 핑크/로맨틱)
 * - dark: Dark Gothic 포토리얼리스틱
 *
 * 메이저 아르카나(0-21): m00.jpg ~ m21.jpg
 * 마이너 아르카나(22-77): 슈트별 이미지 또는 심볼 카드
 */

import LoveTarotSVG from './LoveTarotSVG';

const DECK_PATHS = {
  classic: '/tarot',
  skt: '/tarot-skt',
  custom: '/tarot-custom',
  dark: '/tarot-dark',
};

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

function TarotCardArt({ cardId, deck = 'classic' }) {
  const id = Math.min(Math.max(cardId || 0, 0), 77);
  const isMajor = id <= 21;

  // 덱별 이미지 없는 카드 — 심볼 폴백
  const MISSING_CUSTOM = new Set([28,29, 42,43, 56,57, 70,71]);
  const MISSING_DARK = new Set([
    15, 17,  // Devil, Star
    23,24,25,26,27,28,29,30,31,32,33,34,  // Wands 2~Queen
    36,37,38,39,40,41,42,  // Cups Ace~7
    77,  // King of Pentacles
  ]);
  const missingSet = deck === 'dark' ? MISSING_DARK : MISSING_CUSTOM;

  if (!isMajor && missingSet.has(id)) {
    return <MinorArcanaCard info={getMinorInfo(id)} />;
  }
  if (isMajor && deck === 'dark' && MISSING_DARK.has(id)) {
    return <MinorArcanaCard info={{ label: MAJOR_NAMES[id], name: MAJOR_NAMES[id], symbol: '🖤', color: '#666', rank: '' }} />;
  }

  // love 덱은 SVG 렌더링 (메이저만)
  if (isMajor && deck === 'love') {
    return (
      <div className="tarot-card-art">
        <LoveTarotSVG cardId={id} />
        <div className="tarot-card-art-frame" />
        <div className="tarot-card-art-shine" />
      </div>
    );
  }

  const num = String(id).padStart(2, '0');
  const basePath = DECK_PATHS[deck] || DECK_PATHS.classic;

  return (
    <div className="tarot-card-art">
      <img
        src={`${basePath}/m${num}.jpg`}
        alt={isMajor ? MAJOR_NAMES[id] : getMinorInfo(id).name}
        className="tarot-card-art-img"
        draggable={false}
        loading="eager"
      />
      <div className="tarot-card-art-frame" />
      <div className="tarot-card-art-shine" />
    </div>
  );
}

export default TarotCardArt;
