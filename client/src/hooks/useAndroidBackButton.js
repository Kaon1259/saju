import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Android 하드웨어 백버튼 처리
 *
 * 우선순위:
 *  1) BirthDatePicker / ConfirmDialog 등 portal 시트가 떠 있으면 → 시트만 닫기
 *  2) 라우트 히스토리가 있으면 → navigate(-1)
 *  3) 홈에서 백버튼 → 앱 종료 (Capacitor App.exitApp)
 *
 * Capacitor 8 의 App.addListener('backButton', ...) 사용. iOS 는 무시 (이벤트 안 옴).
 * SPA navigate 와 자연스럽게 합쳐지도록 router 는 BrowserRouter 사용.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;

    let removeListener = null;
    let active = true;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const sub = await App.addListener('backButton', ({ canGoBack }) => {
          if (!active) return;

          // 1) 떠 있는 portal 시트/모달 닫기 (BirthDatePicker, ConfirmDialog)
          const overlay =
            document.querySelector('.bdp-sheet-overlay') ||
            document.querySelector('.confirm-overlay') ||
            document.querySelector('.star-picker-overlay') ||
            document.querySelector('.celeb-ai-overlay');
          if (overlay) {
            overlay.click(); // 각 컴포넌트의 onClose / onCancel 트리거
            return;
          }

          // 2) 홈에서 백버튼 → 앱 종료
          if (location.pathname === '/' || location.pathname === '/landing') {
            App.exitApp().catch(() => {});
            return;
          }

          // 3) 그 외에는 라우터 뒤로가기
          if (canGoBack || window.history.length > 1) {
            navigate(-1);
          } else {
            App.exitApp().catch(() => {});
          }
        });
        removeListener = sub.remove;
      } catch {
        // @capacitor/app 미설치 환경(웹)은 조용히 무시
      }
    })();

    return () => {
      active = false;
      try { removeListener?.(); } catch {}
    };
  }, [navigate, location.pathname]);
}
