import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getHeartBalance } from '../api/fortune';

const HeartContext = createContext();

export function HeartProvider({ children }) {
  const [heartPoints, setHeartPoints] = useState(null);
  const [showInsufficient, setShowInsufficient] = useState(null);

  const userId = localStorage.getItem('userId');

  const refreshHearts = useCallback(async () => {
    if (!userId) { setHeartPoints(null); return; }
    try {
      const data = await getHeartBalance(userId);
      setHeartPoints(data.heartPoints);
    } catch { /* ignore */ }
  }, [userId]);

  const deductLocal = useCallback((amount) => {
    setHeartPoints(prev => prev != null ? Math.max(0, prev - amount) : prev);
  }, []);

  const showInsufficientPopup = useCallback((data) => {
    setShowInsufficient(data);
    refreshHearts();
  }, [refreshHearts]);

  const dismissInsufficient = useCallback(() => {
    setShowInsufficient(null);
  }, []);

  // 초기 잔액 로드
  useEffect(() => {
    refreshHearts();
  }, [refreshHearts]);

  // 전역 insufficient_hearts 이벤트 수신
  useEffect(() => {
    const handler = (e) => showInsufficientPopup(e.detail);
    window.addEventListener('heart:insufficient', handler);
    return () => window.removeEventListener('heart:insufficient', handler);
  }, [showInsufficientPopup]);

  // 로그인/로그아웃 시 갱신
  useEffect(() => {
    const handler = () => refreshHearts();
    window.addEventListener('heart:refresh', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('heart:refresh', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refreshHearts]);

  return (
    <HeartContext.Provider value={{
      heartPoints, refreshHearts, deductLocal,
      showInsufficient, showInsufficientPopup, dismissInsufficient
    }}>
      {children}
      {showInsufficient && (
        <div className="heart-insufficient-overlay" onClick={dismissInsufficient}>
          <div className="heart-insufficient-popup" onClick={e => e.stopPropagation()}>
            <div className="heart-insufficient-icon">💔</div>
            <div className="heart-insufficient-title">하트가 부족해요</div>
            <div className="heart-insufficient-info">
              <div>필요: <strong>{showInsufficient.required}</strong> 하트</div>
              <div>보유: <strong>{showInsufficient.available}</strong> 하트</div>
            </div>
            <p className="heart-insufficient-desc">하트가 부족하여 분석을 진행할 수 없습니다.</p>
            <button className="heart-insufficient-btn" onClick={dismissInsufficient}>확인</button>
          </div>
        </div>
      )}
    </HeartContext.Provider>
  );
}

export function useHearts() {
  return useContext(HeartContext);
}
