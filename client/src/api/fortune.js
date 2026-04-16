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

// 유료 API 호출 전 로그인 체크 — false 반환 시 즉시 로그인 페이지 이동
const requireLogin = (onError) => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    onError?.('로그인이 필요합니다.');
    window.location.replace('/register');
    return false;
  }
  return true;
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

export const getFortuneByZodiac = async (zodiac) => {
  const response = await api.get('/fortune/today', {
    params: { zodiac },
  });
  return response.data;
};

export const getFortuneByZodiacStream = (zodiac, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ zodiac });
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/fortune/today/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
};

export const getFortuneByUserStream = (userId, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  appendUserId(params);
  const paramStr = params.toString();
  const url = `${baseURL}/fortune/user/${userId}/stream${paramStr ? '?' + paramStr : ''}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

export const analyzeSajuStream = (birthDate, birthTime, calendarType, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts, context, targetType, targetName, freeMode } = {}) => {
  if (!freeMode && !requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (birthTime) params.set('birthTime', birthTime);
  if (calendarType) params.set('calendarType', calendarType);
  if (gender) params.set('gender', gender);
  if (context) params.set('context', context);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  if (!freeMode) appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/saju/analyze/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
};

export const getConstellationByDate = async (birthDate) => {
  const response = await api.get('/constellation/fortune/by-date', { params: { birthDate } });
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

export const getMyFortuneStream = (userId, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName } = {}, date) => {
  if (!requireLogin(onError)) return () => {};
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const paramStr = params.toString();
  const url = `${baseURL}/my/fortune/${userId}/stream${paramStr ? '?' + paramStr : ''}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
};

// ─── 만세력 ───
export const getManseryeok = async (date, calendarType) => {
  const params = { date };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/saju/manseryeok', { params });
  return response.data;
};

// ─── 만세력 AI 해석 스트리밍 ───
export const getManseryeokStream = (date, calendarType, birthDate, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ date });
  if (calendarType) params.set('calendarType', calendarType);
  if (birthDate) params.set('birthDate', birthDate);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/saju/manseryeok/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
};

// ─── 사주 궁합 ───
export const getSajuCompatibilityBasic = async (birthDate1, birthDate2, birthTime1, birthTime2, calendarType1, calendarType2, gender1, gender2) => {
  const params = { birthDate1, birthDate2 };
  if (birthTime1) params.birthTime1 = birthTime1;
  if (birthTime2) params.birthTime2 = birthTime2;
  if (calendarType1) params.calendarType1 = calendarType1;
  if (calendarType2) params.calendarType2 = calendarType2;
  if (gender1) params.gender1 = gender1;
  if (gender2) params.gender2 = gender2;
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

export const getCompatibilityStream = (birthDate1, birthDate2, birthTime1, birthTime2, calendarType1, calendarType2, gender1, gender2, score, elementRelation, branchRelation, { onChunk, onDone, onError, onInsufficientHearts }) => {
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
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/compatibility/saju/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

export const getTarotReadingStream = (cardIds, reversals, spread, category, question, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ cardIds, reversals, spread, category });
  if (question) params.set('question', question);
  appendUserId(params);

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/tarot/reading/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
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

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };

  return () => eventSource.close();
};

// ─── 바이오리듬 ───
export const getBiorhythm = async (birthDate) => {
  const response = await api.get('/biorhythm', { params: { birthDate } });
  return response.data;
};

export const getBiorhythmStream = (birthDate, { onChunk, onCached, onDone, onError, onInsufficientHearts }) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/biorhythm/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
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
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
};

// ─── 월별 운세 ───
export const getMonthlyFortune = async (birthDate, month, birthTime, gender) => {
  const params = { birthDate, month };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  const response = await api.get('/monthly-fortune', { params });
  return response.data;
};

export const getMonthlyFortuneStream = (birthDate, month, birthTime, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate, month });
  if (birthTime) params.set('birthTime', birthTime);
  if (gender) params.set('gender', gender);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/monthly-fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
};

// ─── 주간 운세 ───
export const getWeeklyFortune = async (birthDate, birthTime, gender) => {
  const params = { birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  const response = await api.get('/weekly-fortune', { params });
  return response.data;
};

export const getWeeklyFortuneStream = (birthDate, birthTime, gender, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName } = {}) => {
  if (!requireLogin(onError)) return () => {};
  const params = new URLSearchParams({ birthDate });
  if (birthTime) params.set('birthTime', birthTime);
  if (gender) params.set('gender', gender);
  if (targetType) params.set('targetType', targetType);
  if (targetName) params.set('targetName', targetName);
  appendUserId(params);
  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const url = `${baseURL}/weekly-fortune/stream?${params.toString()}`;
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });
  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => { onDone?.(e.data); eventSource.close(); });
  eventSource.addEventListener('error', (e) => { onError?.(e.data || 'Stream error'); eventSource.close(); });
  eventSource.onerror = () => { onError?.('Connection lost'); eventSource.close(); };
  return () => eventSource.close();
};

// ─── 심화분석 ───
export const getDeepAnalysis = async (type, birthDate, birthTime, gender, calendarType, extra) => {
  const params = { type, birthDate };
  if (birthTime) params.birthTime = birthTime;
  if (gender) params.gender = gender;
  if (calendarType) params.calendarType = calendarType;
  if (extra) params.extra = extra;
  const response = await api.get('/deep/fortune', { params });
  return response.data;
};

// ─── 심화분석 스트리밍 ───
export const getDeepAnalysisStream = (type, birthDate, birthTime, gender, calendarType, extra, { onChunk, onCached, onDone, onError, onInsufficientHearts, targetType, targetName } = {}) => {
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
  const eventSource = new EventSource(url);
  addHeartListener(eventSource, { onInsufficientHearts, onError });

  eventSource.addEventListener('chunk', (e) => onChunk?.(e.data));
  eventSource.addEventListener('cached', (e) => {
    try { onCached?.(JSON.parse(e.data)); } catch { onDone?.(e.data); }
    eventSource.close();
  });
  eventSource.addEventListener('done', (e) => {
    onDone?.(e.data);
    eventSource.close();
  });
  eventSource.addEventListener('error', (e) => {
    onError?.(e.data || 'Stream error');
    eventSource.close();
  });
  eventSource.onerror = () => {
    onError?.('Connection lost');
    eventSource.close();
  };

  return () => eventSource.close(); // cleanup function
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

export default api;
