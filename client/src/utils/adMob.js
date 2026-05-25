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
