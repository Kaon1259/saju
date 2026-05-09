import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

const ConfirmContext = createContext(null);

/**
 * 사용법:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: '회원 탈퇴', message: '...', danger: true });
 *   if (ok) doDelete();
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmText, cancelText, danger, resolve }

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        title: opts.title || '확인',
        message: opts.message || '',
        confirmText: opts.confirmText || '확인',
        cancelText: opts.cancelText || '취소',
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    if (state) state.resolve(result);
    setState(null);
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && createPortal(
        <ConfirmDialog
          {...state}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ title, message, confirmText, cancelText, danger, onConfirm, onCancel }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="confirm-title">{title}</h3>
        {message && (
          <div className="confirm-msg">
            {String(message).split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`confirm-btn ${danger ? 'confirm-btn-danger' : 'confirm-btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (opts) => {
      console.warn('[confirm] ConfirmProvider 미설치 — fallback window.confirm');
      if (typeof window !== 'undefined') {
        return window.confirm(opts?.message || opts?.title || '확인');
      }
      return false;
    };
  }
  return ctx;
}

export default ConfirmProvider;
