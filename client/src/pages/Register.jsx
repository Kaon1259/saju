import { useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { phoneSignup, phoneLogin, prefetchSseToken, applyReferralCode } from '../api/fortune';
import { setToken } from '../utils/auth';
import { useToast } from '../components/Toast';
import { ZODIAC_ANIMALS } from '../components/ZodiacGrid';
import MenuIcon from '../components/MenuIcon';
import BirthDatePicker from '../components/BirthDatePicker';
import GenderPicker from '../components/GenderPicker';
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

function formatPhone(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
}

const isWeakPin = (p) => {
  if (!p || p.length < 4) return true;
  let same = true, asc = true, desc = true;
  for (let i = 1; i < p.length; i++) {
    const d = p.charCodeAt(i) - p.charCodeAt(i - 1);
    if (d !== 0) same = false;
    if (d !== 1) asc = false;
    if (d !== -1) desc = false;
  }
  return same || asc || desc;
};

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  // 로그인 후 돌아갈 경로: 각 화면의 로그인 버튼이 state.from 으로 넘김, 401 만료 처리는 ?from= 으로 넘김
  const redirectTo = useRef(location.state?.from || searchParams.get('from') || '/').current;

  // 'signup'(처음이에요: 사주 정보 + 전화번호 + PIN) | 'login'(전화번호 + PIN)
  const [mode, setMode] = useState(searchParams.get('mode') === 'login' ? 'login' : 'signup');
  // 랜딩(/welcome)에서 이미 입력한 생년월일·성별은 다시 묻지 않고 미리 채운다
  const landingPre = useRef((() => {
    try { return JSON.parse(sessionStorage.getItem('landingBirth') || 'null') || {}; } catch { return {}; }
  })()).current;
  const [form, setForm] = useState({
    name: '', birthDate: landingPre.birthDate || '', calendarType: 'SOLAR', gender: landingPre.gender || 'M',
    birthTime: '', bloodType: '', mbtiType: '',
    referralCode: searchParams.get('ref') || '',
  });
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [referralResult, setReferralResult] = useState(null);
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

  const switchMode = (m) => { setMode(m); setError(''); setPin(''); setPin2(''); };

  // 로그인 완료 처리 (localStorage 저장 + 리다이렉트)
  const completeLogin = (user) => {
    try { sessionStorage.removeItem('landingBirth'); } catch {}
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userProfile', JSON.stringify(user));
    window.dispatchEvent(new Event('heart:refresh'));
    window.dispatchEvent(new Event('auth:changed')); // AppContext 재초기화
    navigate(redirectTo, { replace: true });
  };

  const saveSession = (result) => {
    if (result.token) {
      setToken(result.token);
      prefetchSseToken(true).catch(() => {});
    }
  };

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneOk = /^01[016789]\d{7,8}$/.test(phoneDigits);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phoneOk) { setError('전화번호를 확인해 주세요.'); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError('PIN은 숫자 4~6자리예요.'); return; }
    setSubmitting(true); setError('');
    try {
      const result = await phoneLogin({ phone: phoneDigits, pin });
      saveSession(result);
      completeLogin(result.user);
    } catch (err) {
      setError(err.response?.data?.error || '로그인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!form.birthDate) { setError('생년월일을 선택해 주세요.'); return; }
    if (!phoneOk) { setError('전화번호를 확인해 주세요. (예: 010-1234-5678)'); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError('PIN은 숫자 4~6자리예요.'); return; }
    if (isWeakPin(pin)) { setError('너무 쉬운 PIN이에요. (1234, 1111 같은 숫자는 쓸 수 없어요)'); return; }
    if (pin !== pin2) { setError('PIN이 서로 달라요. 다시 확인해 주세요.'); return; }
    if (!allAgreed) { setError('이용약관과 개인정보 처리방침에 동의해 주세요.'); return; }

    setSubmitting(true); setError('');
    try {
      const result = await phoneSignup({
        phone: phoneDigits, pin,
        name: form.name.trim() || null,
        birthDate: form.birthDate,
        calendarType: form.calendarType,
        gender: form.gender,
        birthTime: form.birthTime || null,
        bloodType: form.bloodType || null,
        mbtiType: form.mbtiType || null,
      });
      saveSession(result);
      // 초대 코드 적용 (선택) — 가입 직후 1회 시도, 실패해도 가입 자체는 OK
      const ref = (form.referralCode || '').trim();
      if (ref) {
        try {
          const r = await applyReferralCode(ref);
          setReferralResult(r);
          if (r?.ok) window.dispatchEvent(new Event('heart:refresh'));
        } catch {}
      }
      setAutoLoginAsk({ user: result.user });
    } catch (err) {
      const msg = err.response?.data?.error || '';
      setError(msg || '가입에 실패했어요. 다시 시도해 주세요.');
      if (err.response?.status === 409) toast?.('이미 가입된 번호예요. 로그인해 주세요.', 'info');
    } finally {
      setSubmitting(false);
    }
  };

  const phoneField = (
    <div className="form-group">
      <label className="form-label" htmlFor="phone">전화번호</label>
      <input id="phone" type="tel" inputMode="numeric" autoComplete="tel" className="form-input"
        placeholder="010-1234-5678" value={phone} maxLength={13}
        onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }} />
    </div>
  );

  return (
    <div className="register-page">
      <section className="register-header animate-fade-in-up">
        <h1 className="register-header__title">
          {mode === 'signup'
            ? <><MenuIcon name="star" size={22} /> 내 사주로 시작하기</>
            : <><MenuIcon name="crystalBall" size={22} /> 로그인</>}
        </h1>
        <p className="register-header__subtitle">
          {mode === 'signup'
            ? '생년월일과 전화번호만 입력하면 바로 시작해요'
            : '가입할 때 만든 전화번호와 PIN으로 로그인하세요'}
        </p>
      </section>

      <div className="register-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signup'}
          className={`register-tab ${mode === 'signup' ? 'register-tab--on' : ''}`}
          onClick={() => switchMode('signup')}>처음이에요</button>
        <button type="button" role="tab" aria-selected={mode === 'login'}
          className={`register-tab ${mode === 'login' ? 'register-tab--on' : ''}`}
          onClick={() => switchMode('login')}>이미 가입했어요</button>
      </div>

      {/* ═══ 로그인 ═══ */}
      {mode === 'login' && (
        <form className="register-form glass-card animate-fade-in-up" onSubmit={handleLogin} style={{ animationDelay: '80ms' }}>
          {phoneField}
          <div className="form-group">
            <label className="form-label" htmlFor="pin">PIN (숫자 4~6자리)</label>
            <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" className="form-input"
              placeholder="••••" value={pin} maxLength={6}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }} />
          </div>
          {error && <div className="form-error animate-fade-in"><MenuIcon name="alert" size={15} /> {error}</div>}
          <button type="submit" className="btn-gold register-submit" disabled={submitting || !phoneOk || pin.length < 4}>
            {submitting ? '확인 중...' : '로그인'}
          </button>
          <p className="register-pin-note">PIN을 잊으면 복구할 수 없어요. (문자 인증은 아직 지원하지 않아요)</p>
        </form>
      )}

      {/* ═══ 가입: 사주 정보 → 전화번호 + PIN ═══ */}
      {mode === 'signup' && (
        <form className="register-form glass-card animate-fade-in-up" onSubmit={handleSignup} style={{ animationDelay: '80ms' }}>
          <div className="register-step-title"><MenuIcon name="star" size={16} /> 1. 내 사주 정보</div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">이름 또는 별명 (선택)</label>
            <input id="name" type="text" className="form-input" placeholder="이름을 입력하세요"
              value={form.name} onChange={(e) => handleChange('name', e.target.value)} maxLength={20} />
          </div>

          <div className="form-group">
            <label className="form-label">생년월일</label>
            <BirthDatePicker
              value={form.birthDate}
              onChange={(v) => handleChange('birthDate', v)}
              calendarType={form.calendarType}
              onCalendarTypeChange={(v) => handleChange('calendarType', v)}
            />
          </div>

          {(zodiac || constellation) && (
            <div className="register-info-badges animate-scale-in">
              {zodiac && <div className="register-zodiac"><span className="register-zodiac__emoji">{zodiac.emoji}</span><span className="register-zodiac__text">{zodiac.name}띠</span></div>}
              {constellation && <div className="register-constellation"><span className="register-constellation__emoji">{constellation.emoji}</span><span className="register-constellation__text">{constellation.name}</span></div>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">성별</label>
            <GenderPicker value={form.gender} onChange={(v) => handleChange('gender', v)} />
          </div>

          <div className="form-group">
            <label className="form-label">태어난 시간 (선택 — 알면 더 정확해요)</label>
            <select className="form-input form-select" value={form.birthTime}
              onChange={(e) => handleChange('birthTime', e.target.value)}>
              {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <button type="button" className="register-more-toggle" onClick={() => setShowMore(v => !v)}>
            {showMore ? '▲ 선택 정보 접기' : '▼ 혈액형·MBTI·초대 코드 (선택)'}
          </button>
          {showMore && (
            <>
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
              <div className="form-group">
                <label className="form-label">친구 초대 코드 (선택)</label>
                <input type="text" className="form-input" placeholder="예: AB23CDEF" maxLength={12}
                  value={form.referralCode} autoComplete="off"
                  onChange={(e) => handleChange('referralCode', e.target.value.toUpperCase().replace(/\s/g, ''))} />
                <p className="register-referral-hint">친구 코드를 입력하면 둘 다 +30하트를 받아요</p>
              </div>
            </>
          )}

          <div className="register-step-title" style={{ marginTop: 18 }}><MenuIcon name="lock" size={16} /> 2. 전화번호와 PIN</div>
          {phoneField}
          <div className="form-group">
            <label className="form-label" htmlFor="pin">PIN 만들기 (숫자 4~6자리)</label>
            <input id="pin" type="password" inputMode="numeric" autoComplete="new-password" className="form-input"
              placeholder="••••" value={pin} maxLength={6}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pin2">PIN 한 번 더</label>
            <input id="pin2" type="password" inputMode="numeric" autoComplete="new-password" className="form-input"
              placeholder="••••" value={pin2} maxLength={6}
              onChange={(e) => { setPin2(e.target.value.replace(/\D/g, '')); setError(''); }} />
          </div>
          <p className="register-pin-note">
            전화번호는 로그인에만 쓰이고 다른 사람에게 보이지 않아요.<br />
            <b>PIN을 잊으면 복구할 수 없으니</b> 꼭 기억해 두세요.
          </p>

          <div className="register-agree">
            <label className="register-agree-row register-agree-row--all">
              <input type="checkbox" checked={allAgreed}
                onChange={(e) => { setAgreedTerms(e.target.checked); setAgreedPrivacy(e.target.checked); }} />
              <span><strong>전체 동의</strong></span>
            </label>
            <label className="register-agree-row">
              <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
              <span>(필수) <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>이용약관</a>에 동의합니다</span>
            </label>
            <label className="register-agree-row">
              <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} />
              <span>(필수) <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>개인정보 처리방침</a>에 동의합니다</span>
            </label>
          </div>

          {error && <div className="form-error animate-fade-in"><MenuIcon name="alert" size={15} /> {error}</div>}

          <button type="submit" className="btn-gold register-submit" disabled={submitting}>
            {submitting ? '가입 중...' : <><MenuIcon name="crystalBall" size={16} /> 가입하고 내 사주 보기</>}
          </button>
        </form>
      )}

      {/* ═══ 회원가입 직후 자동로그인 묻기 ═══ */}
      {autoLoginAsk && (
        <div className="autologin-ask-overlay" role="dialog" aria-modal="true">
          <div className="autologin-ask-modal">
            {referralResult?.ok && (
              <div className="autologin-ask-referral">
                <MenuIcon name="heart" size={15} /> 친구 초대 보너스 <strong>+{referralResult.inviteeBonus}하트</strong> 지급!
                {referralResult.inviterName ? <small>{referralResult.inviterName}님이 초대해주셨어요</small> : null}
              </div>
            )}
            <div className="autologin-ask-icon"><MenuIcon name="lock" size={32} /></div>
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
