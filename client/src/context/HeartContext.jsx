import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHeartBalance } from '../api/fortune';

const HeartContext = createContext();

export function HeartProvider({ children }) {
  const navigate = useNavigate();
  const [heartPoints, setHeartPoints] = useState(null);
  const [showInsufficient, setShowInsufficient] = useState(null);

  const refreshHearts = useCallback(async () => {
    const uid = localStorage.getItem('userId');
    if (!uid) { setHeartPoints(null); return; }
    try {
      const data = await getHeartBalance(uid);
      setHeartPoints(data.heartPoints);
    } catch { /* ignore */ }
  }, []);

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

  // 전역 insufficient_hearts 이벤트 수신 → 모달 표시 + 진행 중 AI 호출 모두 종료
  useEffect(() => {
    const handler = (e) => {
      showInsufficientPopup(e.detail);
      try { window.dispatchEvent(new CustomEvent('ai:abort', { detail: { reason: 'insufficient_hearts' } })); } catch {}
    };
    window.addEventListener('heart:insufficient', handler);
    return () => window.removeEventListener('heart:insufficient', handler);
  }, [showInsufficientPopup]);

  // 프로필 미완성 이벤트 수신 → ProfileEdit로 이동
  useEffect(() => {
    const handler = () => {
      const here = window.location.pathname;
      if (here.startsWith('/profile/edit') || here.startsWith('/register')) return;
      navigate('/profile/edit', { state: { from: here } });
    };
    window.addEventListener('profile:required', handler);
    return () => window.removeEventListener('profile:required', handler);
  }, [navigate]);

  // 로그인 필요 이벤트 수신 → 로그인 페이지로 이동
  useEffect(() => {
    const handler = () => navigate('/register', { state: { from: window.location.pathname } });
    window.addEventListener('auth:required', handler);
    return () => window.removeEventListener('auth:required', handler);
  }, [navigate]);

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

  // 하트 차감 버블 애니메이션
  const [deductBubble, setDeductBubble] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const cost = e.detail?.cost;
      if (cost) {
        setDeductBubble(`-${cost}`);
        setTimeout(() => setDeductBubble(null), 1500);
      }
    };
    window.addEventListener('heart:deducted', handler);
    return () => window.removeEventListener('heart:deducted', handler);
  }, []);

  return (
    <HeartContext.Provider value={{
      heartPoints, refreshHearts, deductLocal,
      showInsufficient, showInsufficientPopup, dismissInsufficient
    }}>
      {children}
      {/* 하트 차감 버블 */}
      {deductBubble && (
        <div className="heart-deduct-bubble">
          <span className="heart-deduct-icon">💗</span>
          <span className="heart-deduct-amount">{deductBubble}</span>
        </div>
      )}
      {showInsufficient && (
        <div className="heart-insufficient-overlay" onClick={dismissInsufficient}>
          <div className="heart-insufficient-popup" onClick={e => e.stopPropagation()}>
            <div className="heart-insufficient-icon">💔</div>
            <div className="heart-insufficient-title">하트가 부족해요</div>
            <div className="heart-insufficient-info">
              <div>필요: <strong>{showInsufficient.required}</strong> 하트</div>
              <div>보유: <strong>{showInsufficient.available}</strong> 하트</div>
            </div>
            <p className="heart-insufficient-desc">하트를 충전하고 다시 시도해보세요!</p>
            <button className="heart-insufficient-btn heart-insufficient-btn--charge" onClick={() => { dismissInsufficient(); navigate('/my-menu'); }}>
              💗 하트 충전하러 가기
            </button>
            <button className="heart-insufficient-btn heart-insufficient-btn--close" onClick={dismissInsufficient}>닫기</button>
          </div>
        </div>
      )}
    </HeartContext.Provider>
  );
}

export function useHearts() {
  return useContext(HeartContext);
}
