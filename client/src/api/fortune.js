import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 하트 포인트 시스템 헬퍼
const appendUserId = (params) => {
  const userId = localStorage.getItem('userId');
  if (userId) params.set('userId', userId);
};

// 유료 API 호출 전 로그인 체크 — false 반환 시 호출 중단
const requireLogin = (onError) => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    onError?.('로그인이 필요합니다.');
    return false;
  }
  return true;
};

// 페이지에서 분석 전 호출 — 비로그인이면 true 반환
export const isGuest = () => !localStorage.getItem('userId');

// SSE 청크를 requestAnimationFrame 으로 배치 — 5~10ms 간격으로 쏟아지는 청크를
// 화면 주사율(≈16ms) 에 맞춰 합쳐 전달. React re-render 수를 줄여 모바일 WebView에서
// 스트리밍 텍스트가 자연스럽게 출력되도록 한다.
const rafBatchChunks = (onChunk) => {
  const noop = () => {};
  if (typeof onChunk !== 'function') return { push: noop, flush: noop, cancel: noop };
  const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
  const caf = window.cancelAnimationFrame || clearTimeout;
  let buf = '';
  let rafId = null;
  const emit = () => {
    rafId = null;
    if (!buf) return;
    const s = buf; buf = '';
    try { onChunk(s); } catch {}
  };
  return {
    push: (s) => {
      if (s == null) return;
      buf += s;
      if (rafId == null) rafId = raf(emit);
    },
    flush: () => { if (rafId != null) { caf(rafId); rafId = null; } emit(); },
    cancel: () => { if (rafId != null) { caf(rafId); rafId = null; } buf = ''; },
  };
};

const addHeartListener = (eventSource, { onInsufficientHearts, onError }) => {
  eventSource.addEventListener('insufficient_hearts', (e) => {
    try {
      const data = JSON.parse(e.data);
      onInsufficientHearts?.(data);
      window.dispatchEvent(new CustomEvent('heart:insufficient', { detail: data }));
    } catch {
      // parse error 무시
    }
    onError?.('하트가 부족합니다.');
    eventSource.close();
  });
  // 스트리밍 완료 시 하트 차감 완료 → 잔액 갱신 + 버블 애니메이션
  let hadChunks = false;
  eventSource.addEventListener('chunk', () => { hadChunks = true; });
  eventSource.addEventListener('done', () => {
    window.dispatchEvent(new Event('heart:refresh'));
    if (hadChunks) {
      window.dispatchEvent(new CustomEvent('heart:deducted', { detail: { cost: 5 } }));
    }
  });
};

// 앱 초기화 데이터
export const appInit = async (userId, guestId) => {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (guestId) params.set('guestId', guestId);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const response = await axios.get(`${baseURL}/app/init?${params.toString()}`);
  return response.data;
};

// 하트 잔액 조회
export const getHeartBalance = async (userId) => {
  const response = await api.get('/hearts/balance', { params: { userId } });
  return response.data;
};

// 하트 충분 여부 확인
export const checkHeartSufficient = async (userId, category = 'BASIC_ANALYSIS') => {
  const response = await api.get('/hearts/check', { params: { userId, category } });
  return response.data;
};

// 하트 차감
export const deductHearts = async (userId, category) => {
  const response = await api.post('/hearts/deduct', null, { params: { userId, category } });
  return response.data;
};

export const getFortuneByZodiac = async (zodiac) => {
  const response = await api.get('/fortune/today', {
    params: { zodiac },
  });
  return response.data;
};

