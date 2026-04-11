import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

// 덱별 인트로 GIF (있으면 덱 선택 배경에 표시)
const DECK_INTROS = {
  romantic: ['/tarot-effects/deck-intro/romantic_0.gif', '/tarot-effects/deck-intro/romantic_1.gif', '/tarot-effects/deck-intro/romantic_2.gif', '/tarot-effects/deck-intro/romantic_3.gif'],
};

const DECK_LIST = [
  { id: 'classic_rws', name: '클래식 타로', sub: 'Classic RWS', img: '/tarot-effects/deck-intro/classic_0.gif', gifs: ['/tarot-effects/deck-intro/classic_0.gif', '/tarot-effects/deck-intro/classic_1.gif', '/tarot-effects/deck-intro/classic_2.gif', '/tarot-effects/deck-intro/classic_3.gif'], hasVariants: true },
  { id: 'dark', name: '다크 고딕', sub: 'Dark Gothic', img: '/tarot-effects/deck-intro/dark_0.gif', gifs: ['/tarot-effects/deck-intro/dark_0.gif', '/tarot-effects/deck-intro/dark_1.gif', '/tarot-effects/deck-intro/dark_2.gif', '/tarot-effects/deck-intro/dark_3.gif', '/tarot-effects/deck-intro/dark_0b.gif', '/tarot-effects/deck-intro/dark_1b.gif', '/tarot-effects/deck-intro/dark_2b.gif', '/tarot-effects/deck-intro/dark_3b.gif'], hasVariants: true },
  { id: 'romantic', name: '로맨틱 로즈', sub: 'Romantic Rose', img: '/tarot-effects/deck-intro/romantic_0.gif', gifs: ['/tarot-effects/deck-intro/romantic_0.gif', '/tarot-effects/deck-intro/romantic_1.gif', '/tarot-effects/deck-intro/romantic_2.gif', '/tarot-effects/deck-intro/romantic_3.gif'], hasVariants: true },
  { id: 'western', name: '웨스턴 클래식', sub: 'Western Classic', img: '/tarot-effects/deck-intro/western_0.gif', gifs: ['/tarot-effects/deck-intro/western_0.gif', '/tarot-effects/deck-intro/western_1.gif', '/tarot-effects/deck-intro/western_2.gif', '/tarot-effects/deck-intro/western_3.gif'], hasVariants: true },
  { id: 'girl', name: '소녀 타로', sub: 'Girl Tarot', img: '/tarot-effects/deck-intro/girl_0.gif', gifs: ['/tarot-effects/deck-intro/girl_0.gif', '/tarot-effects/deck-intro/girl_1.gif', '/tarot-effects/deck-intro/girl_2.gif', '/tarot-effects/deck-intro/girl_3.gif'], hasVariants: true },
  { id: 'boy', name: '소년 타로', sub: 'Boy Tarot', img: '/tarot-effects/deck-intro/boy_0.gif', gifs: ['/tarot-effects/deck-intro/boy_0.gif', '/tarot-effects/deck-intro/boy_1.gif', '/tarot-effects/deck-intro/boy_2.gif', '/tarot-effects/deck-intro/boy_3.gif'], hasVariants: true },
];

// 멀티변형 덱의 톤 이름
const VARIANT_NAMES = ['톤 A', '톤 B', '톤 C', '톤 D'];

// ── 인트로: 영상/GIF 풀스크린 → 페이드아웃 ──
function TarotIntro({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 3500);
    const t2 = setTimeout(() => onDoneRef.current(), 4300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`tarot-intro ${fadeOut ? 'fade-out' : ''}`}>
      <video
        className="tarot-intro-video"
        src="/tarot-effects/intro.mp4"
        autoPlay muted playsInline
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <img src="/tarot-effects/intro.gif" alt="" className="tarot-intro-gif" />
      <div className="tarot-intro-overlay" />
    </div>
  );
}

// 배경 GIF 크로스페이드 — 현재+이전 2장만 렌더 (성능)
function BgGifCrossfade({ gifs, idx, className = '' }) {
  if (!gifs || gifs.length === 0) return null;
  const cur = idx % gifs.length;
  const prev = (cur - 1 + gifs.length) % gifs.length;
  return (
    <div className="bg-gif-crossfade">
      <img src={gifs[prev]} alt="" className={`${className} bg-gif-hidden`} />
      <img src={gifs[cur]} alt="" className={`${className} bg-gif-active`} />
    </div>
  );
}

