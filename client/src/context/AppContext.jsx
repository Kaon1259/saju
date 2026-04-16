import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appInit } from '../api/fortune';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [heartCosts, setHeartCosts] = useState({});
  const [appUser, setAppUser] = useState(null);
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
      } else if (userId && !data.user) {
        // 서버에 사용자 없음 → 잘못된 userId → 정리
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userProfile');
        setAppUser(null);
      } else {
        // Guest: 서버 유저 없이 클라이언트만 Guest 상태
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
