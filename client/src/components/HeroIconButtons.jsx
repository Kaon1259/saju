import { useNavigate } from 'react-router-dom';

/**
 * 페이지 히어로 카드 안쪽 좌우 상단에 들어가는 작은 원형 아이콘 버튼.
 * 부모 컨테이너는 position:relative 여야 하며, 좌우 패딩을 ~48px 정도 잡아야 텍스트와 겹치지 않음.
 *
 *   <section style={{position:'relative'}}>
 *     <HeroIconButtons onReset={handleReset} color="#E91E63" />
 *     ...히어로 내용...
 *   </section>
 */
function HeroIconButtons({ onBack, onReset, color }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));
  const style = color ? { '--hib-color': color } : undefined;
  return (
    <>
      <button
        className="hero-iconbtn hero-iconbtn--back"
        onClick={handleBack}
        style={style}
        aria-label="뒤로"
      >
        <span>‹</span>
      </button>
      {onReset && (
        <button
          className="hero-iconbtn hero-iconbtn--reset"
          onClick={onReset}
          style={style}
          aria-label="다시하기"
        >
          <span>↻</span>
        </button>
      )}
    </>
  );
}

export default HeroIconButtons;
