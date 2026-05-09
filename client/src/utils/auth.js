// JWT + 사용자 식별자 통합 저장소.
// 모바일(Capacitor WebView)도 localStorage 가 영구 저장되므로 별도 추상화 불필요.

const KEY_TOKEN = 'authToken';
const KEY_USER_ID = 'userId';
const KEY_USER_NAME = 'userName';
const KEY_USER_PROFILE = 'userProfile';
const KEY_GUEST_ID = 'guestId';

// 추가 사용자 데이터 키 — 탈퇴/로그아웃 시 함께 정리
const EXTRA_LOCAL_KEYS = [
  'myStarList',     // 즐겨찾는 스타 목록
  'recentHistory',  // 캐시된 운세 히스토리
];
const SESSION_KEYS = [
  'splashShown',     // 세션 내 스플래시 표시 여부
  'kakaoReturnTo',   // 카카오 OAuth 복귀 경로
];

export const getToken = () => {
  try { return localStorage.getItem(KEY_TOKEN); } catch { return null; }
};

export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(KEY_TOKEN, t);
    else localStorage.removeItem(KEY_TOKEN);
  } catch {}
};

export const clearAuth = () => {
  try {
    // 인증/식별
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER_ID);
    localStorage.removeItem(KEY_USER_NAME);
    localStorage.removeItem(KEY_USER_PROFILE);
    localStorage.removeItem(KEY_GUEST_ID);
    // 사용자 데이터
    EXTRA_LOCAL_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    // 세션 일회성 데이터
    SESSION_KEYS.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });
  } catch {}
};
