/**
 * AdMob 리워드 광고 통합 (BM ② — 1회 5하트, 하루 5회 한도는 서버에서 검증)
 *
 * - 네이티브(Android/iOS): @capacitor-community/admob 실제 리워드 광고
 * - 웹/dev/플러그인 미가용: 5초 시뮬레이션 폴백 (동일 인터페이스)
 *
 *   import { showRewardedAd, initializeAdMob } from '@/utils/adMob';
 *   await initializeAdMob();                       // 앱 시작 시 1회
 *   const reward = await showRewardedAd({ slot }); // 시청 완료 시 { rewarded:true }
 *   if (reward.rewarded) { // 서버 /api/hearts/ad-reward 호출 }
 */
import { Capacitor } from '@capacitor/core';

const SIM_DURATION_SEC = 5; // 시뮬레이션(웹) 카운트다운
const SIM_REWARD = { rewarded: true, type: 'sim', amount: 1 };

// ⚠️ 출시 전 교체 필수 — 아래는 Google 공식 "테스트" 광고 ID (실수익 0, 정책 위반 아님).
//    AdMob 콘솔에서 발급한 실제 리워드 광고 단위 ID로 바꾸고 USE_TEST_ADS=false 로 설정.
const USE_TEST_ADS = true;
const REWARDED_AD_ID = {
  android: 'ca-app-pub-3940256099942544/5224354917',
  ios: 'ca-app-pub-3940256099942544/1712485313',
};

let _initialized = false;
let _pluginPromise = null;

// 플러그인 지연 로드 — 웹 빌드에선 호출되지 않아 네이티브 코드가 번들에 섞이지 않음
function loadPlugin() {
  if (!_pluginPromise) _pluginPromise = import('@capacitor-community/admob');
  return _pluginPromise;
}

/** 앱 시작 시 1회 호출 (네이티브에서만 실제 초기화) */
export async function initializeAdMob() {
  if (_initialized || !Capacitor.isNativePlatform()) return;
  try {
    const { AdMob } = await loadPlugin();
    await AdMob.initialize({ initializeForTesting: USE_TEST_ADS });
    _initialized = true;
  } catch (e) {
    console.warn('[adMob] 초기화 실패:', e?.message || e);
  }
}

/**
 * 리워드 광고 노출 → 시청 완료 시 reward 반환.
 * @returns {Promise<{rewarded:boolean, type:string}>}
 */
export async function showRewardedAd({ slot = 'default', onTick } = {}) {
  if (!Capacitor.isNativePlatform()) {
    return runSimulation({ slot, onTick });
  }
  try {
    const { AdMob, RewardAdPluginEvents } = await loadPlugin();
    if (!_initialized) await initializeAdMob();

    const platform = Capacitor.getPlatform();
    const adId = REWARDED_AD_ID[platform] || REWARDED_AD_ID.android;

    // 보상 획득 여부는 Rewarded 이벤트로 판정 (중간 이탈 시 미지급)
    let earned = false;
    const sub = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; });
    try {
      await AdMob.prepareRewardVideoAd({ adId });
      await AdMob.showRewardVideoAd();
    } finally {
      try { await sub.remove(); } catch { /* ignore */ }
    }
    return { rewarded: earned, type: 'admob' };
  } catch (e) {
    console.warn('[adMob] 광고 표시 실패 → 시뮬 폴백:', e?.message || e);
    return runSimulation({ slot, onTick });
  }
}

function runSimulation({ slot, onTick }) {
  return new Promise((resolve) => {
    let remaining = SIM_DURATION_SEC;
    onTick?.(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      onTick?.(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        resolve(SIM_REWARD);
      }
    }, 1000);
  });
}

export const AD_SIM_DURATION_SEC = SIM_DURATION_SEC;

// ══════════════════════════════════════════════════════════════════════
//  배너 / 인터스티셜 (BM ② 확장 — "균형": 브라우즈 화면 배너 + 세션당 1회 전면)
//  ⚠️ 아래는 Google 공식 "테스트" 광고 ID. 출시 전:
//     ① 실제 광고단위 ID로 교체  ② USE_TEST_ADS=false
//     ③ AndroidManifest APPLICATION_ID 교체  ④ 본인 기기 AdMob 테스트기기 등록
// ══════════════════════════════════════════════════════════════════════
const BANNER_AD_ID = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
};
const INTERSTITIAL_AD_ID = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
};
// 탭바 위로 배너를 올리기 위한 하단 여백(dp). ⚠️ APK 실측 후 조정 필요.
const BANNER_BOTTOM_MARGIN = 58;

/**
 * 광고 노출 게이트 — 네이티브 + 광고제거(구독) 아닐 때만 true.
 * 구독 미구현 상태이므로 localStorage 'adFree'='1' 로 임시 표현.
 * 구독(엔타이틀먼트) 붙으면 이 함수만 교체하면 전 광고가 자동으로 꺼진다.
 */
export function adsEnabled() {
  if (!Capacitor.isNativePlatform()) return false;
  try { if (localStorage.getItem('adFree') === '1') return false; } catch { /* ignore */ }
  return true;
}

let _bannerShown = false;
/** 브라우즈(비유료) 화면 하단 앵커 배너. ⚠️ 유료 AI 결과 화면에서는 호출 금지. */
export async function showBanner() {
  if (!adsEnabled() || _bannerShown) return;
  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = await loadPlugin();
    if (!_initialized) await initializeAdMob();
    const platform = Capacitor.getPlatform();
    await AdMob.showBanner({
      adId: BANNER_AD_ID[platform] || BANNER_AD_ID.android,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: BANNER_BOTTOM_MARGIN,
      isTesting: USE_TEST_ADS,
    });
    _bannerShown = true;
    try { document.body.classList.add('has-ad-banner'); } catch { /* ignore */ }
  } catch (e) {
    console.warn('[adMob] 배너 노출 실패:', e?.message || e);
  }
}

/** 배너 제거 — 유료/결과 화면 진입 시 반드시 호출. */
export async function hideBanner() {
  try { document.body.classList.remove('has-ad-banner'); } catch { /* ignore */ }
  if (!_bannerShown) return;
  _bannerShown = false;
  try {
    const { AdMob } = await loadPlugin();
    await AdMob.removeBanner();
  } catch (e) {
    console.warn('[adMob] 배너 제거 실패:', e?.message || e);
  }
}

let _interstitialShownThisSession = false;
/** 세션당 1회 전면(인터스티셜). 무료 흐름/브라우즈 전환에서만 호출 — 유료 결과 인접 금지. */
export async function maybeShowInterstitial() {
  if (!adsEnabled() || _interstitialShownThisSession) return false;
  try {
    const { AdMob } = await loadPlugin();
    if (!_initialized) await initializeAdMob();
    const platform = Capacitor.getPlatform();
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID[platform] || INTERSTITIAL_AD_ID.android,
      isTesting: USE_TEST_ADS,
    });
    await AdMob.showInterstitial();
    _interstitialShownThisSession = true;
    return true;
  } catch (e) {
    console.warn('[adMob] 인터스티셜 실패:', e?.message || e);
    return false;
  }
}
