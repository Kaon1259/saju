import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getFortuneByZodiac = async (zodiac) => {
  const response = await api.get('/fortune/today', {
    params: { zodiac },
  });
  return response.data;
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

// ─── 혈액형 운세 ───
export const getBloodTypeFortune = async (type) => {
  const response = await api.get('/bloodtype/fortune', { params: { type } });
  return response.data;
};

export const getAllBloodTypeFortunes = async () => {
  const response = await api.get('/bloodtype/fortune/all');
  return response.data;
};

export const getBloodTypeCompatibility = async (type1, type2) => {
  const response = await api.get('/bloodtype/compatibility', { params: { type1, type2 } });
  return response.data;
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

export const getMbtiCompatibility = async (type1, type2) => {
  const response = await api.get('/mbti/compatibility', { params: { type1, type2 } });
  return response.data;
};

// ─── 만세력 ───
export const getManseryeok = async (date) => {
  const response = await api.get('/saju/manseryeok', { params: { date } });
  return response.data;
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

// ─── 사주 궁합 ───
export const getSajuCompatibility = async (birthDate1, birthDate2, birthTime1, birthTime2) => {
  const params = { birthDate1, birthDate2 };
  if (birthTime1) params.birthTime1 = birthTime1;
  if (birthTime2) params.birthTime2 = birthTime2;
  const response = await api.get('/compatibility/saju', { params });
  return response.data;
};

// ─── 일운 (7일) ───
export const getDailyFortunes = async (birthDate, calendarType) => {
  const params = { birthDate };
  if (calendarType) params.calendarType = calendarType;
  const response = await api.get('/saju/daily', { params });
  return response.data;
};

export default api;
