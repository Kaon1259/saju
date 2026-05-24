// 나의 스타(찜) 단일 저장소 — 스타 페이지 전역 공용.
// MyStar / CelebMatch / CelebCompatibility 가 모두 이 목록(myStarList)을 읽고 쓴다.
const KEY = 'myStarList';

export function getMyStars() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveMyStars(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function isMyStar(item) {
  if (!item) return false;
  return getMyStars().some((s) => s.name === item.name && s.birth === item.birth);
}

function normalize(item) {
  return {
    name: item.name,
    birth: item.birth,
    gender: item.gender || null,
    category: item.category || 'custom',
    group: item.group || null,
    agency: item.agency || null,
  };
}

// 찜 토글 → 토글 후의 저장 여부(true=저장됨) 반환
export function toggleMyStar(item) {
  const list = getMyStars();
  const exists = list.some((s) => s.name === item.name && s.birth === item.birth);
  const next = exists
    ? list.filter((s) => !(s.name === item.name && s.birth === item.birth))
    : [...list, normalize(item)];
  saveMyStars(next);
  return !exists;
}

// 찜 추가 (이미 있으면 무시)
export function addMyStar(item) {
  if (!isMyStar(item)) saveMyStars([...getMyStars(), normalize(item)]);
}
