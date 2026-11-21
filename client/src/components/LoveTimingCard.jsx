import { useEffect, useState } from 'react';
import { getLoveTiming } from '../api/fortune';
import './LoveTimingCard.css';

/**
 * 결정 상담 상단의 무료 "월별 연애 타이밍" 요약 — 상담의 근거 자료.
 * 유리한 달을 누르면 onPick(month) 로 상담 질문(situation)에 반영한다.
 */
export default function LoveTimingCard({ onPick }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getLoveTiming().then((d) => alive && setData(d)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  if (failed || !data?.months?.length) return null; // 보조 정보라 실패 시 조용히 숨김

  const good = data.months.filter((m) => m.grade === '유리');
  const warn = data.months.filter((m) => m.grade === '주의');

  return (
    <section className="ltc">
      <div className="ltc-head">
        <span className="ltc-title fs-fixed">내 연애 타이밍 · 향후 12개월</span>
        <span className="ltc-free fs-fixed">무료</span>
      </div>
      <div className="ltc-strip" aria-hidden="true">
        {data.months.map((m) => <i key={m.ym} className={`ltc-dot ltc-dot--${m.grade}`} />)}
      </div>
      {good.length > 0 && (
        <>
          <div className="ltc-label">유리한 달 — 눌러서 상담에 반영</div>
          <div className="ltc-chips">
            {good.slice(0, 4).map((m) => (
              <button key={m.ym} type="button" className="ltc-chip" onClick={() => onPick?.(m)}>
                <b>{m.month}월</b> {m.keyword}
              </button>
            ))}
          </div>
        </>
      )}
      {warn.length > 0 && (
        <p className="ltc-warn">조심할 달: {warn.map((m) => `${m.month}월`).join(', ')} (관계가 흔들리기 쉬움)</p>
      )}
    </section>
  );
}
