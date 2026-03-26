import './ZodiacGrid.css';

const ZODIAC_ANIMALS = [
  { name: '쥐', emoji: '🐭', color: '#6366F1', element: '수' },
  { name: '소', emoji: '🐮', color: '#8B5CF6', element: '토' },
  { name: '호랑이', emoji: '🐯', color: '#F59E0B', element: '목' },
  { name: '토끼', emoji: '🐰', color: '#EC4899', element: '목' },
  { name: '용', emoji: '🐲', color: '#EF4444', element: '토' },
  { name: '뱀', emoji: '🐍', color: '#10B981', element: '화' },
  { name: '말', emoji: '🐴', color: '#D946EF', element: '화' },
  { name: '양', emoji: '🐑', color: '#A78BFA', element: '토' },
  { name: '원숭이', emoji: '🐵', color: '#F97316', element: '금' },
  { name: '닭', emoji: '🐔', color: '#DC2626', element: '금' },
  { name: '개', emoji: '🐶', color: '#3B82F6', element: '토' },
  { name: '돼지', emoji: '🐷', color: '#F472B6', element: '수' },
];

function ZodiacGrid({ selected, onSelect, scores }) {
  return (
    <div className="zodiac-grid">
      {ZODIAC_ANIMALS.map((animal, index) => {
        const score = scores?.[animal.name];
        const isActive = selected === animal.name;
        return (
          <button
            key={animal.name}
            className={`zodiac-item ${isActive ? 'zodiac-item--selected' : ''}`}
            style={{ '--z-color': animal.color, animationDelay: `${index * 35}ms` }}
            onClick={() => onSelect(animal.name)}
          >
            <div className="zodiac-glow" />
            <span className="zodiac-emoji">{animal.emoji}</span>
            <span className="zodiac-name">{animal.name}</span>
            {score !== undefined && (
              <span className="zodiac-score">{score}<small>점</small></span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { ZODIAC_ANIMALS };
export default ZodiacGrid;
