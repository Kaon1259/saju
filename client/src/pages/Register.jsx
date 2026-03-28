import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerUser, loginUser } from '../api/fortune';
import { ZODIAC_ANIMALS } from '../components/ZodiacGrid';
import './Register.css';

const BIRTH_TIMES = [
  { value: '', label: '모름 / 선택안함' },
  { value: '자시', label: '자시 (23:00~01:00)' },
  { value: '축시', label: '축시 (01:00~03:00)' },
  { value: '인시', label: '인시 (03:00~05:00)' },
  { value: '묘시', label: '묘시 (05:00~07:00)' },
  { value: '진시', label: '진시 (07:00~09:00)' },
  { value: '사시', label: '사시 (09:00~11:00)' },
  { value: '오시', label: '오시 (11:00~13:00)' },
  { value: '미시', label: '미시 (13:00~15:00)' },
  { value: '신시', label: '신시 (15:00~17:00)' },
  { value: '유시', label: '유시 (17:00~19:00)' },
  { value: '술시', label: '술시 (19:00~21:00)' },
  { value: '해시', label: '해시 (21:00~23:00)' },
];

function getZodiacFromYear(year) {
  if (!year || year < 1900) return null;
  const index = (year - 4) % 12;
  const normalizedIndex = index < 0 ? index + 12 : index;
  return ZODIAC_ANIMALS[normalizedIndex] || null;
}

const CONSTELLATIONS = [
  { name: '염소자리', emoji: '♑', start: [1,1], end: [1,19] },
  { name: '물병자리', emoji: '♒', start: [1,20], end: [2,18] },
  { name: '물고기자리', emoji: '♓', start: [2,19], end: [3,20] },
  { name: '양자리', emoji: '♈', start: [3,21], end: [4,19] },
  { name: '황소자리', emoji: '♉', start: [4,20], end: [5,20] },
  { name: '쌍둥이자리', emoji: '♊', start: [5,21], end: [6,21] },
  { name: '게자리', emoji: '♋', start: [6,22], end: [7,22] },
  { name: '사자자리', emoji: '♌', start: [7,23], end: [8,22] },
  { name: '처녀자리', emoji: '♍', start: [8,23], end: [9,22] },
  { name: '천칭자리', emoji: '♎', start: [9,23], end: [10,22] },
  { name: '전갈자리', emoji: '♏', start: [10,23], end: [11,21] },
  { name: '사수자리', emoji: '♐', start: [11,22], end: [12,21] },
  { name: '염소자리', emoji: '♑', start: [12,22], end: [12,31] },
];

function getConstellationFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const v = m * 100 + day;
  for (const c of CONSTELLATIONS) {
    const s = c.start[0] * 100 + c.start[1];
    const e = c.end[0] * 100 + c.end[1];
    if (v >= s && v <= e) return c;
  }
  return null;
}

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [step, setStep] = useState(1); // register: 1=phone, 2=saju info
  const [form, setForm] = useState({
    name: '',
    phone: '',
    birthDate: '',
    calendarType: 'SOLAR',
    gender: 'M',
    birthTime: '',
    bloodType: '',
    mbtiType: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const birthYear = form.birthDate ? parseInt(form.birthDate.split('-')[0], 10) : null;
  const zodiac = useMemo(() => getZodiacFromYear(birthYear), [birthYear]);
  const constellation = useMemo(() => getConstellationFromDate(form.birthDate), [form.birthDate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setStep(1);
    setError('');
  };

  // ─── 로그인 ───
  const handleLogin = async () => {
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await loginUser(form.phone);
      const userId = result.id || result.userId;
      if (userId) {
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', result.name);
        localStorage.setItem('userPhone', form.phone);
        localStorage.setItem('userProfile', JSON.stringify(result));
      }
      navigate(redirectTo);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || '';
      if (typeof msg === 'string' && msg.includes('등록되지 않은')) {
        setError('등록되지 않은 전화번호입니다. 회원가입을 해주세요.');
      } else {
        setError('로그인에 실패했습니다. 전화번호를 확인해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 회원가입: 다음 단계 ───
  const handlePhoneStep = () => {
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }
    setStep(2);
  };

  // ─── 회원가입: 제출 ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!form.birthDate) { setError('생년월일을 선택해주세요.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const userData = {
        phone: form.phone,
        name: form.name.trim(),
        birthDate: form.birthDate,
        calendarType: form.calendarType,
        gender: form.gender,
        birthTime: form.birthTime || null,
        bloodType: form.bloodType || null,
        mbtiType: form.mbtiType || null,
      };
      const result = await registerUser(userData);
      const userId = result.id || result.userId;
      if (userId) {
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userPhone', form.phone);
        localStorage.setItem('userProfile', JSON.stringify({ ...userData, id: userId }));
      }
      navigate(redirectTo);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || '';
      if (typeof msg === 'string' && msg.includes('이미 등록된')) {
        setError('이미 등록된 전화번호입니다. 로그인해주세요.');
      } else {
        setError('등록에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <section className="register-header animate-fade-in-up">
        <h1 className="register-header__title">
          {mode === 'login' ? '🔮 로그인' : '🌟 회원가입'}
        </h1>
        <p className="register-header__subtitle">
          {mode === 'login'
            ? '전화번호로 간편하게 로그인하세요'
            : step === 1
              ? '전화번호로 시작하세요'
              : '사주 정보를 입력하면 맞춤 운세를 받을 수 있어요'}
        </p>

        {/* 모드 탭 */}
        <div className="register-mode-tabs">
          <button
            className={`register-mode-tab ${mode === 'login' ? 'register-mode-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            로그인
          </button>
          <button
            className={`register-mode-tab ${mode === 'register' ? 'register-mode-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            회원가입
          </button>
        </div>

        {/* 회원가입 단계 표시 */}
        {mode === 'register' && (
          <div className="register-steps">
            <div className={`register-step ${step >= 1 ? 'register-step--active' : ''}`}>1</div>
            <div className="register-step__line" />
            <div className={`register-step ${step >= 2 ? 'register-step--active' : ''}`}>2</div>
          </div>
        )}
      </section>

      {/* ═══ 로그인 ═══ */}
      {mode === 'login' && (
        <div className="register-form glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-phone">전화번호</label>
            <input
              id="login-phone"
              type="tel"
              className="form-input"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
              autoFocus
            />
          </div>

          {error && (
            <div className="form-error animate-fade-in">
              <span>&#x26A0;&#xFE0F;</span> {error}
            </div>
          )}

          <button
            className="btn-gold register-submit"
            onClick={handleLogin}
            disabled={submitting}
          >
            {submitting ? '확인 중...' : '🔮 로그인'}
          </button>

          <button className="register-skip" onClick={() => switchMode('register')}>
            계정이 없으신가요? <strong>회원가입</strong>
          </button>
        </div>
      )}

      {/* ═══ 회원가입 Step 1: 전화번호 ═══ */}
      {mode === 'register' && step === 1 && (
        <div className="register-form glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">전화번호</label>
            <input
              id="reg-phone"
              type="tel"
              className="form-input"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
              autoFocus
            />
          </div>

          {error && (
            <div className="form-error animate-fade-in">
              <span>&#x26A0;&#xFE0F;</span> {error}
            </div>
          )}

          <button className="btn-gold register-submit" onClick={handlePhoneStep}>
            다음 단계 &rarr;
          </button>

          <button className="register-skip" onClick={() => switchMode('login')}>
            이미 계정이 있으신가요? <strong>로그인</strong>
          </button>
        </div>
      )}

      {/* ═══ 회원가입 Step 2: 사주 정보 ═══ */}
      {mode === 'register' && step === 2 && (
        <form className="register-form glass-card animate-fade-in-up" onSubmit={handleSubmit} style={{ animationDelay: '100ms' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">이름</label>
            <input id="name" type="text" className="form-input" placeholder="이름을 입력하세요"
              value={form.name} onChange={(e) => handleChange('name', e.target.value)} maxLength={20} autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">달력 구분</label>
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${form.calendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('calendarType', 'SOLAR')}>☀️ 양력</button>
              <button type="button" className={`form-toggle__btn ${form.calendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('calendarType', 'LUNAR')}>🌙 음력</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="birthDate">
              생년월일 ({form.calendarType === 'SOLAR' ? '양력' : '음력'})
            </label>
            <input id="birthDate" type="date" className="form-input" value={form.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)} max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
          </div>

          {(zodiac || constellation) && (
            <div className="register-info-badges animate-scale-in">
              {zodiac && (
                <div className="register-zodiac">
                  <span className="register-zodiac__emoji">{zodiac.emoji}</span>
                  <span className="register-zodiac__text">{zodiac.name}띠</span>
                </div>
              )}
              {constellation && (
                <div className="register-constellation">
                  <span className="register-constellation__emoji">{constellation.emoji}</span>
                  <span className="register-constellation__text">{constellation.name}</span>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">성별</label>
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${form.gender === 'M' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('gender', 'M')}>♂️ 남성</button>
              <button type="button" className={`form-toggle__btn ${form.gender === 'F' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('gender', 'F')}>♀️ 여성</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="birthTime">태어난 시간 (선택)</label>
            <select id="birthTime" className="form-input form-select" value={form.birthTime}
              onChange={(e) => handleChange('birthTime', e.target.value)}>
              {BIRTH_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">혈액형 (선택)</label>
            <div className="form-toggle form-toggle--4">
              {['A', 'B', 'O', 'AB'].map((bt) => (
                <button key={bt} type="button"
                  className={`form-toggle__btn ${form.bloodType === bt ? 'form-toggle__btn--active' : ''}`}
                  onClick={() => handleChange('bloodType', form.bloodType === bt ? '' : bt)}>{bt}형</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">MBTI (선택)</label>
            <div className="form-mbti-grid">
              {['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map((t) => (
                <button key={t} type="button"
                  className={`form-mbti-btn ${form.mbtiType === t ? 'form-mbti-btn--active' : ''}`}
                  onClick={() => handleChange('mbtiType', form.mbtiType === t ? '' : t)}>{t}</button>
              ))}
            </div>
          </div>

          {error && (
            <div className="form-error animate-fade-in"><span>&#x26A0;&#xFE0F;</span> {error}</div>
          )}

          <button type="submit" className="btn-gold register-submit" disabled={submitting}>
            {submitting ? '확인 중...' : '🔮 가입 완료'}
          </button>

          <button type="button" className="register-back-step" onClick={() => setStep(1)}>
            &#x2190; 이전 단계
          </button>
        </form>
      )}
    </div>
  );
}

export default Register;