export const getFortuneByZodiacStream = (zodiac, { onChunk, onCached, onNoCache, onDone, onError, onInsufficientHearts, cacheOnly } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ zodiac });
  if (cacheOnly) params.set('cacheOnly', 'true');
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/fortune/today/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('no-cache', () => { __chunker.cancel(); onNoCache?.(); eventSource.close(); });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getFortuneByUserStream = (userId, { onChunk, onCached, onNoCache, onDone, onError, onInsufficientHearts, cacheOnly } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  if (cacheOnly) params.set('cacheOnly', 'true');
  appendUserId(params);
  const paramStr = params.toString();
  const url = `${baseURL}/fortune/user/${userId}/stream${paramStr ? '?' + paramStr : ''}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('no-cache', () => { __chunker.cancel(); onNoCache?.(); eventSource.close(); });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getAllTodayFortunes = async () => {
  const response = await api.get('/fortune/today/all');
  return response.data;
};

export const getFortuneByUser = async (userId) => {
  const response = await api.get(`/fortune/user/${userId}`);
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const loginUser = async (phone) => {
  const response = await api.post('/users/login', { phone });
  return response.data;
};

// 카카오 로그인
export const kakaoLogin = async (code, redirectUri) => {
  const effectiveRedirectUri = redirectUri || `${window.location.origin}/auth/kakao/callback`;
  const response = await api.post('/auth/kakao/login', { code, redirectUri: effectiveRedirectUri });
  return response.data;
};

export const kakaoRegister = async (userData) => {
  const response = await api.post('/auth/kakao/register', userData);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const getUser = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const analyzeSaju = async (birthDate, birthTime, calendarType, gender) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (calendarType) params.calendarType = calendarType;
  if (gender) params.gender = gender;
  const response = await api.get('/saju/analyze', { params });
  return response.data;
};

export const analyzeSajuStream = (birthDate, birthTime, calendarType, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts, onNoCache, context, targetType, targetName, freeMode, cacheOnly, date } = {}) => {
  if (!freeMode && !requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (birthTime) params.set('birthTime', birthTime);
  if (calendarType) params.set('calendarType', calendarType);
  if (gender) params.set('gender', gender);
  if (context) params.set('context', context);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  if (cacheOnly) params.set('cacheOnly', 'true');
  if (date) params.set('date', date);
  if (!freeMode) appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/saju/analyze/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('no-cache', () => {
    __chunker.cancel();
    onNoCache?.();
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getUserSaju = async (userId) => {
  const response = await api.get(`/saju/user/${userId}`);
  return response.data;
};

// ─── 비회원 사주 운세 ───
export const getGuestFortune = async (birthDate, birthTime, calendarType, gender) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (calendarType) params.calendarType = calendarType;
  if (gender) params.gender = gender;
  const response = await api.get('/saju/analyze', { params });
  return response.data;
};

// ─── 별자리 운세 ───
export const getConstellationFortune = async (sign) => {
  const response = await api.get('/constellation/fortune', { params: { sign } });
  return response.data;
};

export const getConstellationFortuneStream = (sign, { onChunk, onCached, onDone, onError, onInsufficientHearts, birthDate, gender, targetType, targetName } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ sign });
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/constellation/fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getConstellationByDate = async (birthDate, calendarType) => {
  const params = { birthDate };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/constellation/fortune/by-date', { params });
  return response.data;
};

export const getAllConstellations = async () => {
  const response = await api.get('/constellation/signs');
  return response.data;
};

// ─── 나의 통합 운세 ───
export const getMyFortune = async (userId) => {
  const response = await api.get(`/my/fortune/${userId}`);
  return response.data;
};

export const getMyFortuneStream = (userId, { onChunk, onCached, onNoCache, onDone, onError, onInsufficientHearts, targetType, targetName, cacheOnly } = {}, date) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  if (cacheOnly) params.set('cacheOnly', 'true');
  appendUserId(params);
  const paramStr = params.toString();
  const url = `${baseURL}/my/fortune/${userId}/stream${paramStr ? '?' + paramStr : ''}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('no-cache', () => { __chunker.cancel(); onNoCache?.(); eventSource.close(); });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 혈액형 운세 ───
export const getBloodTypeFortune = async (type) => {
  const response = await api.get('/bloodtype/fortune', { params: { type } });
  return response.data;
};

export const getBloodTypeFortuneStream = (type, { onChunk, onCached, onDone, onError, onInsufficientHearts, birthDate, gender, targetType, targetName } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ type });
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/bloodtype/fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getAllBloodTypeFortunes = async () => {
  const response = await api.get('/bloodtype/fortune/all');
  return response.data;
};

export const getBloodTypeCompatibility = async (type1, type2) => {
  const response = await api.get('/bloodtype/compatibility', { params: { type1, type2 } });
  return response.data;
};

export const getBloodTypeCompatibilityBasic = async (type1, type2) => {
  const response = await api.get('/bloodtype/compatibility/basic', { params: { type1, type2 } });
  return response.data;
};

