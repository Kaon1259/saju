import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appInit } from '../api/fortune';

const AppContext = createContext(null);

function generateGuestId() {
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('guestId', guestId);
  }
  return guestId;
}

export function AppProvider({ children }) {
  const [heartCosts, setHeartCosts] = useState({});
  const [appUser, setAppUser] = useState(null);
  const [appReady, setAppReady] = useState(false);

  const initApp = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      const guestId = userId ? null : generateGuestId();
      const data = await appInit(userId, guestId);

      if (data.heartCosts) setHeartCosts(data.heartCosts);
      if (data.user) {
        setAppUser(data.user);
        // Guest인 경우 userId를 localStorage에 저장 (하트 차감용)
        if (data.user.isGuest && !userId) {
          localStorage.setItem('userId', String(data.user.id));
          localStorage.setItem('userName', 'Guest');
        }
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

  const isGuest = appUser?.isGuest ?? !localStorage.getItem('userId');

  return (
    <AppContext.Provider value={{ heartCosts, getHeartCost, appUser, appReady, isGuest, refreshApp: initApp }}>
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
