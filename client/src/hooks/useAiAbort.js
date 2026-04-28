import { useEffect, useRef } from 'react';

// 글로벌 ai:abort 이벤트 수신 → 페이지의 cleanup 콜백 실행
// 발생 시점: 하트 부족, 프로필 미완성, 인증 만료 등 — 진행 중 AI 호출을 안전하게 종료
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
