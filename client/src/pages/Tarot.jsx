import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTarotReadingStream, drawTarotCards, isGuest, getHistory } from '../api/fortune';
import RecentHistory from '../components/RecentHistory';
import FortuneCard from '../components/FortuneCard';
import TarotCardArt from '../components/TarotCardArt';
import { playTarotReveal, playCardShuffle, playCardChaosGather, playCardSpin, playCardPick, playAnalyzeStart, startAnalyzeAmbient, playSpotlightTick, playSpotlightFinal } from '../utils/sounds';
import AnalysisMatrix from '../components/AnalysisMatrix';
import WaitMessages from '../components/WaitMessages';
import { WAIT_MESSAGES } from '../data/waitMessages';
import AnalysisComplete from '../components/AnalysisComplete';
import FortuneLoading from '../components/FortuneLoading';
import StreamText from '../components/StreamText';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
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

// ── 타로 메인 카테고리 (기본 표시) ──
const TAROT_MAIN_CATS = [
  { id: 'relationship', label: '연애운',     icon: '💕' },
  { id: 'mind_reading', label: '속마음',     icon: '🔍' },
  { id: 'general',      label: '종합운',     icon: '🔮' },
  { id: 'money',        label: '재물운',     icon: '💰' },
  { id: 'career',       label: '직업운',     icon: '💼' },
  { id: 'health',       label: '건강운',     icon: '💚' },
  { id: 'marriage',     label: '결혼·인연',  icon: '💒' },
];

// ── 타로 세부 카테고리 (더보기) ──
const TAROT_MORE_CATS = [
  { id: 'crush',              label: '짝사랑',     icon: '💘' },
  { id: 'confession_timing',  label: '고백타이밍',  icon: '💌' },
  { id: 'blind_date',         label: '소개팅',     icon: '🤝' },
  { id: 'couple_fortune',     label: '데이트',     icon: '💑' },
  { id: 'meeting_timing',     label: '만남시기',   icon: '⏳' },
  { id: 'reunion',            label: '재회운',     icon: '💔' },
  { id: 'past_life',          label: '전생인연',   icon: '🌌' },
  { id: 'ideal_type',         label: '이상형',     icon: '👩‍❤️‍👨' },
];

// 하위호환용 (서버/AI에서 참조)
const TAROT_LOVE_TYPES = [
  { id: 'crush', label: '짝사랑운', icon: '💘', group: 'solo' },
  { id: 'blind_date', label: '소개팅운', icon: '🤝', group: 'solo' },
  { id: 'meeting_timing', label: '만남의 시기', icon: '🔮', group: 'solo' },
  { id: 'ideal_type', label: '이상형 분석', icon: '👩‍❤️‍👨', group: 'solo' },
  { id: 'relationship', label: '연애운', icon: '💕', group: 'love' },
  { id: 'confession_timing', label: '고백 타이밍', icon: '💌', group: 'love' },
  { id: 'mind_reading', label: '속마음 타로', icon: '🔍', group: 'love' },
  { id: 'couple_fortune', label: '데이트 운세', icon: 'couple', group: 'love' },
  { id: 'marriage', label: '결혼운', icon: 'wedding', group: 'marriage' },
  { id: 'remarriage', label: '재혼운', icon: '💍', group: 'marriage' },
  { id: 'reunion', label: '재회운', icon: '💔', group: 'marriage' },
  { id: 'past_life', label: '전생 인연', icon: '🌌', group: 'marriage' },
];
const TAROT_LOVE_GROUPS = [
  { key: 'solo', label: '솔로를 위한', emoji: '✨' },
  { key: 'love', label: '썸/연애 중', emoji: '💗' },
  { key: 'marriage', label: '결혼/인연', emoji: '💒' },
];
const OTHER_CATEGORIES = [
  { id: 'general', label: '종합운', icon: '🔮', color: '#9B59B6' },
  { id: 'money', label: '재물운', icon: '💰', color: '#F4D03F' },
  { id: 'career', label: '직업운', icon: '💼', color: '#3498DB' },
  { id: 'health', label: '건강운', icon: '💚', color: '#2ECC71' },
];

const POSITION_LABELS = {
  one: ['현재의 메시지'],
  three: ['과거', '현재', '미래'],
  five: ['현재 상황', '장애물', '잠재의식', '조언', '결과'],
};

const DECK_LIST = [
  { id: 'newclassic', name: '뉴클래식', sub: 'New Classic · Mystical Neoclassical', img: '/tarot-effects/deck-intro/newclassic_cover.jpg', gif: '/tarot-effects/deck-intro/newclassic_0.webp', backs: Array.from({length: 8}, (_, i) => `/tarot-backs/newclassic_${i}.jpg`), hasVariants: true },
  { id: 'jester', name: '광대 타로', sub: 'Renaissance Jester', img: '/tarot-effects/deck-intro/jester_cover.jpg', gif: '/tarot-effects/deck-intro/jester_0.webp', backs: Array.from({length: 16}, (_, i) => `/tarot-backs/jester_${i}.jpg`), hasVariants: true },
  { id: 'masterpiece', name: '명화 타로', sub: 'Old Masters Masterpiece', img: '/tarot-effects/deck-intro/masterpiece_cover.jpg', gif: '/tarot-effects/deck-intro/masterpiece_0.webp', backs: Array.from({length: 12}, (_, i) => `/tarot-backs/masterpiece_${i}.jpg`), hasVariants: true },
  { id: 'cartoon_girl', name: '카툰 걸', sub: 'Cartoon Girl', img: '/tarot-effects/deck-intro/cartoon_girl_cover.jpg', gif: '/tarot-effects/deck-intro/cartoon_girl_0.webp', backs: [0,1,2,3].map(i => `/tarot-backs/cartoon_girl_${i}.jpg`), hasVariants: true },
  { id: 'cartoon_boy', name: '카툰 보이', sub: 'Cartoon Boy', img: '/tarot-effects/deck-intro/cartoon_boy_cover.jpg', gif: '/tarot-effects/deck-intro/cartoon_boy_0.webp', backs: [0,1,2,3].map(i => `/tarot-backs/cartoon_boy_${i}.jpg`), hasVariants: true },
  { id: 'kdrama', name: 'K-드라마 타로', sub: 'Korean Romance Drama', img: '/tarot-effects/deck-intro/kdrama_cover.jpg', gif: '/tarot-effects/deck-intro/kdrama_0.webp', backs: Array.from({length: 12}, (_, i) => `/tarot-backs/kdrama_${i}.jpg`), hasVariants: true },
  { id: 'celestial', name: '셀레스티얼 타로', sub: 'Celestial · Zodiac Cosmos', img: '/tarot-effects/deck-intro/celestial_cover.jpg', gif: '/tarot-effects/deck-intro/celestial_0.webp', backs: Array.from({length: 16}, (_, i) => `/tarot-backs/celestial_${i}.jpg`), hasVariants: true },
  { id: 'lady', name: '레이디 타로', sub: 'Realistic Lady · Golden Petals', img: '/tarot-effects/deck-intro/lady_cover.jpg', gif: '/tarot-effects/deck-intro/lady_0.webp', backs: Array.from({length: 16}, (_, i) => `/tarot-backs/lady_${i}.jpg`), hasVariants: true },
];

// 멀티변형 덱의 톤 이름
const VARIANT_NAMES = ['톤 A', '톤 B', '톤 C', '톤 D'];

// ── 인트로: 덱 커버 이미지 랜덤 풀스크린 → 페이드아웃 ──
const TAROT_INTRO_COVERS = DECK_LIST.map(d => d.img);

const TAROT_QUOTES = [
  { main: '카드가 당신을 부르고 있습니다', sub: 'The cards are calling you' },
  { main: '운명의 카드를 뽑아보세요', sub: 'Draw your destiny' },
  { main: '별빛이 당신의 길을 비춥니다', sub: 'Starlight guides your path' },
  { main: '마음이 이끄는 대로', sub: 'Follow where your heart leads' },
  { main: '오늘, 우주가 전하는 메시지', sub: 'A message from the universe' },
  { main: '당신만을 위한 카드가 기다립니다', sub: 'A card awaits only you' },
  { main: '직감을 믿고 카드를 선택하세요', sub: 'Trust your intuition' },
  { main: '숨겨진 진실이 드러납니다', sub: 'Hidden truths shall be revealed' },
];

function TarotIntro({ onDone }) {
  const [selected] = useState(() => {
    const validDecks = DECK_LIST.filter(d => d?.backs?.length && d?.img);
    const savedDeckId = localStorage.getItem('tarotDeck');
    const d = validDecks.find(x => x.id === savedDeckId) || validDecks[0] || DECK_LIST[0];
    return { deck: d, bgImg: d?.img || '/shuffle-start.png' };
  });
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // 카드 제거 — 배경 + 빠른 문구만 → 1s 후 onDone (부모가 플립 트리거)
    const t = setTimeout(() => onDoneRef.current?.(selected.bgImg), 1000);
    return () => clearTimeout(t);
  }, [selected.bgImg]);

  return (
    <div className="tarot-intro-v2 tarot-intro-v2--simple" onClick={() => onDoneRef.current?.(selected.bgImg)}>
      <img src={selected.bgImg} alt="" className="tarot-intro-v2-bg" />
      <div className="tarot-intro-v2-overlay" />
      <div className="tarot-intro-simple-content">
        <span className="tarot-intro-simple-star">✦</span>
        <h1 className="tarot-intro-simple-title">타로의 문이 열립니다</h1>
        <p className="tarot-intro-simple-sub">운명의 카드를 펼쳐보세요</p>
      </div>
    </div>
  );
}

