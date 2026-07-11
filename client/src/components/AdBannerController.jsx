import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { showBanner, hideBanner, maybeShowInterstitial, adsEnabled } from '../utils/adMob';

/**
 * 광고 중앙 컨트롤러 (BM ② — "균형" 배치)
 *
 * - 배너: 아래 BANNER_SAFE(순수 브라우즈/유틸 화면)에서만 하단 앵커로 노출.
 *   ⚠️ 유료 AI 결과가 인라인으로 뜨는 화면(운세·궁합·타로·결정 등)은 절대 포함하지 않는다.
 * - 인터스티셜: 세션당 1회, 충분히 둘러본 뒤(INTERSTITIAL_AFTER_NAVS) 브라우즈 화면 진입 시.
 *   유료 결과 화면과 인접하지 않도록 브라우즈 진입 시점에만 발동.
 * - 웹/비네이티브 및 광고제거(구독)는 adsEnabled()에서 no-op.
 */
const BANNER_SAFE = new Set([
  '/',            // 홈(브라우즈 — 유료 결과는 별도 페이지)
  '/my-menu',     // 마이메뉴
  '/attendance',  // 출석
  '/choose-home', // 홈 스타일 선택
  '/star-fortune',// 스타 운세 허브
  '/invite',      // 친구 초대
  '/rating',      // 평점 후기
  '/settings',    // 설정
  '/profile',     // 프로필
]);

const INTERSTITIAL_AFTER_NAVS = 4;

export default function AdBannerController() {
  const { pathname } = useLocation();
  const navCount = useRef(0);

  useEffect(() => {
    if (!adsEnabled()) return;
    const safe = BANNER_SAFE.has(pathname);
    if (safe) showBanner();
    else hideBanner();

    navCount.current += 1;
    // 세션당 1회 전면 — 브라우즈 화면에서만(유료 결과와 인접하지 않음)
    if (safe && navCount.current >= INTERSTITIAL_AFTER_NAVS) {
      maybeShowInterstitial();
    }
  }, [pathname]);

  return null;
}
