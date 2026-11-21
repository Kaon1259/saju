import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoveTiming } from '../api/fortune';
import StatusView from '../components/StatusView';
import MenuIcon from '../components/MenuIcon';
import './LoveTiming.css';

const GRADE_CLASS = { 유리: 'lt-g--good', 보통: 'lt-g--mid', 주의: 'lt-g--warn' };

function LoveTiming() {
  const navigate = useNavigate();
  const loggedIn = !!localStorage.getItem('userId') && localStorage.getItem('userName') !== 'Guest';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(loggedIn);

  const load = () => {
    setLoading(true); setError('');
    getLoveTiming()
      .then((d) => setData(d))
      .catch(() => setError('연애 타이밍을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (loggedIn) load(); }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="lt-page">
        <StatusView
          variant="info" icon="lock" title="가입하면 월별 연애 타이밍을 볼 수 있어요"
          message="생년월일 기반으로 앞으로 12개월의 흐름을 계산해 드려요. 무료예요."
          action={{ label: '3초 가입하기', onClick: () => navigate('/register', { state: { from: '/love-timing' } }) }}
        />
      </div>
    );
  }
  if (loading) return <div className="lt-page"><div className="lt-loading">내 연애 타이밍을 계산하는 중…</div></div>;
  if (error || !data) {
    return (
      <div className="lt-page">
        <StatusView variant="error" title="불러오기 실패" message={error}
          action={{ label: '다시 시도', onClick: load }} />
      </div>
    );
  }

  const months = data.months || [];
  const best = data.bestIndex >= 0 ? months[data.bestIndex] : null;

  return (
    <div className="lt-page">
      <header className="lt-head">
        <p className="lt-kicker">향후 12개월</p>
        <h1 className="lt-title">내 연애 타이밍</h1>
        <p className="lt-sub">{data.dayMaster} 일간 · 배우자궁 {data.spouseBranch} · 연애 별 {data.loverStar}</p>
      </header>

      {best ? (
        <section className="lt-best">
          <span className="lt-best-tag fs-fixed">가장 유리한 달</span>
          <div className="lt-best-month">{best.month}월 <em>{best.keyword}</em></div>
          <p className="lt-best-tip">{best.tip}</p>
          <p className="lt-best-why">{(best.why || []).join(' · ')}</p>
        </section>
      ) : (
        <section className="lt-best">
          <span className="lt-best-tag fs-fixed">올해 한 줄</span>
          <p className="lt-best-tip">뚜렷하게 치고 나가는 달은 없어요. 큰 한 방보다 꾸준히 만남을 넓히는 쪽이 맞는 흐름입니다.</p>
        </section>
      )}

      <div className="lt-strip" aria-hidden="true">
        {months.map((m) => <i key={m.ym} className={`lt-dot ${GRADE_CLASS[m.grade]}`} title={`${m.month}월`} />)}
      </div>

      <ul className="lt-list">
        {months.map((m, i) => (
          <li key={m.ym} className={`lt-row ${i === data.bestIndex ? 'lt-row--best' : ''}`}>
            <div className="lt-row-top">
              <span className="lt-m fs-fixed">{m.month}월</span>
              <span className="lt-ganji fs-fixed">{m.ganji}월 · {m.sipsung}</span>
              <span className={`lt-grade fs-fixed ${GRADE_CLASS[m.grade]}`}>{m.grade}</span>
            </div>
            <div className="lt-kw">{m.keyword}</div>
            <p className="lt-tip">{m.tip}</p>
          </li>
        ))}
      </ul>

      <section className="lt-next">
        <div className="lt-next-title">이 타이밍에, 그 사람과 어떻게 할까요?</div>
        <p>재회·고백·결혼처럼 결정이 필요하다면 내 사주와 이 월운을 근거로 구체적인 시기와 행동을 짚어드려요.</p>
        <button type="button" className="lt-next-btn" onClick={() => navigate('/decision')}>
          <MenuIcon name="sparkleHeart" size={18} /><span>결정 상담 받기</span>
        </button>
      </section>

      <p className="lt-note">사주 월운은 운세의 관점이에요. 절기 기준으로 월이 바뀌며, 중요한 결정은 본인의 판단과 함께 참고하세요.</p>
    </div>
  );
}

export default LoveTiming;