export const getBloodTypeCompatibilityStream = (type1, type2, { onChunk, onDone, onError }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ type1, type2 });
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/bloodtype/compatibility/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── MBTI 운세 ───
export const getMbtiTypes = async () => {
  const response = await api.get('/mbti/types');
  return response.data;
};

export const getMbtiFortune = async (type) => {
  const response = await api.get('/mbti/fortune', { params: { type } });
  return response.data;
};

export const getMbtiFortuneStream = (type, { onChunk, onCached, onDone, onError, onInsufficientHearts, birthDate, gender, targetType, targetName } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ type });
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/mbti/fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getMbtiCompatibility = async (type1, type2) => {
  const response = await api.get('/mbti/compatibility', { params: { type1, type2 } });
  return response.data;
};

export const getMbtiCompatibilityBasic = async (type1, type2) => {
  const response = await api.get('/mbti/compatibility/basic', { params: { type1, type2 } });
  return response.data;
};

export const getMbtiCompatibilityStream = (type1, type2, { onChunk, onDone, onError }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ type1, type2 });
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/mbti/compatibility/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 만세력 ───
export const getManseryeok = async (date, calendarType) => {
  const params = { date };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/saju/manseryeok', { params });
  return response.data;
};

// ─── 만세력 AI 해석 스트리밍 ───
export const getManseryeokStream = (date, calendarType, birthDate, { onChunk, onCached, onNoCache, onDone, onError, onInsufficientHearts, cacheOnly } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ date });
  if (calendarType) params.set('calendarType', calendarType);
  if (birthDate) params.set('birthDate', birthDate);
  if (cacheOnly) params.set('cacheOnly', 'true');
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/saju/manseryeok/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('no-cache', () => { __chunker.cancel(); onNoCache?.(); eventSource.close(); });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 토정비결 ───
export const getTojeongFortune = async (birthDate, calendarType) => {
  const params = { birthDate };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/tojeong/analyze', { params });
  return response.data;
};

export const getUserTojeong = async (userId) => {
  const response = await api.get(`/tojeong/user/${userId}`);
  return response.data;
};

