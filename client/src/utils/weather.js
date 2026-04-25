import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const SEOUL_FALLBACK = { lat: 37.5665, lon: 126.9780, label: '서울' };
const POSITION_CACHE_KEY = 'weather:lastPosition';
const POSITION_CACHE_TTL_MS = 30 * 60 * 1000; // 30분 동안 동일 좌표 재사용
const WEATHER_CACHE_KEY = 'weather:lastResult';
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

// 날씨 조건(영문 main) → 한글 + 이모지 + 그라데이션 색상
const CONDITION_MAP = {
  Clear:        { icon: '☀️', label: '맑음',    bgFrom: '#7dd3fc', bgTo: '#fbbf24' },
  Clouds:       { icon: '☁️', label: '구름',    bgFrom: '#cbd5e1', bgTo: '#94a3b8' },
  Rain:         { icon: '🌧️', label: '비',      bgFrom: '#60a5fa', bgTo: '#475569' },
  Drizzle:      { icon: '🌦️', label: '이슬비',  bgFrom: '#7dd3fc', bgTo: '#64748b' },
  Thunderstorm: { icon: '⛈️', label: '뇌우',    bgFrom: '#475569', bgTo: '#1e293b' },
  Snow:         { icon: '❄️', label: '눈',      bgFrom: '#e0f2fe', bgTo: '#cbd5e1' },
  Mist:         { icon: '🌫️', label: '안개',    bgFrom: '#e2e8f0', bgTo: '#94a3b8' },
  Fog:          { icon: '🌫️', label: '짙은 안개', bgFrom: '#e2e8f0', bgTo: '#64748b' },
  Haze:         { icon: '🌫️', label: '연무',    bgFrom: '#fde68a', bgTo: '#94a3b8' },
  Smoke:        { icon: '🌫️', label: '연기',    bgFrom: '#cbd5e1', bgTo: '#475569' },
  Dust:         { icon: '🌫️', label: '먼지',    bgFrom: '#fde68a', bgTo: '#92400e' },
  Sand:         { icon: '🌫️', label: '황사',    bgFrom: '#fde68a', bgTo: '#92400e' },
};

// 시간대별 톤 — 새벽/아침/점심/저녁/밤/심야
// hour 인자가 없으면 현재 시각 기준
export function getTimeBand(hour = new Date().getHours()) {
  if (hour >= 4  && hour < 7)  return { id: 'dawn',     label: '새벽', icon: '🌅', tint: '#fda4af', overlay: 'rgba(15, 23, 42, 0.18)' };
  if (hour >= 7  && hour < 11) return { id: 'morning',  label: '아침', icon: '🌤️', tint: '#fde68a', overlay: 'rgba(15, 23, 42, 0.10)' };
  if (hour >= 11 && hour < 16) return { id: 'noon',     label: '점심', icon: '☀️', tint: '#fff',    overlay: 'rgba(15, 23, 42, 0.05)' };
  if (hour >= 16 && hour < 19) return { id: 'evening',  label: '저녁', icon: '🌇', tint: '#fb923c', overlay: 'rgba(76, 29, 149, 0.20)' };
  if (hour >= 19 && hour < 23) return { id: 'night',    label: '밤',   icon: '🌙', tint: '#818cf8', overlay: 'rgba(15, 23, 42, 0.45)' };
  return                            { id: 'midnight', label: '심야', icon: '🌃', tint: '#6366f1', overlay: 'rgba(15, 23, 42, 0.62)' };
}

// 컨디션 + 시간대 조합으로 그라데이션 결정
function pickGradient(condition, timeBand) {
  const base = CONDITION_MAP[condition] || { bgFrom: '#7dd3fc', bgTo: '#fbbf24' };
  // 시간대별 색상 조정
  switch (timeBand.id) {
    case 'dawn':     return { bgFrom: '#fb923c', bgTo: '#fcd34d' };  // 일출 — 분홍 오렌지
    case 'morning':  return { bgFrom: base.bgFrom, bgTo: '#fde68a' }; // 밝은 파랑→옐로우
    case 'noon':     return base;                                    // 컨디션 그대로 가장 밝음
    case 'evening':  return { bgFrom: '#f97316', bgTo: '#7c3aed' };  // 노을 오렌지→퍼플
    case 'night':    return { bgFrom: '#1e3a8a', bgTo: '#312e81' };  // 어두운 인디고
    case 'midnight': return { bgFrom: '#0f172a', bgTo: '#1e1b4b' };  // 매우 어두운 네이비
    default:         return base;
  }
}

