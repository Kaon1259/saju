import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, updateUser } from '../api/fortune';
import { ZODIAC_ANIMALS } from '../components/ZodiacGrid';
import './Register.css';

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
  { id: 'IN_RELATIONSHIP', label: '연애중', icon: '💕', color: '#E91E63' },
  { id: 'SOME', label: '썸타는 중', icon: '💗', color: '#FF6B6B' },
  { id: 'SINGLE', label: '화려한 솔로', icon: '✨', color: '#FFB020' },
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
    partnerBirthDate: '', partnerBirthTime: '', partnerBloodType: '', partnerMbtiType: '',
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
          partnerBloodType: user.partnerBloodType || '',
          partnerMbtiType: user.partnerMbtiType || '',
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setError(''); setSuccess(false); };

  const isPartnerEnabled = form.relationshipStatus === 'IN_RELATIONSHIP' || form.relationshipStatus === 'SOME';

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
        <h1 className="register-header__title">✏️ 프로필 수정</h1>
        <p className="register-header__subtitle">내 정보와 연애 상태를 수정할 수 있어요</p>
      </section>

      <div className="register-form glass-card" style={{ animationDelay: '100ms' }}>
        {/* 이름 */}
        <div className="form-group">
          <label className="form-label">이름</label>
          <input type="text" className="form-input" value={form.name}
            onChange={e => handleChange('name', e.target.value)} maxLength={20} />
        </div>

        {/* 달력/생년월일 */}
        <div className="form-group">
          <label className="form-label">달력</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${form.calendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`}
              onClick={() => handleChange('calendarType', 'SOLAR')}>☀️ 양력</button>
            <button type="button" className={`form-toggle__btn ${form.calendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`}
              onClick={() => handleChange('calendarType', 'LUNAR')}>🌙 음력</button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">생년월일</label>
          <input type="date" className="form-input" value={form.birthDate}
            onChange={e => handleChange('birthDate', e.target.value)} max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
        </div>

        {/* 성별 */}
        <div className="form-group">
          <label className="form-label">성별</label>
          <div className="form-toggle">
            <button type="button" className={`form-toggle__btn ${form.gender === 'M' ? 'form-toggle__btn--active' : ''}`}
              onClick={() => handleChange('gender', 'M')}>♂️ 남성</button>
            <button type="button" className={`form-toggle__btn ${form.gender === 'F' ? 'form-toggle__btn--active' : ''}`}
              onClick={() => handleChange('gender', 'F')}>♀️ 여성</button>
          </div>
        </div>

        {/* 태어난 시간 */}
        <div className="form-group">
          <label className="form-label">태어난 시간</label>
          <select className="form-input form-select" value={form.birthTime}
            onChange={e => handleChange('birthTime', e.target.value)}>
            {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* 혈액형 */}
        <div className="form-group">
          <label className="form-label">혈액형</label>
          <div className="form-toggle form-toggle--4">
            {['A','B','O','AB'].map(bt => (
              <button key={bt} type="button" className={`form-toggle__btn ${form.bloodType === bt ? 'form-toggle__btn--active' : ''}`}
                onClick={() => handleChange('bloodType', form.bloodType === bt ? '' : bt)}>{bt}형</button>
            ))}
          </div>
        </div>

        {/* MBTI */}
        <div className="form-group">
          <label className="form-label">MBTI</label>
          <div className="form-mbti-grid">
            {MBTI_TYPES.map(t => (
              <button key={t} type="button" className={`form-mbti-btn ${form.mbtiType === t ? 'form-mbti-btn--active' : ''}`}
                onClick={() => handleChange('mbtiType', form.mbtiType === t ? '' : t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* ═══ 연애 상태 ═══ */}
        <div className="form-group">
          <label className="form-label">💝 연애 상태</label>
          <div className="form-toggle" style={{ gap: '6px' }}>
            {REL_STATUS.map(rs => (
              <button key={rs.id} type="button"
                className={`form-toggle__btn ${form.relationshipStatus === rs.id ? 'form-toggle__btn--active' : ''}`}
                style={form.relationshipStatus === rs.id ? { borderColor: rs.color, background: `${rs.color}22` } : {}}
                onClick={() => handleChange('relationshipStatus', rs.id)}>
                {rs.icon} {rs.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ 상대방 정보 ═══ */}
        <div className={`pe-partner-section ${!isPartnerEnabled ? 'pe-partner--disabled' : ''}`}>
          <label className="form-label">
            {isPartnerEnabled ? '💑 상대방 정보' : '💑 상대방 정보 (솔로 시 비활성)'}
          </label>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>상대방 생년월일</label>
            <input type="date" className="form-input" value={form.partnerBirthDate}
              onChange={e => handleChange('partnerBirthDate', e.target.value)}
              disabled={!isPartnerEnabled} max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
          </div>

          {/* 상대방 띠 + 별자리 자동 표시 */}
          {isPartnerEnabled && (partnerZodiac || partnerConstellation) && (
            <div className="register-info-badges" style={{ margin: '4px 0 8px' }}>
              {partnerZodiac && <div className="register-zodiac"><span className="register-zodiac__emoji">{partnerZodiac.emoji}</span><span className="register-zodiac__text">{partnerZodiac.name}띠</span></div>}
              {partnerConstellation && <div className="register-constellation"><span className="register-constellation__emoji">{partnerConstellation.emoji}</span><span className="register-constellation__text">{partnerConstellation.name}</span></div>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>상대방 태어난 시간</label>
            <select className="form-input form-select" value={form.partnerBirthTime}
              onChange={e => handleChange('partnerBirthTime', e.target.value)} disabled={!isPartnerEnabled}>
              {BIRTH_TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>상대방 혈액형</label>
            <div className="form-toggle form-toggle--4">
              {['A','B','O','AB'].map(bt => (
                <button key={bt} type="button" disabled={!isPartnerEnabled}
                  className={`form-toggle__btn ${form.partnerBloodType === bt ? 'form-toggle__btn--active' : ''}`}
                  onClick={() => handleChange('partnerBloodType', form.partnerBloodType === bt ? '' : bt)}>{bt}형</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>상대방 MBTI</label>
            <div className="form-mbti-grid">
              {MBTI_TYPES.map(t => (
                <button key={t} type="button" disabled={!isPartnerEnabled}
                  className={`form-mbti-btn ${form.partnerMbtiType === t ? 'form-mbti-btn--active' : ''}`}
                  onClick={() => handleChange('partnerMbtiType', form.partnerMbtiType === t ? '' : t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="form-error"><span>⚠️</span> {error}</div>}
        {success && <div className="form-error" style={{ background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>✅ 저장되었습니다!</div>}

        <button className="btn-gold register-submit" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '💾 저장'}
        </button>
        <button className="register-back-step" onClick={() => navigate('/profile')}>← 프로필로 돌아가기</button>
      </div>
    </div>
  );
}

export default ProfileEdit;
