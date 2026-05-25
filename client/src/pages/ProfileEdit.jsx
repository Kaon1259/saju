import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, updateUser } from '../api/fortune';
import { ZODIAC_ANIMALS } from '../components/ZodiacGrid';
import MenuIcon from '../components/MenuIcon';
import BirthDatePicker from '../components/BirthDatePicker';
import GenderPicker from '../components/GenderPicker';
import './Register.css';
import './ProfileEdit.css';

const BIRTH_TIMES = [
  { value: '', label: '모름 / 선택안함' },
  { value: '자시', label: '자시 (23:00~01:00)' },{ value: '축시', label: '축시 (01:00~03:00)' },
  { value: '인시', label: '인시 (03:00~05:00)' },{ value: '묘시', label: '묘시 (05:00~07:00)' },
  { value: '진시', label: '진시 (07:00~09:00)' },{ value: '사시', label: '사시 (09:00~11:00)' },
  { value: '오시', label: '오시 (11:00~13:00)' },{ value: '미시', label: '미시 (13:00~15:00)' },
  { value: '신시', label: '신시 (15:00~17:00)' },{ value: '유시', label: '유시 (17:00~19:00)' },
  { value: '술시', label: '술시 (19:00~21:00)' },{ value: '해시', label: '해시 (21:00~23:00)' },
];

const MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];

const REL_STATUS = [
  { id: 'SINGLE', label: '솔로', icon: '💫', iconKey: 'sparkle', color: '#FFB020' },
  { id: 'SOME', label: '썸', icon: '💗', iconKey: 'heart', color: '#FF6B6B' },
  { id: 'IN_RELATIONSHIP', label: '연애중', icon: '💕', iconKey: 'love', color: '#E91E63' },
  { id: 'MARRIED', label: '기혼', icon: '💍', iconKey: 'ring', color: '#9B59B6' },
  { id: 'COMPLICATED', label: '복잡', icon: '💔', iconKey: 'heartBroken', color: '#94A3B8' },
];

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

function getConstellation(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const v = (d.getMonth() + 1) * 100 + d.getDate();
  return CONSTELLATIONS.find(c => v >= c.start[0]*100+c.start[1] && v <= c.end[0]*100+c.end[1]);
}

function getZodiac(year) {
  if (!year) return null;
  return ZODIAC_ANIMALS[((year - 4) % 12 + 12) % 12] || null;
}

