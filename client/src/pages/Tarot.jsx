import { useState, useEffect, useRef, useCallback } from 'react';
import { getTarotReadingStream, drawTarotCards } from '../api/fortune';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import TarotCardArt from '../components/TarotCardArt';
import { playTarotReveal, playCardShuffle } from '../utils/sounds';
import FortuneLoading from '../components/FortuneLoading';
import StreamText from '../components/StreamText';
import './Tarot.css';

// ═══════════════════════════════════════════════════
// 타로 78장 데이터 (메이저 22 + 마이너 56)
// ═══════════════════════════════════════════════════
const ALL_CARDS = [
  // ── 메이저 아르카나 (0-21) ──
  { id: 0,  nameEn: 'The Fool',            nameKr: '광대',          color: '#FFD700', msg: '새로운 시작과 모험의 기운이 감돕니다. 두려움 없이 한 걸음을 내딛으세요.' },
  { id: 1,  nameEn: 'The Magician',        nameKr: '마법사',        color: '#FF6B35', msg: '당신에게는 원하는 것을 현실로 만들 힘이 있습니다.' },
  { id: 2,  nameEn: 'The High Priestess',  nameKr: '여사제',        color: '#4A90D9', msg: '내면의 목소리에 귀 기울이세요. 직관이 답을 알고 있습니다.' },
  { id: 3,  nameEn: 'The Empress',         nameKr: '여황제',        color: '#2ECC71', msg: '풍요와 창조의 에너지가 넘칩니다. 사랑이 꽃피는 시기입니다.' },
  { id: 4,  nameEn: 'The Emperor',         nameKr: '황제',          color: '#E74C3C', msg: '질서와 리더십을 발휘할 때입니다. 계획대로 진행하세요.' },
  { id: 5,  nameEn: 'The Hierophant',      nameKr: '교황',          color: '#8E44AD', msg: '전통과 가르침 안에서 답을 찾으세요. 좋은 멘토를 만나게 됩니다.' },
  { id: 6,  nameEn: 'The Lovers',          nameKr: '연인',          color: '#FF69B4', msg: '중요한 선택의 기로에 섰습니다. 마음이 이끄는 방향을 따르세요.' },
  { id: 7,  nameEn: 'The Chariot',         nameKr: '전차',          color: '#3498DB', msg: '강한 의지로 전진하세요. 승리가 기다리고 있습니다.' },
  { id: 8,  nameEn: 'Strength',            nameKr: '힘',            color: '#F39C12', msg: '부드러운 힘이 강한 힘을 이깁니다. 인내심이 보상받습니다.' },
  { id: 9,  nameEn: 'The Hermit',          nameKr: '은둔자',        color: '#7F8C8D', msg: '내면을 탐구하면 답을 찾게 됩니다. 조용한 지혜가 빛납니다.' },
  { id: 10, nameEn: 'Wheel of Fortune',    nameKr: '운명의 수레바퀴', color: '#9B59B6', msg: '운명의 전환점에 섰습니다. 변화를 받아들이세요.' },
  { id: 11, nameEn: 'Justice',             nameKr: '정의',          color: '#1ABC9C', msg: '정당한 결과를 받게 됩니다. 공정하게 행동하세요.' },
  { id: 12, nameEn: 'The Hanged Man',      nameKr: '매달린 사람',   color: '#2980B9', msg: '다른 관점에서 바라보세요. 전략적 기다림이 필요합니다.' },
  { id: 13, nameEn: 'Death',               nameKr: '죽음',          color: '#2C3E50', msg: '하나의 장이 끝나고 새로운 장이 열립니다. 변화가 성장을 가져옵니다.' },
  { id: 14, nameEn: 'Temperance',          nameKr: '절제',          color: '#16A085', msg: '균형과 조화를 유지하세요. 중용의 길이 답입니다.' },
  { id: 15, nameEn: 'The Devil',           nameKr: '악마',          color: '#C0392B', msg: '자신을 속박하는 것에서 벗어나세요. 자유를 되찾을 때입니다.' },
  { id: 16, nameEn: 'The Tower',           nameKr: '탑',            color: '#E67E22', msg: '예상치 못한 변화가 옵니다. 파괴 후에 재건이 있습니다.' },
  { id: 17, nameEn: 'The Star',            nameKr: '별',            color: '#F1C40F', msg: '희망의 빛이 비칩니다. 치유와 회복의 시간입니다.' },
  { id: 18, nameEn: 'The Moon',            nameKr: '달',            color: '#BDC3C7', msg: '숨겨진 것들이 드러나는 시기입니다. 직감을 믿으세요.' },
  { id: 19, nameEn: 'The Sun',             nameKr: '태양',          color: '#F4D03F', msg: '성공과 기쁨의 시기입니다. 자신감을 갖고 빛나세요.' },
  { id: 20, nameEn: 'Judgement',           nameKr: '심판',          color: '#8E44AD', msg: '과거를 돌아보고 새롭게 시작할 때입니다. 내면의 소명을 따르세요.' },
  { id: 21, nameEn: 'The World',           nameKr: '세계',          color: '#27AE60', msg: '하나의 순환이 완성됩니다. 목표를 달성하고 새로운 차원으로 나아갑니다.' },

  // ── 완드 (Wands) 22-35: 열정·행동·창조 ──
  { id: 22, nameEn: 'Ace of Wands',    nameKr: '완드 에이스',  color: '#FF4500', msg: '뜨거운 열정이 타오릅니다. 새로운 사랑의 불꽃이 시작되는 순간이에요.' },
  { id: 23, nameEn: 'Two of Wands',    nameKr: '완드 2',       color: '#FF5722', msg: '두 갈래 길 앞에서 용기 있는 선택을 하세요. 새로운 가능성이 열립니다.' },
  { id: 24, nameEn: 'Three of Wands',  nameKr: '완드 3',       color: '#FF6F00', msg: '기다려온 소식이 곧 도착합니다. 넓은 시야로 사랑을 바라보세요.' },
  { id: 25, nameEn: 'Four of Wands',   nameKr: '완드 4',       color: '#FFA000', msg: '축하할 일이 생깁니다. 함께하는 기쁨이 두 배가 되는 시기예요.' },
  { id: 26, nameEn: 'Five of Wands',   nameKr: '완드 5',       color: '#E65100', msg: '작은 갈등이 있지만 경쟁 속에서 성장합니다. 솔직하게 마음을 전하세요.' },
  { id: 27, nameEn: 'Six of Wands',    nameKr: '완드 6',       color: '#FF8F00', msg: '승리와 인정의 기운! 자신감 있게 다가가면 좋은 결과가 옵니다.' },
  { id: 28, nameEn: 'Seven of Wands',  nameKr: '완드 7',       color: '#E64A19', msg: '당당하게 자신을 지키세요. 흔들리지 않는 마음이 사랑을 지킵니다.' },
  { id: 29, nameEn: 'Eight of Wands',  nameKr: '완드 8',       color: '#FF7043', msg: '급물살을 타는 전개! 연락이 오고, 만남이 빨라지고, 설렘이 커집니다.' },
  { id: 30, nameEn: 'Nine of Wands',   nameKr: '완드 9',       color: '#D84315', msg: '조금만 더 버텨보세요. 포기하지 않는 마음이 사랑을 완성합니다.' },
  { id: 31, nameEn: 'Ten of Wands',    nameKr: '완드 10',      color: '#BF360C', msg: '짊어진 짐을 내려놓을 때입니다. 혼자 다 안아도 되는 거예요.' },
  { id: 32, nameEn: 'Page of Wands',   nameKr: '완드 시종',    color: '#FF9100', msg: '설레는 소식이 찾아옵니다. 호기심 가득한 새 만남의 기운이에요.' },
  { id: 33, nameEn: 'Knight of Wands', nameKr: '완드 기사',    color: '#FF6D00', msg: '열정적인 사람이 다가옵니다. 불꽃같은 어드벤처가 시작됩니다.' },
  { id: 34, nameEn: 'Queen of Wands',  nameKr: '완드 여왕',    color: '#F4511E', msg: '매력이 빛나는 시기입니다. 자신감이 곧 최고의 매력이에요.' },
  { id: 35, nameEn: 'King of Wands',   nameKr: '완드 왕',      color: '#DD2C00', msg: '리더십과 카리스마가 넘칩니다. 주도적으로 사랑을 이끌어보세요.' },

  // ── 컵 (Cups) 36-49: 감정·사랑·관계 ──
  { id: 36, nameEn: 'Ace of Cups',     nameKr: '컵 에이스',    color: '#E91E63', msg: '사랑의 샘이 솟아오릅니다. 새로운 감정의 시작, 마음을 활짝 여세요.' },
  { id: 37, nameEn: 'Two of Cups',     nameKr: '컵 2',         color: '#F06292', msg: '두 마음이 하나로 연결됩니다. 운명적인 만남, 깊은 유대감의 카드예요.' },
  { id: 38, nameEn: 'Three of Cups',   nameKr: '컵 3',         color: '#EC407A', msg: '함께하는 기쁨이 넘칩니다. 축하와 우정, 사랑이 어우러지는 시간이에요.' },
  { id: 39, nameEn: 'Four of Cups',    nameKr: '컵 4',         color: '#AD1457', msg: '지금 있는 것에 감사해보세요. 놓치고 있는 소중한 사랑이 곁에 있어요.' },
  { id: 40, nameEn: 'Five of Cups',    nameKr: '컵 5',         color: '#880E4F', msg: '슬픔 뒤에 남아있는 희망을 보세요. 아직 채워지지 않은 컵이 있습니다.' },
  { id: 41, nameEn: 'Six of Cups',     nameKr: '컵 6',         color: '#FF80AB', msg: '달콤한 추억이 미소 짓게 합니다. 순수했던 그 감정을 다시 떠올려보세요.' },
  { id: 42, nameEn: 'Seven of Cups',   nameKr: '컵 7',         color: '#F48FB1', msg: '꿈과 환상이 가득합니다. 진짜 원하는 사랑이 무엇인지 마음에 물어보세요.' },
  { id: 43, nameEn: 'Eight of Cups',   nameKr: '컵 8',         color: '#C2185B', msg: '더 깊은 사랑을 찾아 떠날 용기. 지금의 안주가 진짜 행복은 아닐 수 있어요.' },
  { id: 44, nameEn: 'Nine of Cups',    nameKr: '컵 9',         color: '#D81B60', msg: '소원이 이루어지는 카드! 원하던 사랑이 현실이 되는 행복한 시기예요.' },
  { id: 45, nameEn: 'Ten of Cups',     nameKr: '컵 10',        color: '#E91E63', msg: '완벽한 사랑의 완성. 무지개 아래 행복한 결말이 기다리고 있어요.' },
  { id: 46, nameEn: 'Page of Cups',    nameKr: '컵 시종',      color: '#F8BBD0', msg: '순수한 감정의 메시지가 옵니다. 첫사랑 같은 설렘을 느끼게 될 거예요.' },
  { id: 47, nameEn: 'Knight of Cups',  nameKr: '컵 기사',      color: '#CE93D8', msg: '로맨틱한 백마탄 왕자가 다가옵니다. 감성적인 고백이 기다리고 있어요.' },
  { id: 48, nameEn: 'Queen of Cups',   nameKr: '컵 여왕',      color: '#AB47BC', msg: '깊은 공감과 따뜻한 사랑의 에너지. 직관으로 상대의 마음을 읽어보세요.' },
  { id: 49, nameEn: 'King of Cups',    nameKr: '컵 왕',        color: '#7B1FA2', msg: '감정의 균형을 이룬 성숙한 사랑. 흔들리지 않는 깊은 애정이 빛납니다.' },

  // ── 소드 (Swords) 50-63: 지성·진실·결단 ──
  { id: 50, nameEn: 'Ace of Swords',     nameKr: '소드 에이스',  color: '#42A5F5', msg: '명확한 진실의 순간. 관계의 본질을 꿰뚫어 보는 통찰력이 생깁니다.' },
  { id: 51, nameEn: 'Two of Swords',     nameKr: '소드 2',       color: '#5C6BC0', msg: '선택의 기로에서 두 눈을 감고 마음의 소리를 들어보세요.' },
  { id: 52, nameEn: 'Three of Swords',   nameKr: '소드 3',       color: '#7986CB', msg: '마음의 상처가 아프지만, 이 아픔이 더 깊은 사랑을 알게 해줍니다.' },
  { id: 53, nameEn: 'Four of Swords',    nameKr: '소드 4',       color: '#90CAF9', msg: '지친 마음에 휴식이 필요합니다. 쉬어가야 더 멀리 사랑할 수 있어요.' },
  { id: 54, nameEn: 'Five of Swords',    nameKr: '소드 5',       color: '#455A64', msg: '이기려 하지 마세요. 사랑에서 승부욕은 둘 다 지게 만듭니다.' },
  { id: 55, nameEn: 'Six of Swords',     nameKr: '소드 6',       color: '#78909C', msg: '힘든 시기를 지나 평화로운 곳으로 향하고 있어요. 더 나은 날이 옵니다.' },
  { id: 56, nameEn: 'Seven of Swords',   nameKr: '소드 7',       color: '#546E7A', msg: '숨기고 있는 것이 있나요? 솔직함이 관계를 더 단단하게 만듭니다.' },
  { id: 57, nameEn: 'Eight of Swords',   nameKr: '소드 8',       color: '#607D8B', msg: '스스로 만든 감옥에서 벗어나세요. 두려움은 생각보다 작습니다.' },
  { id: 58, nameEn: 'Nine of Swords',    nameKr: '소드 9',       color: '#37474F', msg: '밤새 걱정하지 마세요. 불안은 실제보다 크게 느껴지는 법이에요.' },
  { id: 59, nameEn: 'Ten of Swords',     nameKr: '소드 10',      color: '#263238', msg: '가장 힘든 순간은 지났습니다. 바닥을 찍었으니 이제 올라갈 일만 남았어요.' },
  { id: 60, nameEn: 'Page of Swords',    nameKr: '소드 시종',    color: '#64B5F6', msg: '호기심 어린 눈으로 진실을 찾아보세요. 새로운 관점이 열립니다.' },
  { id: 61, nameEn: 'Knight of Swords',  nameKr: '소드 기사',    color: '#1E88E5', msg: '거침없이 돌진하는 에너지. 하지만 상대의 마음도 헤아려주세요.' },
  { id: 62, nameEn: 'Queen of Swords',   nameKr: '소드 여왕',    color: '#1565C0', msg: '냉철한 판단력으로 관계를 정리하세요. 현명한 선택이 행복을 가져옵니다.' },
  { id: 63, nameEn: 'King of Swords',    nameKr: '소드 왕',      color: '#0D47A1', msg: '이성적이고 공정한 시선으로 바라보세요. 진심은 논리 너머에 있습니다.' },

  // ── 펜타클 (Pentacles) 64-77: 안정·현실·풍요 ──
  { id: 64, nameEn: 'Ace of Pentacles',     nameKr: '펜타클 에이스', color: '#43A047', msg: '풍요로운 새 시작! 현실적인 사랑의 기반이 단단하게 놓이고 있어요.' },
  { id: 65, nameEn: 'Two of Pentacles',     nameKr: '펜타클 2',      color: '#66BB6A', msg: '일과 사랑 사이에서 균형을 찾으세요. 유연하게 대처하면 둘 다 잡을 수 있어요.' },
  { id: 66, nameEn: 'Three of Pentacles',   nameKr: '펜타클 3',      color: '#4CAF50', msg: '함께 만들어가는 사랑. 서로의 노력이 관계를 더 견고하게 합니다.' },
  { id: 67, nameEn: 'Four of Pentacles',    nameKr: '펜타클 4',      color: '#388E3C', msg: '마음을 꽉 쥐고 있지 마세요. 놓아줄 때 더 큰 사랑이 들어옵니다.' },
  { id: 68, nameEn: 'Five of Pentacles',    nameKr: '펜타클 5',      color: '#2E7D32', msg: '외로움을 느끼고 있나요? 도움의 손길은 생각보다 가까이에 있어요.' },
  { id: 69, nameEn: 'Six of Pentacles',     nameKr: '펜타클 6',      color: '#81C784', msg: '주고받는 사랑의 균형. 베풀 줄 아는 마음이 더 큰 행복을 가져옵니다.' },
  { id: 70, nameEn: 'Seven of Pentacles',   nameKr: '펜타클 7',      color: '#A5D6A7', msg: '씨앗을 뿌려놓은 사랑이 자라고 있어요. 조급해하지 말고 기다려보세요.' },
  { id: 71, nameEn: 'Eight of Pentacles',   nameKr: '펜타클 8',      color: '#558B2F', msg: '사랑도 연습이 필요해요. 꾸준한 노력이 완벽한 관계를 만듭니다.' },
  { id: 72, nameEn: 'Nine of Pentacles',    nameKr: '펜타클 9',      color: '#689F38', msg: '독립적이고 당당한 매력이 빛납니다. 자기 자신을 사랑하는 것이 먼저예요.' },
  { id: 73, nameEn: 'Ten of Pentacles',     nameKr: '펜타클 10',     color: '#33691E', msg: '오래도록 이어지는 풍요로운 사랑. 가족 같은 안정감이 찾아옵니다.' },
  { id: 74, nameEn: 'Page of Pentacles',    nameKr: '펜타클 시종',   color: '#7CB342', msg: '진지하고 성실한 만남의 기운. 천천히 다가오는 사랑이 더 오래갑니다.' },
  { id: 75, nameEn: 'Knight of Pentacles',  nameKr: '펜타클 기사',   color: '#9E9D24', msg: '느리지만 확실한 사람이 옵니다. 변함없는 마음이 진짜 사랑이에요.' },
  { id: 76, nameEn: 'Queen of Pentacles',   nameKr: '펜타클 여왕',   color: '#827717', msg: '따뜻한 보살핌과 현실적인 사랑. 안정감 속에서 사랑이 꽃핍니다.' },
  { id: 77, nameEn: 'King of Pentacles',    nameKr: '펜타클 왕',     color: '#6D4C41', msg: '든든하고 신뢰할 수 있는 사랑. 물질적·정서적 풍요가 함께합니다.' },
];

