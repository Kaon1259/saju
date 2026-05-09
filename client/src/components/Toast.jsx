import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

const ToastContext = createContext(null);

let toastIdCounter = 0;

/**
 * 사용법:
 *   const toast = useToast();
 *   toast('저장되었습니다');
 *   toast('실패했어요', 'error');
 *   toast('확인하세요', 'info', 4000);
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', duration = 2600) => {
    if (!message) return;
    const id = ++toastIdCounter;
    setItems((prev) => [...prev, { id, message: String(message), type }]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }, [remove]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
        <div className="toast-stack" role="region" aria-live="polite" aria-atomic="true">
          {items.map((it) => (
            <ToastItem key={it.id} {...it} onClose={() => remove(it.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ message, type, onClose }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : type === 'warn' ? '⚡' : '💬';

  return (
    <div className={`toast-item toast-${type} ${exiting ? 'toast-exit' : ''}`} onClick={onClose}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-msg">{message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return (msg) => {
      if (typeof window !== 'undefined') {
        console.warn('[toast] ToastProvider 미설치 — fallback alert:', msg);
        if (msg) window.alert(msg);
      }
    };
  }
  return ctx;
}

export default ToastProvider;