export const getTojeongStream = (birthDate, calendarType, { onChunk, onCached, onBase, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (calendarType) params.set('calendarType', calendarType);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/tojeong/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  eventSource.addEventListener('base', (e) => {
    try { onBase?.(JSON.parse(e.data)); } catch {}
  });
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 사주 궁합 ───
export const getSajuCompatibilityBasic = async (birthDate1, birthDate2, birthTime1, birthTime2, calendarType1, calendarType2, gender1, gender2, extra = {}) => {
  const params = { birthDate1, birthDate2 };
  if (birthTime1) params.birthTime1 = birthTime1;
  if (birthTime2) params.birthTime2 = birthTime2;
  if (calendarType1) params.calendarType1 = calendarType1;
  if (calendarType2) params.calendarType2 = calendarType2;
  if (gender1) params.gender1 = gender1;
  if (gender2) params.gender2 = gender2;
  const uid = localStorage.getItem('userId');
  if (uid) params.userId = uid;
  if (extra.historyType) params.historyType = extra.historyType;
  if (extra.celebName) params.celebName = extra.celebName;
  if (extra.mode) params.mode = extra.mode;
  const response = await api.get('/compatibility/saju/basic', { params });
  return response.data;
};

export const getSajuCompatibility = async (birthDate1, birthDate2, birthTime1, birthTime2, calendarType1, calendarType2, gender1, gender2) => {
  const params = { birthDate1, birthDate2 };
  if (birthTime1) params.birthTime1 = birthTime1;
  if (birthTime2) params.birthTime2 = birthTime2;
  if (calendarType1) params.calendarType1 = calendarType1;
  if (calendarType2) params.calendarType2 = calendarType2;
  if (gender1) params.gender1 = gender1;
  if (gender2) params.gender2 = gender2;
  const response = await api.get('/compatibility/saju', { params });
  return response.data;
};

export const saveCompatCache = async (data) => {
  await api.post('/compatibility/saju/cache', data);
};

export const getCompatibilityStream = (birthDate1, birthDate2, birthTime1, birthTime2, calendarType1, calendarType2, gender1, gender2, score, elementRelation, branchRelation, { onChunk, onDone, onError, onInsufficientHearts, historyType, celebName, mode }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate1, birthDate2 });
  if (birthTime1) params.set('birthTime1', birthTime1);
  if (birthTime2) params.set('birthTime2', birthTime2);
  if (calendarType1) params.set('calendarType1', calendarType1);
  if (calendarType2) params.set('calendarType2', calendarType2);
  if (gender1) params.set('gender1', gender1);
  if (gender2) params.set('gender2', gender2);
  if (score) params.set('score', score);
  if (elementRelation) params.set('elementRelation', elementRelation);
  if (branchRelation) params.set('branchRelation', branchRelation);
  if (historyType) params.set('historyType', historyType);
  if (celebName) params.set('celebName', celebName);
  if (mode) params.set('mode', mode);
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/compatibility/saju/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

export const getCelebMatch = async (birthDate, birthTime, calendarType, celebrities) => {
  const response = await api.post('/compatibility/celeb-match', {
    birthDate, birthTime, calendarType, celebrities
  });
  return response.data;
};

// ─── 타로 ───
export const drawTarotCards = async (count = 3) => {
  const response = await api.get('/tarot/draw', { params: { count } });
  return response.data;
};

export const getTarotReading = async (cardIds, reversals, spread, category, question) => {
  const params = { cardIds, reversals, spread, category };
  if (question) params.question = question;
  const response = await api.get('/tarot/reading', { params });
  return response.data;
};

export const getTarotReadingStream = (cardIds, reversals, spread, category, question, { onChunk, onCached, onDone, onError, onInsufficientHearts, deck, deckVariant }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ cardIds, reversals, spread, category });
  if (question) params.set('question', question);
  if (deck) params.set('deck', deck);
  if (deckVariant != null) params.set('deckVariant', String(deckVariant));
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/tarot/reading/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  // done/cached 이후 발생하는 connection-closed onerror가 onError로 올라가
  // setReading(fallback)으로 덮어쓰는 race 방지
  let finished = false;
  addHeartListener(eventSource, { onInsufficientHearts, onError: (e) => { if (!finished) onError?.(e); } });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    finished = true;
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); finished = true; onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { if (!finished) { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); } });
  eventSource.onerror = () => { if (!finished) { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); } };

  return () => { __chunker.cancel(); finished = true; eventSource.close(); };
};

// ─── 오늘의 연애 온도 ───
export const getLoveTemperature = async (userId) => {
  const params = {};
  if (userId) params.userId = userId;
  const response = await api.get('/special/love-temperature', { params });
  return response.data;
};