const SPREADS = [
  { id: 'one',   label: '원카드',   count: 1, icon: '🎴', desc: '핵심 한 장', color: '#FF9800', cost: 1 },
  { id: 'three', label: '쓰리카드', count: 3, icon: '🃏', desc: '과거·현재·미래', color: '#9B59B6', cost: 3 },
  { id: 'five',  label: '켈틱',     count: 5, icon: '✨', desc: '상황·장애·조언·결과', color: '#E91E63', cost: 5 },
];

const TAROT_LOVE_TYPES = [
  // 솔로
  { id: 'crush',              label: '짝사랑운',   icon: '💘', group: 'solo' },
  { id: 'blind_date',         label: '소개팅운',   icon: '🤝', group: 'solo' },
  { id: 'meeting_timing',     label: '만남의 시기', icon: '🔮', group: 'solo' },
  { id: 'ideal_type',         label: '이상형 분석', icon: '👩‍❤️‍👨', group: 'solo' },
  // 썸/연애
  { id: 'relationship',       label: '연애운',     icon: '💕', group: 'love' },
  { id: 'confession_timing',  label: '고백 타이밍', icon: '💌', group: 'love' },
  { id: 'mind_reading',       label: '속마음 타로', icon: '🔍', group: 'love' },
  { id: 'couple_fortune',     label: '데이트 운세', icon: 'couple', group: 'love' },
  // 결혼/인연
  { id: 'marriage',           label: '결혼운',     icon: 'wedding', group: 'marriage' },
  { id: 'remarriage',         label: '재혼운',     icon: '💍', group: 'marriage' },
  { id: 'reunion',            label: '재회운',     icon: '💔', group: 'marriage' },
  { id: 'past_life',          label: '전생 인연',   icon: '🌌', group: 'marriage' },
];

