import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // 프록시 대상 — 기본은 로컬 Spring(8080). 로컬 클라이언트로 Railway
        // 백엔드(키 전부 설정됨)를 디버깅하려면 VITE_PROXY_TARGET 환경변수 지정:
        //   VITE_PROXY_TARGET=https://saju-production-ac3c.up.railway.app npm run dev
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // 심화분석(특히 결혼 7500토큰)은 90~120초 걸려 디폴트 proxy timeout(~120초)에 걸림.
        // SSE 끊김 → 'done' 이벤트 미수신 → 클라이언트 매트릭스가 안 사라지고 결과도 안 보임.
        timeout: 600000,       // 클라이언트 ↔ proxy 10분
        proxyTimeout: 600000,  // proxy ↔ 백엔드 10분
      },
    },
  },
});