// ─── 특수 운세 (연애/재회/재혼/소개팅) ───
export const getSpecialLoveFortune = async (type, birthDate, birthTime, gender, calendarType, partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus) => {
  const params = { type, birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  if (partnerDate) params.partnerDate = partnerDate;
  if (partnerGender) params.partnerGender = partnerGender;
  if (breakupDate) params.breakupDate = breakupDate;
  if (meetDate) params.meetDate = meetDate;
  if (relationshipStatus) params.relationshipStatus = relationshipStatus;
  const response = await api.get('/special/love', { params });
  return response.data;
};

export const getLoveFortuneBasic = async (type, birthDate, birthTime, gender, calendarType, partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus) => {
  const params = { type, birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  if (partnerDate) params.partnerDate = partnerDate;
  if (partnerGender) params.partnerGender = partnerGender;
  if (breakupDate) params.breakupDate = breakupDate;
  if (meetDate) params.meetDate = meetDate;
  if (relationshipStatus) params.relationshipStatus = relationshipStatus;
  const response = await api.get('/special/love/basic', { params });
  return response.data;
};

export const saveLoveFortuneCache = async (data) => {
  await api.post('/special/love/cache', data);
};

export const getLoveFortuneStream = (type, birthDate, birthTime, gender, calendarType, partnerDate, partnerGender, breakupDate, meetDate, relationshipStatus, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams();
  params.set('type', type);
  params.set('birthDate', birthDate);
  if (birthTime && birthTime !== 'null') params.set('birthTime', birthTime);
  if (gender && gender !== 'null') params.set('gender', gender);
  if (calendarType && calendarType !== 'null') params.set('calendarType', calendarType);
  if (partnerDate && partnerDate !== 'null') params.set('partnerDate', partnerDate);
  if (partnerGender && partnerGender !== 'null') params.set('partnerGender', partnerGender);
  if (breakupDate && breakupDate !== 'null') params.set('breakupDate', breakupDate);
  if (meetDate && meetDate !== 'null') params.set('meetDate', meetDate);
  if (relationshipStatus && relationshipStatus !== 'null') params.set('relationshipStatus', relationshipStatus);
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/special/love/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 아침/점심/저녁 운세 ───
export const getTimeblockFortune = async (birthDate, birthTime, gender, calendarType) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/special/timeblock', { params });
  return response.data;
};

// ─── 시간대별 운세 ───
export const getHourlyFortune = async (birthDate, birthTime, gender, calendarType) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/special/hourly', { params });
  return response.data;
};

// ─── 일운 (7일) ───
export const getDailyFortunes = async (birthDate, calendarType) => {
  const params = { birthDate };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/saju/daily', { params });
  return response.data;
};

// ─── 꿈해몽 ───
export const interpretDream = async (dreamText, birthDate, gender) => {
  const params = new URLSearchParams();
  params.append('dreamText', dreamText);
  if (birthDate) params.append('birthDate', birthDate);
  if (gender) params.append('gender', gender);
  const response = await api.post('/dream/interpret', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const interpretDreamStream = (dreamText, birthDate, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  params.set('dreamText', dreamText);
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  appendUserId(params);
  const url = `${baseURL}/dream/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── AI 관상 ───
export const analyzeFaceReading = async (faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender) => {
  const params = new URLSearchParams();
  params.append('faceShape', faceShape);
  params.append('eyeShape', eyeShape);
  params.append('noseShape', noseShape);
  params.append('mouthShape', mouthShape);
  params.append('foreheadShape', foreheadShape);
  if (birthDate) params.append('birthDate', birthDate);
  if (gender) params.append('gender', gender);
  const response = await api.post('/face-reading/analyze', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const analyzeFaceReadingStream = (faceShape, eyeShape, noseShape, mouthShape, foreheadShape, birthDate, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams({ faceShape, eyeShape, noseShape, mouthShape, foreheadShape });
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  appendUserId(params);
  const url = `${baseURL}/face-reading/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 심리테스트 ───
export const getPsychTests = async () => {
  const response = await api.get('/psych/tests');
  return response.data;
};

export const analyzePsychTest = async (testId, answers, birthDate, gender) => {
  const params = new URLSearchParams();
  params.append('testId', testId);
  params.append('answers', answers);
  if (birthDate) params.append('birthDate', birthDate);
  if (gender) params.append('gender', gender);
  const response = await api.post('/psych/analyze', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const analyzePsychTestStream = (testId, answers, birthDate, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams({ testId, answers });
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  appendUserId(params);
  const url = `${baseURL}/psych/analyze/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };

  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 바이오리듬 ───
export const getBiorhythm = async (birthDate, calendarType) => {
  const params = { birthDate };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/biorhythm', { params });
  return response.data;
};

export const getBiorhythmStream = (birthDate, { onChunk, onCached, onDone, onError, onInsufficientHearts, calendarType } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (calendarType) params.set('calendarType', calendarType);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/biorhythm/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 2026 신년운세 ───
export const getYearFortune = async (birthDate, birthTime, gender, calendarType) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/year-fortune', { params });
  return response.data;
};

export const getYearFortuneStream = (birthDate, birthTime, gender, calendarType, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (birthTime) params.set('birthTime', birthTime);
  if (gender) params.set('gender', gender);
  if (calendarType) params.set('calendarType', calendarType);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/year-fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 월별 운세 ───
export const getMonthlyFortune = async (birthDate, month, birthTime, gender) => {
  const params = { birthDate, month };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  const response = await api.get('/monthly-fortune', { params });
  return response.data;
};

export const getMonthlyFortuneStream = (birthDate, month, birthTime, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName, extra, calendarType } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate, month });
  if (birthTime) params.set('birthTime', birthTime);
  if (gender) params.set('gender', gender);
  if (calendarType) params.set('calendarType', calendarType);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  if (extra) params.set('extra', 'true');
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/monthly-fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 주간 운세 ───
export const getWeeklyFortune = async (birthDate, birthTime, gender) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  const response = await api.get('/weekly-fortune', { params });
  return response.data;
};

export const getWeeklyFortuneStream = (birthDate, birthTime, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName, calendarType } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (birthTime) params.set('birthTime', birthTime);
  if (gender) params.set('gender', gender);
  if (calendarType) params.set('calendarType', calendarType);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/weekly-fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  const __chunker = rafBatchChunks(onChunk);
  eventSource.addEventListener('chunk', (e) => __chunker.push(e.data));
  eventSource.addEventListener('cached', (e) => {
    __chunker.cancel();
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { __chunker.flush(); onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { __chunker.flush(); onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { __chunker.cancel(); onError?.('Connection lost'); eventSource.close(); };
  return () => { __chunker.cancel(); eventSource.close(); };
};

// ─── 심화분석 ───
export const getDeepAnalysis = async (type, birthDate, birthTime, gender, calendarType, extra, context) => {
  const params = { type, birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  if (extra) params.extra = extra;
  if (context) params.context = context;
  const response = await api.get('/deep/fortune', { params });
  return response.data;
};

// ─── 심화분석 스트리밍 (POST fetch + ReadableStream) ───
export const getDeepAnalysisStream = (type, birthDate, birthTime, gender, calendarType, extra, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName, context } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ type, birthDate });
  if (birthTime) params.set('birthTime', birthTime);
  if (gender) params.set('gender', gender);
  if (calendarType) params.set('calendarType', calendarType);
  if (extra) params.set('extra', extra);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/deep/fortune/stream?${params.toString()}`;
  const controller = new AbortController();
  const __chunker = rafBatchChunks(onChunk);

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: context || '',
        signal: controller.signal,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 이벤트는 빈 줄(\n\n)로 구분
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;
          const lines = event.split('\n');
          let eventName = '';
          let dataLines = [];
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5));
          }
          const data = dataLines.join('\n');

          if (eventName === 'insufficient_hearts') {
            __chunker.cancel();
            try { window.dispatchEvent(new CustomEvent('heart:insufficient', { detail: JSON.parse(data) })); } catch {}
            onError?.('insufficient_hearts');
            return;
          } else if (eventName === 'cached') {
            __chunker.cancel();
            try { onCached?.(JSON.parse(data)); } catch { onDone?.(data); }
            return;
          } else if (eventName === 'chunk') {
            __chunker.push(data);
          } else if (eventName === 'done') {
            __chunker.flush();
            window.dispatchEvent(new CustomEvent('heart:refresh'));
            window.dispatchEvent(new CustomEvent('heart:deducted'));
            onDone?.(data);
            return;
          } else if (eventName === 'error') {
            __chunker.flush();
            onError?.(data);
            return;
          }
        }
      }
    } catch (e) {
      __chunker.cancel();
      if (e.name !== 'AbortError') onError?.(e.message || 'Connection lost');
    }
  })();

  return () => { __chunker.cancel(); controller.abort(); };
};

