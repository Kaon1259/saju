/**
 * 메이저 아르카나 22장 — 덱 선택 지원
 * - classic: Rider-Waite-Smith (1909, 퍼블릭 도메인)
 * - skt: SKT Vitruvian (CC-BY, Benebell Wen)
 */

const DECK_PATHS = {
  classic: '/tarot',
  skt: '/tarot-skt',
};

const CARD_NAMES = [
  'THE FOOL','THE MAGICIAN','THE HIGH PRIESTESS','THE EMPRESS','THE EMPEROR',
  'THE HIEROPHANT','THE LOVERS','THE CHARIOT','STRENGTH','THE HERMIT',
  'WHEEL OF FORTUNE','JUSTICE','THE HANGED MAN','DEATH','TEMPERANCE',
  'THE DEVIL','THE TOWER','THE STAR','THE MOON','THE SUN',
  'JUDGEMENT','THE WORLD'
];

function TarotCardArt({ cardId, deck = 'classic' }) {
  const id = Math.min(Math.max(cardId || 0, 0), 21);
  const num = String(id).padStart(2, '0');
  const basePath = DECK_PATHS[deck] || DECK_PATHS.classic;

  return (
    <div className="tarot-card-art">
      <img
        src={`${basePath}/m${num}.jpg`}
        alt={CARD_NAMES[id]}
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
