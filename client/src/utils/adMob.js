/**
 * AdMob 통합 인터페이스 (Phase 0 — 시뮬레이션)
 *
 * Phase 1에서 Capacitor AdMob 플러그인을 설치하면 같은 함수 시그니처로
 * 실제 AdMob 호출로 교체됩니다. 호출부(Home.jsx 등)는 변경 불필요.
 *
 *   import { showRewardedAd } from '@/utils/adMob';
 *   const reward = await showRewardedAd({ slot: 'guest_fortune' });
 *   if (reward.rewarded) { // 운세 호출 진행 }
 */
import { Capacitor } from '@capacitor/core';

const SIM_DURATION_SEC = 5; // Phase 0 시뮬레이션 카운트다운
const SIM_REWARD = { rewarded: true, type: 'sim', amount: 1 };

/**
 * 리워드 광고 노출 → 시청 완료 시 reward 반환.
 * - rewarded: true 면 운세 호출 진행
 * - rewarded: false 면 사용자가 광고 중간에 닫음
 *
 * @param {object} opts
 * @param {string} opts.slot      광고 슬롯 키 (analytics용)
 * @param {function} [opts.onTick]  매초 호출, remaining(sec) 전달
 * @returns {Promise<{rewarded:boolean, type:string}>}
 */
export function showRewardedAd({ slot = 'default', onTick } = {}) {
  // 추후 네이티브 AdMob 분기 (현재는 시뮬레이션만)
  if (Capacitor.isNativePlatform() && globalThis.AdMobRewarded) {
    // TODO: 실제 AdMob 호출
    // return await AdMobRewarded.show(...)
  }
  return runSimulation({ slot, onTick });
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
