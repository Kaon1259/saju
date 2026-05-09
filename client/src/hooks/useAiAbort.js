import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// 글로벌 ai:abort 이벤트 수신 → 페이지의 cleanup 콜백 실행
// 발생 시점: 하트 부족, 프로필 미완성, 인증 만료, 라우트 변경 — 진행 중 AI 호출을 안전하게 종료
//
// 사용:
//   useAiAbort(() => {
//     setLoading(false); setStreaming(false);
//     cleanupRef.current?.();
//   });
export function useAiAbort(cleanup) {
  const ref = useRef(cleanup);
  ref.current = cleanup;
  useEffect(() => {
    const handler = () => { try { ref.current?.(); } catch {} };
    window.addEventListener('ai:abort', handler);
    return () => window.removeEventListener('ai:abort', handler);
  }, []);
}

// 라우트 변경 시 자동으로 ai:abort 이벤트 발행 → 진행 중 SSE 스트림 종료
// App.jsx 최상단에서 한 번만 호출. SSE 누수 방지(비용 절감).
export function useGlobalAiAbort() {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      try { window.dispatchEvent(new Event('ai:abort')); } catch {}
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);
}
