import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getDailyFortunes, deductHearts, deleteUser } from '../api/fortune';
import { clearAuth } from '../utils/auth';
import HeartCost from '../components/HeartCost';
import { ZODIAC_ANIMALS } from '../components/ZodiacGrid';
import ConstellationMap from '../components/ConstellationMap';
import './Profile.css';

// 별자리 데이터
const CONSTELLATIONS = [
  { name: '물병자리', icon: '♒', emoji: '🏺', dates: '1/20~2/18', color: '#60A5FA', element: '공기' },
  { name: '물고기자리', icon: '♓', emoji: '🐟', dates: '2/19~3/20', color: '#A78BFA', element: '물' },
  { name: '양자리', icon: '♈', emoji: '🐏', dates: '3/21~4/19', color: '#EF4444', element: '불' },
  { name: '황소자리', icon: '♉', emoji: '🐂', dates: '4/20~5/20', color: '#10B981', element: '흙' },
  { name: '쌍둥이자리', icon: '♊', emoji: '👯', dates: '5/21~6/21', color: '#FBBF24', element: '공기' },
  { name: '게자리', icon: '♋', emoji: '🦀', dates: '6/22~7/22', color: '#F472B6', element: '물' },
  { name: '사자자리', icon: '♌', emoji: '🦁', dates: '7/23~8/22', color: '#F59E0B', element: '불' },
  { name: '처녀자리', icon: '♍', emoji: '👸', dates: '8/23~9/22', color: '#8B5CF6', element: '흙' },
  { name: '천칭자리', icon: '♎', emoji: '⚖️', dates: '9/23~10/22', color: '#EC4899', element: '공기' },
  { name: '전갈자리', icon: '♏', emoji: '🦂', dates: '10/23~11/21', color: '#DC2626', element: '물' },
  { name: '사수자리', icon: '♐', emoji: '🏹', dates: '11/22~12/21', color: '#7C3AED', element: '불' },
  { name: '염소자리', icon: '♑', emoji: '🐐', dates: '12/22~1/19', color: '#6366F1', element: '흙' },
];

function getConstellation(birthDate) {
  if (!birthDate) return null;
  const parts = birthDate.split('-');
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  const md = month * 100 + day;
  if (md >= 120 && md <= 218) return CONSTELLATIONS[0];
  if (md >= 219 && md <= 320) return CONSTELLATIONS[1];
  if (md >= 321 && md <= 419) return CONSTELLATIONS[2];
  if (md >= 420 && md <= 520) return CONSTELLATIONS[3];
  if (md >= 521 && md <= 621) return CONSTELLATIONS[4];
  if (md >= 622 && md <= 722) return CONSTELLATIONS[5];
  if (md >= 723 && md <= 822) return CONSTELLATIONS[6];
  if (md >= 823 && md <= 922) return CONSTELLATIONS[7];
  if (md >= 923 && md <= 1022) return CONSTELLATIONS[8];
  if (md >= 1023 && md <= 1121) return CONSTELLATIONS[9];
  if (md >= 1122 && md <= 1221) return CONSTELLATIONS[10];
  return CONSTELLATIONS[11];
}

