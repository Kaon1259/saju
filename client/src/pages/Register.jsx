import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { kakaoLogin, kakaoRegister, updateUser, prefetchSseToken } from '../api/fortune';
import { setToken } from '../utils/auth';
import { ZODIAC_ANIMALS } from '../components/ZodiacGrid';
import BirthDatePicker from '../components/BirthDatePicker';
import { startKakaoLogin, peekKakaoReturnTo, clearKakaoReturnTo, getKakaoRedirectUri } from '../utils/kakaoAuth';
import './Register.css';

const isNative = Capacitor.isNativePlatform();
const KAKAO_REDIRECT_URI = getKakaoRedirectUri();

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
  return ZODIAC_ANIMALS[index < 0 ? index + 12 : index] || null;
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
  const v = (d.getMonth() + 1) * 100 + d.getDate();
  for (const c of CONSTELLATIONS) {
    if (v >= c.start[0] * 100 + c.start[1] && v <= c.end[0] * 100 + c.end[1]) return c;
  }
  return null;
}

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // OAuth 콜백으로 복귀할 때는 location.state 가 비어있으므로 sessionStorage 에 저장된 returnTo 도 확인.
  // peek 만 하고, 실제 navigate 성공 후에 clear — Strict Mode 더블 마운트로 값이 사라지는 것을 방지.
  const redirectToRef = useRef(location.state?.from || peekKakaoReturnTo() || '/');
  const redirectTo = redirectToRef.current;

  const needProfile = searchParams.get('needProfile') === 'true';
  const [step, setStep] = useState(needProfile ? 'profile' : 'kakao'); // 'kakao' | 'profile' | 'loading'
  const [userId, setUserId] = useState(needProfile ? localStorage.getItem('userId') : null);
  const [form, setForm] = useState({
    name: '', birthDate: '', calendarType: 'SOLAR', gender: 'M',
    birthTime: '', bloodType: '', mbtiType: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const allAgreed = agreedTerms && agreedPrivacy;
  // 회원가입 직후 자동로그인 여부 묻기
  const [autoLoginAsk, setAutoLoginAsk] = useState(null); // null | { user }

  const birthYear = form.birthDate ? parseInt(form.birthDate.split('-')[0], 10) : null;
  const zodiac = useMemo(() => getZodiacFromYear(birthYear), [birthYear]);
  const constellation = useMemo(() => getConstellationFromDate(form.birthDate), [form.birthDate]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // 로그인 완료 처리 (localStorage 저장 + 리다이렉트)
  const completeLogin = (user) => {
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userProfile', JSON.stringify(user));
    window.dispatchEvent(new Event('heart:refresh'));
    window.dispatchEvent(new Event('auth:changed')); // AppContext 재초기화
    clearKakaoReturnTo(); // 사용 완료 후 sessionStorage 정리
    navigate(redirectTo, { replace: true });
  };

  // 카카오 로그인 버튼 클릭
  const handleKakaoLogin = async () => {
    await startKakaoLogin(redirectTo);
  };

  // 카카오 콜백 처리 - ref로 중복 호출 방지
  const kakaoProcessed = useRef(false);
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || kakaoProcessed.current) return;
    kakaoProcessed.current = true;

    // 앱: 딥링크로 WebView 복귀 시 열려 있던 Chrome Custom Tab 닫기
    if (isNative) {
      Browser.close().catch(() => {});
    }

    setStep('loading');
    (async () => {
      try {
        const result = await kakaoLogin(code, KAKAO_REDIRECT_URI);
        const user = result.user;

        // JWT 저장 (서버에서 발급) → 후속 API 호출에 자동 첨부
        if (result.token) {
          setToken(result.token);
          prefetchSseToken(true).catch(() => {});
        }
        // localStorage에 기본 정보 저장
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userProfile', JSON.stringify(user));
        window.dispatchEvent(new Event('heart:refresh'));
        window.dispatchEvent(new Event('auth:changed')); // AppContext 재초기화 (isLoggedIn 상태 갱신)

        if (result.profileComplete) {
          // 프로필 완성됨 → 바로 이동
          clearKakaoReturnTo();
          navigate(redirectTo, { replace: true });
        } else {
          // 프로필 미완성 → 프로필 입력 폼
          setUserId(user.id);
          setForm(prev => ({
            ...prev,
            name: user.name || '',
            gender: user.gender || 'M',
            birthDate: user.birthDate || '',
          }));
          setStep('profile');
        }
      } catch (e) {
        console.error(e);
        setError('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
        setStep('kakao');
      }
    })();
  }, [searchParams]);

  // 프로필 입력 완료 → 프로필 업데이트
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!form.birthDate) { setError('생년월일을 선택해주세요.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const result = await kakaoRegister({
        userId,
        name: form.name.trim(),
        birthDate: form.birthDate,
        calendarType: form.calendarType,
        gender: form.gender,
        birthTime: form.birthTime || null,
        bloodType: form.bloodType || null,
        mbtiType: form.mbtiType || null,
      });

      // JWT 갱신 — 서버가 register 시점에 새 토큰 발급
      if (result.token) {
        setToken(result.token);
        prefetchSseToken(true).catch(() => {});
      }
      // 자동로그인 여부를 한 번 묻고, 응답 후 completeLogin 호출
      setAutoLoginAsk({ user: result.user });
    } catch (err) {
      const msg = err.response?.data?.error || '';
      setError(msg || '등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 로딩 ───
  if (step === 'loading') {
    return (
      <div className="register-page">
        <div className="register-kakao-loading">
          <div className="register-kakao-spinner" />
          <p>카카오 로그인 처리 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <section className="register-header animate-fade-in-up">
        <h1 className="register-header__title">
          {step === 'kakao' ? '🔮 로그인' : '🌟 프로필 설정'}
        </h1>
        <p className="register-header__subtitle">
          {step === 'kakao'
            ? '카카오톡으로 간편하게 시작하세요'
            : '사주 정보를 입력하면 맞춤 운세를 받을 수 있어요'}
        </p>
      </section>

      {/* ═══ 카카오 로그인 ═══ */}
      {step === 'kakao' && (
        <div className="register-form glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="register-agree">
            <label className="register-agree-row">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={(e) => { setAgreedTerms(e.target.checked); setAgreedPrivacy(e.target.checked); }}
              />
              <span><strong>전체 동의</strong></span>
            </label>
            <label className="register-agree-row">
              <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
              <span>
                (필수) <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>이용약관</a>에 동의합니다
              </span>
            </label>
            <label className="register-agree-row">
              <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} />
              <span>
                (필수) <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>개인정보 처리방침</a>에 동의합니다
              </span>
            </label>
          </div>

          <button
            className="kakao-login-btn"
            onClick={handleKakaoLogin}
            disabled={!allAgreed}
            style={!allAgreed ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <svg className="kakao-logo" viewBox="0 0 24 24" width="22" height="22">
              <path fill="#000" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.32.65.64.44l4.94-3.26c.38.04.76.06 1.16.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/>
            </svg>
            카카오 로그인
          </button>

          {error && (
            <div className="form-error animate-fade-in">
              <span>&#x26A0;&#xFE0F;</span> {error}
            </div>
          )}

          <p className="register-kakao-notice">
            {allAgreed ? '카카오 계정으로 간편하게 로그인하세요' : '약관에 동의해야 가입을 진행할 수 있어요'}
          </p>
        </div>
      )}

      {/* ═══ 프로필 입력 ═══ */}
      {step === 'profile' && (
        <form className="register-form glass-card animate-fade-in-up" onSubmit={handleSubmit} style={{ animationDelay: '100ms' }}>
          <div className="register-kakao-welcome">
            카카오 인증 완료! 프로필을 설정해주세요
          </div>

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
            <label className="form-label">생년월일 ({form.calendarType === 'SOLAR' ? '양력' : '음력'})</label>
            <BirthDatePicker value={form.birthDate} onChange={(v) => handleChange('birthDate', v)} calendarType={form.calendarType} />
          </div>

          {(zodiac || constellation) && (
            <div className="register-info-badges animate-scale-in">
              {zodiac && <div className="register-zodiac"><span className="register-zodiac__emoji">{zodiac.emoji}</span><span className="register-zodiac__text">{zodiac.name}띠</span></div>}
              {constellation && <div className="register-constellation"><span className="register-constellation__emoji">{constellation.emoji}</span><span className="register-constellation__text">{constellation.name}</span></div>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">성별</label>
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${form.gender === 'M' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('gender', 'M')}><span className="g-circle g-male">♂</span></button>
              <button type="button" className={`form-toggle__btn ${form.gender === 'F' ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('gender', 'F')}><span className="g-circle g-female">♀</span></button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">태어난 시간 (선택)</label>
            <select className="form-input form-select" value={form.birthTime}
              onChange={(e) => handleChange('birthTime', e.target.value)}>
              {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">혈액형 (선택)</label>
            <div className="form-toggle form-toggle--4">
              {['A', 'B', 'O', 'AB'].map(bt => (
                <button key={bt} type="button"
                  className={`form-toggle__btn ${form.bloodType === bt ? 'form-toggle__btn--active' : ''}`}
                  onClick={() => handleChange('bloodType', form.bloodType === bt ? '' : bt)}>{bt}형</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">MBTI (선택)</label>
            <div className="form-mbti-grid">
              {['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map(t => (
                <button key={t} type="button"
                  className={`form-mbti-btn ${form.mbtiType === t ? 'form-mbti-btn--active' : ''}`}
                  onClick={() => handleChange('mbtiType', form.mbtiType === t ? '' : t)}>{t}</button>
              ))}
            </div>
          </div>

          {error && <div className="form-error animate-fade-in"><span>&#x26A0;&#xFE0F;</span> {error}</div>}

          <button type="submit" className="btn-gold register-submit" disabled={submitting}>
            {submitting ? '확인 중...' : '🔮 프로필 저장'}
          </button>
        </form>
      )}

      {/* ═══ 회원가입 직후 자동로그인 묻기 ═══ */}
      {autoLoginAsk && (
        <div className="autologin-ask-overlay" role="dialog" aria-modal="true">
          <div className="autologin-ask-modal">
            <div className="autologin-ask-icon">🔐</div>
            <h3 className="autologin-ask-title">자동 로그인할까요?</h3>
            <p className="autologin-ask-desc">
              켜두시면 다음에 앱을 열 때<br />
              <strong>로그인 없이 바로 시작</strong>할 수 있어요.<br />
              <span className="autologin-ask-hint">언제든 마이메뉴에서 변경 가능합니다.</span>
            </p>
            <div className="autologin-ask-actions">
              <button
                className="autologin-ask-btn autologin-ask-btn-off"
                onClick={() => {
                  localStorage.setItem('autoLogin', 'off');
                  const u = autoLoginAsk.user;
                  setAutoLoginAsk(null);
                  completeLogin(u);
                }}
              >
                지금은 끄기
              </button>
              <button
                className="autologin-ask-btn autologin-ask-btn-on"
                onClick={() => {
                  localStorage.setItem('autoLogin', 'on');
                  const u = autoLoginAsk.user;
                  setAutoLoginAsk(null);
                  completeLogin(u);
                }}
              >
                자동 로그인 켜기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
