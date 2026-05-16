import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAttendanceStatus } from '../api/fortune';
import MenuIcon from './MenuIcon';
import './AttendanceCard.css';

/**
 * 홈에 표시하는 닫힌 출석 카드.
 *  - 연속 일수 + 다음 마일스톤까지 남은 일수
 *  - 7일 도트 진행도 (●●●○○○○)
 *  - "전체 보기 ›" → /attendance
 */
export default function AttendanceCard({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAttendanceStatus().then((s) => { if (!cancelled) setStatus(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  // status가 없어도 진입점은 항상 노출 (서버 미가동/배포 중에도 사용자가 카드 인지 가능)
  const consecutiveDays = status?.consecutiveDays ?? 0;
  const daysToNextMilestone = status?.daysToNextMilestone ?? 7;
  const nextMilestoneReward = status?.nextMilestoneReward ?? 15;
  const checkedToday = status?.checkedToday ?? false;
  // 7일 도트: 1~7 자리에 점, 채워진 칸 = consecutive % 7 (마지막 7배수면 7개 다 채움)
  const dotsCount = 7;
  const filled = consecutiveDays === 0 ? 0
    : (consecutiveDays % 7 === 0 ? 7 : consecutiveDays % 7);

  return (
    <button
      className="attend-card"
      onClick={() => navigate('/attendance')}
      aria-label="출석부 전체 보기"
    >
      <span className="attend-card-icon" aria-hidden="true">
        <MenuIcon name="attendance" size={24} />
      </span>
      <div className="attend-card-body">
        <div className="attend-card-meta">
          <span className="attend-card-streak">
            출석 <strong>{consecutiveDays}</strong>일째
          </span>
          <span className="attend-card-sep">·</span>
          <span className="attend-card-next">
            {checkedToday ? '오늘 완료' : '오늘 보상 대기'}
          </span>
          {daysToNextMilestone > 0 && (
            <>
              <span className="attend-card-sep">·</span>
              <span className="attend-card-next-milestone">
                {daysToNextMilestone}일 후 +{nextMilestoneReward}
              </span>
            </>
          )}
        </div>
        <div className="attend-card-dots" aria-hidden="true">
          {Array.from({ length: dotsCount }).map((_, i) => (
            <span
              key={i}
              className={`attend-dot ${i < filled ? 'attend-dot--filled' : ''} ${i + 1 === filled ? 'attend-dot--latest' : ''}`}
            />
          ))}
        </div>
      </div>
      <span className="attend-card-arrow">›</span>
    </button>
  );
}