const TAROT_LOVE_GROUPS = [
  { key: 'solo', label: '솔로를 위한', emoji: '✨' },
  { key: 'love', label: '썸/연애 중', emoji: '💗' },
  { key: 'marriage', label: '결혼/인연', emoji: '💒' },
];

const OTHER_CATEGORIES = [
  { id: 'general',    label: '종합운',    icon: '🔮', color: '#9B59B6' },
  { id: 'money',      label: '재물운',    icon: '💰', color: '#F4D03F' },
  { id: 'career',     label: '직업운',    icon: '💼', color: '#3498DB' },
  { id: 'health',     label: '건강운',    icon: '💚', color: '#2ECC71' },
];

const POSITION_LABELS = {
  one: ['현재의 메시지'],
  three: ['과거', '현재', '미래'],
  five: ['현재 상황', '장애물', '잠재의식', '조언', '결과'],
};

// ── 인트로: 카드 앞면 바로 등장 → 글로우 → 페이드아웃 ──
function TarotIntro({ onDone, heroCardId, deck }) {
  const [phase, setPhase] = useState(0); // 0=등장, 1=글로우, 2=페이드아웃

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`tarot-intro ${phase >= 2 ? 'fade-out' : ''}`}>
      <div className="tarot-intro-bg">
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} className="tarot-intro-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            fontSize: `${1 + Math.random() * 3}px`,
          }}>✦</span>
        ))}
      </div>
      <div className={`tarot-intro-card-wrap ${phase >= 1 ? 'glow' : ''}`}>
        <TarotCardArt cardId={heroCardId} deck={deck} />
      </div>
    </div>
  );
}