// ─── 궁합 심화분석 캐시 조회 ───
export const getCompatibilityDeepCached = async (type, bd1, bt1, g1, bd2, bt2, g2) => {
  const params = { type, bd1, g1, bd2, g2 };
  if (bt1) params.bt1 = bt1;
  if (bt2) params.bt2 = bt2;
  try {
    const res = await api.get('/deep/compatibility/cached', { params });
    return res.data?.cached ? res.data.data : null;
  } catch {
    return null;
  }
};

// ─── 궁합 심화분석 스트리밍 (POST + body=context) ───
export const getCompatibilityDeepStream = (type, bd1, bt1, g1, bd2, bt2, g2, { onChunk, onCached, onDone, onError, context } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ type, bd1, g1, bd2, g2 });
  if (bt1) params.set('bt1', bt1);
  if (bt2) params.set('bt2', bt2);
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/deep/compatibility/stream?${params.toString()}`;
  const controller = new AbortController();
  const __chunker = rafBatchChunks(onChunk);

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: context || '',
        signal: controller.signal,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;
          const lines = event.split('\n');
          let eventName = '';
          let dataLines = [];
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5));
          }
          const data = dataLines.join('\n');

          if (eventName === 'insufficient_hearts') {
            __chunker.cancel();
            try { window.dispatchEvent(new CustomEvent('heart:insufficient', { detail: JSON.parse(data) })); } catch {}
            onError?.('insufficient_hearts');
            return;
          } else if (eventName === 'cached') {
            __chunker.cancel();
            try { onCached?.(JSON.parse(data)); } catch { onDone?.(data); }
            return;
          } else if (eventName === 'chunk') {
            __chunker.push(data);
          } else if (eventName === 'done') {
            __chunker.flush();
            window.dispatchEvent(new CustomEvent('heart:refresh'));
            window.dispatchEvent(new CustomEvent('heart:deducted'));
            onDone?.(data);
            return;
          } else if (eventName === 'error') {
            __chunker.flush();
            onError?.(data);
            return;
          }
        }
      }
    } catch (e) {
      __chunker.cancel();
      if (e.name !== 'AbortError') onError?.(e.message || 'Connection lost');
    }
  })();

  return () => { __chunker.cancel(); controller.abort(); };
};

// ─── 타로 심화분석 스트리밍 (POST + body=basicInterpretation) ───
export const getTarotDeepStream = (cardIds, reversals, spread, category, {
  categoryKr, question, birthDate, gender, basicInterpretation,
  onChunk, onCached, onDone, onError, onInsufficientHearts,
} = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ cardIds, reversals, spread });
  if (category) params.set('category', category);
  if (categoryKr) params.set('categoryKr', categoryKr);
  if (question) params.set('question', question);
  if (birthDate) params.set('birthDate', birthDate);
  if (gender) params.set('gender', gender);
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/deep/tarot/stream?${params.toString()}`;
  const controller = new AbortController();
  const __chunker = rafBatchChunks(onChunk);

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: basicInterpretation || '',
        signal: controller.signal,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const event of events) {
          if (!event.trim()) continue;
          const lines = event.split('\n');
          let eventName = '';
          let dataLines = [];
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5));
          }
          const data = dataLines.join('\n');

          if (eventName === 'insufficient_hearts') {
            __chunker.cancel();
            try {
              const detail = JSON.parse(data);
              onInsufficientHearts?.(detail);
              window.dispatchEvent(new CustomEvent('heart:insufficient', { detail }));
            } catch {}
            onError?.('insufficient_hearts');
            return;
          } else if (eventName === 'cached') {
            __chunker.cancel();
            try { onCached?.(JSON.parse(data)); } catch { onDone?.(data); }
            return;
          } else if (eventName === 'chunk') {
            __chunker.push(data);
          } else if (eventName === 'done') {
            __chunker.flush();
            window.dispatchEvent(new CustomEvent('heart:refresh'));
            window.dispatchEvent(new CustomEvent('heart:deducted'));
            onDone?.(data);
            return;
          } else if (eventName === 'error') {
            __chunker.flush();
            onError?.(data);
            return;
          }
        }
      }
    } catch (e) {
      __chunker.cancel();
      if (e.name !== 'AbortError') onError?.(e.message || 'Connection lost');
    }
  })();

  return () => { __chunker.cancel(); controller.abort(); };
};

// ─── YouTube Shorts ───
export const getFortuneShorts = async (context) => {
  const params = {};
  if (context) params.context = context;
  const response = await api.get('/shorts', { params });
  return response.data;
};

export const searchCeleb = async (name) => {
  const response = await api.post('/celeb/search', { name });
  return response.data;
};

// ─── 운세 히스토리 ───
export const listHistory = async (type, limit = 20, subType = null) => {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];
  const params = { userId, limit };
  if (type) params.type = type;
  if (subType) params.subType = subType;
  const response = await api.get('/history', { params });
  return response.data;
};

export const getHistory = async (id) => {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('login required');
  const response = await api.get(`/history/${id}`, { params: { userId } });
  return response.data;
};

export const deleteHistory = async (id) => {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('login required');
  await api.delete(`/history/${id}`, { params: { userId } });
};

// ─── 최근 N일 점수 트렌드 (캐시 활용, AI 호출 없음) ───
export const getScoreTrend = async (zodiacAnimal, days = 7) => {
  try {
    const res = await api.get('/fortune/score-trend', { params: { zodiac: zodiacAnimal, days } });
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export default api;
