import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/fortune';
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

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: phone, 2: saju info
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handlePhoneStep = () => {
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }
    setStep(2);
  };

  const handleSkipToFortune = () => {
    // Save phone only, go to home
    localStorage.setItem('userPhone', form.phone);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!form.birthDate) {
      setError('생년월일을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const userData = {
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
      }
      navigate('/fortune');
    } catch (err) {
      console.error('Registration failed:', err);
      setError('등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  return (
    <div className="register-page">
      <section className="register-header animate-fade-in-up">
        <h1 className="register-header__title">&#x1F31F; 회원가입</h1>
        <p className="register-header__subtitle">
          {step === 1
            ? '전화번호로 간편하게 시작하세요'
            : '사주 정보를 입력하면 맞춤 운세를 받을 수 있어요'}
        </p>
        {/* Step indicator */}
        <div className="register-steps">
          <div className={`register-step ${step >= 1 ? 'register-step--active' : ''}`}>1</div>
          <div className="register-step__line" />
          <div className={`register-step ${step >= 2 ? 'register-step--active' : ''}`}>2</div>
        </div>
      </section>

      {step === 1 ? (
        /* Step 1: Phone */
        <div className="register-form glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">전화번호</label>
            <input
              id="phone"
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

          <button className="register-skip" onClick={handleSkipToFortune}>
            나중에 입력할게요 (건너뛰기)
          </button>
        </div>
      ) : (
        /* Step 2: Saju Info */
        <form className="register-form glass-card animate-fade-in-up" onSubmit={handleSubmit} style={{ animationDelay: '100ms' }}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="이름을 입력하세요"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>

          {/* Calendar Type */}
          <div className="form-group">
            <label className="form-label">달력 구분</label>
            <div className="form-toggle">
              <button
                type="button"
                className={`form-toggle__btn ${form.calendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('calendarType', 'SOLAR')}
              >
                ☀️ 양력
              </button>
              <button
                type="button"
                className={`form-toggle__btn ${form.calendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('calendarType', 'LUNAR')}
              >
                🌙 음력
              </button>
            </div>
          </div>

          {/* Birth Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="birthDate">
              생년월일 ({form.calendarType === 'SOLAR' ? '양력' : '음력'})
            </label>
            <input
              id="birthDate"
              type="date"
              className="form-input"
              value={form.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              min="1920-01-01"
            />
          </div>

          {/* Zodiac Display */}
          {zodiac && (
            <div className="register-zodiac animate-scale-in">
              <span className="register-zodiac__emoji">{zodiac.emoji}</span>
              <span className="register-zodiac__text">{zodiac.name}띠</span>
            </div>
          )}

          {/* Gender */}
          <div className="form-group">
            <label className="form-label">성별</label>
            <div className="form-toggle">
              <button
                type="button"
                className={`form-toggle__btn ${form.gender === 'M' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('gender', 'M')}
              >
                ♂️ 남성
              </button>
              <button
                type="button"
                className={`form-toggle__btn ${form.gender === 'F' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('gender', 'F')}
              >
                ♀️ 여성
              </button>
            </div>
          </div>

          {/* Birth Time */}
          <div className="form-group">
            <label className="form-label" htmlFor="birthTime">태어난 시간 (선택)</label>
            <select
              id="birthTime"
              className="form-input form-select"
              value={form.birthTime}
              onChange={(e) => handleChange('birthTime', e.target.value)}
            >
              {BIRTH_TIMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Blood Type (Optional) */}
          <div className="form-group">
            <label className="form-label">혈액형 (선택)</label>
            <div className="form-toggle form-toggle--4">
              {['A', 'B', 'O', 'AB'].map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className={`form-toggle__btn ${form.bloodType === bt ? 'form-toggle__btn--active' : ''}`}
                  onClick={() => handleChange('bloodType', form.bloodType === bt ? '' : bt)}
                >
                  {bt}형
                </button>
              ))}
            </div>
          </div>

          {/* MBTI (Optional) */}
          <div className="form-group">
            <label className="form-label">MBTI (선택)</label>
            <div className="form-mbti-grid">
              {['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`form-mbti-btn ${form.mbtiType === t ? 'form-mbti-btn--active' : ''}`}
                  onClick={() => handleChange('mbtiType', form.mbtiType === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="form-error animate-fade-in">
              <span>&#x26A0;&#xFE0F;</span> {error}
            </div>
          )}

          {/* Actions */}
          <button
            type="submit"
            className="btn-gold register-submit"
            disabled={submitting}
          >
            {submitting ? '확인 중...' : '🔮 운세 보기'}
          </button>

          <button
            type="button"
            className="register-back-step"
            onClick={() => setStep(1)}
          >
            &#x2190; 이전 단계
          </button>
        </form>
      )}
    </div>
  );
}

export default Register;
