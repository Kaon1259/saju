// JWT + 사용자 식별자 통합 저장소.
// 모바일(Capacitor WebView)도 localStorage 가 영구 저장되므로 별도 추상화 불필요.

const KEY_TOKEN = 'authToken';
const KEY_USER_ID = 'userId';
const KEY_USER_NAME = 'userName';
const KEY_USER_PROFILE = 'userProfile';
const KEY_GUEST_ID = 'guestId';

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
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER_ID);
    localStorage.removeItem(KEY_USER_NAME);
    localStorage.removeItem(KEY_USER_PROFILE);
    localStorage.removeItem(KEY_GUEST_ID);
  } catch {}
};
