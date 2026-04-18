import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appInit } from '../api/fortune';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [heartCosts, setHeartCosts] = useState({});
  // 깜빡임 방지: localStorage에 캐시된 프로필이 있으면 낙관적으로 세팅 (appInit 완료 전까지 유효)
  const [appUser, setAppUser] = useState(() => {
    try {
      const uid = localStorage.getItem('userId');
      const raw = localStorage.getItem('userProfile');
      if (!uid || !raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && !parsed.isGuest) return parsed;
    } catch {}
    return null;
  });
  const [appReady, setAppReady] = useState(false);

  const initApp = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      // Guest는 서버에 유저를 만들지 않음 — heartCosts만 받아옴
      const data = await appInit(userId, null);

      if (data.heartCosts) setHeartCosts(data.heartCosts);
      if (data.user && !data.user.isGuest) {
        // 로그인 사용자: 서버 프로필로 localStorage 갱신
        setAppUser(data.user);
        localStorage.setItem('userName', data.user.name || '');
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        window.dispatchEvent(new Event('heart:refresh'));
      } else {
        // Guest 또는 서버에 사용자 없음 또는 Guest 유저 → userId 정리
        if (userId) {
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          localStorage.removeItem('userProfile');
          localStorage.removeItem('guestId');
        }
        setAppUser(null);
      }
    } catch (e) {
      console.error('[AppInit] failed:', e);
    } finally {
      setAppReady(true);
    }
  }, []);

  useEffect(() => { initApp(); }, [initApp]);

  // 로그인/로그아웃 시 재초기화
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'userId') initApp();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth:changed', initApp);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth:changed', initApp);
    };
  }, [initApp]);

  const getHeartCost = useCallback((category) => {
    if (heartCosts[category] !== undefined) return heartCosts[category];
    if (category.startsWith('DEEP_')) return 15;
    return 5;
  }, [heartCosts]);

  const isGuest = !appUser;
  const isLoggedIn = !!appUser && !appUser.isGuest;

  return (
    <AppContext.Provider value={{ heartCosts, getHeartCost, appUser, appReady, isGuest, isLoggedIn, refreshApp: initApp }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export default AppContext;
