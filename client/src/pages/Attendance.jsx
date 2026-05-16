import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAttendanceStatus, getAttendanceHistory, checkInAttendance } from '../api/fortune';
import { useToast } from '../components/Toast';
import './Attendance.css';

const MILESTONES = [
  { day: 7,  reward: 15, label: '7일 연속' },
  { day: 14, reward: 30, label: '14일 연속' },
  { day: 30, reward: 60, label: '30일 연속' },
];

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Attendance() {
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getAttendanceStatus(), getAttendanceHistory(30)])
      .then(([s, h]) => {
        if (cancelled) return;
        setStatus(s);
        setHistory(Array.isArray(h) ? h : []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const attendedSet = useMemo(() => new Set(history.map(h => h.date)), [history]);

  // 최근 30일 캘린더 — 오늘 포함 30일
  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      arr.push({
        date: formatDate(d),
        dayOfMonth: d.getDate(),
        dayOfWeek: d.getDay(),
        isToday: i === 0,
      });
    }
    return arr;
  }, []);

  const handleCheckIn = async () => {
    if (!status || status.checkedToday) return;
    try {
      const result = await checkInAttendance();
      if (!result) {
        toast?.error?.('로그인이 필요합니다.');
        navigate('/register');
        return;
      }
      if (result.alreadyChecked) {
        toast?.info?.('오늘은 이미 출석 보상을 받으셨습니다.');
      } else {
        const message = result.milestoneCategory
          ? `🎉 ${result.consecutiveDays}일 연속 출석! +${result.rewardAmount}하트`
          : `✅ +${result.rewardAmount}하트 지급 (${result.consecutiveDays}일째)`;
        toast?.success?.(message);
      }
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error(e);
      toast?.error?.('출석 보상 지급에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="attend-page">
        <header className="attend-page-header">
          <button className="attend-back" onClick={() => navigate(-1)}>‹</button>
          <h1 className="attend-page-title">📆 출석부</h1>
          <span className="attend-back attend-back--ghost" />
        </header>
        <div className="attend-loading">불러오는 중...</div>
      </div>
    );
  }

  // status null 이어도 페이지는 그릴 수 있도록 fallback (서버 미가동/마이그레이션 중 대비)
  const safeStatus = status || {
    consecutiveDays: 0,
    checkedToday: false,
    daysToNextMilestone: 7,
    nextMilestoneReward: 15,
    balanceAfter: null,
  };
  const { consecutiveDays, checkedToday, daysToNextMilestone, nextMilestoneReward, balanceAfter } = safeStatus;

  return (
    <div className="attend-page">
      <header className="attend-page-header">
        <button className="attend-back" onClick={() => navigate(-1)}>‹</button>
        <h1 className="attend-page-title">📆 출석부</h1>
        <span className="attend-back attend-back--ghost" />
      </header>

      {/* 1. 오늘 보상 + CTA */}
      <section className="attend-hero glass-card">
        <div className="attend-hero-streak">
          <span className="attend-hero-streak-num">{consecutiveDays}</span>
          <span className="attend-hero-streak-suf">일 연속 출석 중</span>
        </div>
        {!checkedToday ? (
          <button className="attend-hero-cta" onClick={handleCheckIn}>
            🎁 오늘의 출석 보상 받기 (+3)
          </button>
        ) : (
          <div className="attend-hero-done">
            ✅ 오늘 출석 완료
            {daysToNextMilestone > 0 && (
              <span className="attend-hero-next">
                · {daysToNextMilestone}일 후 +{nextMilestoneReward}하트
              </span>
            )}
          </div>
        )}
        {balanceAfter != null && (
          <div className="attend-hero-balance">현재 보유: ❤ {balanceAfter} 하트</div>
        )}
      </section>

      {/* 2. 마일스톤 진행도 */}
      <section className="attend-section">
        <h2 className="attend-section-title">⭐ 마일스톤</h2>
        <div className="attend-milestones">
          {MILESTONES.map((ms) => {
            const reached = consecutiveDays >= ms.day;
            const pct = Math.min(100, (consecutiveDays / ms.day) * 100);
            return (
              <div key={ms.day} className={`attend-ms ${reached ? 'attend-ms--done' : ''}`}>
                <div className="attend-ms-head">
                  <span className="attend-ms-label">{ms.label}</span>
                  <span className="attend-ms-reward">+{ms.reward}하트</span>
                </div>
                <div className="attend-ms-bar">
                  <div className="attend-ms-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="attend-ms-status">
                  {reached
                    ? '✓ 달성'
                    : `${ms.day - consecutiveDays}일 남음`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 30일 캘린더 */}
      <section className="attend-section">
        <h2 className="attend-section-title">📅 최근 30일</h2>
        <div className="attend-cal">
          {days.map((d) => {
            const attended = attendedSet.has(d.date);
            return (
              <div
                key={d.date}
                className={`attend-cal-cell ${attended ? 'attend-cal-cell--attended' : ''} ${d.isToday ? 'attend-cal-cell--today' : ''}`}
                title={d.date}
              >
                <span className="attend-cal-day">{d.dayOfMonth}</span>
                {attended && <span className="attend-cal-mark">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="attend-cal-legend">
          <span className="attend-cal-legend-item">
            <span className="attend-cal-cell attend-cal-cell--attended attend-cal-cell--demo" />
            출석한 날
          </span>
          <span className="attend-cal-legend-item">
            <span className="attend-cal-cell attend-cal-cell--today attend-cal-cell--demo" />
            오늘
          </span>
        </div>
      </section>

      {/* 4. 보상 안내 */}
      <section className="attend-section attend-tips">
        <h2 className="attend-section-title">💡 출석 보상 안내</h2>
        <ul className="attend-tip-list">
          <li>매일 첫 로그인 시 <strong>+3하트</strong> 자동 지급</li>
          <li>7일 연속 출석마다 <strong>+15하트</strong> 추가</li>
          <li>14일 연속 1회 <strong>+30하트</strong> 보너스</li>
          <li>30일 연속 1회 <strong>+60하트</strong> 보너스</li>
          <li>하루라도 빠지면 1일부터 다시 시작합니다</li>
        </ul>
      </section>
    </div>
  );
}