function getZodiacFromYear(year) {
  if (!year || year < 1900) return null;
  const index = (year - 4) % 12;
  return ZODIAC_ANIMALS[index < 0 ? index + 12 : index] || null;
}

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyFortunes, setDailyFortunes] = useState(null);
  const [showAllDaily, setShowAllDaily] = useState(false);
  const [dailyUnlocking, setDailyUnlocking] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) { navigate('/register', { state: { from: '/profile' } }); return; }
    getUser(userId).then((u) => {
      setUser(u);
      if (u.birthDate) {
        // 음력 사용자는 반드시 calendarType 전달 — 안 그러면 서버가 양력으로 잘못 해석
        getDailyFortunes(u.birthDate, u.calendarType || 'SOLAR').then(setDailyFortunes).catch(() => {});
      }
    }).catch(() => {
      clearAuth();
      navigate('/register', { state: { from: '/profile' } });
    }).finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="profile-page"><div className="profile-loading"><div className="pf-spinner" /><p>불러오는 중...</p></div></div>;
  if (!user) return null;

  const birthYear = user.birthDate ? parseInt(user.birthDate.split('-')[0]) : null;
  const zodiac = user.zodiacAnimal ? ZODIAC_ANIMALS.find(z => z.name === user.zodiacAnimal) : getZodiacFromYear(birthYear);
  const constellation = getConstellation(user.birthDate);

  const formatDate = (d) => {
    if (!d) return '-';
    const p = d.split('-');
    return `${p[0]}년 ${parseInt(p[1])}월 ${parseInt(p[2])}일`;
  };

  return (
    <div className="profile-page">
      {/* 별자리 비주얼 헤더 */}
      <section className="pf-constellation-hero" style={{ '--c-color': constellation?.color || '#7C3AED' }}>
        <div className="pf-stars-bg">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="pf-star" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`, fontSize: `${Math.random() * 3 + 1}px`,
            }}>✦</span>
          ))}
        </div>
        <ConstellationMap name={constellation?.name} color={constellation?.color} size={180} />
        <h2 className="pf-constellation-name">{constellation?.name}</h2>
        <p className="pf-constellation-dates">{constellation?.icon} {constellation?.dates} · {constellation?.element} 원소</p>
        <h1 className="pf-user-name">{user.name}</h1>
      </section>

      {/* 뱃지 */}
      <div className="pf-badges">
        {zodiac && <span className="pf-badge pf-badge--zodiac">{zodiac.name}띠</span>}
        {constellation && <span className="pf-badge pf-badge--const" style={{ borderColor: constellation.color, color: constellation.color }}>{constellation.icon} {constellation.name}</span>}
        {user.bloodType && <span className="pf-badge pf-badge--bt">{user.bloodType}형</span>}
        {user.mbtiType && <span className="pf-badge pf-badge--mbti">{user.mbtiType}</span>}
      </div>

      {/* 정보 카드 */}
      <section className="pf-info glass-card">
        <div className="pf-info-row">
          <span className="pf-info-label">📅 생년월일</span>
          <span className="pf-info-value">{formatDate(user.birthDate)} <span className="pf-info-tag">{user.calendarType === 'LUNAR' ? '음력' : '양력'}</span></span>
        </div>
        <div className="pf-info-divider" />
        <div className="pf-info-row">
          <span className="pf-info-label">{user.gender === 'M' ? <span className="g-circle g-male">♂</span> : <span className="g-circle g-female">♀</span>} 성별</span>
          <span className="pf-info-value">{user.gender === 'M' ? '남성' : '여성'}</span>
        </div>
        {user.birthTime && (<>
          <div className="pf-info-divider" />
          <div className="pf-info-row">
            <span className="pf-info-label">🕐 태어난 시간</span>
            <span className="pf-info-value">{user.birthTime}</span>
          </div>
        </>)}
        {user.bloodType && (<>
          <div className="pf-info-divider" />
          <div className="pf-info-row">
            <span className="pf-info-label">🩸 혈액형</span>
            <span className="pf-info-value">{user.bloodType}형</span>
          </div>
        </>)}
        {user.mbtiType && (<>
          <div className="pf-info-divider" />
          <div className="pf-info-row">
            <span className="pf-info-label">🧬 MBTI</span>
            <span className="pf-info-value">{user.mbtiType}</span>
          </div>
        </>)}
        <div className="pf-info-divider" />
        <div className="pf-info-row">
          <span className="pf-info-label">💕 연애 상태</span>
          <span className="pf-info-value">
            {user.relationshipStatus === 'IN_RELATIONSHIP' ? '💕 연애중' :
             user.relationshipStatus === 'SOME' ? '💗 썸' :
             user.relationshipStatus === 'COMPLICATED' ? '💔 복잡' : '💫 솔로'}
          </span>
        </div>
      </section>

      {/* 나의 연인 */}
      {user.partnerBirthDate && (
        <section className="pf-partner glass-card">
          <h3 className="profile-section-title">💕 나의 연인</h3>
          <div className="pf-partner-info">
            <div className="pf-partner-row">
              <span className="pf-partner-label">생년월일</span>
              <span className="pf-partner-value">
                {user.partnerCalendarType === 'LUNAR' ? '🌙 음력' : '☀️ 양력'} {formatDate(user.partnerBirthDate)}
              </span>
            </div>
            {(() => {
              const pYear = parseInt(user.partnerBirthDate.split('-')[0]);
              const pZodiac = getZodiacFromYear(pYear);
              const pConst = getConstellation(user.partnerBirthDate);
              return (
                <div className="pf-partner-tags">
                  {pZodiac && <span className="pf-badge pf-badge--zodiac">{pZodiac.name}띠</span>}
                  {pConst && <span className="pf-badge pf-badge--const" style={{ borderColor: pConst.color, color: pConst.color }}>{pConst.icon} {pConst.name}</span>}
                </div>
              );
            })()}
          </div>
          <button className="pf-partner-compat-btn" onClick={() => navigate('/compatibility')}>
            💑 궁합 분석하러 가기
          </button>
        </section>
      )}

      {/* 이번 달 일운 */}
      {dailyFortunes && (
        <section className="profile-daily glass-card">
          <h3 className="profile-section-title">
            📆 {new Date().getMonth() + 1}월 일운
            {user?.birthDate && (
              <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {user.calendarType === 'LUNAR' ? '음력' : '양력'} {user.birthDate} 기준
              </span>
            )}
          </h3>
          <div className="profile-daily-list">
            {(showAllDaily ? dailyFortunes : dailyFortunes.slice(0, 3)).map((day) => {
              // 서버가 정밀 점수를 직접 반환 (없으면 등급 기반 폴백 — 서버 등급은 대길/길/보통/흉/대흉)
              const score = typeof day.score === 'number' ? day.score
                          : day.rating === '대길' ? 95 : day.rating === '길' ? 78 : day.rating === '보통' ? 55 : day.rating === '흉' ? 38 : 25;
              const scoreColor = score >= 80 ? '#ff3d7f' : score >= 65 ? '#fbbf24' : score >= 45 ? '#94a3b8' : '#64748b';
              const ratingCls = day.rating === '대길' ? 'rate-best'
                              : day.rating === '길' ? 'rate-good'
                              : day.rating === '보통' ? 'rate-normal'
                              : 'rate-bad';
              return (
              <div key={day.date} className={`profile-daily-item ${day.isToday ? 'profile-daily--today' : ''}`}>
                <span className="profile-daily-date">{new Date(day.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}</span>
                <span className="profile-daily-pillar">{day.dayPillar}</span>
                <span className="profile-daily-sipsung">{day.sipsung}</span>
                <span className="profile-daily-score" style={{ color: scoreColor }}>{score}점</span>
                <span className={`profile-daily-rating ${ratingCls}`}>{day.rating}</span>
                {day.isToday && <span className="profile-daily-now">오늘</span>}
              </div>
              );
            })}
          </div>
          {!showAllDaily && dailyFortunes.length > 3 && (
            <button className="profile-daily-more-btn" disabled={dailyUnlocking} onClick={async () => {
              const userId = localStorage.getItem('userId');
              if (!userId) return;
              setDailyUnlocking(true);
              try {
                await deductHearts(userId, 'DAILY_FORTUNE_EXTRA');
                setShowAllDaily(true);
                window.dispatchEvent(new CustomEvent('heart:refresh'));
              } catch {
                alert('하트가 부족합니다. 충전 후 다시 시도해주세요.');
              }
              setDailyUnlocking(false);
            }}>
              {dailyUnlocking ? '처리 중...' : <>🔓 일운 더보기 ({dailyFortunes.length - 3}일) <HeartCost category="DAILY_FORTUNE_EXTRA" /></>}
            </button>
          )}
        </section>
      )}

      {/* 설정 바로가기 */}
      <section className="pf-actions" style={{ marginBottom: 0 }}>
        <button className="pf-btn pf-btn--secondary" onClick={() => navigate('/settings')}>
          ⚙️ 설정
        </button>
      </section>

      {/* 액션 */}
      <section className="pf-actions">
        <button className="pf-btn pf-btn--primary" onClick={() => navigate('/my')}>
          🔮 나의 통합 운세 보기
        </button>
        <button className="pf-btn pf-btn--primary" style={{ background: 'linear-gradient(135deg, #E91E63, #FF6B6B)' }} onClick={() => navigate('/profile/edit')}>
          ✏️ 프로필 수정
        </button>
        <button className="pf-btn pf-btn--logout" onClick={() => {
          clearAuth();
          localStorage.setItem('autoLogin', 'off');
          navigate('/register');
        }}>
          🚪 로그아웃
        </button>
        <button
          className="pf-btn pf-btn--logout"
          style={{ marginTop: 8, color: '#999', fontSize: '0.85rem' }}
          onClick={async () => {
            const ok = window.confirm(
              '정말 회원 탈퇴하시겠습니까?\n\n' +
              '- 모든 운세 히스토리, 하트, 프로필 정보가 영구 삭제됩니다.\n' +
              '- 잔여 하트는 복구되지 않습니다.\n' +
              '- 같은 카카오 계정으로 재가입은 가능하지만 기존 데이터는 복구되지 않습니다.'
            );
            if (!ok) return;
            const ok2 = window.confirm('탈퇴 후 복구가 불가능합니다. 정말 진행하시겠습니까?');
            if (!ok2) return;
            try {
              const uid = localStorage.getItem('userId');
              await deleteUser(uid);
              alert('탈퇴가 완료되었습니다.');
              clearAuth();
              localStorage.setItem('autoLogin', 'off');
              navigate('/register', { replace: true });
            } catch (e) {
              alert('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
          }}>
          회원 탈퇴
        </button>
      </section>
    </div>
  );
}

export default Profile;
