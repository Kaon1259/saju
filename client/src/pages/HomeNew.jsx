import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getMyFortune, checkInAttendance } from '../api/fortune';
import MenuIcon from '../components/MenuIcon';
import AttendanceCard from '../components/AttendanceCard';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import { useToast } from '../components/Toast';
import './HomeNew.css';

/* ── 결정적 해시: 같은 시드는 항상 같은 값 (0~1) ───────────────── */
function hashFloat(seed, salt) {
  let h = 2166136261;
  const s = String(seed) + '|' + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/* ── 레이더 차트 5개 항목 ──────────────────────────────────────── */
const RADAR_AXES = [
  { key: 'love',   label: '연애운',   scoreKey: 'loveScore' },
  { key: 'money',  label: '재물운',   scoreKey: 'moneyScore' },
  { key: 'social', label: '인간관계', scoreKey: null },
  { key: 'health', label: '건강운',   scoreKey: 'healthScore' },
  { key: 'work',   label: '직장운',   scoreKey: 'workScore' },
];

/* AI 분석값(loveScore 등)이 있으면 실연동, 없으면 시드 산출 폴백.
   인간관계는 AI 항목이 없어 연애·직장 점수 평균으로 산출. */
function buildRadar(seed, base, saju) {
  const real = saju?.aiAnalyzed ? saju : null;
  const clamp = (v) => Math.max(40, Math.min(98, Math.round(v)));
  const derived = (key) => clamp((base || 72) + (hashFloat(seed, key) - 0.5) * 34);
  return RADAR_AXES.map((a) => {
    let value;
    if (real && a.scoreKey && real[a.scoreKey] != null) {
      value = clamp(real[a.scoreKey]);
    } else if (a.key === 'social' && real && real.loveScore != null && real.workScore != null) {
      value = clamp((real.loveScore + real.workScore) / 2);
    } else {
      value = derived(a.key);
    }
    return { ...a, value };
  });
}

function grade(score) {
  // 분석 전(null) — 시드 점수 노출 금지, "분석 전" 상태로
  if (score == null) return { label: '분석 전', cls: 'pending' };
  if (score >= 88) return { label: '대길', cls: 'best' };
  if (score >= 72) return { label: '길',   cls: 'good' };
  if (score >= 55) return { label: '보통', cls: 'soso' };
  if (score >= 40) return { label: '주의', cls: 'warn' };
  return { label: '흉', cls: 'bad' };
}

const SCORE_DESC = {
  pending: '탭하여 오늘의 운세를 분석해 보세요',
  best: '오늘은 기운의 흐름이 아주 좋아요. 마음먹은 일을 밀어붙여 보세요.',
  good: '전반적으로 안정적인 하루예요. 연애운의 흐름도 함께 살펴보세요.',
  soso: '차분하게 흘러가는 하루. 무리하지 말고 페이스를 지키세요.',
  warn: '작은 변수에 신경 쓰면 좋은 날. 컨디션 관리에 집중하세요.',
  bad:  '잠시 숨 고르기 좋은 날. 큰 결정은 미루는 게 안전해요.',
};

/* ── 오각형 레이더 차트 (SVG) ──────────────────────────────────── */
function RadarChart({ data, size = 138 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 26;
  const n = data.length;
  const pt = (i, r) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const poly = (pts) =>
    pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' Z';
  const ring = (frac) => poly(data.map((_, i) => pt(i, R * frac)));
  const valuePath = poly(data.map((d, i) => pt(i, (R * d.value) / 100)));

  return (
    <svg className="hn-radar" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      {[0.4, 0.7, 1].map((f) => (
        <path key={f} className="hn-radar-grid" d={ring(f)} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} className="hn-radar-axis" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <path className="hn-radar-area" d={valuePath} />
      {data.map((d, i) => {
        const [x, y] = pt(i, (R * d.value) / 100);
        return <circle key={i} className="hn-radar-dot" cx={x} cy={y} r="2.6" />;
      })}
      {data.map((d, i) => {
        const [lx, ly] = pt(i, R + 15);
        return (
          <text key={i} className="hn-radar-label" x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── 섹션 카드 그리드 ── 더보기 = 인라인 펼침(메뉴 더 보여줌) ────── */
function CardSection({ title, items, onNav }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > 4;
  const shown = hasMore && !expanded ? items.slice(0, 4) : items;
  return (
    <section className="hn-section">
      <div className="hn-section-head">
        <h2 className="hn-section-title">{title}</h2>
        {hasMore && (
          <button className="hn-more" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '접기' : '더보기'}{' '}
            <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
          </button>
        )}
      </div>
      <div className="hn-grid">
        {shown.map((it) => (
          <button key={it.label} className="hn-card" onClick={() => onNav(it.path)}>
            <span className="hn-card-icon">
              <MenuIcon name={it.icon} size={28} />
            </span>
            <span className="hn-card-label">{it.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const QUICK = [
  { label: '오늘운세', icon: 'sun',          path: '/my' },
  { label: '타로',     icon: 'tarot',        path: '/tarot' },
  { label: '사주궁합', icon: 'sparkleHeart', path: '/compatibility' },
  { label: '출석체크', icon: 'attendance',   path: '/attendance' },
];

const SECTION_LOVE = [
  { label: '1:1연애',   icon: 'heart',        path: '/my-solo' },
  { label: '썸·짝사랑', icon: 'heartArrow',   path: '/my-some-crush' },
  { label: '데이트운',  icon: 'couple',       path: '/my-love-compat' },
  { label: '스타궁합',  icon: 'star',         path: '/my-star' },
  { label: '재회운',    icon: 'refresh',      path: '/again-meet' },
  { label: '사주궁합',  icon: 'sparkleHeart', path: '/compatibility' },
  { label: '스타매칭',  icon: 'people',       path: '/celeb-match' },
  { label: '그룹궁합',  icon: 'handshake',    path: '/celeb-fortune' },
];

const SECTION_SEASON = [
  { label: '신년운세', icon: 'newyear',       path: '/year-fortune' },
  { label: '월간운세', icon: 'monthly',       path: '/monthly-fortune' },
  { label: '주간운세', icon: 'weekly',        path: '/weekly-fortune' },
  { label: '토정비결', icon: 'tojeong',       path: '/tojeong' },
  { label: '오늘운세', icon: 'sun',           path: '/my' },
  { label: '띠 운세',  icon: 'zodiac',        path: '/fortune' },
  { label: '별자리',   icon: 'constellation', path: '/constellation' },
  { label: '바이오리듬', icon: 'biorhythm',   path: '/biorhythm' },
];

const SECTION_TRAD = [
  { label: '정통사주',   icon: 'traditional', path: '/traditional' },
  { label: '만세력',     icon: 'compass',     path: '/manseryeok' },
  { label: 'MBTI',       icon: 'mbti',        path: '/mbti' },
  { label: '혈액형',     icon: 'bloodtype',   path: '/bloodtype' },
  { label: '관상',       icon: 'face',        path: '/face-reading' },
  { label: '꿈해몽',     icon: 'dream',       path: '/dream' },
  { label: '심리테스트', icon: 'psych',       path: '/psych-test' },
  { label: '띠 성격',    icon: 'zodiac',      path: '/zodiac' },
];

function HomeNew() {
  const navigate = useNavigate();
  const toast = useToast();
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const isGuestUser = userName === 'Guest';

  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 (${dayNames[today.getDay()]})`;
  const ymd = `${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`;

  const [myData, setMyData] = useState(null);

  // 유저 정보 + 오늘의 운세
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [user, fortune] = await Promise.all([
          getUser(userId),
          getMyFortune(userId).catch(() => null),
        ]);
        if (cancelled) return;
        const data = { user };
        if (fortune?.saju) data.saju = fortune.saju;
        setMyData(data);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // 일일 출석 자동 체크인 (Home 과 동일 — localStorage 가드)
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);
  useEffect(() => {
    if (!userId || isGuestUser) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastKey = `attendance:lastCheck:${userId}`;
    if (localStorage.getItem(lastKey) === todayKey) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await checkInAttendance();
        if (cancelled || !result) return;
        localStorage.setItem(lastKey, todayKey);
        setAttendanceRefreshKey((k) => k + 1);
        if (!result.alreadyChecked && result.rewardAmount > 0) {
          const msg = result.milestoneCategory
            ? `🎉 ${result.consecutiveDays}일 연속 출석! +${result.rewardAmount}하트 지급`
            : `✅ 출석 완료! +${result.rewardAmount}하트 지급 (${result.consecutiveDays}일째)`;
          toast?.(msg, 'success');
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 점수 — AI 분석 완료 시에만 노출. 분석 전엔 null → '—' 로 표시 (시드 점수 → 실 점수 전환은 신뢰도 ↓)
  const seed = `${userId || 'guest'}:${ymd}`;
  const overall = useMemo(() => {
    const saju = myData?.saju;
    if (saju?.aiAnalyzed && saju?.score != null) return saju.score;
    return null;
  }, [myData, seed]);
  const radar = useMemo(() => buildRadar(seed, overall, myData?.saju), [seed, overall, myData]);
  const g = grade(overall);

  // 오늘의 행운 — AI 분석값이 있으면 실연동, 없으면 시드 산출 폴백
  const lucky = useMemo(() => {
    const COLORS = ['코랄 핑크', '아이보리', '라벤더', '민트', '소프트 옐로', '스카이 블루'];
    const DIRS = ['동쪽', '서쪽', '남쪽', '북쪽', '남동쪽', '북서쪽'];
    const real = myData?.saju?.aiAnalyzed ? myData.saju : null;
    return {
      color: real?.luckyColor || COLORS[Math.floor(hashFloat(seed, 'color') * COLORS.length)],
      number: real?.luckyNumber != null ? real.luckyNumber : 1 + Math.floor(hashFloat(seed, 'num') * 45),
      direction: real?.luckyDirection || DIRS[Math.floor(hashFloat(seed, 'place') * DIRS.length)],
    };
  }, [seed, myData]);

  const go = (path) => navigate(path);

  return (
    <div className="hn">
      {/* ── 인사말 ─────────────────────────────────────────── */}
      <header className="hn-greet">
        <p className="hn-greet-date">{dateLabel}</p>
        <h1 className="hn-greet-title">
          {userId && !isGuestUser ? (
            <>안녕하세요, <strong>{userName || '회원'}</strong>님</>
          ) : (
            <>오늘의 기운을 살펴보세요</>
          )}
        </h1>
        <p className="hn-greet-sub">오늘의 운세와 연애운, 행운의 흐름을 확인해 보세요</p>
      </header>

      {/* ── 히어로 — 총 운세 점수 + 레이더 차트 ───────────────── */}
      {userId && !isGuestUser ? (
        <section className="hn-hero" onClick={() => go('/my')}>
          <div className="hn-hero-main">
            <span className="hn-hero-label">오늘의 총 운세</span>
            <div className="hn-hero-score">
              <strong>{overall ?? '—'}</strong>
              <span className="hn-hero-out">/100</span>
              <em className={`hn-hero-grade hn-hero-grade--${g.cls}`}>{g.label}</em>
            </div>
            <p className="hn-hero-desc">{overall != null ? SCORE_DESC[g.cls] : '탭하여 오늘의 운세를 분석해 보세요'}</p>
          </div>
          <div className="hn-hero-chart">
            <RadarChart data={radar} />
          </div>
        </section>
      ) : (
        <section className="hn-hero hn-hero--guest">
          <div className="hn-hero-guest-body">
            <span className="hn-hero-label">나만의 운세 점수</span>
            <p className="hn-hero-guest-text">
              로그인하면 사주 기반 오늘의 총 운세와<br />항목별 분석 차트를 볼 수 있어요
            </p>
          </div>
          <KakaoLoginCTA returnTo="/">카카오로 시작하고 내 운세 보기</KakaoLoginCTA>
        </section>
      )}

      {/* ── 오늘의 행운 ─────────────────────────────────────── */}
      <section className="hn-lucky">
        <div className="hn-lucky-item">
          <span className="hn-lucky-key"><MenuIcon name="palette" size={16} /> 행운의 색</span>
          <span className="hn-lucky-val">{lucky.color}</span>
        </div>
        <div className="hn-lucky-sep" />
        <div className="hn-lucky-item">
          <span className="hn-lucky-key"><MenuIcon name="hash" size={16} /> 행운의 숫자</span>
          <span className="hn-lucky-val">{lucky.number}</span>
        </div>
        <div className="hn-lucky-sep" />
        <div className="hn-lucky-item">
          <span className="hn-lucky-key"><MenuIcon name="compass" size={16} /> 행운의 방향</span>
          <span className="hn-lucky-val">{lucky.direction}</span>
        </div>
      </section>

      {/* ── 퀵 액션 ─────────────────────────────────────────── */}
      <section className="hn-quick">
        {QUICK.map((q) => (
          <button key={q.label} className="hn-quick-btn" onClick={() => go(q.path)}>
            <span className="hn-quick-icon">
              <MenuIcon name={q.icon} size={25} />
            </span>
            <span className="hn-quick-label">{q.label}</span>
          </button>
        ))}
      </section>

      {/* ── 출석 카드 (로그인 시) ───────────────────────────── */}
      {userId && !isGuestUser && (
        <div className="hn-attendance">
          <AttendanceCard refreshKey={attendanceRefreshKey} />
        </div>
      )}

      {/* ── 섹션 — 연애 / 시즌 / 정통 ───────────────────────── */}
      <CardSection title="연애 운세"      items={SECTION_LOVE}   onNav={go} />
      <CardSection title="시즌 운세"      items={SECTION_SEASON} onNav={go} />
      <CardSection title="정통·종합 운세" items={SECTION_TRAD}   onNav={go} />

      <p className="hn-foot">오늘도 좋은 기운이 함께하길 바라요 ✦</p>
    </div>
  );
}

export default HomeNew;
