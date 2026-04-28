// 타로 카드 프레임 풀 — 실제 존재하는 PNG (set,v) 조합 8개
// 자세한 매핑: 덱 선택 화면(Tarot.jsx의 deck-cover-frame)에서 카드별로 사용되는 (set,v) 페어
export const FRAME_POOL = [
  { set: 0, v: 0 },
  { set: 1, v: 0 },
  { set: 2, v: 1 },
  { set: 3, v: 1 },
  { set: 4, v: 2 },
  { set: 5, v: 2 },
  { set: 6, v: 3 },
  { set: 7, v: 3 },
];

export const pickRandomFrame = () => FRAME_POOL[Math.floor(Math.random() * FRAME_POOL.length)];