export function decorateWeather(raw) {
  if (!raw) return null;
  const cond = CONDITION_MAP[raw.condition] || { icon: '🌤️', label: raw.description || '오늘' };
  const timeBand = getTimeBand();
  const grad = pickGradient(raw.condition, timeBand);
  return {
    ...raw,
    icon: cond.icon,
    conditionLabel: raw.description || cond.label,
    bgFrom: grad.bgFrom,
    bgTo: grad.bgTo,
    timeBand: timeBand.id,
    timeBandLabel: timeBand.label,
    timeOverlay: timeBand.overlay,
    message: pickMessage(raw),
  };
}

function pickMessage(raw) {
  const t = typeof raw.temp === 'number' ? raw.temp : null;
  const cond = raw.condition;
  if (cond === 'Rain' || cond === 'Drizzle') return '우산 챙기는 게 좋아요. 습도 조심하세요.';
  if (cond === 'Snow') return '눈길 미끄러우니 조심해서 다니세요.';
  if (cond === 'Thunderstorm') return '천둥번개 주의보. 외출은 짧게.';
  if (t == null) return '오늘 하루도 무탈하시길.';
  if (t >= 28) return '더운 날씨, 수분 충분히 챙기세요.';
  if (t >= 20) return '활동하기 딱 좋은 따뜻한 날씨예요.';
  if (t >= 10) return '선선한 날씨, 가벼운 겉옷이면 충분해요.';
  if (t >= 0)  return '쌀쌀하니 따뜻하게 챙겨 입으세요.';
  return '많이 춥습니다. 보온 단단히 하세요.';
}

async function getCurrentPosition() {
  // 캐시 확인
  try {
    const raw = sessionStorage.getItem(POSITION_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.t < POSITION_CACHE_TTL_MS) {
        return { lat: cached.lat, lon: cached.lon };
      }
    }
  } catch (_) {}

  // Capacitor 네이티브: @capacitor/geolocation 플러그인은 설치 후에 주입.
  // Vite 정적 분석을 피하기 위해 변수로 우회 + @vite-ignore.
  if (Capacitor.isNativePlatform()) {
    try {
      const moduleName = '@capacitor/geolocation';
      const mod = await import(/* @vite-ignore */ moduleName);
      const pos = await mod.Geolocation.getCurrentPosition({ timeout: 8000, maximumAge: 5 * 60 * 1000 });
      const out = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      sessionStorage.setItem(POSITION_CACHE_KEY, JSON.stringify({ ...out, t: Date.now() }));
      return out;
    } catch (e) {
      console.warn('[weather] Capacitor geolocation failed (plugin may not be installed)', e?.message);
    }
  }

  // 웹: navigator.geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000,
        });
      });
      const out = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      sessionStorage.setItem(POSITION_CACHE_KEY, JSON.stringify({ ...out, t: Date.now() }));
      return out;
    } catch (e) {
      console.warn('[weather] navigator.geolocation denied or failed', e?.message);
    }
  }

  // 폴백: 서울
  return { lat: SEOUL_FALLBACK.lat, lon: SEOUL_FALLBACK.lon };
}

/**
 * 현재 위치의 날씨를 가져온다 (서버 프록시 → OpenWeather).
 * - 좌표 캐시 30분 / 응답 캐시 30분.
 * - 위치 권한 거부 시 서울 좌표 폴백.
 */
export async function getCurrentWeather() {
  // 응답 캐시 확인
  try {
    const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.t < WEATHER_CACHE_TTL_MS && cached.data) {
        return cached.data;
      }
    }
  } catch (_) {}

  const { lat, lon } = await getCurrentPosition();
  const { data } = await axios.get(`${API_URL}/weather/current`, { params: { lat, lon }, timeout: 10000 });
  const decorated = decorateWeather(data);
  try {
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data: decorated, t: Date.now() }));
  } catch (_) {}
  return decorated;
}