function Tarot() {
  // ─── 상태 ───
  const [heroCardId] = useState(() => Math.floor(Math.random() * 78));
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState('deck'); // deck → tone → setup → shuffle → pick → reveal → result
  const [deck, setDeck] = useState(() => localStorage.getItem('tarotDeck') || 'custom');
  const [deckVariant, setDeckVariant] = useState(() => {
    const saved = localStorage.getItem('tarotDeckVariant');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
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
  const [focusCard, setFocusCard] = useState(null);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [deckSwipeIdx, setDeckSwipeIdx] = useState(() => {
    const saved = localStorage.getItem('tarotDeck') || 'custom';
    return Math.max(0, DECK_LIST.findIndex(d => d.id === saved));
  });
  const [deckDragX, setDeckDragX] = useState(0);
  const [deckFlyDir, setDeckFlyDir] = useState(0); // -1=left fly, 1=right fly, 0=none
  const [pickSwipeIdx, setPickSwipeIdx] = useState(0);
  const [resultDetailIdx, setResultDetailIdx] = useState(null); // 결과 카드 상세보기 인덱스
  const [setupBgIdx, setSetupBgIdx] = useState(0);
  const [deckGifIdx, setDeckGifIdx] = useState(0);
  const resultRef = useRef(null);
  const cleanupRef = useRef(null);
  const carouselTouchRef = useRef({ startX: 0 });
  const pickTouchRef = useRef({ startX: 0 });
  const deckDragRef = useRef({ startX: 0, dragging: false });

  // ── 무한 캐러셀 물리 엔진 ──
  const cPos = useRef(0);           // 현재 위치 (카드 인덱스, float)
  const cVel = useRef(0);           // 속도 (카드/frame)
  const cAnimId = useRef(null);     // rAF ID
  const cDrag = useRef({ active: false, startX: 0, startPos: 0, samples: [] });
  const [cTick, setCTick] = useState(0); // 렌더 트리거
  const CSLIDE = 190; // 슬라이드 간격 px



  useEffect(() => { return () => cleanupRef.current?.(); }, []);
  useEffect(() => () => { if (cAnimId.current) cancelAnimationFrame(cAnimId.current); }, []);

  // pick 자동 드리프트 ID (별도 관리)
  const driftId = useRef(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  // 느린 자동 드리프트 시작
  const startDrift = useCallback(() => {
    if (driftId.current) cancelAnimationFrame(driftId.current);
    const driftTick = () => {
      // pick 단계이고, 드래그/관성 중이 아닐 때만
      if ((stepRef.current !== 'pick' && stepRef.current !== 'reveal' && stepRef.current !== 'result') || cAnimId.current || cDrag.current.active) {
        driftId.current = null;
        return;
      }
      cPos.current += 0.012; // 아주 느린 이동
      setCTick(n => n + 1);
      driftId.current = requestAnimationFrame(driftTick);
    };
    driftId.current = requestAnimationFrame(driftTick);
  }, []);

  // pick/reveal 진입 시 드리프트 시작
  useEffect(() => {
    if (step === 'pick' || step === 'reveal' || step === 'result') {
      if (step === 'reveal' || step === 'result') { cPos.current = 0; cVel.current = 0; }
      const t = setTimeout(() => startDrift(), 500);
      return () => { clearTimeout(t); if (driftId.current) { cancelAnimationFrame(driftId.current); driftId.current = null; } };
    }
    if (driftId.current) { cancelAnimationFrame(driftId.current); driftId.current = null; }
  }, [step, startDrift]);

  // 캐러셀 관성 애니메이션
  const runMomentum = useCallback((friction = 0.95) => {
    if (cAnimId.current) cancelAnimationFrame(cAnimId.current);
    if (driftId.current) { cancelAnimationFrame(driftId.current); driftId.current = null; }
    const tick = () => {
      cVel.current *= friction;
      if (Math.abs(cVel.current) < 0.01) {
        cVel.current = 0;
        cPos.current = Math.round(cPos.current);
        setCTick(n => n + 1);
        cAnimId.current = null;
        // 관성 멈춘 뒤 1초 후 드리프트 재시작
        if (stepRef.current === 'pick' || stepRef.current === 'reveal' || stepRef.current === 'result') setTimeout(() => startDrift(), 1000);
        return;
      }
      cPos.current += cVel.current;
      setCTick(n => n + 1);
      cAnimId.current = requestAnimationFrame(tick);
    };
    cAnimId.current = requestAnimationFrame(tick);
  }, [startDrift]);

  // 캐러셀 드래그 핸들러
  const cHandlers = useMemo(() => {
    const start = (x) => {
      if (cAnimId.current) { cancelAnimationFrame(cAnimId.current); cAnimId.current = null; }
      cVel.current = 0;
      cDrag.current = { active: true, startX: x, startPos: cPos.current, samples: [{ x, t: Date.now() }] };
    };
    const move = (x) => {
      if (!cDrag.current.active) return;
      cPos.current = cDrag.current.startPos + (cDrag.current.startX - x) / CSLIDE;
      cDrag.current.samples.push({ x, t: Date.now() });
      if (cDrag.current.samples.length > 6) cDrag.current.samples.shift();
      setCTick(n => n + 1);
    };
    const end = () => {
      if (!cDrag.current.active) return;
      cDrag.current.active = false;
      const s = cDrag.current.samples;
      if (s.length >= 2) {
        const dt = s[s.length - 1].t - s[0].t;
        if (dt > 0) {
          const raw = (s[0].x - s[s.length - 1].x) / CSLIDE / (dt / 16.67);
          cVel.current = Math.max(-2.5, Math.min(2.5, raw));
        }
      }
      runMomentum();
    };
    return {
      onTouchStart: e => start(e.touches[0].clientX),
      onTouchMove: e => move(e.touches[0].clientX),
      onTouchEnd: end,
      onMouseDown: e => { e.preventDefault(); start(e.clientX); },
      onMouseMove: e => move(e.clientX),
      onMouseUp: end,
      onMouseLeave: () => { if (cDrag.current.active) end(); },
    };
  }, [runMomentum]);

  // 캐러셀 무한 루프 렌더 데이터
  const getCarouselItems = useCallback((total) => {
    if (total === 0) return [];
    const items = [];
    for (let off = -3; off <= 3; off++) {
      const raw = Math.round(cPos.current) + off;
      const idx = ((raw % total) + total) % total;
      const x = (raw - cPos.current) * CSLIDE;
      const dist = Math.abs(x) / CSLIDE;
      items.push({
        off, idx, x,
        scale: Math.max(0.6, 1 - dist * 0.15),
        opacity: Math.max(0.25, 1 - dist * 0.3),
        z: 10 - Math.abs(off),
        isCenter: Math.abs(off) === 0 && Math.abs(x) < CSLIDE * 0.4,
      });
    }
    return items;
  }, [cTick]); // eslint-disable-line

  // 덱 GIF 순차 교체 (4초 간격)
  useEffect(() => {
    if (step !== 'deck') return;
    setDeckGifIdx(0);
    const curDeck = DECK_LIST[deckSwipeIdx];
    if (!curDeck?.gifs || curDeck.gifs.length <= 1) return;
    const iv = setInterval(() => {
      setDeckGifIdx(prev => (prev + 1) % curDeck.gifs.length);
    }, 4000);
    return () => clearInterval(iv);
  }, [step, deckSwipeIdx]);

  // 셔플 자동 회전 — 마찰 물리 (관성 회전판)
  useEffect(() => {
    if (step !== 'shuffle' || shuffledCards.length === 0) return;
    cPos.current = 0;

    let vel = 0.8;                   // 부드러운 초기 속도
    let lastTime = Date.now();
    const startTime = lastTime;
    let didSecondPush = false;

    const tick = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;

      // 1.5초쯤 재셔플 임펄스
      if (!didSecondPush && (now - startTime) > 1500) {
        vel += 0.2;
        didSecondPush = true;
      }

      // 가변 마찰: 부드러운 감속
      const dynamicFriction = vel > 0.4 ? 0.990 : vel > 0.15 ? 0.993 : vel > 0.05 ? 0.995 : 0.990;
      vel *= Math.pow(dynamicFriction, dt);

      // 미세 떨림 — 속도 비례
      const jitter = (Math.random() - 0.5) * vel * 0.03;

      cPos.current += (vel + jitter) * dt;
      setCTick(n => n + 1);

      // 자연 정지 → 부드러운 스냅 → 1초 후 pick
      if (vel < 0.003) {
        // 가장 가까운 카드로 부드럽게 스냅 (0.6초)
        const target = Math.round(cPos.current);
        const snapStart = cPos.current;
        const snapDur = 600;
        const snapT0 = Date.now();
        const snapTick = () => {
          const p = Math.min((Date.now() - snapT0) / snapDur, 1);
          const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
          cPos.current = snapStart + (target - snapStart) * ease;
          setCTick(n => n + 1);
          if (p < 1) {
            cAnimId.current = requestAnimationFrame(snapTick);
          } else {
            cPos.current = target;
            cVel.current = 0;
            setCTick(n => n + 1);
            cAnimId.current = null;
            setTimeout(() => { setShuffleAnim(false); setStep('pick'); }, 1000);
          }
        };
        cAnimId.current = requestAnimationFrame(snapTick);
        return;
      }

      cAnimId.current = requestAnimationFrame(tick);
    };
    cAnimId.current = requestAnimationFrame(tick);
    return () => { if (cAnimId.current) cancelAnimationFrame(cAnimId.current); };
  }, [step, shuffledCards.length]);

  // tone → setup 자동 전환 (2.5초)
  useEffect(() => {
    if (step !== 'tone') return;
    const t = setTimeout(() => setStep('setup'), 2500);
    return () => clearTimeout(t);
  }, [step]);

  // 셔플/픽 배경 GIF 순환
  const [stageGifIdx, setStageGifIdx] = useState(0);
  useEffect(() => {
    if (step !== 'shuffle' && step !== 'pick' && step !== 'reveal' && step !== 'result') return;
    const curDeck = DECK_LIST.find(d => d.id === deck);
    if (!curDeck?.gifs) return;
    setStageGifIdx(0);
    const iv = setInterval(() => {
      setStageGifIdx(prev => (prev + 1) % curDeck.gifs.length);
    }, 4000);
    return () => clearInterval(iv);
  }, [step, deck]);

  // 메뉴 배경 GIF 순환
  const [setupGifIdx, setSetupGifIdx] = useState(0);
  const SETUP_BG_CARDS = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];
  useEffect(() => {
    if (step !== 'setup') return;
    const curDeck = DECK_LIST.find(d => d.id === deck);
    if (curDeck?.gifs) {
      setSetupGifIdx(0);
      const iv = setInterval(() => {
        setSetupGifIdx(prev => (prev + 1) % curDeck.gifs.length);
      }, 4000);
      return () => clearInterval(iv);
    }
    // GIF 없는 덱은 기존 카드 슬라이드쇼
    setSetupBgIdx(Math.floor(Math.random() * SETUP_BG_CARDS.length));
    const iv = setInterval(() => {
      setSetupBgIdx(prev => (prev + 1) % SETUP_BG_CARDS.length);
    }, 5000);
    return () => clearInterval(iv);
  }, [step, deck]);

  // 공용 스와이프 핸들러 팩토리
  const makeSwipe = (ref, getIdx, setIdx, maxIdx) => ({
    onTouchStart: (e) => { ref.current.startX = e.touches[0].clientX; },
    onTouchEnd: (e) => {
      const dx = e.changedTouches[0].clientX - ref.current.startX;
      if (dx > 50 && getIdx() > 0) setIdx(getIdx() - 1);
      if (dx < -50 && getIdx() < maxIdx()) setIdx(getIdx() + 1);
    },
  });

  // 결과 캐러셀
  const resultSwipe = makeSwipe(carouselTouchRef, () => carouselIndex, setCarouselIndex, () => revealedCards.length - 1);
  // 카드 선택 스와이프
  const pickSwipe = makeSwipe(pickTouchRef, () => pickSwipeIdx, setPickSwipeIdx, () => shuffledCards.length - 1);

  // 슬라이드 덱 전환 — 순환
  // dir: 1 = 다음(카드가 왼쪽으로), -1 = 이전(카드가 오른쪽으로)
  const [deckSliding, setDeckSliding] = useState(false);
  const deckSlide = (dir) => {
    if (deckSliding) return;
    const len = DECK_LIST.length;
    const nextIdx = (deckSwipeIdx + dir + len) % len;
    setDeckSliding(true);
    setDeckFlyDir(dir);
    setTimeout(() => {
      setDeckFlyDir(0);
      setDeckDragX(0);
      setDeckSwipeIdx(nextIdx);
      handleDeckChange(DECK_LIST[nextIdx].id);
      setDeckSliding(false);
    }, 400);
  };
  // 순환 인덱스 헬퍼
  const deckAt = (offset) => DECK_LIST[(deckSwipeIdx + offset + DECK_LIST.length) % DECK_LIST.length];

  const requiredCount = SPREADS.find(s => s.id === spread)?.count || 3;

  // ─── 카드 셔플 ───
  const startShuffle = useCallback(() => {

    // 카드 즉시 섞기 (셔플 화면에서 보여주기 위해)
    const indices = Array.from({ length: 78 }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const cards = indices.map(idx => ({
      ...ALL_CARDS[idx],
      reversed: Math.random() > 0.5,
    }));
    setShuffledCards(cards);

    setSelectedIndices([]);
    selectedRef.current = [];
    setRevealedCards([]);
    setReading(null);
    setFlipIndex(-1);
    setFilledSlots([]);
    filledRef.current = [];
    setAllFilled(false);
    setDiscardPhase(false);
    setDiscardingIdx(null);
    setPickingCard(null);
    pickBusy.current = false;
    setAutoPickRunning(false);
    autoPickRef.current = false;
    cPos.current = 0;
    cVel.current = 0;

    setStep('shuffle');
    setShuffleAnim(true);
  }, []);

  // 카드 선택 — ref 기반 (stale closure 방지)
  const [pickingCard, setPickingCard] = useState(null);
  const [filledSlots, setFilledSlots] = useState([]);
  const [flyingToSlot, setFlyingToSlot] = useState(false);
  const [allFilled, setAllFilled] = useState(false);
  const [discardPhase, setDiscardPhase] = useState(false);
  const [discardingIdx, setDiscardingIdx] = useState(null); // 버리는 중인 슬롯
  const selectedRef = useRef([]);
  const filledRef = useRef([]);
  const pickBusy = useRef(false);

  const pickLimit = requiredCount + 1;

  const handleCardPick = (index) => {
    if (step !== 'pick' || pickBusy.current || discardPhase) return;
    if (selectedRef.current.includes(index)) return;
    if (selectedRef.current.length >= pickLimit) return;

    // 캐러셀 정지
    if (cAnimId.current) { cancelAnimationFrame(cAnimId.current); cAnimId.current = null; }
    cVel.current = 0;
    pickBusy.current = true;

    const card = shuffledCards[index];

    // 즉시 슬롯에 추가 (앞면 안 보여줌, 뒷면으로 슬롯에 들어감)
    const newSelected = [...selectedRef.current, index];
    const newFilled = [...filledRef.current, card];
    selectedRef.current = newSelected;
    filledRef.current = newFilled;
    setSelectedIndices(newSelected);
    setFilledSlots(newFilled);

    setTimeout(() => {
      pickBusy.current = false;

      if (newFilled.length >= pickLimit) {
        setAllFilled(true);
        setDiscardPhase(true);
        if (autoPickRef.current) {
          setTimeout(() => handleDiscard(newFilled.length - 1), 800);
        }
      }
    }, 400);
  };

  // 카드 버리기
  const handleDiscard = (slotIdx) => {
    setDiscardingIdx(slotIdx);

    setTimeout(() => {
      const newFilled = filledRef.current.filter((_, i) => i !== slotIdx);
      const newSelected = selectedRef.current.filter((_, i) => i !== slotIdx);
      filledRef.current = newFilled;
      selectedRef.current = newSelected;
      setFilledSlots(newFilled);
      setSelectedIndices(newSelected);
      setDiscardPhase(false);
      setDiscardingIdx(null);
      setAllFilled(false);

      setTimeout(() => revealCards(newSelected), 500);
    }, 600);
  };

  const handleReadCards = () => {
    revealCards(selectedIndices);
  };

  // 랜덤 자동 선택 — 캐러셀 회전 후 자동 선택
  const [autoPickRunning, setAutoPickRunning] = useState(false);
  const autoPickRef = useRef(false);

  const handleRandomPick = useCallback(() => {
    if (autoPickRunning || pickingCard) return;
    setAutoPickRunning(true);
    autoPickRef.current = true;

    const total = shuffledCards.length;
    const remaining = shuffledCards.map((_, i) => i).filter(i => !selectedRef.current.includes(i));
    const need = pickLimit - filledRef.current.length;
    const picks = [];
    for (let n = 0; n < need && remaining.length > 0; n++) {
      const r = Math.floor(Math.random() * remaining.length);
      picks.push(remaining.splice(r, 1)[0]);
    }

    let delay = 0;
    picks.forEach((targetIdx) => {
      // 1) 캐러셀 빠르게 회전 (0.8초 동안)
      const spinStart = delay;
      const spinDuration = 800;
      const startPos = cPos.current + delay * 0.03; // 대략적 시작 위치
      setTimeout(() => {
        if (!autoPickRef.current) return;
        cVel.current = 0.5;
        const tick = () => {
          cPos.current += cVel.current;
          cVel.current *= 0.97;
          setCTick(n => n + 1);
          if (cVel.current > 0.05) cAnimId.current = requestAnimationFrame(tick);
        };
        if (cAnimId.current) cancelAnimationFrame(cAnimId.current);
        cAnimId.current = requestAnimationFrame(tick);
      }, delay);
      delay += spinDuration;

      // 2) 목표 위치로 정확히 이동 + 선택
      setTimeout(() => {
        if (!autoPickRef.current) return;
        if (cAnimId.current) cancelAnimationFrame(cAnimId.current);
        cVel.current = 0;
        cPos.current = targetIdx;
        setCTick(n => n + 1);
        handleCardPick(targetIdx);
      }, delay);
      delay += 600; // 카드가 슬롯에 바로 들어감 (400ms + 여유)
    });

    setTimeout(() => {
      setAutoPickRunning(false);
      autoPickRef.current = false;
    }, delay + 500);
  }, [autoPickRunning, pickingCard, shuffledCards, selectedIndices, requiredCount, filledSlots, handleCardPick]);

  const handleReshuffle = () => {
    setPickingCard(null);
    setFilledSlots([]);
    filledRef.current = [];
    selectedRef.current = [];
    setFlyingToSlot(false);
    setAllFilled(false);
    setDiscardPhase(false);
    setDiscardingIdx(null);
    pickBusy.current = false;
    setPickSwipeIdx(0);
    setAutoPickRunning(false);
    autoPickRef.current = false;
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
        setCarouselIndex(0);
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
        setCarouselIndex(0);
        setStep('result');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
      },
      onError: () => {
        setAiStreaming(false);
        setStreamText('');
        setReading(fallbackReading);
        setLoading(false);
        setCarouselIndex(0);
        setStep('result');
      },
    });
  };

  const handleDeckChange = (d) => {
    setDeck(d);
    localStorage.setItem('tarotDeck', d);
  };

  const handleVariantChange = (v) => {
    setDeckVariant(v);
    localStorage.setItem('tarotDeckVariant', String(v));
  };

  const resetAll = () => {
    cleanupRef.current?.();
    setStep('deck');
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
    setPickSwipeIdx(0);
    setSheetExpanded(false);
    setCarouselIndex(0);
    setResultDetailIdx(null);
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
    return <TarotIntro onDone={() => setShowIntro(false)} />;
  }

  // ═══ 렌더링 ═══
  return (
    <div className="tarot-page" data-deck={deck}>

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
            <TarotCardArt cardId={i * 4} deck={deck} variant={deckVariant} />
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

      {/* ═══ STEP 0: 덱 선택 — 슬라이드 캐러셀 (순환) ═══ */}
      {step === 'deck' && (() => {
        const curDeck = DECK_LIST[deckSwipeIdx];
        const isDrag = deckDragRef.current.dragging;
        // 드래그 비율: -1(완전히 왼쪽) ~ 0(중앙) ~ 1(완전히 오른쪽)
        const slideW = 220; // 카드 슬라이드 간격
        // 슬라이드 애니메이션: deckFlyDir=-1이면 왼쪽으로 한칸
        const animOffset = deckFlyDir ? -deckFlyDir * slideW : deckDragX;
        const transStyle = isDrag ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease';

        // 보여줄 카드: 앞뒤 2장씩 (총 5장)
        const visible = [-2, -1, 0, 1, 2].map(off => ({
          off,
          deck: deckAt(off),
        }));

        return (
          <div className="tarot-deck-screen">
            {/* 배경 영상/GIF */}
            <div className="deck-bg-video">
              <video src="/tarot-effects/intro.mp4" autoPlay muted loop playsInline
                onError={(e) => { e.target.style.display = 'none'; }} />
              <img src="/tarot-effects/intro.gif" alt="" />
            </div>
            {/* 상단 덱 이름 */}
            <div className="deck-top-header">
              <h1 className="deck-info-name">{curDeck.name}</h1>
              <p className="deck-info-sub">{curDeck.sub}</p>
            </div>

            <div className="deck-carousel"
              onTouchStart={e => { deckDragRef.current = { startX: e.touches[0].clientX, dragging: true }; }}
              onTouchMove={e => { if (deckDragRef.current.dragging) setDeckDragX(e.touches[0].clientX - deckDragRef.current.startX); }}
              onTouchEnd={() => {
                deckDragRef.current.dragging = false;
                if (deckDragX < -60) deckSlide(1);
                else if (deckDragX > 60) deckSlide(-1);
                else setDeckDragX(0);
              }}
              onMouseDown={e => { e.preventDefault(); deckDragRef.current = { startX: e.clientX, dragging: true }; }}
              onMouseMove={e => { if (deckDragRef.current.dragging) setDeckDragX(e.clientX - deckDragRef.current.startX); }}
              onMouseUp={() => {
                deckDragRef.current.dragging = false;
                if (deckDragX < -60) deckSlide(1);
                else if (deckDragX > 60) deckSlide(-1);
                else setDeckDragX(0);
              }}
              onMouseLeave={() => { if (deckDragRef.current.dragging) { deckDragRef.current.dragging = false; setDeckDragX(0); } }}
            >
              {visible.map(({ off, deck: d }) => {
                const x = off * slideW + animOffset;
                const dist = Math.abs(x) / slideW;
                const scale = Math.max(0.65, 1 - dist * 0.15);
                const opacity = Math.max(0.3, 1 - dist * 0.35);
                const z = 10 - Math.abs(off);
                return (
                  <div key={`${d.id}-${off}`} className={`deck-slide-card${off === 0 ? ' deck-slide-active' : ''}`} style={{
                    transform: `translateX(${x}px) scale(${scale})`,
                    opacity,
                    zIndex: z,
                    transition: transStyle,
                  }} onClick={() => {
                    if (off === 0 && !deckSliding && Math.abs(deckDragX) < 10) {
                      handleDeckChange(d.id);
                      if (d.hasVariants) setStep('tone');
                      else setStep('setup');
                    }
                  }}>
                    {off === 0 && d.gifs ? (
                      <div className="deck-gif-crossfade">
                        <img src={d.gifs[(deckGifIdx - 1 + d.gifs.length) % d.gifs.length]} alt={d.name} draggable={false} className="deck-gif-hidden" />
                        <img src={d.gifs[deckGifIdx % d.gifs.length]} alt={d.name} draggable={false} className="deck-gif-active" />
                      </div>
                    ) : (
                      <img src={d.img} alt={d.name} draggable={false} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* 좌우 화살표 */}
            <button className="deck-arrow deck-arrow-left" onClick={() => deckSlide(1)}>‹</button>
            <button className="deck-arrow deck-arrow-right" onClick={() => deckSlide(-1)}>›</button>

            {/* 하단 정보 */}
            <div className="deck-info-overlay">
              <div className="deck-info-dots">
                {DECK_LIST.map((d, i) => (
                  <span key={d.id} className={`deck-dot ${i === deckSwipeIdx ? 'active' : ''}`} />
                ))}
              </div>
              <button className="deck-select-btn" onClick={() => {
                handleDeckChange(curDeck.id);
                if (curDeck.hasVariants) setStep('tone');
                else setStep('setup');
              }}>
                이 덱으로 시작하기
              </button>
            </div>
          </div>
        );
      })()}

      {/* ═══ STEP 0.5: 덱 GIF 풀스크린 인트로 → 자동 메뉴 전환 ═══ */}
      {step === 'tone' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck) || DECK_LIST[0];
        const gifSrc = curDeck.gifs ? curDeck.gifs[Math.floor(Math.random() * curDeck.gifs.length)] : curDeck.img;
        return (
          <div className="tarot-tone-screen">
            <img src={gifSrc} alt={curDeck.name} className="tone-fullscreen-gif" />
            <div className="tone-fullscreen-overlay" />
          </div>
        );
      })()}

      {/* ═══ STEP 1: 메뉴 화면 (타로 스타일) ═══ */}
      {step === 'setup' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck) || DECK_LIST[0];
        const bgPaths = { classic_rws: '/tarot-classic-rws', dark: '/tarot-dark', romantic: '/tarot-romantic', oriental: '/tarot-oriental', western: '/tarot-western', girl: '/tarot-girl', boy: '/tarot-boy' };
        const bgBase = bgPaths[deck] || '';
        const bgSuffix = curDeck.hasVariants ? `_v${deckVariant}` : '';
        // GIF 배경 우선, 없으면 카드 슬라이드쇼
        const hasGifs = curDeck.gifs && curDeck.gifs.length > 0;
        const gifBgSrc = hasGifs ? curDeck.gifs[setupGifIdx % curDeck.gifs.length] : null;
        const curBgCard = SETUP_BG_CARDS[setupBgIdx % SETUP_BG_CARDS.length];
        const bgSrc = `${bgBase}/m${String(curBgCard).padStart(2,'0')}${bgSuffix}.jpg`;
        return (
          <div className="tarot-setup-screen">
            <div className="tarot-setup-bg">
              {hasGifs ? (
                <BgGifCrossfade gifs={curDeck.gifs} idx={setupGifIdx} className="setup-bg-slide" />
              ) : (
                <img key={`bg-${setupBgIdx}`} src={bgSrc} alt="" draggable={false} className="setup-bg-slide" />
              )}
            </div>
            <div className="tarot-setup-overlay" />

            <div className="tarot-setup-content">
              {/* 상단 바 — 덱 변경 */}
              <div className="setup-top-bar">
                <button className="setup-deck-change" onClick={() => setStep('deck')}>
                  ← 덱 변경
                </button>
                <span className="setup-deck-name">{curDeck.name}</span>
              </div>

              {/* 타로 헤더 */}
              <div className="tarot-menu-header">
                <h1 className="tarot-menu-title">타로 리딩</h1>
              </div>

              {/* ─ 1. 질문 분야 ─ */}
              <div className="setup-section">
                <div className="setup-section-label">☽ 무엇을 물어볼까요?</div>
                <div className="setup-chips-wrap">
                  {[...TAROT_LOVE_TYPES.slice(0, 6), ...OTHER_CATEGORIES.slice(0, 2)].map(item => (
                    <button key={item.id}
                      className={`setup-chip ${category === item.id ? 'active' : ''}`}
                      onClick={() => setCategory(item.id)}>
                      {typeof item.icon === 'string' && item.icon.length <= 2 ? item.icon : '💕'} {item.label}
                    </button>
                  ))}
                  <button className="setup-chip setup-chip-more"
                    onClick={() => setSheetExpanded(!sheetExpanded)}>
                    {sheetExpanded ? '접기 −' : '더보기 +'}
                  </button>
                </div>
                {/* 더보기 확장 */}
                {sheetExpanded && (
                  <div className="tarot-expanded-cats fade-in" style={{ marginTop: '10px' }}>
                    {TAROT_LOVE_GROUPS.map(group => (
                      <div key={group.key} className="tarot-love-group">
                        <h3 className="tarot-love-group-title"><span>{group.emoji}</span> {group.label}</h3>
                        <div className="tarot-love-cards">
                          {TAROT_LOVE_TYPES.filter(l => l.group === group.key).map(lt => (
                            <button key={lt.id}
                              className={`tarot-love-card ${category === lt.id ? 'active' : ''}`}
                              onClick={() => { setCategory(lt.id); setSheetExpanded(false); }}>
                              <span className="tarot-love-icon">{typeof lt.icon === 'string' && lt.icon.length <= 2 ? lt.icon : '💕'}</span>
                              <span className="tarot-love-label">{lt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="tarot-cat-grid" style={{ marginTop: '8px' }}>
                      {OTHER_CATEGORIES.map(cat => (
                        <button key={cat.id}
                          className={`tarot-cat-btn ${category === cat.id ? 'active' : ''}`}
                          style={{ '--cat-color': cat.color }}
                          onClick={() => { setCategory(cat.id); setSheetExpanded(false); }}>
                          <span className="tarot-cat-icon">{cat.icon}</span>
                          <span className="tarot-cat-label">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─ 2. 스프레드 ─ */}
              <div className="setup-section">
                <div className="setup-section-label">☾ 카드 수</div>
                <div className="setup-spread-row">
                  {SPREADS.map(s => (
                    <button key={s.id}
                      className={`setup-spread ${spread === s.id ? 'active' : ''}`}
                      onClick={() => setSpread(s.id)}>
                      <span className="setup-spread-name">{s.label}</span>
                      <span className="setup-spread-cost">💗 {s.cost}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 시작 버튼 */}
              <button className="tarot-start-btn" onClick={startShuffle}>
                <span>카드 셔플 시작</span>
                <span className="tarot-start-glow" />
              </button>

            </div>
          </div>
        );
      })()}

      {/* ═══ STEP 2: 셔플 — 카드 앞면이 빠르게 돌아가며 섞이는 모습 ═══ */}
      {step === 'shuffle' && shuffledCards.length > 0 && (() => {
        const items = getCarouselItems(shuffledCards.length);
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const stageBg = curDeck?.gifs ? curDeck.gifs[stageGifIdx % curDeck.gifs.length] : '/shuffle-start.png';
        return (
          <div className="tarot-shuffle-stage">
            <div className="shuffle-bg">
              {curDeck?.gifs ? (
                <BgGifCrossfade gifs={curDeck.gifs} idx={stageGifIdx} className="shuffle-bg-gif" />
              ) : (
                <img src={stageBg} alt="" className="shuffle-bg-gif" />
              )}
            </div>
            <p className="shuffle-top-text">카드를 섞고 있습니다<span className="tarot-dots" /></p>
            <div className="pick-carousel">
              {items.map(({ off, idx, x, scale, opacity, z }) => (
                <div key={`shuf-${off}`} className="pick-slide-card" style={{
                  transform: `translateX(${x}px) scale(${scale})`,
                  opacity, zIndex: z,
                }}>
                  <TarotCardArt cardId={shuffledCards[idx].id} deck={deck} variant={deckVariant} />
                </div>
              ))}
            </div>
            <p className="tarot-shuffle-hint">마음을 가라앉히고 질문에 집중하세요</p>
          </div>
        );
      })()}

      {/* ═══ STEP 3: 카드 선택 — 무한 캐러셀 + 관성 물리 ═══ */}
      {step === 'pick' && shuffledCards.length > 0 && (() => {
        const total = shuffledCards.length;
        const items = getCarouselItems(total);
        const centerIdx = ((Math.round(cPos.current) % total) + total) % total;
        const isCenterSelected = selectedIndices.includes(centerIdx);
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const pickBg = curDeck?.gifs ? curDeck.gifs[stageGifIdx % curDeck.gifs.length] : null;
        return (
          <div className="tarot-pick-stage fade-in">
            {/* GIF 배경 */}
            {curDeck?.gifs && (
              <div className="pick-gif-bg">
                <BgGifCrossfade gifs={curDeck.gifs} idx={stageGifIdx} />
              </div>
            )}
            {/* 상단 바 */}
            <div className="pick-top-bar">
              {discardPhase ? (
                <span className="pick-top-label discard-label">버릴 카드 <strong>1장</strong>을 탭하세요</span>
              ) : (
                <span className="pick-top-label">카드 <strong>{pickLimit}장</strong> 선택</span>
              )}
              <div className="pick-top-actions">
                {!allFilled && !autoPickRunning && !pickBusy.current && !discardPhase && (
                  <button className="pick-random-btn" onClick={handleRandomPick}>✦ 자동</button>
                )}
                <span className="pick-top-counter">{filledSlots.length}/{pickLimit}</span>
              </div>
            </div>

            {/* 무한 캐러셀 — 버리기 단계에선 숨김 */}
            {!discardPhase && (
              <div className="pick-carousel" {...cHandlers}>
                {items.map(({ off, idx, x, scale, opacity, z, isCenter }) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div key={`pick-${off}`}
                      className={`pick-slide-card ${isCenter ? 'pick-slide-active' : ''} ${isSelected ? 'pick-slide-done' : ''}`}
                      style={{
                        transform: `translateX(${x}px) scale(${scale})`,
                        opacity: isSelected ? 0.15 : opacity,
                        zIndex: z,
                      }}
                      onClick={() => isCenter && !isSelected && !allFilled && handleCardPick(idx)}
                    >
                      <div className="tarot-card-back">
                        <div className="tarot-card-back-inner">
                          <div className="tarot-card-back-star">✦</div>
                          <div className="tarot-card-back-border" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 하단 슬롯 — 뒷면만 표시, 버리기 모드에서만 ✕ */}
            <div className={`tarot-deck-slots ${discardPhase ? `discard-mode${filledSlots.length >= 6 ? ' discard-cols-3' : ''}` : ''}`}>
              {filledSlots.map((card, i) => (
                <div key={`slot-${card.id}-${i}`}
                  className={`tarot-deck-slot slot-filled ${discardPhase ? 'slot-discard-tap' : ''} ${discardingIdx === i ? 'slot-fly-away' : ''}`}
                  onClick={() => discardPhase && discardingIdx === null && handleDiscard(i)}
                >
                  <div className="tarot-slot-card">
                    <div className="tarot-card-back">
                      <div className="tarot-card-back-inner">
                        <div className="tarot-card-back-star">✦</div>
                        <div className="tarot-card-back-border" />
                      </div>
                    </div>
                    <div className="tarot-slot-badge">{i + 1}</div>
                  </div>
                </div>
              ))}
              {!discardPhase && Array.from({ length: Math.max(0, pickLimit - filledSlots.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="tarot-deck-slot slot-empty">
                  <div className="tarot-slot-placeholder">
                    <span className="tarot-slot-num">{filledSlots.length + i + 1}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 안내 */}
            {discardPhase && !discardingIdx && (
              <p className="discard-hint fade-in">
                버릴 카드 한 장을 선택하세요
              </p>
            )}
            {!allFilled && !autoPickRunning && !discardPhase && (
              <p className="tarot-pick-hint">직감을 믿고 가운데 카드를 탭하세요</p>
            )}
          </div>
        );
      })()}

      {/* ═══ STEP 4: 리빌 — 카드 캐러셀(앞면) + AI 분석 ═══ */}
      {step === 'reveal' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const revealBg = curDeck?.gifs ? curDeck.gifs[stageGifIdx % curDeck.gifs.length] : null;
        const revealItems = getCarouselItems(revealedCards.length || 1);
        return (
        <div className="tarot-reveal-stage fade-in">
          {curDeck?.gifs && (
            <div className="reveal-gif-bg">
              <div className="bg-gif-crossfade">
                {curDeck.gifs.map((g, gi) => (
                  <img key={gi} src={g} alt="" className={gi === (stageGifIdx % curDeck.gifs.length) ? 'bg-gif-active' : 'bg-gif-hidden'} />
                ))}
              </div>
            </div>
          )}

          {/* 카드 캐러셀 — 상단 고정 */}
          <div className="reveal-carousel-sticky">
            <div className="reveal-carousel" {...cHandlers}>
              {revealedCards.length > 0 && revealItems.map(({ off, idx, x, scale, opacity, z }) => {
                const card = revealedCards[idx % revealedCards.length];
                if (!card) return null;
                const posLabel = POSITION_LABELS[spread]?.[idx % revealedCards.length] || '';
                return (
                  <div key={`rev-${off}`} className={`reveal-slide-card ${off === 0 ? 'reveal-slide-active' : ''}`} style={{
                    transform: `translateX(${x}px) scale(${scale})`,
                    opacity, zIndex: z,
                  }}>
                    <div className={`reveal-card-front ${card.reversed ? 'reversed' : ''}`}>
                      <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} />
                      {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                    </div>
                    <div className="reveal-card-label">{posLabel}</div>
                    <div className="reveal-card-name">{card.nameKr}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI 분석 영역 — 블러 배경 + 회전하는 신비한 빛 */}
          <div className="reveal-ai-area">
            {(loading || aiStreaming) && (
              <div className="reveal-ai-mystic">
                <div className="reveal-ai-blur" />
                <div className="reveal-ai-orbit">
                  <div className="reveal-ai-orb reveal-ai-orb-1" />
                  <div className="reveal-ai-orb reveal-ai-orb-2" />
                  <div className="reveal-ai-orb reveal-ai-orb-3" />
                </div>
              </div>
            )}
            {loading && !aiStreaming && <FortuneLoading type="tarot" />}
            {aiStreaming && (
              <StreamText text={streamText} icon="🔮" label="AI가 타로를 해석하고 있어요..." color="#9B59B6" />
            )}
          </div>
        </div>
        );
      })()}

      {/* ═══ STEP 5: 결과 — 캐러셀 + GIF 배경 + 해석 결과 ═══ */}
      {step === 'result' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const resultBg = curDeck?.gifs ? curDeck.gifs[stageGifIdx % curDeck.gifs.length] : null;
        const resultItems = getCarouselItems(revealedCards.length || 1);
        return (
        <div className="tarot-result-stage fade-in">
          {curDeck?.gifs && (
            <div className="reveal-gif-bg">
              <div className="bg-gif-crossfade">
                {curDeck.gifs.map((g, gi) => (
                  <img key={gi} src={g} alt="" className={gi === (stageGifIdx % curDeck.gifs.length) ? 'bg-gif-active' : 'bg-gif-hidden'} />
                ))}
              </div>
            </div>
          )}

          {/* 카드 캐러셀 — 앞면, 천천히 슬라이드 */}
          <div className="reveal-carousel" {...cHandlers}>
            {revealedCards.length > 0 && resultItems.map(({ off, idx, x, scale, opacity, z }) => {
              const card = revealedCards[idx % revealedCards.length];
              if (!card) return null;
              const posLabel = POSITION_LABELS[spread]?.[idx % revealedCards.length] || '';
              return (
                <div key={`res-${off}`} className={`reveal-slide-card ${off === 0 ? 'reveal-slide-active' : ''}`} style={{
                  transform: `translateX(${x}px) scale(${scale})`,
                  opacity, zIndex: z,
                }} onClick={() => off === 0 && setResultDetailIdx(idx % revealedCards.length)}>
                  <div className={`reveal-card-front ${card.reversed ? 'reversed' : ''}`}>
                    <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} />
                    {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                  </div>
                  <div className="reveal-card-label">{posLabel}</div>
                  <div className="reveal-card-name">{card.nameKr}</div>
                </div>
              );
            })}
          </div>

          {/* AI 해석 결과 */}
          {reading && (
            <div className="reveal-ai-area fade-in" ref={resultRef}>
              <div className="tarot-overall glass-card">
                <div className="tarot-overall-icon">🌟</div>
                <p className="tarot-overall-text">{reading.overallMessage}</p>
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

          {/* 카드 상세보기 모달 */}
          {resultDetailIdx !== null && (() => {
            const card = revealedCards[resultDetailIdx];
            const posLabel = POSITION_LABELS[spread]?.[resultDetailIdx] || '';
            const readingCard = reading?.cards?.[resultDetailIdx];
            if (!card) return null;
            return (
              <div className="result-card-detail-overlay fade-in" onClick={() => setResultDetailIdx(null)}>
                <div className="result-card-detail">
                  <div className={`result-card-detail-img ${card.reversed ? 'reversed' : ''}`}>
                    <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} />
                    {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                  </div>
                  <div className="result-card-detail-info">
                    <span className="result-card-detail-pos">{posLabel}</span>
                    <h3 className="result-card-detail-name">{card.nameKr}{card.reversed ? ' (역)' : ''}</h3>
                    <p className="result-card-detail-name-en">{card.nameEn}</p>
                    <p className="result-card-detail-msg">
                      {readingCard?.meaning || card.msg}
                    </p>
                  </div>
                  <p className="result-card-detail-dismiss">탭하여 돌아가기</p>
                </div>
              </div>
            );
          })()}
        </div>
        );
      })()}

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
                    <TarotCardArt cardId={heroCardId} deck={deck} variant={deckVariant} />
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
                  <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} />
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

      {/* 덱 모달 제거 — 스와이프로 대체 */}
    </div>
  );
}

export default Tarot;
