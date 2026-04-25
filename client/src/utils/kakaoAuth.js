import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY || '';
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const RETURN_TO_KEY = 'kakaoReturnTo';

export function getKakaoRedirectUri() {
  const isNative = Capacitor.isNativePlatform();
  return isNative
    ? `${API_URL}/auth/kakao/app-callback`
    : `${window.location.origin}/auth/kakao/callback`;
}

// Home/CTA 등에서 즉시 카카오 OAuth 로 진입.
// returnTo 를 sessionStorage 에 저장 → 콜백 처리 후 해당 경로로 복귀.
export async function startKakaoLogin(returnTo) {
  try {
    if (returnTo) sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  } catch (_) {}

  const redirectUri = getKakaoRedirectUri();
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
    } catch (_) {
      window.location.href = url;
    }
  } else {
    window.location.href = url;
  }
}

export function peekKakaoReturnTo() {
  try {
    return sessionStorage.getItem(RETURN_TO_KEY);
  } catch (_) {
    return null;
  }
}

export function clearKakaoReturnTo() {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch (_) {}
}

// 호환용 — 기존 호출부가 있을 수 있음
export function consumeKakaoReturnTo() {
  const v = peekKakaoReturnTo();
  if (v) clearKakaoReturnTo();
  return v;
}