function Tarot() {
  const navigate = useNavigate();
  const location = useLocation();
  // 비로그인 사용자는 타로 랜딩 페이지로 보냄 (인트로 대신)
  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      navigate('/tarot/welcome', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ─── 상태 ───
  const [heroCardId] = useState(() => Math.floor(Math.random() * 78));
  const [showIntro, setShowIntro] = useState(true);
  const [introBg, setIntroBg] = useState(null);
  // 덱 갤러리 (이름 클릭 시 해당 덱 전체 카드 필름릴 회전)
  const [galleryDeck, setGalleryDeck] = useState(null);
  const [galleryProgress, setGalleryProgress] = useState(0); // 0~78 (실수)
  const [gallerySpeed, setGallerySpeed] = useState('normal'); // slow | normal | fast
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [galleryFin, setGalleryFin] = useState(false);
  const [galleryBgIdx] = useState(() => Math.floor(Math.random() * 78));
  const [galleryFocusIdx, setGalleryFocusIdx] = useState(null); // 선택된 카드 인덱스
  const galleryRafRef = useRef(null);
  const galleryLastTsRef = useRef(0);
  const [step, setStep] = useState('deck'); // deck → tone → setup → shuffle → pick → reveal → result
  const [historyOpen, setHistoryOpen] = useState(false); // 덱 화면 하단 "최근 본 타로" drawer 토글

  // ─── Y축 페이지 플립 헬퍼 (step 변경을 플립 애니메이션으로 감싸기) ───
  const [flipPhase, setFlipPhase] = useState(null); // null | 'out' | 'in'
  const flipPhaseRef = useRef(null);
  flipPhaseRef.current = flipPhase;
  const flipToStep = useCallback((swapFn) => {
    if (flipPhaseRef.current) return;
    setFlipPhase('out');
    setTimeout(() => {
      try { swapFn?.(); } catch (e) { console.error(e); }
      setFlipPhase('in');
    }, 420);
    setTimeout(() => { setFlipPhase(null); }, 860);
  }, []);
  const [deck, setDeck] = useState(() => {
    const saved = localStorage.getItem('tarotDeck');
    return (saved && DECK_LIST.some(d => d.id === saved)) ? saved : 'newclassic';
  });
  const [deckVariant, setDeckVariant] = useState(() => {
    const saved = localStorage.getItem('tarotDeckVariant');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  const [spread, setSpread] = useState('three');
  const [category, setCategory] = useState('relationship');
  // 카드 펼치기 방식: 'carousel'(기본) | 'line'(가로 일렬) | 'fan'(부채꼴)
  const [pickMode, setPickMode] = useState(() => {
    const saved = localStorage.getItem('tarotPickMode');
    return ['carousel', 'line', 'fan'].includes(saved) ? saved : 'carousel';
  });
  // fan 모드 회전 오프셋 (deg) — 좌우 드래그로 변경
  const [fanRotation, setFanRotation] = useState(0);
  const fanDragRef = useRef({ active: false, startX: 0, startRot: 0, moved: false });
  const [question, setQuestion] = useState('');
  const [questionOpen, setQuestionOpen] = useState(false);
  // setup 화면 내부 서브 스텝: 'category' → 'spread' → 'confirm'
  const [setupStep, setSetupStep] = useState('category');
  // setup 진입 시 항상 첫 단계로 리셋
  useEffect(() => {
    if (step === 'setup') setSetupStep('category');
  }, [step]);

  // 카테고리 카드 배경용 — 현재 덱에서 카테고리별 랜덤 카드 인덱스 (덱/variant 바뀌면 재추첨)
  // 카테고리 ID → "/tarot-{deckid}/m{NN}_v{X}.jpg" 매핑
  const categoryBgImages = useMemo(() => {
    const bgPaths = { newclassic: '/tarot-newclassic', jester: '/tarot-jester', masterpiece: '/tarot-masterpiece', classic_rws: '/tarot-classic-rws', dark: '/tarot-dark', romantic: '/tarot-romantic', oriental: '/tarot-oriental', western: '/tarot-western', girl: '/tarot-girl', boy: '/tarot-boy', cartoon_girl: '/tarot-cartoon-girl', cartoon_boy: '/tarot-cartoon-boy', cats: '/tarot-cats', dogs: '/tarot-dogs', kdrama: '/tarot-kdrama', celestial: '/tarot-celestial', lady: '/tarot-lady' };
    const base = bgPaths[deck];
    if (!base) return {};
    const dl = DECK_LIST.find(d => d.id === deck);
    const suffix = dl?.hasVariants ? `_v${deckVariant}` : '';
    const allCats = [...TAROT_MAIN_CATS, ...TAROT_MORE_CATS];
    const used = new Set();
    const map = {};
    allCats.forEach((cat) => {
      // 78장 중 사용되지 않은 인덱스 추첨 (카테고리끼리 안 겹치게)
      let idx;
      let tries = 0;
      do { idx = Math.floor(Math.random() * 78); tries++; } while (used.has(idx) && tries < 20);
      used.add(idx);
      map[cat.id] = `${base}/m${String(idx).padStart(2, '0')}${suffix}.jpg`;
    });
    return map;
  }, [deck, deckVariant]);
  const [shuffledCards, setShuffledCards] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [revealedCards, setRevealedCards] = useState([]);
  const [reading, setReading] = useState(null);
  const [completing, setCompleting] = useState(false);
  const pendingReadingRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  // 타로는 Sonnet 4.6 통일, 심화분석 UI 미노출 (서버 엔드포인트는 코드로 남아있음 — 추후 재활성 대비)
  const [shuffleAnim, setShuffleAnim] = useState(false);
  const [shuffleFlipping, setShuffleFlipping] = useState(false);
  const [shufflePhase, setShufflePhase] = useState('riffle'); // riffle(좌우 두 묶음 인터리브) → gather(한 덩어리로 모임) → fan(부채꼴 펼침)
  const [shuffleCardsMeta, setShuffleCardsMeta] = useState([]);
  const [flipIndex, setFlipIndex] = useState(-1);
  // 리빌 Phase 1: 한 장씩 크게 보여줄 때의 현재 카드 인덱스 (-1 = 비활성)
  const [revealSingleIdx, setRevealSingleIdx] = useState(-1);
  // 리빌 Phase 2: 원래 캐러셀 + AI 분석 모드 진입 여부
  const [revealCarouselMode, setRevealCarouselMode] = useState(false);
  const [slotsRevealed, setSlotsRevealed] = useState(false); // 버리기 후 남은 카드 앞면 표시
  const [showAnalyzeMsg, setShowAnalyzeMsg] = useState(false); // "AI 분석 시작" 메시지
  const [focusCard, setFocusCard] = useState(null);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [deckSwipeIdx, setDeckSwipeIdx] = useState(() => {
    const saved = localStorage.getItem('tarotDeck') || 'newclassic';
    return Math.max(0, DECK_LIST.findIndex(d => d.id === saved));
  });
  const [deckDragX, setDeckDragX] = useState(0);
  const [deckFlyDir, setDeckFlyDir] = useState(0); // -1=left fly, 1=right fly, 0=none
  const [pickSwipeIdx, setPickSwipeIdx] = useState(0);
  const [resultDetailIdx, setResultDetailIdx] = useState(null); // 결과 카드 상세보기 인덱스
  const [setupBgIdx, setSetupBgIdx] = useState(0);
  const [shuffleBgSrc, setShuffleBgSrc] = useState(null);
  // 프레임 오버레이: 덱 선택 시 세트+변형 고정
  const [selectedFrame, setSelectedFrame] = useState(() => {
    const set = Math.floor(Math.random() * 10);
    const v = Math.floor(Math.random() * 4);
    return { set, v };
  });
  const frameSrc = `/tarot-frames/frame_${selectedFrame.set}_${selectedFrame.v}.png`;
  const [selectedBack, setSelectedBack] = useState(() => {
    const saved = localStorage.getItem('tarotDeck') || 'newclassic';
    const deckData = DECK_LIST.find(d => d.id === saved);
    if (deckData?.backs?.length) return deckData.backs[Math.floor(Math.random() * deckData.backs.length)];
    return null;
  }); // 선택된 뒷면 이미지 경로
  const resultRef = useRef(null);
  const startBtnRef = useRef(null);
  const cleanupRef = useRef(null);

  // 홈 드로어에서 넘어온 restoreHistoryId 복원 — 인트로 건너뛰고 result로 점프
  useEffect(() => {
    const hid = location.state?.restoreHistoryId;
    if (!hid) return;
    (async () => {
      try {
        const full = await getHistory(hid);
        const p = full?.payload;
        if (!p) return;
        const cards = Array.isArray(p.cards) ? p.cards : [];
        setShowIntro(false);
        setRevealedCards(cards);
        setReading(p);
        if (p.spread) setSpread(p.spread);
        if (p.category) setCategory(p.category);
        // 사용했던 덱/변형 복원 — 카드 이미지가 정확히 당시 뽑은 덱으로 보임
        if (p.deck) setDeck(p.deck);
        if (p.deckVariant != null) setDeckVariant(p.deckVariant);
        setStep('result');
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.restoreHistoryId]);
  const analyzeAmbientRef = useRef(null);
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



  useEffect(() => { return () => { cleanupRef.current?.(); analyzeAmbientRef.current?.(); }; }, []);
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
      // pick: 자동 선택(0.5)의 3/4 속도 / reveal·result(AI 분석·결과): 카드 감상용 느린 속도
      // pick 단계: 기존 0.144 → 0.072 (추가 50% 감속)
      cPos.current += (stepRef.current === 'pick') ? 0.072 : 0.02;
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
        // 관성 끝나면 드리프트 즉시 복귀 (공백 없이 계속 회전)
        if (stepRef.current === 'pick' || stepRef.current === 'reveal' || stepRef.current === 'result') {
          startDrift();
        }
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
      // 드래그 거리가 거의 없으면(탭) 관성/정지 없이 드리프트 유지
      const totalDrag = s.length >= 2 ? Math.abs(s[0].x - s[s.length - 1].x) : 0;
      if (totalDrag < 5) {
        cVel.current = 0;
        if (!driftId.current && (stepRef.current === 'pick' || stepRef.current === 'reveal' || stepRef.current === 'result')) {
          startDrift();
        }
        return;
      }
      if (s.length >= 2) {
        const dt = s[s.length - 1].t - s[0].t;
        if (dt > 0) {
          const raw = (s[0].x - s[s.length - 1].x) / CSLIDE / (dt / 16.67);
          cVel.current = Math.max(-4.5, Math.min(4.5, raw * 1.4));
        }
      }
      runMomentum(0.93);
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
  }, [runMomentum, startDrift]);

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


  // 셔플 페이즈 타이머 — riffle(실제 섞기) → gather(한 덩어리) → fan(반원 펼침) → pick 전환
  useEffect(() => {
    if (step !== 'shuffle' || shuffledCards.length === 0) return;
    const N = 24;
    setShuffleCardsMeta(Array.from({ length: N }, (_, i) => {
      // 스택 최종 Y 오프셋 (gather 후 깊이감)
      const stackY = (i - N / 2) * 0.7;
      // 리플: 짝수 인덱스=왼쪽(-1), 홀수=오른쪽(+1) — 두 묶음으로 나뉨
      const rside = i % 2 === 0 ? -1 : 1;
      const rpos = Math.floor(i / 2); // 묶음 내 순서
      // 리플 주기 0.85s, 양쪽 인터리브 (왼쪽 0, 0.12, 0.24... / 오른쪽 0.06, 0.18, 0.30...)
      const riffleDur = 0.85;
      const interleaveStep = 0.06;
      const interleaveDelay = rpos * (interleaveStep * 2) + (rside === 1 ? interleaveStep : 0);
      // 음수 delay로 이미 진행 중으로 시작
      const riffleDelay = -riffleDur + (interleaveDelay % riffleDur);
      // Fan: 부채꼴 각도 (-55° ~ +55°), 왼쪽부터 순차 펼침
      const fanAngle = -55 + (110 * i / (N - 1));
      const fanDelay = (i / N) * 0.5; // 0 ~ 0.5s stagger
      return {
        id: i,
        stackY: `${stackY.toFixed(1)}px`,
        rx: `${rside * 90}px`,
        rxMid: `${rside * 45}px`,
        rRotStart: `${rside * -7}deg`,
        rRotMid: `${rside * -3}deg`,
        riffleDur: `${riffleDur}s`,
        riffleDelay: `${riffleDelay.toFixed(2)}s`,
        fanAngle: `${fanAngle.toFixed(1)}deg`,
        fanDelay: `${fanDelay.toFixed(2)}s`,
      };
    }));
    setShufflePhase('riffle');
    try { playCardShuffle(); } catch {}
    const t1 = setTimeout(() => setShufflePhase('gather'), 2500);
    const t2 = setTimeout(() => setShufflePhase('fan'), 3100);
    // fan 펼침 + 0.3s 정지 후 pick 화면으로 플립
    const t3 = setTimeout(() => flipToStep(() => setStep('pick')), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step, shuffledCards.length, flipToStep]);

  // 덱 갤러리: 필름릴 rAF 루프 (일시정지/속도 조절/Fin/포커스 처리)
  useEffect(() => {
    if (!galleryDeck || galleryPaused || galleryFin || galleryFocusIdx !== null) {
      if (galleryRafRef.current) { cancelAnimationFrame(galleryRafRef.current); galleryRafRef.current = null; }
      return;
    }
    const speedMap = { slow: 0.4, normal: 0.9, fast: 1.8 }; // 카드/초
    const step = (ts) => {
      if (!galleryLastTsRef.current) galleryLastTsRef.current = ts;
      const dt = (ts - galleryLastTsRef.current) / 1000;
      galleryLastTsRef.current = ts;
      setGalleryProgress(prev => {
        const next = prev + dt * (speedMap[gallerySpeed] || 0.9);
        if (next >= 78) {
          setGalleryFin(true);
          return 78;
        }
        return next;
      });
      galleryRafRef.current = requestAnimationFrame(step);
    };
    galleryLastTsRef.current = 0;
    galleryRafRef.current = requestAnimationFrame(step);
    return () => { if (galleryRafRef.current) { cancelAnimationFrame(galleryRafRef.current); galleryRafRef.current = null; } };
  }, [galleryDeck, gallerySpeed, galleryPaused, galleryFin, galleryFocusIdx]);

  const openDeckGallery = (d) => {
    setGalleryDeck(d);
    setGalleryProgress(0);
    setGalleryPaused(false);
    setGalleryFin(false);
    setGallerySpeed('normal');
    setGalleryFocusIdx(null);
  };
  const closeDeckGallery = () => {
    setGalleryDeck(null);
    setGalleryProgress(0);
    setGalleryPaused(false);
    setGalleryFin(false);
    setGalleryFocusIdx(null);
  };
  const toggleGalleryPause = () => {
    if (galleryFocusIdx !== null) {
      // 포커스된 카드 보는 중 → 스테이지 탭하면 포커스 해제하고 회전 복귀
      setGalleryFocusIdx(null);
      galleryLastTsRef.current = 0;
      return;
    }
    if (galleryFin) {
      // Fin 상태에서 클릭 → 처음부터 재생
      setGalleryFin(false);
      setGalleryProgress(0);
      setGalleryPaused(false);
      galleryLastTsRef.current = 0;
    } else {
      setGalleryPaused(p => !p);
    }
  };
  const selectGalleryCard = (idx, e) => {
    if (e) e.stopPropagation();
    setGalleryFocusIdx(idx);
  };

  // tone → setup 자동 전환 (2.5초)
  useEffect(() => {
    if (step !== 'tone') return;
    const t = setTimeout(() => setStep('setup'), 2500);
    return () => clearTimeout(t);
  }, [step]);

  // deck 변경 시 selectedBack 동기화 — 현재 덱에 속하지 않으면 랜덤 재선택
  useEffect(() => {
    const deckData = DECK_LIST.find(d => d.id === deck);
    if (!deckData?.backs?.length) return;
    if (!deckData.backs.includes(selectedBack)) {
      setSelectedBack(deckData.backs[Math.floor(Math.random() * deckData.backs.length)]);
    }
  }, [deck]);


  // 메뉴 배경 카드 슬라이드쇼
  const SETUP_BG_CARDS = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];
  useEffect(() => {
    if (step !== 'setup') return;
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
    }, 1100);
  };
  // 순환 인덱스 헬퍼
  const deckAt = (offset) => DECK_LIST[(deckSwipeIdx + offset + DECK_LIST.length) % DECK_LIST.length];

  // ── 덱 캐러셀 자동 회전 (3초마다 다음 덱) ──
  // 덱 자동 회전 제거 — 좌우 버튼/스와이프로만 이동

  const requiredCount = SPREADS.find(s => s.id === spread)?.count || 3;

  // 현재 스프레드별 하트 카테고리
  const tarotCategory = spread === 'one' ? 'TAROT_ONE' : spread === 'five' ? 'TAROT_FIVE' : 'TAROT_THREE';
  const { guardedAction: guardedShuffleStart } = useHeartGuard(tarotCategory);

  // ─── 카드 셔플 ───
  const startShuffle = useCallback(() => {
    // 셋업 화면에서 현재 보여지던 배경을 셔플 화면에도 그대로 유지
    try {
      const bgPaths = { newclassic: '/tarot-newclassic', jester: '/tarot-jester', masterpiece: '/tarot-masterpiece', classic_rws: '/tarot-classic-rws', dark: '/tarot-dark', romantic: '/tarot-romantic', oriental: '/tarot-oriental', western: '/tarot-western', girl: '/tarot-girl', boy: '/tarot-boy', cartoon_girl: '/tarot-cartoon-girl', cartoon_boy: '/tarot-cartoon-boy', cats: '/tarot-cats', dogs: '/tarot-dogs', kdrama: '/tarot-kdrama', celestial: '/tarot-celestial', lady: '/tarot-lady' };
      const curDeckData = DECK_LIST.find(d => d.id === deck) || DECK_LIST[0];
      const bgBase = bgPaths[deck] || '';
      const bgSuffix = curDeckData.hasVariants ? `_v${deckVariant}` : '';
      const curBgCard = setupBgIdx % 22;
      if (bgBase) {
        setShuffleBgSrc(`${bgBase}/m${String(curBgCard).padStart(2,'0')}${bgSuffix}.jpg`);
      }
    } catch {}

    // 카드 즉시 섞기 — crypto.getRandomValues 기반 Fisher-Yates (Math.random보다 균일)
    const secureRandInt = (max) => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
      }
      return Math.floor(Math.random() * max);
    };
    const indices = Array.from({ length: 78 }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = secureRandInt(i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const cards = indices.map(idx => ({
      ...ALL_CARDS[idx],
      reversed: secureRandInt(2) === 0,
    }));
    setShuffledCards(cards);

    setSelectedIndices([]);
    selectedRef.current = [];
    setRevealedCards([]);
    setReading(null);
    setFlipIndex(-1);
    setRevealSingleIdx(-1);
    setRevealCarouselMode(false);
    setFilledSlots([]);
    filledRef.current = [];
    setAllFilled(false);
    setDiscardPhase(false);
    setDiscardingIdx(null);
    setPickingCard(null);
    pickBusy.current = false;
    setAutoPickRunning(false);
    autoPickRef.current = false;
    // 시작 위치를 매번 랜덤하게 → 탭만 하는 사용자도 다른 카드를 보게 됨
    cPos.current = secureRandInt(78);
    cVel.current = 0;

    // selectedBack이 현재 덱에 속하지 않으면 랜덤 재선택
    const deckData = DECK_LIST.find(d => d.id === deck);
    if (deckData?.backs?.length && !deckData.backs.includes(selectedBack)) {
      setSelectedBack(deckData.backs[Math.floor(Math.random() * deckData.backs.length)]);
    }

    // setup → shuffle 플립 전환
    flipToStep(() => {
      setStep('shuffle');
      setShuffleAnim(true);
    });
  }, [deck, selectedBack, deckVariant, setupBgIdx, flipToStep]);

  // 카드 선택 — ref 기반 (stale closure 방지)
  const [pickingCard, setPickingCard] = useState(null);
  const [filledSlots, setFilledSlots] = useState([]);
  const [flyingToSlot, setFlyingToSlot] = useState(false);
  const [allFilled, setAllFilled] = useState(false);
  const [discardPhase, setDiscardPhase] = useState(false);
  const [discardingIdx, setDiscardingIdx] = useState(null); // 버리는 중인 슬롯
  const [spotlightIdx, setSpotlightIdx] = useState(null); // 자동 버리기 하이라이트 회전 인덱스
  const selectedRef = useRef([]);
  const filledRef = useRef([]);
  const pickBusy = useRef(false);

  const pickLimit = requiredCount + 1;

  const handleCardPick = (index) => {
    if (step !== 'pick' || pickBusy.current || discardPhase) return;
    if (selectedRef.current.includes(index)) return;
    if (selectedRef.current.length >= pickLimit) return;

    // 관성(momentum)만 정지 — 드리프트는 끊지 않음 (계속 회전)
    if (cAnimId.current) { cancelAnimationFrame(cAnimId.current); cAnimId.current = null; }
    cVel.current = 0;
    pickBusy.current = true;
    // 드리프트가 어떤 이유로 꺼져 있었다면 즉시 재시작
    if (!driftId.current) startDrift();

    const card = shuffledCards[index];
    const pickOrder = filledRef.current.filter(c => c !== null).length + 1;

    // 즉시 슬롯에 추가 (앞면 안 보여줌, 뒷면으로 슬롯에 들어감)
    const newSelected = [...selectedRef.current, index];
    const newFilled = [...filledRef.current, { ...card, _pickOrder: pickOrder }];
    selectedRef.current = newSelected;
    filledRef.current = newFilled;
    setSelectedIndices(newSelected);
    setFilledSlots(newFilled);

    setTimeout(() => {
      pickBusy.current = false;

      if (newFilled.length >= pickLimit) {
        setAllFilled(true);
        if (autoPickRef.current) {
          // 자동: 하이라이트 회전 → 랜덤 선택 → 자동 버리기
          setDiscardPhase(true);
          const slotCount = newFilled.length;
          const finalIdx = Math.floor(Math.random() * slotCount);
          const rounds = 3;
          const totalSteps = slotCount * rounds + finalIdx + 1;
          const stepDelay = 180;
          let stepN = 0;
          const rotate = () => {
            if (stepN >= totalSteps) {
              try { playSpotlightFinal(); } catch {}
              setTimeout(() => {
                setSpotlightIdx(null);
                handleDiscard(finalIdx);
              }, 800);
              return;
            }
            setSpotlightIdx(stepN % slotCount);
            try { playSpotlightTick(); } catch {}
            stepN++;
            const remaining = totalSteps - stepN;
            const delay = remaining <= 3 ? stepDelay * (1 + (3 - remaining) * 0.4) : stepDelay;
            setTimeout(rotate, delay);
          };
          setTimeout(rotate, 500);
        } else {
          // 수동: 사용자가 버릴 카드 탭
          setDiscardPhase(true);
        }
      }
    }, 400);
  };

  // 카드 버리기 — 선택한 슬롯은 그 자리에서 비워짐 (재정렬 안 함)
  const handleDiscard = (slotIdx) => {
    setDiscardingIdx(slotIdx);

    setTimeout(() => {
      // null 로 치환해 빈 슬롯이 제자리에 남도록 유지
      const newFilledWithNull = filledRef.current.map((c, i) => (i === slotIdx ? null : c));
      const newSelectedWithNull = selectedRef.current.map((s, i) => (i === slotIdx ? null : s));
      filledRef.current = newFilledWithNull;
      selectedRef.current = newSelectedWithNull;
      setFilledSlots(newFilledWithNull);
      setSelectedIndices(newSelectedWithNull);
      setDiscardingIdx(null);

      setTimeout(() => {
        setDiscardPhase(false);
        setAllFilled(false);
        // reveal 단계에는 null 제외
        revealCards(newSelectedWithNull.filter(v => v !== null));
      }, 600);
    }, 900);
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
      // 1) 캐러셀 빠르게 회전 (0.8초 동안) + 차르르륵 사운드
      const spinStart = delay;
      const spinDuration = 800;
      const startPos = cPos.current + delay * 0.03; // 대략적 시작 위치
      setTimeout(() => {
        if (!autoPickRef.current) return;
        try { playCardSpin(spinDuration / 1000); } catch {}
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

      // 2) 목표 위치로 정확히 이동 + 선택 + 딸깍 사운드
      setTimeout(() => {
        if (!autoPickRef.current) return;
        if (cAnimId.current) cancelAnimationFrame(cAnimId.current);
        cVel.current = 0;
        cPos.current = targetIdx;
        setCTick(n => n + 1);
        try { playCardPick(); } catch {}
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
    setSlotsRevealed(false);
    pickBusy.current = false;
    setPickSwipeIdx(0);
    setAutoPickRunning(false);
    autoPickRef.current = false;
    startShuffle();
  };

  const revealCards = async (indices) => {
    setStep('reveal');
    setFlipIndex(-1);
    setRevealSingleIdx(-1);
    setRevealCarouselMode(false);
    const cards = indices.map(i => shuffledCards[i]);
    setRevealedCards(cards);
    const revealStartTime = Date.now();

    // Phase 1: 카드 한 장씩 화면 중앙에 크게 확대 (카드당 1초)
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < cards.length; i++) {
      setRevealSingleIdx(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    // 마지막 카드 사라짐 (brief 블랭크)
    setRevealSingleIdx(-1);
    await new Promise(r => setTimeout(r, 300));

    // Phase 2: 원래 AI 분석 화면으로 전환 (캐러셀 + 순차 플립)
    setRevealCarouselMode(true);
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < cards.length; i++) {
      setFlipIndex(i);
      await new Promise(r => setTimeout(r, 900));
    }

    // 카드 전면이 모두 보이면 reveal 단계에서 AI 분석 (오브 + 하단 타입라이터), done 후 result 로 전환
    setLoading(true);
    setStreamText('');
    setAiStreaming(false);

    try { playAnalyzeStart(); } catch {}
    try {
      analyzeAmbientRef.current?.();
      analyzeAmbientRef.current = startAnalyzeAmbient();
    } catch {}

    const stopAnalyzeSound = () => {
      try { analyzeAmbientRef.current?.(); } catch {}
      analyzeAmbientRef.current = null;
    };

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

    // reveal 화면 최소 노출 시간 (카드 감상 + 타입라이터 효과 충분히 보이게)
    const MIN_REVEAL_MS = 5000;
    let doneFired = false;
    const goToResult = () => {
      if (doneFired) return;
      doneFired = true;
      stopAnalyzeSound();
      clearTimeout(safetyTimeoutId);
      const elapsed = Date.now() - revealStartTime;
      const wait = Math.max(0, MIN_REVEAL_MS - elapsed);
      setTimeout(() => {
        flipToStep(() => {
          setStep('result');
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
        });
      }, wait);
    };

    // 안전장치: 4분 내 응답 없으면 폴백으로 결과 전환
    const safetyTimeoutId = setTimeout(() => {
      if (doneFired) return;
      console.warn('[Tarot] AI analysis safety timeout — forcing result');
      setAiStreaming(false);
      setLoading(false);
      setReading({
        ...fallbackReading,
        interpretation: streamText || fallbackReading.interpretation,
      });
      setCarouselIndex(0);
      goToResult();
    }, 240000);

    cleanupRef.current = getTarotReadingStream(cardIds, reversals, spread, category, question, {
      deck,
      deckVariant,
      onCached: (data) => {
        setReading(data);
        setLoading(false);
        setCarouselIndex(0);
        goToResult();
      },
      onChunk: (text) => {
        if (!aiStreaming) {
          // 첫 chunk → 서버에서 이미 하트 차감됨, 헤더 잔량 즉시 갱신
          window.dispatchEvent(new Event('heart:refresh'));
        }
        setLoading(false);
        setAiStreaming(true);
        setStreamText(prev => prev + text);
      },
      onDone: (donePayload) => {
        try {
          setAiStreaming(false);
          // 서버 enriched JSON 우선, 실패 시 평문 그대로 interpretation 에 넣기
          let enriched = null;
          if (donePayload && typeof donePayload === 'string') {
            const trimmed = donePayload.trim();
            if (trimmed.startsWith('{')) {
              try { enriched = JSON.parse(trimmed); } catch {}
            }
          }
          let finalReading;
          if (enriched && enriched.interpretation) {
            finalReading = { ...fallbackReading, ...enriched };
          } else {
            finalReading = {
              ...fallbackReading,
              interpretation: (donePayload || '').trim() || streamText || fallbackReading.interpretation,
            };
          }
          setReading(finalReading);
          setStreamText('');
          setLoading(false);
          setCarouselIndex(0);
          goToResult();
        } catch (e) {
          console.error('[Tarot] onDone error:', e);
          goToResult();
        }
      },
      onError: () => {
        setAiStreaming(false);
        setStreamText('');
        setReading(fallbackReading);
        setLoading(false);
        setCarouselIndex(0);
        goToResult();
      },
    });
  };

  const handleDeckChange = (d) => {
    setDeck(d);
    localStorage.setItem('tarotDeck', d);
    // 덱에 맞는 뒷면 이미지 4장 중 랜덤 선택
    const deckData = DECK_LIST.find(dl => dl.id === d);
    if (deckData?.backs) {
      setSelectedBack(deckData.backs[Math.floor(Math.random() * deckData.backs.length)]);
    }
    // 프레임 오버레이 세트+변형 고정 (덱 선택 시 1회)
    setSelectedFrame({ set: Math.floor(Math.random() * 10), v: Math.floor(Math.random() * 4) });
    // 새 덱 78장 v0 백그라운드 프리로드 — 다음 셔플 즉시 시작
    try {
      const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
      if (conn && conn.saveData) return;
      const bgPaths = { newclassic: '/tarot-newclassic', jester: '/tarot-jester', masterpiece: '/tarot-masterpiece', cartoon_girl: '/tarot-cartoon-girl', cartoon_boy: '/tarot-cartoon-boy', kdrama: '/tarot-kdrama', celestial: '/tarot-celestial', lady: '/tarot-lady' };
      const base = bgPaths[d];
      if (!base) return;
      const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 500));
      ric(() => {
        for (let i = 0; i < 78; i++) {
          const img = new Image();
          if ('fetchPriority' in img) img.fetchPriority = 'low';
          img.decoding = 'async';
          img.src = `${base}/m${String(i).padStart(2,'0')}_v0.jpg`;
        }
      }, { timeout: 4000 });
    } catch {}
  };

  const selectDeckWithFlip = (d) => {
    flipToStep(() => {
      handleDeckChange(d);
      setStep('setup');
    });
  };

  const handleVariantChange = (v) => {
    setDeckVariant(v);
    localStorage.setItem('tarotDeckVariant', String(v));
  };

  const resetAll = () => {
    // AI 분석 결과 → 덱 선택으로 페이지 플립
    flipToStep(() => {
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
      setRevealSingleIdx(-1);
      setRevealCarouselMode(false);
      setFocusCard(null);
      setStreamText('');
      setShuffleFlipping(false);
      setAiStreaming(false);
      setPickingCard(null);
      setFilledSlots([]);
      setFlyingToSlot(false);
      setAllFilled(false);
      setPickSwipeIdx(0);
      setSheetExpanded(false);
      setCarouselIndex(0);
      setResultDetailIdx(null);
      setSlotsRevealed(false);
      setShowAnalyzeMsg(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
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

  // ═══ 렌더링 ═══
  return (
    <div className="tarot-flip-parent">
    <div className={`tarot-page${flipPhase ? ` tarot-page--flip-${flipPhase}` : ''}`} data-deck={deck}>
      {/* 플립 전환 시 배경 — 덱 이미지 블러 */}
      {(introBg || shuffleBgSrc) && (
        <div className="tarot-page-bg">
          <img src={shuffleBgSrc || introBg} alt="" draggable={false} />
        </div>
      )}

      {/* ═══ 덱 갤러리 — 필름릴 방식 ═══ */}
      {galleryDeck && (() => {
        const isMulti = ['newclassic','jester','masterpiece','oriental','western','dark','romantic','classic_rws','girl','boy','cartoon_girl','cartoon_boy','cats','dogs','kdrama','celestial','lady'].includes(galleryDeck.id);
        const deckPaths = { newclassic:'/tarot-newclassic', jester:'/tarot-jester', masterpiece:'/tarot-masterpiece', classic_rws:'/tarot-classic-rws', dark:'/tarot-dark', romantic:'/tarot-romantic', oriental:'/tarot-oriental', western:'/tarot-western', girl:'/tarot-girl', boy:'/tarot-boy', cartoon_girl:'/tarot-cartoon-girl', cartoon_boy:'/tarot-cartoon-boy', cats:'/tarot-cats', dogs:'/tarot-dogs', kdrama:'/tarot-kdrama', celestial:'/tarot-celestial', lady:'/tarot-lady' };
        const basePath = deckPaths[galleryDeck.id] || '/tarot';
        const variant = deckVariant;
        const cardSrcFixed = (i) => {
          const num = String(i).padStart(2, '0');
          const v = (galleryDeck.id === 'classic_rws' && i === 77 && variant === 2) ? 0 : variant;
          return isMulti ? `${basePath}/m${num}_v${v}.jpg` : `${basePath}/m${num}.jpg`;
        };
        const center = galleryProgress; // 실수 인덱스
        // 중심 주변 ±4장 렌더 (총 9장)
        const visible = [];
        for (let off = -4; off <= 4; off++) {
          const idx = Math.round(center) + off;
          if (idx < 0 || idx >= 78) continue;
          const delta = idx - center; // 중심에서의 거리
          visible.push({ idx, delta });
        }
        return (
          <div className="deck-gallery-overlay fade-in">
            <img src={cardSrcFixed(galleryBgIdx)} alt="" className="deck-gallery-bg" draggable={false} />
            <div className="deck-gallery-overlay-dim" />
            <button className="deck-gallery-back" onClick={closeDeckGallery}>
              <span>‹</span> 돌아가기
            </button>
            <div className="deck-gallery-header">
              <h2 className="deck-gallery-title">
                {galleryDeck.name}<span className="deck-gallery-title-en">({galleryDeck.sub})</span>
              </h2>
              <span className="deck-gallery-count">
                {galleryFin ? '78 / 78' : `${Math.min(78, Math.floor(galleryProgress) + 1)} / 78`}
              </span>
            </div>
            {/* 카드 포커스 뷰 — 갤러리 오버레이 전체의 중앙에 고정 표시 */}
            {galleryFocusIdx !== null && (
              <div className="deck-gallery-focus-overlay" onClick={toggleGalleryPause}>
                <div className="deck-gallery-focus">
                  <div className="deck-gallery-focus-card">
                    <img
                      src={cardSrcFixed(galleryFocusIdx)}
                      alt={`card ${galleryFocusIdx}`}
                      className="deck-gallery-focus-img"
                      draggable={false}
                    />
                  </div>
                  <div className="deck-gallery-focus-info">
                    <div className="deck-gallery-focus-num">#{String(galleryFocusIdx).padStart(2, '0')}</div>
                    <h3 className="deck-gallery-focus-name-kr">{ALL_CARDS[galleryFocusIdx]?.nameKr || ''}</h3>
                    <p className="deck-gallery-focus-name-en">{ALL_CARDS[galleryFocusIdx]?.nameEn || ''}</p>
                    <p className="deck-gallery-focus-msg">{ALL_CARDS[galleryFocusIdx]?.msg || ''}</p>
                    <p className="deck-gallery-focus-hint">탭하면 회전 화면으로 돌아갑니다</p>
                  </div>
                </div>
              </div>
            )}

            {/* 필름릴 스테이지 — 클릭 시 일시정지/재생 토글 */}
            <div className="deck-gallery-stage deck-gallery-stage--film" onClick={toggleGalleryPause}>
              {galleryFin ? (
                <div className="deck-gallery-fin">
                  <div className="deck-gallery-fin-frame">
                    <span className="deck-gallery-fin-text">Fin</span>
                  </div>
                  <p className="deck-gallery-fin-sub">탭하면 다시 재생</p>
                </div>
              ) : (
                <div className="deck-gallery-film">
                  {/* 필름 스프로킷 상단/하단 */}
                  <div className="deck-gallery-film-sprockets deck-gallery-film-sprockets--top">
                    {Array.from({ length: 14 }).map((_, i) => <span key={i} />)}
                  </div>
                  <div className="deck-gallery-film-sprockets deck-gallery-film-sprockets--bottom">
                    {Array.from({ length: 14 }).map((_, i) => <span key={i} />)}
                  </div>
                  {/* 카드들 — 필름 롤처럼 수평 이동 */}
                  <div className="deck-gallery-film-strip">
                    {visible.map(({ idx, delta }) => {
                      const SLIDE = 220; // 카드 간격 px
                      const x = delta * SLIDE;
                      const absD = Math.abs(delta);
                      const scale = Math.max(0.55, 1 - absD * 0.14);
                      const opacity = Math.max(0.15, 1 - absD * 0.28);
                      const rotY = delta * -18; // 필름 휘어짐 효과
                      const z = 10 - Math.round(absD);
                      return (
                        <div
                          key={`g-${idx}`}
                          className="deck-gallery-film-card"
                          style={{
                            transform: `translate3d(calc(-50% + ${x}px), -50%, 0) scale(${scale}) rotateY(${rotY}deg)`,
                            opacity,
                            zIndex: z,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => selectGalleryCard(idx, e)}
                        >
                          <img
                            src={cardSrcFixed(idx)}
                            alt={`card ${idx}`}
                            className="deck-gallery-card-img"
                            draggable={false}
                            onError={(e) => { e.currentTarget.style.opacity = 0.2; }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* 일시정지 오버레이 */}
                  {galleryPaused && (
                    <div className="deck-gallery-pause-badge">
                      <span>⏸</span>
                      <p>일시정지 — 탭하면 재생</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 속도 컨트롤 */}
            <div className="deck-gallery-speed-bar" onClick={(e) => e.stopPropagation()}>
              <button
                className={`deck-gallery-speed-btn ${gallerySpeed === 'slow' ? 'active' : ''}`}
                onClick={() => setGallerySpeed('slow')}
              >🐢 느리게</button>
              <button
                className={`deck-gallery-speed-btn ${gallerySpeed === 'normal' ? 'active' : ''}`}
                onClick={() => setGallerySpeed('normal')}
              >▶ 보통</button>
              <button
                className={`deck-gallery-speed-btn ${gallerySpeed === 'fast' ? 'active' : ''}`}
                onClick={() => setGallerySpeed('fast')}
              >⚡ 빠르게</button>
            </div>
            {/* 진행 바 */}
            <div className="deck-gallery-dots">
              <div className="deck-gallery-progress" style={{ width: `${Math.min(100, (galleryProgress / 78) * 100)}%` }} />
            </div>
          </div>
        );
      })()}

      {/* ═══ 인트로 — 간소화 배경 + 문구, 끝나면 플립으로 덱 화면 전환 ═══ */}
      {showIntro && (
        <TarotIntro onDone={(bg) => {
          if (bg) setIntroBg(bg);
          flipToStep(() => setShowIntro(false));
        }} />
      )}

      {!showIntro && <>
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
            <TarotCardArt cardId={i * 4} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
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
        const transStyle = isDrag ? 'none' : 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease';

        // 보여줄 카드: 앞뒤 2장씩 (총 5장)
        const visible = [-2, -1, 0, 1, 2].map(off => ({
          off,
          deck: deckAt(off),
        }));

        return (
          <div className="tarot-deck-screen">
            <img src={frameSrc} alt="" className="stage-frame-overlay" draggable={false} />
            {/* ─── 벚꽃 흩날림 ─── */}
            <div className="deck-sakura" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="deck-sakura-petal" style={{
                  '--sk-x': `${-5 + (i * 110 / 17)}%`,
                  '--sk-delay': `${i * 0.6}s`,
                  '--sk-dur': `${4 + (i % 5) * 1.2}s`,
                  '--sk-size': `${14 + (i % 4) * 5}px`,
                  '--sk-drift': `${30 + (i % 6) * 15}px`,
                  '--sk-rot': `${(i % 3) * 120}deg`,
                }}>🌸</span>
              ))}
            </div>
            {/* 배경 — 인트로에서 선택된 카드 이미지 (없으면 영상 폴백) */}
            {introBg ? (
              <div className="deck-bg-intro">
                <img src={introBg} alt="" className="deck-bg-intro-img" draggable={false} />
                <div className="deck-bg-intro-overlay" />
              </div>
            ) : (
              <div className="deck-bg-video">
                <video src="/tarot-effects/intro.mp4" autoPlay muted loop playsInline
                  onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            {/* 상단 덱 이름 */}
            <div className="deck-top-header">
              <h1
                className="deck-info-name deck-info-name--clickable"
                onClick={() => openDeckGallery(curDeck)}
                title="이 덱의 카드 전체 보기"
              >
                {curDeck.name} <span className="deck-info-name-icon">🔍</span>
              </h1>
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
                // 테두리 강도: 가운데=1, 인접=거리에 따라 감소, 2칸 이상=0
                const borderIntensity = Math.max(0, 1 - dist * 0.7);
                const isNear = dist < 1.5;
                return (
                  <div key={d.id} className={`deck-slide-card${off === 0 ? ' deck-slide-active' : isNear ? ' deck-slide-near' : ''}`} style={{
                    transform: `translateX(${x}px) scale(${scale})`,
                    opacity,
                    zIndex: z,
                    transition: transStyle,
                    '--border-intensity': borderIntensity,
                  }} onClick={() => {
                    if (off === 0 && !deckSliding && Math.abs(deckDragX) < 10) {
                      selectDeckWithFlip(d.id);
                    }
                  }}>
                    <div className={`deck-cover-wrap${off === 0 ? ' deck-cover-active' : ''}`}>
                      <img src={d.img} alt={d.name} draggable={false} className="deck-cover-static" style={{ opacity: 1 }} />
                      {d.gif && off === 0 && <img src={d.gif} alt="" draggable={false} className="deck-cover-gif" style={{ opacity: 1 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                      <img src={`/tarot-frames/frame_${DECK_LIST.indexOf(d) % 10}_${Math.floor(DECK_LIST.indexOf(d) / 2) % 4}.png`} alt="" className="deck-cover-frame" draggable={false} style={{ opacity: borderIntensity }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 좌우 화살표 */}
            <button className="deck-arrow deck-arrow-left" onClick={() => deckSlide(1)} aria-label="이전 덱">
              <svg viewBox="0 0 24 24" className="deck-arrow-icon" aria-hidden="true">
                <path d="M16 3 L5 12 L16 21 Z" fill="currentColor" />
              </svg>
            </button>
            <button className="deck-arrow deck-arrow-right" onClick={() => deckSlide(-1)} aria-label="다음 덱">
              <svg viewBox="0 0 24 24" className="deck-arrow-icon" aria-hidden="true">
                <path d="M8 3 L19 12 L8 21 Z" fill="currentColor" />
              </svg>
            </button>

            {/* 하단 정보 */}
            <div className="deck-info-overlay">
              <div className="deck-info-dots">
                {DECK_LIST.map((d, i) => (
                  <span key={d.id} className={`deck-dot ${i === deckSwipeIdx ? 'active' : ''}`} />
                ))}
              </div>
              <button className="deck-select-btn" onClick={() => selectDeckWithFlip(curDeck.id)}>
                이 덱으로 시작하기
              </button>
            </div>

            {/* 최근 본 타로 — 하단 drawer: 헤더 탭하면 위로 올라옴 */}
            <div className={`tarot-history-drawer ${historyOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="tarot-history-handle"
                onClick={() => setHistoryOpen(v => !v)}
                aria-expanded={historyOpen}
                aria-label="최근 본 타로 토글">
                <span className="tarot-history-handle-grip" aria-hidden="true" />
                <span className="tarot-history-handle-label">📚 최근 본 타로</span>
                <span className={`tarot-history-handle-chev ${historyOpen ? 'open' : ''}`} aria-hidden="true">▲</span>
              </button>
              <div className="tarot-history-content">
                <RecentHistory
                  type="tarot"
                  hideTitle
                  onOpen={async (item) => {
                    try {
                      const full = await getHistory(item.id);
                      const p = full?.payload;
                      if (!p) return;
                      const cards = Array.isArray(p.cards) ? p.cards : [];
                      setRevealedCards(cards);
                      setReading(p);
                      if (p.spread) setSpread(p.spread);
                      if (p.category) setCategory(p.category);
                      if (p.deck) setDeck(p.deck);
                      if (p.deckVariant != null) setDeckVariant(p.deckVariant);
                      setHistoryOpen(false);
                      setStep('result');
                    } catch {}
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ STEP 0.5: 덱 커버 풀스크린 인트로 → 자동 메뉴 전환 ═══ */}
      {step === 'tone' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck) || DECK_LIST[0];
        const phrases = [
          '카드가 당신의 운명을 속삭입니다',
          '별들이 당신의 이야기를 준비합니다',
          '운명의 카드가 펼쳐집니다',
          '신비로운 에너지가 모이고 있습니다',
          '카드 속 비밀이 드러나려 합니다',
        ];
        return (
          <div className="tarot-tone-screen">
            <img src={curDeck.img} alt={curDeck.name} className="tone-fullscreen-cover" />
            <div className="tone-fullscreen-overlay" />
            <div className="tone-phrase">
              <p className="tone-phrase-text">{phrases[Math.floor(Math.random() * phrases.length)]}</p>
              <p className="tone-phrase-deck">{curDeck.name}</p>
            </div>
          </div>
        );
      })()}

      {/* ═══ STEP 1: 메뉴 화면 (타로 스타일) ═══ */}
      {step === 'setup' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck) || DECK_LIST[0];
        const bgPaths = { newclassic: '/tarot-newclassic', jester: '/tarot-jester', masterpiece: '/tarot-masterpiece', classic_rws: '/tarot-classic-rws', dark: '/tarot-dark', romantic: '/tarot-romantic', oriental: '/tarot-oriental', western: '/tarot-western', girl: '/tarot-girl', boy: '/tarot-boy', cartoon_girl: '/tarot-cartoon-girl', cartoon_boy: '/tarot-cartoon-boy', cats: '/tarot-cats', dogs: '/tarot-dogs', kdrama: '/tarot-kdrama', celestial: '/tarot-celestial', lady: '/tarot-lady' };
        const bgBase = bgPaths[deck] || '';
        const bgSuffix = curDeck.hasVariants ? `_v${deckVariant}` : '';
        const curBgCard = SETUP_BG_CARDS[setupBgIdx % SETUP_BG_CARDS.length];
        const bgSrc = `${bgBase}/m${String(curBgCard).padStart(2,'0')}${bgSuffix}.jpg`;
        return (
          <div className="tarot-setup-screen">
            <img src={frameSrc} alt="" className="stage-frame-overlay" draggable={false} />
            <div className="tarot-setup-bg">
              <img key={`bg-${setupBgIdx}`} src={bgSrc} alt="" draggable={false} className="setup-bg-slide" />
            </div>
            <div className="tarot-setup-overlay" />

            {/* 별 파티클 — 차분하게 8개로 축소 */}
            <div className="tarot-setup-stars">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="tarot-setup-star tarot-setup-star--soft" style={{
                  '--ts-x': `${5 + (i * 12) % 90}%`,
                  '--ts-delay': `${i * 0.7}s`,
                  '--ts-dur': `${5 + (i % 3) * 1.2}s`,
                  '--ts-size': `${10 + (i % 3) * 4}px`,
                  '--ts-drift': `${-10 + (i % 5) * 4}px`,
                }}>{i % 2 === 0 ? '✦' : '✧'}</span>
              ))}
            </div>

            <div className="tarot-setup-content">
              <div className="tarot-setup-spacer" />
              {/* 상단 바 — 뒤로(덱 변경 또는 이전 단계) + 덱 이름 + 진행 표시 */}
              <div className="setup-top-bar">
                <button
                  className="setup-deck-change"
                  onClick={() => {
                    if (setupStep === 'spread') setSetupStep('category');
                    else if (setupStep === 'confirm') setSetupStep('spread');
                    else flipToStep(() => setStep('deck'));
                  }}
                >
                  ← {setupStep === 'category' ? '덱 변경' : '뒤로'}
                </button>
                <span className="setup-deck-name">{curDeck.name}</span>
                <div className="setup-step-dots" aria-label="진행 단계">
                  <span className={`setup-step-dot ${setupStep === 'category' ? 'active' : 'done'}`} />
                  <span className={`setup-step-dot ${setupStep === 'spread' ? 'active' : setupStep === 'confirm' ? 'done' : ''}`} />
                  <span className={`setup-step-dot ${setupStep === 'confirm' ? 'active' : ''}`} />
                </div>
              </div>

              {/* ════════ STEP A: 카테고리 ════════ */}
              {setupStep === 'category' && (() => {
                const allCats = [...TAROT_MAIN_CATS, ...(sheetExpanded ? TAROT_MORE_CATS : [])];
                return (
                  <div className="setup-substep fade-in">
                    <h2 className="setup-substep-title">
                      <span className="setup-title-quote">「</span>
                      무엇을 물어볼까요?
                      <span className="setup-title-quote">」</span>
                    </h2>
                    <p className="setup-substep-desc">카드에게 던질 질문의 분야를 골라주세요</p>
                    <div className="setup-cat-grid">
                      {allCats.map((item, i) => {
                        const bgImg = categoryBgImages[item.id];
                        return (
                          <button
                            key={item.id}
                            className={`setup-cat-tarot-card ${category === item.id ? 'active' : ''} ${bgImg ? 'has-deck-bg' : ''}`}
                            style={{ '--card-i': i, ...(bgImg ? { '--deck-bg': `url(${bgImg})` } : {}) }}
                            onClick={() => { setCategory(item.id); setSetupStep('spread'); }}
                          >
                            {bgImg && <span className="cat-tarot-deck-bg" aria-hidden="true" />}
                            <span className="cat-tarot-corner cat-tarot-corner-tl">✦</span>
                            <span className="cat-tarot-corner cat-tarot-corner-tr">✦</span>
                            <span className="cat-tarot-corner cat-tarot-corner-bl">✦</span>
                            <span className="cat-tarot-corner cat-tarot-corner-br">✦</span>
                            <span className="cat-tarot-icon">{item.icon}</span>
                            <span className="cat-tarot-label">{item.label}</span>
                            <span className="cat-tarot-shine" />
                          </button>
                        );
                      })}
                    </div>
                    {!sheetExpanded && (
                      <button
                        className="setup-more-link"
                        onClick={() => setSheetExpanded(true)}
                      >
                        + 더 많은 분야 보기
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* ════════ STEP B: 카드 수 ════════ */}
              {setupStep === 'spread' && (() => {
                const cat = [...TAROT_MAIN_CATS, ...TAROT_MORE_CATS].find(x => x.id === category);
                return (
                  <div className="setup-substep fade-in">
                    <h2 className="setup-substep-title">
                      <span className="setup-title-quote">「</span>
                      몇 장 뽑을까요?
                      <span className="setup-title-quote">」</span>
                    </h2>
                    <p className="setup-substep-desc">
                      <span className="setup-desc-cat">{cat?.icon} {cat?.label}</span>
                    </p>
                    <div className="setup-spread-stack">
                      {SPREADS.map((s, i) => {
                        const num = parseInt(s.id, 10) || 1;
                        const desc = s.id === '1' ? '한 장의 명확한 답'
                                   : s.id === '3' ? '과거 · 현재 · 미래'
                                   : '깊이 있는 켈틱 크로스';
                        return (
                          <button
                            key={s.id}
                            className={`setup-spread-card ${spread === s.id ? 'active' : ''}`}
                            style={{ '--spread-i': i }}
                            onClick={() => { setSpread(s.id); setSetupStep('confirm'); }}
                          >
                            <div className="setup-spread-visual">
                              {Array.from({ length: num }).map((_, k) => (
                                <span key={k} className="spread-mini-card" style={{ '--mc-i': k, '--mc-total': num }} />
                              ))}
                            </div>
                            <div className="setup-spread-card-main">
                              <span className="setup-spread-card-num">{s.label}</span>
                              <span className="setup-spread-card-desc">{desc}</span>
                            </div>
                            <span className="setup-spread-card-cost">💗 {s.cost}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ════════ STEP C: 시작 / 옵션 ════════ */}
              {setupStep === 'confirm' && (() => {
                const c = [...TAROT_MAIN_CATS, ...TAROT_MORE_CATS].find(x => x.id === category);
                const sp = SPREADS.find(x => x.id === spread);
                const num = parseInt(spread, 10) || 1;
                const spreadDesc = spread === '1' ? '한 장의 명확한 답'
                                : spread === '3' ? '과거 · 현재 · 미래'
                                : '깊이 있는 켈틱 크로스';
                const catBgImg = categoryBgImages[category];
                return (
                  <div className="setup-substep fade-in">
                    <h2 className="setup-substep-title">
                      <span className="setup-title-quote">「</span>
                      준비 완료
                      <span className="setup-title-quote">」</span>
                    </h2>

                    {/* 선택한 분야 + 카드 수 — Step B 카드와 동일한 보라/다크 그라데이션 배경 */}
                    <div className="setup-confirm-grid">
                      <div className="setup-spread-card setup-confirm-card" style={{ pointerEvents: 'none' }}>
                        <span className="setup-confirm-tag-inline">선택한 분야</span>
                        <div className="setup-confirm-row">
                          <span className="setup-confirm-cat-icon">{c?.icon}</span>
                          <span className="setup-confirm-cat-label">{c?.label}</span>
                        </div>
                      </div>

                      <div className="setup-spread-card setup-confirm-card" style={{ pointerEvents: 'none' }}>
                        <span className="setup-confirm-tag-inline">카드 수</span>
                        <div className="setup-confirm-row">
                          <div className="setup-spread-visual">
                            {Array.from({ length: num }).map((_, k) => (
                              <span key={k} className="spread-mini-card" style={{ '--mc-i': k, '--mc-total': num }} />
                            ))}
                          </div>
                          <div className="setup-spread-card-main" style={{ flex: 1 }}>
                            <span className="setup-spread-card-num">{sp?.label}</span>
                            <span className="setup-spread-card-desc">{spreadDesc}</span>
                          </div>
                          <span className="setup-spread-card-cost">💗 {sp?.cost}</span>
                        </div>
                      </div>
                    </div>

                    {/* 질문 추가 (선택) — 아코디언 */}
                    <button
                      type="button"
                      className="setup-question-toggle"
                      onClick={() => setQuestionOpen(v => !v)}
                      aria-expanded={questionOpen}
                    >
                      <span>✏️ 직접 질문 추가 <span className="setup-optional">(선택)</span></span>
                      <span className="setup-question-toggle-arrow">{questionOpen ? '▲' : '▼'}</span>
                    </button>
                    {questionOpen && (
                      <input
                        type="text"
                        className="setup-question-input fade-in"
                        placeholder="예) 이 사람과 잘 될 수 있을까?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        maxLength={100}
                        autoFocus
                      />
                    )}

                    {/* 시작 버튼 */}
                    <button className="tarot-start-btn" ref={startBtnRef} onClick={() => guardedShuffleStart(startShuffle)}>
                      <span>카드 셔플 시작</span>
                      <HeartCost category={tarotCategory} />
                      <span className="tarot-start-glow" />
                    </button>

                    {/* 펼치기 방식 — 시작 버튼 아래 미니 토글 */}
                    <div className="setup-pickmode-mini" role="group" aria-label="카드 펼치기 방식">
                      <span className="setup-pickmode-mini-label">펼치기</span>
                      <button
                        className={`setup-pickmode-mini-btn ${pickMode === 'carousel' ? 'active' : ''}`}
                        onClick={() => { setPickMode('carousel'); localStorage.setItem('tarotPickMode', 'carousel'); }}
                        title="한 장씩 넘기기"
                      >🎴</button>
                      <button
                        className={`setup-pickmode-mini-btn ${pickMode === 'line' ? 'active' : ''}`}
                        onClick={() => { setPickMode('line'); localStorage.setItem('tarotPickMode', 'line'); }}
                        title="전체 펼쳐서 선택"
                      >🃏</button>
                      <button
                        className={`setup-pickmode-mini-btn ${pickMode === 'fan' ? 'active' : ''}`}
                        onClick={() => { setPickMode('fan'); localStorage.setItem('tarotPickMode', 'fan'); }}
                        title="전통 부채꼴"
                      >🌙</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* ═══ STEP 2: 셔플 v2 — 뒷면만 카오스/모임/분산 ═══ */}
      {step === 'shuffle' && shuffledCards.length > 0 && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const phaseText =
          shufflePhase === 'riffle' ? <>카드를 섞고 있습니다<span className="tarot-dots" /></> :
          shufflePhase === 'gather' ? '한 덩어리로 모이고 있습니다...' :
          shufflePhase === 'fan'    ? '카드를 펼치고 있습니다...' :
                                       '';
        return (
          <div
            className="tarot-shuffle-stage-v2"
            onClick={() => { if (!flipPhaseRef.current) flipToStep(() => setStep('pick')); }}
            style={{ cursor: 'pointer' }}
          >
            <div className="shuffle-bg">
              <img src={shuffleBgSrc || curDeck?.img || '/shuffle-start.png'} alt="" className="shuffle-bg-static" />
            </div>
            <p className="shuffle-top-text shuffle-top-text-v2">{phaseText}</p>
            <p className="shuffle-skip-hint">탭하면 바로 카드 선택으로</p>
            <div className={`shuffle-field shuffle-phase-${shufflePhase}`}>
              {shuffleCardsMeta.map((c) => (
                <div
                  key={c.id}
                  className="shuffle-back-card"
                  style={{
                    '--stack-y': c.stackY,
                    '--rx': c.rx,
                    '--rx-mid': c.rxMid,
                    '--r-rot-start': c.rRotStart,
                    '--r-rot-mid': c.rRotMid,
                    '--r-dur': c.riffleDur,
                    '--r-delay': c.riffleDelay,
                    '--fan-angle': c.fanAngle,
                    '--fan-delay': c.fanDelay,
                    zIndex: c.id,
                  }}
                >
                  {selectedBack ? (
                    <img src={selectedBack} alt="" draggable={false} />
                  ) : (
                    <div className="tarot-card-back">
                      <div className="tarot-card-back-inner">
                        <div className="tarot-card-back-star">✦</div>
                        <div className="tarot-card-back-border" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="tarot-shuffle-hint">마음을 가라앉히고 질문에 집중하세요</p>
          </div>
        );
      })()}

      {/* STEP 2.5 (flip) 제거됨 — 셔플 캐러셀에서 직접 뒤집기 */}

      {/* ═══ STEP 3: 카드 선택 — 무한 캐러셀 + 관성 물리 ═══ */}
      {step === 'pick' && shuffledCards.length > 0 && (() => {
        const total = shuffledCards.length;
        const items = getCarouselItems(total);
        const centerIdx = ((Math.round(cPos.current) % total) + total) % total;
        const isCenterSelected = selectedIndices.includes(centerIdx);
        const curDeck = DECK_LIST.find(d => d.id === deck);
        return (
          <div className="tarot-pick-stage fade-in">
            <img src={frameSrc} alt="" className="stage-frame-overlay" draggable={false} />
            {/* 셋업/셔플에서 이어지는 동일한 배경 */}
            {(shuffleBgSrc || curDeck?.img) && (
              <div className="pick-gif-bg">
                <img src={shuffleBgSrc || curDeck.img} alt="" className="pick-bg-static" />
                <img src={frameSrc} alt="" className="bg-frame-overlay" draggable={false} />
              </div>
            )}
            {/* 상단 바 */}
            <div className="pick-top-bar">
              {discardPhase ? (
                <span className="pick-top-label discard-label">버릴 카드 <strong>1장</strong>을 탭하세요</span>
              ) : (
                <span className="pick-top-label">카드 <strong>{pickLimit}장</strong> 선택</span>
              )}
              <span className="pick-top-counter">{filledSlots.length}/{pickLimit}</span>
            </div>

            {/* 카드 선택 안내 회전 오버레이 — 자동/수동 선택 전까지만 */}
            {!discardPhase && filledSlots.length === 0 && !autoPickRunning && (
              <div className="pick-select-hint">
                <div className="pick-select-hint-orb">
                  <span className="pick-select-hint-ring pick-select-hint-ring--1" />
                  <span className="pick-select-hint-ring pick-select-hint-ring--2" />
                  <span className="pick-select-hint-ring pick-select-hint-ring--3" />
                  <span className="pick-select-hint-icon">✦</span>
                </div>
                <p className="pick-select-hint-text">카드를 선택하세요</p>
                <p className="pick-select-hint-sub">직감이 이끄는 카드를 탭 · 또는 자동 선택</p>
              </div>
            )}


            {/* 무한 캐러셀 모드 — 버리기 단계 / line·fan 모드(자동선택 외)에선 숨김
                line·fan 모드에서도 자동선택 중에는 캐러셀로 전환 (회전 → 한 장씩 선택 연출 유지) */}
            {!discardPhase && (pickMode === 'carousel' || ((pickMode === 'line' || pickMode === 'fan') && autoPickRunning)) && (
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
                      {selectedBack ? (
                        <img src={selectedBack} alt="" className="pick-card-back-img" draggable={false} />
                      ) : (
                        <div className="tarot-card-back">
                          <div className="tarot-card-back-inner">
                            <div className="tarot-card-back-star">✦</div>
                            <div className="tarot-card-back-border" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 가로 일렬 모드 — 78장 전체를 가로 스크롤로 펼침, 직접 탭으로 선택
                자동선택 중에는 캐러셀로 잠시 전환되므로 숨김 */}
            {!discardPhase && pickMode === 'line' && !autoPickRunning && (
              <div className="pick-line-wrap">
                <div className="pick-line-scroll">
                  {shuffledCards.map((_, idx) => {
                    const isSelected = selectedIndices.includes(idx);
                    // 78장을 살짝 겹치게 — 카드끼리 위로 약간 어긋나는 깊이감
                    const overlap = idx % 2 === 0 ? 0 : -6;
                    return (
                      <div
                        key={`line-${idx}`}
                        className={`pick-line-card ${isSelected ? 'pick-line-done' : ''}`}
                        style={{ marginTop: `${overlap}px` }}
                        onClick={() => !isSelected && !allFilled && handleCardPick(idx)}
                      >
                        {selectedBack ? (
                          <img src={selectedBack} alt="" className="pick-line-back-img" draggable={false} />
                        ) : (
                          <div className="tarot-card-back">
                            <div className="tarot-card-back-inner">
                              <div className="tarot-card-back-star">✦</div>
                              <div className="tarot-card-back-border" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 부채꼴 모드 — 78장을 화면 하단을 회전축으로 펼침.
                좌우 드래그로 회전, 탭으로 선택. 자동선택은 캐러셀로 잠시 전환.
                centerIdx 카드가 정확히 수직(0°)에 위치하도록 고정. */}
            {!discardPhase && pickMode === 'fan' && !autoPickRunning && (() => {
              const totalFan = shuffledCards.length; // 78
              const centerIdx = Math.floor(totalFan / 2); // 39번 카드가 가운데(수직)
              const stepDeg = 6.5; // 카드당 6.5° → 시각적 간격 충분, 클릭 쉬움
              const maxRotation = Math.max(centerIdx, totalFan - 1 - centerIdx) * stepDeg + 10;
              return (
                <div
                  className="pick-fan-wrap"
                  onTouchStart={(e) => {
                    fanDragRef.current = { active: true, startX: e.touches[0].clientX, startRot: fanRotation, moved: false };
                  }}
                  onTouchMove={(e) => {
                    if (!fanDragRef.current.active) return;
                    const dx = e.touches[0].clientX - fanDragRef.current.startX;
                    if (Math.abs(dx) > 4) fanDragRef.current.moved = true;
                    // 1px = 0.32deg → 부드러우면서도 양 끝까지 도달 가능
                    const newRot = fanDragRef.current.startRot + dx * 0.32;
                    setFanRotation(Math.max(-maxRotation, Math.min(maxRotation, newRot)));
                  }}
                  onTouchEnd={() => { fanDragRef.current.active = false; }}
                  onMouseDown={(e) => {
                    fanDragRef.current = { active: true, startX: e.clientX, startRot: fanRotation, moved: false };
                  }}
                  onMouseMove={(e) => {
                    if (!fanDragRef.current.active) return;
                    const dx = e.clientX - fanDragRef.current.startX;
                    if (Math.abs(dx) > 4) fanDragRef.current.moved = true;
                    const newRot = fanDragRef.current.startRot + dx * 0.32;
                    setFanRotation(Math.max(-maxRotation, Math.min(maxRotation, newRot)));
                  }}
                  onMouseUp={() => { fanDragRef.current.active = false; }}
                  onMouseLeave={() => { fanDragRef.current.active = false; }}
                >
                  <div className="pick-fan-inner">
                    {shuffledCards.map((_, idx) => {
                      const isSelected = selectedIndices.includes(idx);
                      // centerIdx 카드의 angle = fanRotation (0이면 정확히 수직)
                      const cardAngle = (idx - centerIdx) * stepDeg + fanRotation;
                      const distFromCenter = Math.abs(cardAngle);
                      // 포커스: 카드 한 칸 폭(±stepDeg/2) 이내 → 항상 한 장만 강조
                      const isFocus = distFromCenter < stepDeg / 2;
                      // 가시 범위 ±70° (양옆 약 11~12장씩 보임, 너무 옆은 숨김)
                      const visible = distFromCenter < 70;
                      return (
                        <div
                          key={`fan-${idx}`}
                          className={`pick-fan-card ${isSelected ? 'pick-fan-done' : ''} ${isFocus ? 'pick-fan-focus' : ''}`}
                          style={{
                            // translateY -36vh: 중앙 카드를 아래로 약 8vh(≈1.5cm) 내림 → 상단 힌트 오브와 겹침 해소
                            transform: `translate(-50%, 0) rotate(${cardAngle.toFixed(2)}deg) translateY(-36vh)`,
                            zIndex: 100 - Math.round(distFromCenter),
                            opacity: visible ? (isSelected ? 0.18 : 1) : 0,
                            pointerEvents: visible && !isSelected ? 'auto' : 'none',
                          }}
                          onClick={(e) => {
                            // 드래그 중이었으면 클릭 무시
                            if (fanDragRef.current.moved) { fanDragRef.current.moved = false; return; }
                            if (isSelected || allFilled) return;
                            handleCardPick(idx);
                          }}
                        >
                          {selectedBack ? (
                            <img src={selectedBack} alt="" className="pick-fan-back-img" draggable={false} />
                          ) : (
                            <div className="tarot-card-back">
                              <div className="tarot-card-back-inner">
                                <div className="tarot-card-back-star">✦</div>
                                <div className="tarot-card-back-border" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 자동 선택 버튼 — 캐러셀과 슬롯 사이 */}
            {!allFilled && !autoPickRunning && !pickBusy.current && !discardPhase && (
              <button className="pick-auto-btn" onClick={handleRandomPick}>✦ 자동 선택</button>
            )}

            {/* 하단 슬롯 — 버리기 모드 or 남은 카드 앞면 공개 */}
            <div className={`tarot-deck-slots ${discardPhase ? `discard-mode${filledSlots.length >= 6 ? ' discard-cols-3' : ''}` : ''}`}>
              {filledSlots.map((card, i) => (
                card === null ? (
                  <div key={`slot-empty-${i}`} className="tarot-deck-slot slot-empty slot-discarded-placeholder">
                    <div className="tarot-slot-placeholder">
                      <span className="tarot-slot-num">✕</span>
                    </div>
                  </div>
                ) : (
                  <div key={`slot-${card.id}-${i}`}
                    className={`tarot-deck-slot slot-filled ${discardPhase ? 'slot-discard-tap' : ''} ${discardingIdx === i ? 'slot-fly-away' : ''} ${spotlightIdx === i ? 'slot-spotlight' : ''} ${spotlightIdx !== null && spotlightIdx !== i ? 'slot-dim' : ''}`}
                    onClick={() => discardPhase && discardingIdx === null && spotlightIdx === null && handleDiscard(i)}
                  >
                    <div className={`tarot-slot-card slot-flip-wrap${slotsRevealed ? ' slot-flipped' : ''}`} style={{ '--slot-flip-delay': `${i * 300}ms` }}>
                      <div className="slot-flip-back">
                        {selectedBack ? (
                          <img src={selectedBack} alt="" className="slot-card-back-img" draggable={false} />
                        ) : (
                          <div className="tarot-card-back">
                            <div className="tarot-card-back-inner">
                              <div className="tarot-card-back-star">✦</div>
                              <div className="tarot-card-back-border" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="slot-flip-front">
                        <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
                      </div>
                      {!slotsRevealed && <div className="tarot-slot-badge">{card._pickOrder || (i + 1)}</div>}
                    </div>
                  </div>
                )
              ))}
              {!discardPhase && !slotsRevealed && Array.from({ length: Math.max(0, pickLimit - filledSlots.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="tarot-deck-slot slot-empty">
                  <div className="tarot-slot-placeholder">
                    <span className="tarot-slot-num">{filledSlots.length + i + 1}</span>
                  </div>
                </div>
              ))}
            </div>

            {discardPhase && !discardingIdx && (
              <p className="discard-hint fade-in">버릴 카드 한 장을 탭하세요</p>
            )}
            {!allFilled && !autoPickRunning && !discardPhase && !slotsRevealed && (
              <p className="tarot-pick-hint">직감을 믿고 가운데 카드를 탭하세요</p>
            )}

          </div>
        );
      })()}

      {/* ═══ STEP 4: 리빌 — 카드 캐러셀(앞면) + AI 분석 ═══ */}
      {step === 'reveal' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const revealItems = getCarouselItems(revealedCards.length || 1);
        return (
        <div className="tarot-reveal-stage fade-in">
            <img src={frameSrc} alt="" className="stage-frame-overlay" draggable={false} />
          {(shuffleBgSrc || curDeck?.img) && (
            <div className="reveal-gif-bg">
              <img src={shuffleBgSrc || curDeck.img} alt="" className="reveal-bg-static" />
            </div>
          )}

          {/* Phase 1: 한 장씩 크게 순차 공개 (1초씩). ai-analyzing 클래스 — 분석 중엔 카드가 위로 올라가 하단 타입라이터 자리 확보 */}
          <div className={`reveal-center-wrap ${(loading || aiStreaming) ? 'ai-analyzing' : ''}`}>
            {!revealCarouselMode && (
              <div className="reveal-single-wrap">
                {revealedCards.length > 0 && revealSingleIdx >= 0 && revealSingleIdx < revealedCards.length && (() => {
                  const card = revealedCards[revealSingleIdx];
                  if (!card) return null;
                  const posLabel = POSITION_LABELS[spread]?.[revealSingleIdx] || '';
                  return (
                    <div key={`single-${revealSingleIdx}`} className="reveal-single-card">
                      {posLabel && <div className="reveal-single-label">{posLabel}</div>}
                      <div className={`reveal-single-flip ${card.reversed ? 'reversed' : ''}`}>
                        <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
                        {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                      </div>
                      <div className="reveal-single-name">{card.nameKr}</div>
                      <div className="reveal-single-counter">{revealSingleIdx + 1} / {revealedCards.length}</div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Phase 2: 원래 AI 분석 화면 — 캐러셀 + 순차 플립 */}
            {revealCarouselMode && (
              <div className="reveal-carousel" {...cHandlers}>
                {revealedCards.length > 0 && revealItems.map(({ off, idx, x, scale, opacity, z }) => {
                  const cardIdx = idx % revealedCards.length;
                  const card = revealedCards[cardIdx];
                  if (!card) return null;
                  const posLabel = POSITION_LABELS[spread]?.[cardIdx] || '';
                  const isFlipped = flipIndex >= cardIdx;
                  return (
                    <div key={`rev-${off}`} className={`reveal-slide-card ${off === 0 ? 'reveal-slide-active' : ''}`} style={{
                      transform: `translateX(${x}px) scale(${scale})`,
                      opacity, zIndex: z,
                    }}>
                      <div className={`reveal-card-flip${isFlipped ? ' flipped' : ''}`}>
                        <div className="reveal-card-back-face">
                          {selectedBack ? (
                            <img src={selectedBack} alt="" draggable={false} />
                          ) : (
                            <div className="tarot-card-back">
                              <div className="tarot-card-back-inner">
                                <div className="tarot-card-back-star">✦</div>
                                <div className="tarot-card-back-border" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className={`reveal-card-front ${card.reversed ? 'reversed' : ''}`}>
                          <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
                          {card.reversed && <div className="tarot-card-reversed-tag">역방향</div>}
                        </div>
                      </div>
                      <div className="reveal-card-label">{posLabel}</div>
                      <div className="reveal-card-name">{isFlipped ? card.nameKr : ''}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI 분석 — 카드 뒤 오브 (배경 분위기) */}
            {(loading || aiStreaming) && (
              <div className="reveal-ai-behind">
                <div className="reveal-ai-orbit">
                  <div className="reveal-ai-orb reveal-ai-orb-1" />
                  <div className="reveal-ai-orb reveal-ai-orb-2" />
                  <div className="reveal-ai-orb reveal-ai-orb-3" />
                </div>
              </div>
            )}
          </div>

          {/* AI 분석 — 하단 타입라이터 스트리밍 텍스트 박스 */}
          {(loading || aiStreaming) && (
            <div className="reveal-ai-bottom-stream">
              <div className="reveal-ai-status-top">🔮 AI가 타로를 분석하고 있어요</div>
              {/* 회전 멘트 — 지루함 방지 (6초마다) */}
              <WaitMessages messages={WAIT_MESSAGES.tarot} interval={6000} variant="large" />
              <div className="reveal-ai-typewriter" ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
                {aiStreaming && streamText ? (
                  <p className="reveal-ai-typewriter-text">
                    {streamText}
                    <span className="reveal-ai-cursor">▍</span>
                  </p>
                ) : (
                  <p className="reveal-ai-typewriter-text reveal-ai-typewriter-waiting">
                    <span className="reveal-ai-dots">···</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* ═══ STEP 5: 결과 — 캐러셀 + 해석 결과 ═══ */}
      {step === 'result' && (() => {
        const curDeck = DECK_LIST.find(d => d.id === deck);
        const resultItems = getCarouselItems(revealedCards.length || 1);
        return (
        <div className="tarot-result-stage fade-in">
            <img src={frameSrc} alt="" className="stage-frame-overlay" draggable={false} />
            <button className="tarot-retry-btn" onClick={resetAll}>다시하기 ↻</button>
          {(shuffleBgSrc || curDeck?.img) && (
            <div className="reveal-gif-bg">
              <img src={shuffleBgSrc || curDeck.img} alt="" className="reveal-bg-static" />
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
                    <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
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
              <div className="tarot-overall glass-card tarot-framed-card">
                <img src={frameSrc} alt="" className="text-frame-overlay" draggable={false} />
                <button className="tarot-overall-retry" onClick={resetAll} aria-label="다시하기">
                  <span className="tarot-overall-retry-icon">↻</span>
                  <span className="tarot-overall-retry-label">다시하기</span>
                </button>
                <div className="tarot-overall-icon">🌟</div>
                <p className="tarot-overall-text">{reading.overallMessage}</p>
              </div>

              {reading.cards && reading.cards.length > 0 && (
                <div className="tarot-cards-table glass-card tarot-framed-card">
                  <img src={frameSrc} alt="" className="text-frame-overlay" draggable={false} />
                  <h3 className="tarot-interp-title"><span>🃏</span> 카드별 해석</h3>
                  <div className="tarot-cards-table-body">
                    {reading.cards.map((card, i) => (
                      <div key={i} className="tarot-card-row">
                        <div className="tarot-card-row-pos">{card.position || POSITION_LABELS[spread]?.[i] || `카드 ${i + 1}`}</div>
                        <div className="tarot-card-row-name">{card.nameKr || card.name}{card.reversed ? ' (역방향)' : ''}</div>
                        <div className="tarot-card-row-meaning">{card.meaning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="tarot-interpretation glass-card tarot-framed-card">
                <img src={frameSrc} alt="" className="text-frame-overlay" draggable={false} />
                <h3 className="tarot-interp-title"><span>📜</span> 타로 마스터의 해석</h3>
                <div className="tarot-interp-body">
                  {(reading.interpretation || '').split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>

              {reading.advice && (
                <div className="tarot-framed-card" style={{ position: 'relative' }}>
                  <img src={frameSrc} alt="" className="text-frame-overlay" draggable={false} />
                  <FortuneCard icon="💡" title="오늘의 조언" description={reading.advice} delay={200} />
                </div>
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
        </div>
        );
      })()}

      {/* ═══ 결과 카드 상세보기 모달 (result-stage 밖) ═══ */}
      {resultDetailIdx !== null && (() => {
        const card = revealedCards[resultDetailIdx];
        const posLabel = POSITION_LABELS[spread]?.[resultDetailIdx] || '';
        const readingCard = reading?.cards?.[resultDetailIdx];
        if (!card) return null;
        return (
          <div className="result-card-detail-overlay fade-in" onClick={() => setResultDetailIdx(null)}>
            <div className="result-card-detail">
              <div className={`result-card-detail-img ${card.reversed ? 'reversed' : ''}`}>
                <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
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
                    <TarotCardArt cardId={heroCardId} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
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
                  <TarotCardArt cardId={card.id} deck={deck} variant={deckVariant} frameSet={selectedFrame.set} frameV={selectedFrame.v} />
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
      </>}
    </div>
    </div>
  );
}

export default Tarot;