function ProfileEdit() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '', birthDate: '', calendarType: 'SOLAR', gender: 'M',
    birthTime: '', bloodType: '', mbtiType: '',
    relationshipStatus: 'SINGLE',
    partnerBirthDate: '', partnerBirthTime: '', partnerCalendarType: 'SOLAR', partnerBloodType: '', partnerMbtiType: '',
  });

  useEffect(() => {
    if (!userId) { navigate('/register', { state: { from: '/profile/edit' } }); return; }
    (async () => {
      try {
        const user = await getUser(userId);
        setForm({
          name: user.name || '',
          birthDate: user.birthDate || '',
          calendarType: user.calendarType || 'SOLAR',
          gender: user.gender || 'M',
          birthTime: user.birthTime || '',
          bloodType: user.bloodType || '',
          mbtiType: user.mbtiType || '',
          relationshipStatus: user.relationshipStatus || 'SINGLE',
          partnerBirthDate: user.partnerBirthDate || '',
          partnerBirthTime: user.partnerBirthTime || '',
          partnerCalendarType: user.partnerCalendarType || 'SOLAR',
          partnerBloodType: user.partnerBloodType || '',
          partnerMbtiType: user.partnerMbtiType || '',
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); setSuccess(false); };

  const isPartnerEnabled = form.relationshipStatus === 'IN_RELATIONSHIP' || form.relationshipStatus === 'SOME' || form.relationshipStatus === 'MARRIED';

  const partnerZodiac = useMemo(() => {
    if (!form.partnerBirthDate) return null;
    return getZodiac(parseInt(form.partnerBirthDate.split('-')[0]));
  }, [form.partnerBirthDate]);

  const partnerConstellation = useMemo(() => getConstellation(form.partnerBirthDate), [form.partnerBirthDate]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        name: form.name.trim(),
        birthDate: form.birthDate,
        calendarType: form.calendarType,
        gender: form.gender,
        birthTime: form.birthTime || null,
        bloodType: form.bloodType || null,
        mbtiType: form.mbtiType || null,
        relationshipStatus: form.relationshipStatus,
        partnerBirthDate: isPartnerEnabled && form.partnerBirthDate ? form.partnerBirthDate : null,
        partnerBirthTime: isPartnerEnabled && form.partnerBirthTime ? form.partnerBirthTime : null,
        partnerCalendarType: isPartnerEnabled && form.partnerBirthDate ? (form.partnerCalendarType || 'SOLAR') : null,
        partnerBloodType: isPartnerEnabled && form.partnerBloodType ? form.partnerBloodType : null,
        partnerMbtiType: isPartnerEnabled && form.partnerMbtiType ? form.partnerMbtiType : null,
      };
      await updateUser(userId, data);
      localStorage.setItem('userName', data.name);
      localStorage.setItem('userProfile', JSON.stringify({ ...data, id: userId }));
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 1200);
    } catch (e) {
      setError('저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="register-page"><div style={{ textAlign: 'center', padding: 60 }}>로딩 중...</div></div>;

  return (
    <div className="register-page">
      <section className="register-header">
        <h1 className="register-header__title"><MenuIcon name="user" size={22} /> 프로필 수정</h1>
        <p className="register-header__subtitle">내 정보와 연애 상태를 수정할 수 있어요</p>
      </section>

      <div className="register-form glass-card" style={{ animationDelay: '100ms' }}>
        <div className="pe-list">
          {/* 이름 + 성별 — 한 줄 통합 */}
          <div className="pe-row pe-row-combo">
            <span className="pe-input-icon"><MenuIcon name="user" size={18} /></span>
            <input
              type="text"
              className="pe-input-name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              maxLength={20}
              placeholder="이름"
            />
            <GenderPicker value={form.gender} onChange={(v) => handleChange('gender', v)} />
          </div>

          {/* 생년월일 — stack (큼) */}
          <div className="pe-row pe-row--stack">
            <span className="pe-row-label">생년월일</span>
            <div className="pe-row-value">
              <BirthDatePicker
                value={form.birthDate}
                onChange={(v) => handleChange('birthDate', v)}
                calendarType={form.calendarType}
                onCalendarTypeChange={(v) => handleChange('calendarType', v)}
              />
            </div>
          </div>

          {/* 태어난 시간 — inline select */}
          <div className="pe-row">
            <span className="pe-row-label">태어난 시간</span>
            <div className="pe-row-value">
              <select
                className="pe-select-inline"
                value={form.birthTime}
                onChange={e => handleChange('birthTime', e.target.value)}
              >
                {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* 혈액형 — chip row */}
          <div className="pe-row">
            <span className="pe-row-label">혈액형</span>
            <div className="pe-row-value">
              <div className="pe-chips">
                {['A','B','O','AB'].map(bt => (
                  <button
                    key={bt}
                    type="button"
                    className={`pe-chip ${form.bloodType === bt ? 'pe-chip--active' : ''}`}
                    onClick={() => handleChange('bloodType', form.bloodType === bt ? '' : bt)}
                  >
                    {bt}형
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MBTI — stack (그리드 큼) */}
          <div className="pe-row pe-row--stack">
            <span className="pe-row-label">MBTI</span>
            <div className="pe-row-value">
              <div className="pe-mbti-grid">
                {MBTI_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`pe-mbti-btn ${form.mbtiType === t ? 'pe-mbti-btn--active' : ''}`}
                    onClick={() => handleChange('mbtiType', form.mbtiType === t ? '' : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 연애 상태 — stack chips */}
          <div className="pe-row pe-row--stack">
            <span className="pe-row-label">연애 상태</span>
            <div className="pe-row-value">
              <div className="pe-chips">
                {REL_STATUS.map(rs => (
                  <button
                    key={rs.id}
                    type="button"
                    className={`pe-chip ${form.relationshipStatus === rs.id ? 'pe-chip--active' : ''}`}
                    style={form.relationshipStatus === rs.id ? { borderColor: rs.color, background: `${rs.color}22`, color: '#fff' } : {}}
                    onClick={() => handleChange('relationshipStatus', rs.id)}
                  >
                    <span className="pe-chip-icon">{rs.iconKey ? <MenuIcon name={rs.iconKey} size={15} /> : rs.icon}</span> {rs.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 연인 정보 섹션 ═══ */}
        <div className="pe-section-heading">
          <span><MenuIcon name="couple" size={16} /> 연인 정보</span>
          <span className="pe-section-heading-line" />
          {!isPartnerEnabled && <span className="pe-partner-hint">솔로 시 비활성</span>}
        </div>

        <div className={`pe-list ${!isPartnerEnabled ? 'pe-partner-disabled' : ''}`}>
          {/* 연인 생년월일 — stack */}
          <div className="pe-row pe-row--stack">
            <span className="pe-row-label">연인 생년월일</span>
            <div className="pe-row-value">
              <BirthDatePicker
                value={form.partnerBirthDate}
                onChange={(v) => handleChange('partnerBirthDate', v)}
                calendarType={form.partnerCalendarType}
                onCalendarTypeChange={isPartnerEnabled ? (v) => handleChange('partnerCalendarType', v) : undefined}
              />
            </div>
            {isPartnerEnabled && (partnerZodiac || partnerConstellation) && (
              <div className="pe-meta-row">
                {partnerZodiac && (
                  <span className="pe-meta-badge pe-meta-badge--zodiac">
                    {partnerZodiac.emoji} {partnerZodiac.name}띠
                  </span>
                )}
                {partnerConstellation && (
                  <span className="pe-meta-badge pe-meta-badge--const">
                    {partnerConstellation.emoji} {partnerConstellation.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 연인 태어난 시간 — inline */}
          <div className="pe-row">
            <span className="pe-row-label">연인 태어난 시간</span>
            <div className="pe-row-value">
              <select
                className="pe-select-inline"
                value={form.partnerBirthTime}
                onChange={e => handleChange('partnerBirthTime', e.target.value)}
                disabled={!isPartnerEnabled}
              >
                {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* 연인 혈액형 — chip row */}
          <div className="pe-row">
            <span className="pe-row-label">연인 혈액형</span>
            <div className="pe-row-value">
              <div className="pe-chips">
                {['A','B','O','AB'].map(bt => (
                  <button
                    key={bt}
                    type="button"
                    disabled={!isPartnerEnabled}
                    className={`pe-chip ${form.partnerBloodType === bt ? 'pe-chip--active' : ''}`}
                    onClick={() => handleChange('partnerBloodType', form.partnerBloodType === bt ? '' : bt)}
                  >
                    {bt}형
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 연인 MBTI — stack */}
          <div className="pe-row pe-row--stack">
            <span className="pe-row-label">연인 MBTI</span>
            <div className="pe-row-value">
              <div className="pe-mbti-grid">
                {MBTI_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    disabled={!isPartnerEnabled}
                    className={`pe-mbti-btn ${form.partnerMbtiType === t ? 'pe-mbti-btn--active' : ''}`}
                    onClick={() => handleChange('partnerMbtiType', form.partnerMbtiType === t ? '' : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pe-actions">
          {error && <div className="form-error"><MenuIcon name="alert" size={15} /> {error}</div>}
          {success && <div className="form-error" style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.2)', color: '#4ade80' }}><MenuIcon name="check" size={15} /> 저장되었습니다!</div>}

          <button className="btn-gold register-submit" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : <><MenuIcon name="check" size={16} /> 저장</>}
          </button>
          <button className="register-back-step" onClick={() => navigate('/profile')}>← 프로필로 돌아가기</button>
        </div>
      </div>
    </div>
  );
}

export default ProfileEdit;