function Tarot() {
  // ─── 상태 ───
  const [heroCardId] = useState(() => Math.floor(Math.random() * 78));
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState('setup');
  const [deck, setDeck] = useState(() => localStorage.getItem('tarotDeck') || 'custom');
  const [spread, setSpread] = useState('three');
  const [category, setCategory] = useState('relationship');
  const [question, setQuestion] = useState('');
  const [shuffledCards, setShuffledCards] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [revealedCards, setRevealedCards] = useState([]);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [shuffleAnim, setShuffleAnim] = useState(false);
  const [flipIndex, setFlipIndex] = useState(-1);
  const [focusCard, setFocusCard] = useState(null); // 클릭한 카드 인덱스
  const [showDeckModal, setShowDeckModal] = useState(false);
  const resultRef = useRef(null);
  const cleanupRef = useRef(null);

  // 반원 스와이프 상태
  const [arcOffset, setArcOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, offset: 0 });
  const arcContainerRef = useRef(null);



  useEffect(() => { return () => cleanupRef.current?.(); }, []);

  // 반원 스와이프 핸들러
  const handleArcDragStart = (clientX) => {
    if (pickingCard || allFilled) return;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, offset: arcOffset };
  };
  const handleArcDragMove = (clientX) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    // 1px 드래그 = 0.15도 회전
    setArcOffset(dragStartRef.current.offset + dx * 0.15);
  };
  const handleArcDragEnd = () => setIsDragging(false);

  // 네이티브 touchmove에서 preventDefault (passive 문제 해결)
  useEffect(() => {
    const el = arcContainerRef.current;
    if (!el) return;
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length > 0) handleArcDragMove(e.touches[0].clientX);
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  });

  const requiredCount = SPREADS.find(s => s.id === spread)?.count || 3;

  // ─── 카드 셔플 ───
  const startShuffle = useCallback(() => {
    playCardShuffle();
    setStep('shuffle');
    setShuffleAnim(true);
    setSelectedIndices([]);
    setRevealedCards([]);
    setReading(null);
    setFlipIndex(-1);

    const indices = Array.from({ length: 78 }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const cards = indices.map(idx => ({
      ...ALL_CARDS[idx],
      reversed: Math.random() > 0.5,
    }));

    setTimeout(() => {
      setShuffledCards(cards);
      setShuffleAnim(false);
      setStep('pick');
    }, 2000);
  }, []);

  // 카드 선택 애니메이션 상태
  const [pickingCard, setPickingCard] = useState(null); // 현재 중앙에 보여지는 카드
  const [filledSlots, setFilledSlots] = useState([]); // 덱에 채워진 카드들
  const [flyingToSlot, setFlyingToSlot] = useState(false); // 중앙→슬롯 이동 중
  const [allFilled, setAllFilled] = useState(false); // 모든 덱 완성

  const handleCardPick = (index) => {
    if (step !== 'pick' || pickingCard !== null) return;
    if (selectedIndices.includes(index)) return;
    if (selectedIndices.length >= requiredCount) return;

    const card = shuffledCards[index];
    setPickingCard({ ...card, index });

    // 1) 카드가 중앙에서 잠시 보여짐 (1.2초)
    setTimeout(() => {
      setFlyingToSlot(true);
      // 2) 중앙에서 덱 슬롯으로 날아감 (0.6초)
      setTimeout(() => {
        const newSelected = [...selectedIndices, index];
        const newFilled = [...filledSlots, card];
        setSelectedIndices(newSelected);
        setFilledSlots(newFilled);
        setPickingCard(null);
        setFlyingToSlot(false);

        if (newFilled.length === requiredCount) {
          setAllFilled(true);
        }
      }, 600);
    }, 1200);
  };

  const handleReadCards = () => {
    revealCards(selectedIndices);
  };

  const handleReshuffle = () => {
    setPickingCard(null);
    setFilledSlots([]);
    setFlyingToSlot(false);
    setAllFilled(false);
    setArcOffset(0);
    startShuffle();
  };

  const revealCards = async (indices) => {
    setStep('reveal');
    const cards = indices.map(i => shuffledCards[i]);
    setRevealedCards(cards);

    for (let i = 0; i < cards.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setFlipIndex(i);
    }

    await new Promise(r => setTimeout(r, 800));
    setLoading(true);
    setStreamText('');
    setAiStreaming(false);

    const cardIds = cards.map(c => c.id).join(',');
    const reversals = cards.map(c => c.reversed ? '1' : '0').join(',');

    const fallbackReading = {
      cards: cards.map((c, i) => ({
        ...c,
        position: POSITION_LABELS[spread]?.[i] || '카드',
        meaning: c.reversed
          ? '내면의 성찰이 필요한 시기입니다.'
          : '긍정적인 에너지가 당신을 감싸고 있습니다.',
      })),
      interpretation: '카드가 당신에게 보내는 메시지를 깊이 느껴보세요.',
      overallMessage: '카드의 지혜를 믿고 한 걸음 나아가세요.',
      advice: '마음을 열고 카드의 메시지에 귀 기울이세요.',
      luckyElement: '불(火)',
    };

    cleanupRef.current = getTarotReadingStream(cardIds, reversals, spread, category, question, {
      onCached: (data) => {
        setReading(data);
        setLoading(false);
        setStep('result');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
      },
      onChunk: (text) => {
        setLoading(false);
        setAiStreaming(true);
        setStreamText(prev => prev + text);
      },
      onDone: (fullText) => {
        setAiStreaming(false);
        setStreamText('');
        // 스트리밍 텍스트를 해석 텍스트로 읽딩에 저장
        setReading({
          ...fallbackReading,
          cards: cards.map((c, i) => ({
            ...c,
            position: POSITION_LABELS[spread]?.[i] || '카드',
            meaning: c.reversed
              ? '내면의 성찰이 필요한 시기입니다.'
              : '긍정적인 에너지가 당신을 감싸고 있습니다.',
          })),
          interpretation: fullText.trim(),
        });
        setLoading(false);
        setStep('result');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
      },
      onError: () => {
        setAiStreaming(false);
        setStreamText('');
        setReading(fallbackReading);
        setLoading(false);
        setStep('result');
      },
    });
  };

  const handleDeckChange = (d) => {
    setDeck(d);
    localStorage.setItem('tarotDeck', d);
  };

  const resetAll = () => {
    cleanupRef.current?.();
    setStep('setup');
    setSpread('three');
    setCategory('relationship');
    setQuestion('');
    setShuffledCards([]);
    setSelectedIndices([]);
    setRevealedCards([]);
    setReading(null);
    setFlipIndex(-1);
    setFocusCard(null);
    setStreamText('');
    setAiStreaming(false);
    setPickingCard(null);
    setFilledSlots([]);
    setFlyingToSlot(false);
    setAllFilled(false);
    setArcOffset(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (!reading) return;
    const text = `🔮 타로 리딩 결과\n\n` +
      revealedCards.map((c, i) => {
        const pos = POSITION_LABELS[spread]?.[i] || '';
        return `${pos}: ${c.nameKr} ${c.reversed ? '(역)' : '(정)'}`;
      }).join('\n') +
      `\n\n${reading.overallMessage}\n\n연애 앱에서 나만의 타로를 뽑아보세요!`;
    if (navigator.share) {
      navigator.share({ title: '타로 리딩 결과', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('결과가 복사되었습니다!');
    }
  };

  // ═══ 인트로 ═══
  if (showIntro) {
    return <TarotIntro heroCardId={heroCardId} deck={deck} onDone={() => setShowIntro(false)} />;
  }

  // ═══ 렌더링 ═══
  return (
    <div className="tarot-page">

      {/* ── 신비로운 배경 ── */}
      <div className="tarot-mystical-bg">
        {/* 떠다니는 카드 실루엣 */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`fc-${i}`} className="tarot-float-card" style={{
            left: `${10 + i * 20}%`,
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${8 + i * 2}s`,
            opacity: 0.04 + i * 0.01,
          }}>
            <TarotCardArt cardId={i * 4} deck={deck} />
          </div>
        ))}
        {/* 별 파티클 */}
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="tarot-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${Math.random() * 4 + 2}px`,
          }}>✦</span>
        ))}
        {/* 안개 레이어 */}
        <div className="tarot-mist tarot-mist--1" />
        <div className="tarot-mist tarot-mist--2" />
      </div>

      {/* ── 히어로: 오늘의 카드 (setup에서만 표시) ── */}
      {step === 'setup' && (
        <div className="tarot-hero">
          <div className="tarot-hero-glow" />
          <button className="tarot-deck-change-btn" onClick={() => setShowDeckModal(true)}>
            🃏 덱 변경
          </button>
          <p className="tarot-hero-badge">Today's Card</p>
          <div className="tarot-hero-card" onClick={() => setFocusCard('hero')} style={{ cursor: 'pointer' }}>
            <div className="tarot-hero-card-inner">
              <TarotCardArt cardId={heroCardId} deck={deck} />
            </div>
            <div className="tarot-hero-card-shine" />
          </div>
          <h1 className="tarot-title">{ALL_CARDS[heroCardId].nameKr}</h1>
          <p className="tarot-subtitle">{ALL_CARDS[heroCardId].nameEn}</p>
          <p className="tarot-hero-msg">{ALL_CARDS[heroCardId].msg}</p>
          <div className="tarot-hero-divider" />
        </div>
      )}

      {/* ═══ STEP 1: 설정 ═══ */}
      {step === 'setup' && (
        <div className="tarot-setup fade-in">
          {/* 궁금한 분야 */}
          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">✨</span>
              궁금한 분야
            </h2>

            {/* 연애 3그룹 (홈과 동일) */}
            <div className="tarot-cat-love-wrap">
              <div className="tarot-cat-love-hearts">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="tarot-cat-float-heart" style={{
                    left: `${8 + i * 12}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                    fontSize: `${10 + Math.random() * 8}px`,
                  }}>♥</span>
                ))}
              </div>
              {TAROT_LOVE_GROUPS.map(group => (
                <div key={group.key} className="tarot-love-group">
                  <h3 className="tarot-love-group-title">
                    <span>{group.emoji}</span> {group.label}
                  </h3>
                  <div className="tarot-love-cards">
                    {TAROT_LOVE_TYPES.filter(l => l.group === group.key).map(lt => (
                      <button key={lt.id}
                        className={`tarot-love-card ${category === lt.id ? 'active' : ''}`}
                        onClick={() => setCategory(lt.id)}>
                        <span className="tarot-love-icon">{lt.icon === 'couple'
                          ? <span className="couple-icon"><span className="couple-m">♂</span><span className="couple-heart">♡</span><span className="couple-f">♀</span></span>
                          : lt.icon === 'wedding'
                          ? <span className="wedding-icon"><span className="wedding-person"><span className="wedding-hat">🎩</span><span className="wedding-sym wedding-sym--m">♂</span></span><span className="wedding-person"><span className="wedding-hat">🎀</span><span className="wedding-sym wedding-sym--f">♀</span></span></span>
                          : lt.icon}</span>
                        <span className="tarot-love-label">{lt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 기타 카테고리 */}
            <div className="tarot-cat-grid" style={{ marginTop: '10px' }}>
              {OTHER_CATEGORIES.map(cat => (
                <button key={cat.id}
                  className={`tarot-cat-btn ${category === cat.id ? 'active' : ''}`}
                  style={{ '--cat-color': cat.color }}
                  onClick={() => setCategory(cat.id)}>
                  <span className="tarot-cat-icon">{cat.icon}</span>
                  <span className="tarot-cat-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 스프레드 선택 */}
          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">🎴</span>
              스프레드 선택
            </h2>
            <div className="tarot-spread-grid">
              {SPREADS.map(s => (
                <button key={s.id}
                  className={`tarot-spread-card ${spread === s.id ? 'active' : ''}`}
                  style={{ '--spread-color': s.color }}
                  onClick={() => setSpread(s.id)}>
                  <span className="tarot-spread-cost-badge">💗{s.cost}</span>
                  <span className="tarot-spread-icon">{s.icon}</span>
                  <span className="tarot-spread-label">{s.label}</span>
                  <span className="tarot-spread-count">{s.count}장</span>
                  <span className="tarot-spread-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tarot-section">
            <h2 className="tarot-section-title">
              <span className="tarot-section-icon">💭</span>
              질문 <span className="tarot-optional">(선택)</span>
            </h2>
            <textarea
              className="tarot-question glass-card"
              placeholder="카드에게 물어보고 싶은 것을 자유롭게 적어주세요..."
              value={question} onChange={e => setQuestion(e.target.value)}
              maxLength={200} rows={3}
            />
            {question && <div className="tarot-question-count">{question.length}/200</div>}
          </section>

          <button className="tarot-start-btn" onClick={startShuffle}>
            <span className="tarot-start-icon">🔮</span>
            <span>카드 셔플 시작</span>
            <span className="tarot-start-glow" />
          </button>
        </div>
      )}

      {/* ═══ STEP 2: 셔플 ═══ */}
      {step === 'shuffle' && (
        <div className="tarot-shuffle-stage">
          <div className="tarot-shuffle-deck">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i}
                className={`tarot-shuffle-card ${shuffleAnim ? 'shuffling' : ''}`}
                style={{ '--shuffle-i': i, animationDelay: `${i * 0.1}s` }}>
                <div className="tarot-card-back">
                  <div className="tarot-card-back-inner">
                    <div className="tarot-card-back-star">✦</div>
                    <div className="tarot-card-back-border" />
                    <div className="tarot-card-back-pattern">
                      <span>☽</span><span>✦</span><span>☾</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="tarot-shuffle-text">카드를 섞고 있습니다<span className="tarot-dots" /></p>
          <p className="tarot-shuffle-hint">마음을 가라앉히고 질문에 집중하세요</p>
          <button className="tarot-back-btn" onClick={resetAll}>🔄 다시 뽑기</button>
        </div>
      )}

      {/* ═══ STEP 3: 카드 선택 (반원형 배치) ═══ */}
      {step === 'pick' && (
        <div className="tarot-pick-stage fade-in">
          <div className="tarot-pick-header">
            <p className="tarot-pick-instruction">
              마음이 이끄는 카드 <strong>{requiredCount}장</strong>을 선택하세요
            </p>
            <div className="tarot-pick-counter">
              {filledSlots.length} / {requiredCount}
            </div>
          </div>

          {/* 반원형 카드 배치 — 좌우 스와이프로 78장 회전 */}
          <div className="tarot-arc-swipe-hint">← 좌우로 밀어서 카드를 돌려보세요 →</div>
          <div className="tarot-arc-container"
            ref={arcContainerRef}
            onMouseDown={e => handleArcDragStart(e.clientX)}
            onMouseMove={e => handleArcDragMove(e.clientX)}
            onMouseUp={handleArcDragEnd}
            onMouseLeave={handleArcDragEnd}
            onTouchStart={e => handleArcDragStart(e.touches[0].clientX)}
            onTouchEnd={handleArcDragEnd}
          >
            <div className="tarot-arc">
              {shuffledCards.map((card, index) => {
                const isSelected = selectedIndices.includes(index);
                const isPicking = pickingCard?.index === index;
                const total = shuffledCards.length;
                // 각 카드의 기본 각도 (78장을 360도에 배치) + 스와이프 오프셋
                const baseAngle = (index / total) * 360;
                const angle = baseAngle + arcOffset;
                // -180~180으로 정규화
                let norm = ((angle % 360) + 540) % 360 - 180;
                // 보이는 범위: -80~80도 (반원)
                if (norm < -85 || norm > 85) return null;

                return (
                  <button key={card.id}
                    className={`tarot-arc-card ${isSelected ? 'arc-picked' : ''} ${isPicking ? 'arc-picking' : ''}`}
                    style={{
                      '--arc-angle': `${norm}deg`,
                      zIndex: isPicking ? 100 : Math.round(85 - Math.abs(norm)),
                    }}
                    onClick={() => !isSelected && !pickingCard && !allFilled && handleCardPick(index)}
                    disabled={isSelected || pickingCard !== null || allFilled}>
                    <div className="tarot-card-back">
                      <div className="tarot-card-back-inner">
                        <div className="tarot-card-back-star">✦</div>
                        <div className="tarot-card-back-border" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 중앙 카드 공개 오버레이 */}
          {pickingCard && (
            <div className={`tarot-center-reveal ${flyingToSlot ? 'fly-to-slot' : 'reveal-in'}`}>
              <div className="tarot-center-card">
                <TarotCardArt cardId={pickingCard.id} deck={deck} />
                <div className="tarot-center-card-name">{pickingCard.nameKr}</div>
                <div className="tarot-center-card-name-en">{pickingCard.nameEn}</div>
              </div>
            </div>
          )}

          {/* 하단 덱 슬롯 */}
          <div className="tarot-deck-slots">
            {Array.from({ length: requiredCount }).map((_, i) => {
              const filled = filledSlots[i];
              const posLabel = POSITION_LABELS[spread]?.[i] || `${i + 1}`;
              return (
                <div key={i} className={`tarot-deck-slot ${filled ? 'slot-filled' : 'slot-empty'}`}>
                  {filled ? (
                    <div className="tarot-slot-card">
                      <TarotCardArt cardId={filled.id} deck={deck} />
                      <div className="tarot-slot-badge">{i + 1}</div>
                    </div>
                  ) : (
                    <div className="tarot-slot-placeholder">
                      <span className="tarot-slot-num">{i + 1}</span>
                      <span className="tarot-slot-label">{posLabel}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 안내 + 버튼 */}
          {!allFilled && !pickingCard && (
            <p className="tarot-pick-hint">직감을 믿으세요. 당신의 무의식이 올바른 카드로 인도합니다.</p>
          )}
          {allFilled && (
            <div className="tarot-deck-complete fade-in">
              <p className="tarot-deck-complete-msg">✨ 카드가 모두 선택되었습니다</p>
              <button className="tarot-read-btn" onClick={handleReadCards}>🔮 타로점 보기</button>
            </div>
          )}
          <button className="tarot-back-btn" onClick={handleReshuffle}>🔄 다시 섞기</button>
        </div>
      )}

      {/* ═══ STEP 4: 리빌 + 결과 ═══ */}
      {(step === 'reveal' || step === 'result') && (
        <div className="tarot-reveal-stage fade-in">
          <div className={`tarot-reveal-cards spread-${spread} ${loading ? 'cards-floating' : 'cards-landed'}`}>
            {revealedCards.map((card, i) => {
              const isFlipped = i <= flipIndex;
              const posLabel = POSITION_LABELS[spread]?.[i] || '';
              const readingCard = reading?.cards?.[i];
              return (
                <div key={card.id} className="tarot-reveal-slot" style={{ '--reveal-i': i }}
                onClick={() => step === 'result' && isFlipped && setFocusCard(i)}>
                  <div className="tarot-position-label">{posLabel}</div>
                  <div className={`tarot-reveal-card ${isFlipped ? 'flipped' : ''} ${card.reversed ? 'reversed-card' : ''} ${step === 'result' && isFlipped ? 'clickable' : ''}`}>
                    {/* 뒷면 */}
                    <div className="tarot-card-face tarot-card-back-face">
                      <div className="tarot-card-back-inner">
                        <div className="tarot-card-back-star">✦</div>
                        <div className="tarot-card-back-border" />
                      </div>
                    </div>
                    {/* 앞면 — SVG 아트 */}
                    <div className={`tarot-card-face tarot-card-front-face ${card.reversed ? 'reversed-front' : ''}`}>
                      <TarotCardArt cardId={card.id} deck={deck} />
                      {card.reversed && (
                        <div className="tarot-card-reversed-tag">역방향</div>
                      )}
                    </div>
                  </div>
                  {isFlipped && step === 'result' && (
                    <>
                      <div className="tarot-card-name-tag fade-in">{card.nameKr}{card.reversed ? ' (역)' : ''}</div>
                      <div className="tarot-card-tap-hint fade-in">터치하여 상세보기</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {loading && !aiStreaming && (
            <FortuneLoading type="tarot" />
          )}

          {aiStreaming && (
            <StreamText text={streamText} icon="🔮" label="AI가 타로를 해석하고 있어요..." color="#9B59B6" />
          )}

          {reading && step === 'result' && (
            <div className="tarot-result fade-in" ref={resultRef}>
              <div className="tarot-overall glass-card">
                <div className="tarot-overall-icon">🌟</div>
                <p className="tarot-overall-text">{reading.overallMessage}</p>
                {reading.luckyElement && (
                  <div className="tarot-lucky-element">
                    행운의 원소: <strong>{reading.luckyElement}</strong>
                  </div>
                )}
              </div>

              <div className="tarot-interpretation glass-card">
                <h3 className="tarot-interp-title"><span>📜</span> 타로 마스터의 해석</h3>
                <div className="tarot-interp-body">
                  {reading.interpretation.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>

              {reading.advice && (
                <FortuneCard icon="💡" title="오늘의 조언" description={reading.advice} delay={200} />
              )}

              <div className="tarot-actions-speech">
                <SpeechButton
                  label="리딩 읽어주기"
                  text={[
                    '타로 리딩 결과입니다.',
                    reading.overallMessage,
                    reading.interpretation,
                    reading.advice ? `오늘의 조언. ${reading.advice}` : '',
                  ].filter(Boolean).join(' ')}
                  summaryText={[
                    '타로 요약입니다.',
                    reading.overallMessage,
                    reading.advice ? `조언. ${reading.advice}` : '',
                  ].filter(Boolean).join(' ')}
                />
              </div>

              <div className="tarot-actions">
                <button className="tarot-action-btn tarot-share-btn" onClick={handleShare}>
                  <span>📤</span> 공유하기
                </button>
                <button className="tarot-action-btn tarot-reset-btn" onClick={resetAll}>
                  <span>🔄</span> 다시 뽑기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 카드 포커스 모달 ═══ */}
      {focusCard !== null && (() => {
        // 히어로 카드 상세보기
        if (focusCard === 'hero') {
          const heroCard = ALL_CARDS[heroCardId];
          return (
            <div className="tarot-focus-overlay" onClick={() => setFocusCard(null)}>
              <div className="tarot-focus-content" onClick={e => e.stopPropagation()}>
                <div className="tarot-focus-card-wrap">
                  <div className="tarot-focus-card">
                    <TarotCardArt cardId={heroCardId} deck={deck} />
                  </div>
                </div>
                <div className="tarot-focus-info">
                  <span className="tarot-focus-pos">오늘의 카드</span>
                  <h3 className="tarot-focus-name">{heroCard.nameKr}</h3>
                  <p className="tarot-focus-name-en">{heroCard.nameEn}</p>
                  <p className="tarot-focus-meaning">{heroCard.msg}</p>
                </div>
                <button className="tarot-focus-close" onClick={() => setFocusCard(null)}>닫기</button>
              </div>
            </div>
          );
        }
        // 리딩 결과 카드 상세보기
        const card = revealedCards[focusCard];
        const readingCard = reading?.cards?.[focusCard];
        const posLabel = POSITION_LABELS[spread]?.[focusCard] || '';
        if (!card) return null;
        return (
          <div className="tarot-focus-overlay" onClick={() => setFocusCard(null)}>
            <div className="tarot-focus-content" onClick={e => e.stopPropagation()}>
              <div className="tarot-focus-card-wrap">
                <div className={`tarot-focus-card ${card.reversed ? 'reversed-front' : ''}`}>
                  <TarotCardArt cardId={card.id} deck={deck} />
                  {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                </div>
              </div>
              <div className="tarot-focus-info">
                <span className="tarot-focus-pos">{posLabel}</span>
                <h3 className="tarot-focus-name">{card.nameKr} {card.reversed ? '(역방향)' : '(정방향)'}</h3>
                <p className="tarot-focus-name-en">{card.nameEn}</p>
                {readingCard?.meaning && (
                  <p className="tarot-focus-meaning">{readingCard.meaning}</p>
                )}
                {!readingCard?.meaning && card.msg && (
                  <p className="tarot-focus-meaning">{card.msg}</p>
                )}
              </div>
              <button className="tarot-focus-close" onClick={() => setFocusCard(null)}>닫기</button>
            </div>
          </div>
        );
      })()}

      {/* ═══ 덱 변경 팝업 ═══ */}
      {showDeckModal && (
        <div className="tarot-deck-modal-overlay" onClick={() => setShowDeckModal(false)}>
          <div className="tarot-deck-modal" onClick={e => e.stopPropagation()}>
            <h3 className="tarot-deck-modal-title">🃏 덱 선택</h3>
            <div className="tarot-deck-modal-grid">
              {[
                { id: 'custom', name: '커스텀', sub: '연애감성 아트', preview: <img src="/tarot-custom/m06.jpg" alt="Custom" className="tarot-deck-thumb" /> },
                { id: 'love', name: '러브', sub: '1:1연애 오리지널', preview: <TarotCardArt cardId={6} deck="love" />, loveStyle: true },
                { id: 'classic', name: '클래식', sub: 'Rider-Waite', preview: <img src="/tarot/m01.jpg" alt="Classic" className="tarot-deck-thumb" /> },
                { id: 'skt', name: '비트루비안', sub: 'SKT Vitruvian', preview: <img src="/tarot-skt/m01.jpg" alt="SKT" className="tarot-deck-thumb" /> },
                { id: 'dark', name: '다크', sub: 'Dark Gothic', preview: <img src="/tarot-dark/m13.jpg" alt="Dark" className="tarot-deck-thumb" /> },
              ].map(d => (
                <button key={d.id}
                  className={`tarot-deck-modal-item ${deck === d.id ? 'active' : ''}`}
                  onClick={() => { handleDeckChange(d.id); setShowDeckModal(false); }}>
                  <div className={`tarot-deck-modal-preview ${d.loveStyle ? 'tarot-deck-preview--love' : ''}`}>
                    {d.preview}
                  </div>
                  <span className="tarot-deck-modal-name">{d.name}</span>
                  <span className="tarot-deck-modal-sub">{d.sub}</span>
                </button>
              ))}
            </div>
            <button className="tarot-deck-modal-close" onClick={() => setShowDeckModal(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tarot;
