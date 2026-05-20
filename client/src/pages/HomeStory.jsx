import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getMyFortune, checkInAttendance } from '../api/fortune';
import MenuIcon from '../components/MenuIcon';
import AttendanceCard from '../components/AttendanceCard';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import { useToast } from '../components/Toast';
import './HomeStory.css';

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

/* ── 오늘의 다섯 빛 (운세 5항목) ──────────────────────────────── */
const LIGHTS = [
  { key: 'love',   label: '사랑', icon: 'heart',  scoreKey: 'loveScore' },
  { key: 'money',  label: '재물', icon: 'money',  scoreKey: 'moneyScore' },
  { key: 'social', label: '인연', icon: 'people', scoreKey: null },
  { key: 'health', label: '건강', icon: 'clover', scoreKey: 'healthScore' },
  { key: 'work',   label: '하루', icon: 'work',   scoreKey: 'workScore' },
];

/* AI 분석값(loveScore 등)이 있으면 실연동, 없으면 시드 산출 폴백.
   인연은 AI 항목이 없어 연애·직장 점수 평균으로 산출. */
function buildLights(seed, base, saju) {
  const real = saju?.aiAnalyzed ? saju : null;
  const clamp = (v) => Math.max(40, Math.min(98, Math.round(v)));
  const derived = (key) => clamp((base || 72) + (hashFloat(seed, key) - 0.5) * 34);
  return LIGHTS.map((a) => {
    let value;
    if (real && a.scoreKey && real[a.scoreKey] != null) {
      value = clamp(real[a.scoreKey]);
    } else if (a.key === 'social' && real && real.loveScore != null && real.workScore != null) {
      value = clamp((real.loveScore + real.workScore) / 2);
    } else {
      value = derived(a.key);
    }
    return { ...a, value, stars: Math.max(1, Math.min(5, Math.round(value / 20))) };
  });
}

function grade(score) {
  if (score == null) return { label: '분석 전', cls: 'pending' };
  if (score >= 88) return { label: '대길', cls: 'best' };
  if (score >= 72) return { label: '길',   cls: 'good' };
  if (score >= 55) return { label: '보통', cls: 'soso' };
  if (score >= 40) return { label: '주의', cls: 'warn' };
  return { label: '흉', cls: 'bad' };
}

/* 동화풍 시적 한 줄 — 등급별 ─────────────────────────────────── */
const STORY_DESC = {
  pending: '오늘의 운세 페이지를 펼치면 별빛이 깨어나요.',
  best: '별빛이 가장 환하게 비추는 날이에요. 마음 가는 길로 한 걸음 내디뎌 보세요.',
  good: '잔잔하고 따뜻한 하루가 펼쳐져요. 곁에 있는 인연을 살며시 들여다보세요.',
  soso: '구름이 천천히 흐르는 하루예요. 서두르지 않아도 괜찮아요.',
  warn: '작은 바람이 스치는 날이에요. 마음을 포근하게 감싸 두세요.',
  bad:  '오늘은 잠시 쉬어 가는 페이지. 큰 결정은 다음 장으로 미뤄 두어요.',
};

/* ── 퀵 — 오늘 펼쳐볼 페이지 ──────────────────────────────────── */
const QUICK = [
  { label: '오늘운세', icon: 'sun',          path: '/my' },
  { label: '타로',     icon: 'tarot',        path: '/tarot' },
  { label: '사주궁합', icon: 'sparkleHeart', path: '/compatibility' },
  { label: '출석체크', icon: 'attendance',   path: '/attendance' },
];

/* ── 챕터별 일러스트 패널 ─────────────────────────────────────── */
const CHAPTERS = [
  {
    no: '제1장', title: '사랑 이야기', tint: 'rose',
    items: [
      { label: '1:1연애',   sub: '둘만의 인연',   icon: 'heart',        path: '/my-solo' },
      { label: '썸·짝사랑', sub: '설레는 마음',   icon: 'heartArrow',   path: '/my-some-crush' },
      { label: '데이트운',  sub: '함께한 하루',   icon: 'couple',       path: '/my-love-compat' },
      { label: '스타궁합',  sub: '별과 나',       icon: 'star',         path: '/my-star' },
      { label: '재회운',    sub: '다시 만날까',   icon: 'refresh',      path: '/again-meet' },
      { label: '사주궁합',  sub: '우리 둘',       icon: 'sparkleHeart', path: '/compatibility' },
      { label: '스타매칭',  sub: '최애와 나',     icon: 'people',       path: '/celeb-match' },
      { label: '그룹궁합',  sub: '여럿의 인연',   icon: 'handshake',    path: '/celeb-fortune' },
    ],
  },
  {
    no: '제2장', title: '계절 이야기', tint: 'peach',
    items: [
      { label: '신년운세', sub: '새해 첫 장',     icon: 'newyear',       path: '/year-fortune' },
      { label: '월간운세', sub: '이번 달 이야기', icon: 'monthly',       path: '/monthly-fortune' },
      { label: '주간운세', sub: '한 주의 흐름',   icon: 'weekly',        path: '/weekly-fortune' },
      { label: '토정비결', sub: '올해의 길',      icon: 'tojeong',       path: '/tojeong' },
      { label: '오늘운세', sub: '오늘의 한 장',   icon: 'sun',           path: '/my' },
      { label: '띠 운세',  sub: '열두 띠의 운',   icon: 'zodiac',        path: '/fortune' },
      { label: '별자리',   sub: '하늘의 별',      icon: 'constellation', path: '/constellation' },
      { label: '바이오리듬', sub: '몸과 마음',    icon: 'biorhythm',     path: '/biorhythm' },
    ],
  },
  {
    no: '제3장', title: '운명 이야기', tint: 'lilac',
    items: [
      { label: '정통사주',   sub: '타고난 기운',   icon: 'traditional', path: '/traditional' },
      { label: '만세력',     sub: '운명의 책력',   icon: 'compass',     path: '/manseryeok' },
      { label: 'MBTI',       sub: '나라는 사람',   icon: 'mbti',        path: '/mbti' },
      { label: '혈액형',     sub: '피가 그린',     icon: 'bloodtype',   path: '/bloodtype' },
      { label: '관상',       sub: '얼굴의 운',     icon: 'face',        path: '/face-reading' },
      { label: '꿈해몽',     sub: '꿈의 의미',     icon: 'dream',       path: '/dream' },
      { label: '심리테스트', sub: '마음 들여다보기', icon: 'psych',     path: '/psych-test' },
      { label: '띠 성격',    sub: '띠가 말하는',   icon: 'zodiac',      path: '/zodiac' },
    ],
  },
];

/* ── 모서리 장식 4개 ──────────────────────────────────────────── */
function Corners() {
  return (
    <>
      <span className="hs-corner hs-corner--tl" aria-hidden="true">✦</span>
      <span className="hs-corner hs-corner--tr" aria-hidden="true">✦</span>
      <span className="hs-corner hs-corner--bl" aria-hidden="true">✦</span>
      <span className="hs-corner hs-corner--br" aria-hidden="true">✦</span>
    </>
  );
}

/* ── 크레파스 손그림 히어로 일러스트 (SVG + roughen 필터) ────── */
const HERO_STARS = [
  [30, 30, 1], [70, 74, 0.8], [106, 26, 1.05], [148, 58, 0.82], [34, 112, 0.78],
  [178, 98, 0.9], [214, 40, 0.95], [122, 126, 0.7], [86, 150, 0.72], [198, 132, 0.78],
];
const STAR_D = 'M0,-4 L1.1,-1.1 L4,0 L1.1,1.1 L0,4 L-1.1,1.1 L-4,0 L-1.1,-1.1 Z';

/* 동화 나무 — 둥근 잎 + 줄기 */
function Tree({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect className="hs-art-trunk" x="-3.6" y="-15" width="7.2" height="17" rx="2.6" />
      <circle className="hs-art-leaf" cx="0" cy="-29" r="15" />
      <circle className="hs-art-leaf" cx="-10" cy="-19" r="11" />
      <circle className="hs-art-leaf" cx="10" cy="-19" r="11" />
    </g>
  );
}

/* 동화 꽃 — 줄기 + 다섯 꽃잎 */
function Flower({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line className="hs-art-stem" x1="0" y1="0" x2="0" y2="-10" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          className="hs-art-petal"
          cx={(Math.cos((i / 5) * 6.2832) * 3.6).toFixed(2)}
          cy={(-13 + Math.sin((i / 5) * 6.2832) * 3.6).toFixed(2)}
          r="2.7"
        />
      ))}
      <circle className="hs-art-core" cx="0" cy="-13" r="2.1" />
    </g>
  );
}

/* 히어로 풍경 일러스트 */
function HeroArt({ overall, gradeCls, loggedIn }) {
  return (
    <svg className="hs-art" viewBox="0 0 360 236" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="hs-rough" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="8" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="hs-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id="hs-moonfill" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="58%" stopColor="#fff0d5" />
          <stop offset="100%" stopColor="#ffe1bb" />
        </radialGradient>
      </defs>

      {/* 달무리 글로우 */}
      <circle className="hs-art-glow" cx="284" cy="62" r="53" filter="url(#hs-soft)" />

      {/* 크레파스 손그림 — roughen 필터로 윤곽선 울렁임 */}
      <g filter="url(#hs-rough)">
        <ellipse className="hs-art-cloud" cx="74" cy="42" rx="32" ry="12" />
        <ellipse className="hs-art-cloud" cx="182" cy="28" rx="21" ry="9" />

        <path className="hs-art-hill3" d="M-12,148 C70,126 132,158 200,144 C268,131 322,154 372,142 L372,236 L-12,236 Z" />
        <Tree x={146} y={166} s={0.78} />
        <Tree x={308} y={156} s={0.62} />

        <path className="hs-art-hill2" d="M-12,176 C84,154 152,188 232,172 C300,158 344,180 372,170 L372,236 L-12,236 Z" />
        <Tree x={214} y={196} s={0.92} />

        <path className="hs-art-hill1" d="M-12,202 C70,186 142,212 214,198 C284,187 332,209 372,198 L372,236 L-12,236 Z" />
        <Tree x={66} y={220} s={1.2} />
        <Tree x={322} y={216} s={0.72} />
        <Flower x={116} y={210} />
        <Flower x={150} y={214} />
        <Flower x={258} y={208} />

        <circle className="hs-art-ring" cx="284" cy="62" r="47" />
        <circle className="hs-art-moon" cx="284" cy="62" r="42" fill="url(#hs-moonfill)" />
      </g>

      {/* 별 — 잔잔한 반짝임 */}
      <g className="hs-art-stars">
        {HERO_STARS.map((p, i) => (
          <path
            key={i}
            className="hs-art-star"
            style={{ animationDelay: `${(i * 0.4) % 3}s` }}
            transform={`translate(${p[0]} ${p[1]}) scale(${p[2]})`}
            d={STAR_D}
          />
        ))}
      </g>

      {/* 점수 — 또렷하게 (필터 밖). null(분석 전)이면 '—' 표시 (시드 점수 노출 금지). */}
      <text className={`hs-art-score hs-art-score--${gradeCls}`} x="284" y="72" textAnchor="middle">
        {loggedIn ? (overall ?? '—') : '?'}
      </text>
      <text className="hs-art-scorecap" x="284" y="86" textAnchor="middle">오늘의 운세</text>
    </svg>
  );
}

/* ── 챕터 한 페이지 (장식 액자 + 2열 일러스트 패널) ──────────────
   더보기 = 인라인 펼침(메뉴 더 보여줌) */
function StoryPage({ no, title, tint, items, onNav }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > 4;
  const shown = hasMore && !expanded ? items.slice(0, 4) : items;
  return (
    <section className="hs-page" data-tint={tint}>
      <div className="hs-page-frame">
        <Corners />
        <div className="hs-page-head">
          <span className="hs-page-no">{no}</span>
          <h2 className="hs-page-title">{title}</h2>
          {hasMore && (
            <button className="hs-page-more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '접기' : '더보기'}{' '}
              <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
            </button>
          )}
        </div>
        <div className="hs-panels">
          {shown.map((it) => (
            <button key={it.label} className="hs-panel" onClick={() => onNav(it.path)}>
              <span className="hs-panel-icon">
                <MenuIcon name={it.icon} size={24} />
              </span>
              <span className="hs-panel-text">
                <span className="hs-panel-label">{it.label}</span>
                <span className="hs-panel-sub">{it.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeStory() {
  const navigate = useNavigate();
  const toast = useToast();
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  const isGuestUser = userName === 'Guest';

  const today = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${dayNames[today.getDay()]}요일`;
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

  // 점수 — AI 분석 완료 시에만 노출. 분석 전엔 null → '—' (시드 점수 → 실 점수 전환은 신뢰도 ↓)
  const seed = `${userId || 'guest'}:${ymd}`;
  const overall = useMemo(() => {
    const saju = myData?.saju;
    if (saju?.aiAnalyzed && saju?.score != null) return saju.score;
    return null;
  }, [myData, seed]);
  const lights = useMemo(() => buildLights(seed, overall, myData?.saju), [seed, overall, myData]);
  const g = grade(overall);
  const loggedIn = userId && !isGuestUser;

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
    <div className="hs">
      {/* 거친 그레인(노이즈) 텍스처 — 페이지 전체 */}
      <div className="hs-grain" aria-hidden="true" />

      {/* ── 챕터 표지 인사말 ──────────────────────────────────── */}
      <header className="hs-cover">
        <span className="hs-cover-chapter">
          <span className="hs-cover-orn" aria-hidden="true">✦</span>
          오늘의 이야기
          <span className="hs-cover-orn" aria-hidden="true">✦</span>
        </span>
        <p className="hs-cover-date">{dateLabel}</p>
        <h1 className="hs-cover-title">
          {loggedIn ? (
            <><strong>{userName || '회원'}</strong>님, 오늘은 어떤 하루일까요</>
          ) : (
            <>오늘의 이야기를 펼쳐 보세요</>
          )}
        </h1>
        <span className="hs-cover-rule" aria-hidden="true" />
      </header>

      {/* ── 히어로 — 동화 풍경 삽화 + 종이 쪽지 ───────────────── */}
      <section className="hs-hero">
        <div
          className={`hs-scene ${loggedIn ? '' : 'hs-scene--guest'}`}
          onClick={loggedIn ? () => go('/my') : undefined}
        >
          <HeroArt overall={overall} gradeCls={g.cls} loggedIn={loggedIn} />
          {/* 장면 위 거친 그레인 — 크레파스 왁스 질감 */}
          <div className="hs-scene-grain" aria-hidden="true" />
        </div>

        {/* 종이 쪽지 — 오늘의 이야기 한 줄 */}
        <div className="hs-note">
          <span className="hs-note-pin" aria-hidden="true" />
          {loggedIn ? (
            <>
              <span className="hs-note-cap">
                오늘의 총 운세 · <em className={`hs-note-grade hs-note-grade--${g.cls}`}>{g.label}</em>
              </span>
              <p className="hs-note-line">{STORY_DESC[g.cls]}</p>
              <button className="hs-note-link" onClick={() => go('/my')}>
                오늘의 운세 펼쳐보기 <span aria-hidden="true">›</span>
              </button>
            </>
          ) : (
            <>
              <span className="hs-note-cap">나만의 이야기</span>
              <p className="hs-note-line">
                로그인하면 사주로 풀어낸 오늘의 운세와<br />
                다섯 가지 빛을 이야기로 들려드려요.
              </p>
              <KakaoLoginCTA returnTo="/">카카오로 시작하고 내 이야기 보기</KakaoLoginCTA>
            </>
          )}
        </div>
      </section>

      {/* ── 오늘의 다섯 빛 — 매달린 별빛 ──────────────────────── */}
      {loggedIn && (
        <section className="hs-block">
          <h2 className="hs-h">오늘의 다섯 빛</h2>
          <div className="hs-string">
            {lights.map((l, i) => (
              <button
                key={l.key}
                className="hs-lamp"
                style={{ '--i': i }}
                onClick={() => go('/my')}
                aria-label={`${l.label} ${l.stars}점 — 오늘의 운세 보기`}
              >
                <span className="hs-lamp-wire" aria-hidden="true" />
                <span className="hs-lamp-orb">
                  <MenuIcon name={l.icon} size={19} />
                </span>
                <span className="hs-lamp-label">{l.label}</span>
                <span className="hs-lamp-stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <i key={s} className={s < l.stars ? 'on' : ''}>★</i>
                  ))}
                </span>
              </button>
            ))}
          </div>
          <p className="hs-string-hint">탭하면 오늘의 운세를 자세히 볼 수 있어요</p>
        </section>
      )}

      {/* ── 오늘 함께하는 행운 ────────────────────────────────── */}
      <section className="hs-block">
        <h2 className="hs-h">오늘 함께하는 행운</h2>
        <div className="hs-luck">
          <div className="hs-luck-item">
            <span className="hs-luck-icon"><MenuIcon name="palette" size={17} /></span>
            <span className="hs-luck-key">행운의 색</span>
            <span className="hs-luck-val">{lucky.color}</span>
          </div>
          <div className="hs-luck-item">
            <span className="hs-luck-icon"><MenuIcon name="hash" size={17} /></span>
            <span className="hs-luck-key">행운의 숫자</span>
            <span className="hs-luck-val">{lucky.number}</span>
          </div>
          <div className="hs-luck-item">
            <span className="hs-luck-icon"><MenuIcon name="compass" size={17} /></span>
            <span className="hs-luck-key">행운의 방향</span>
            <span className="hs-luck-val">{lucky.direction}</span>
          </div>
        </div>
      </section>

      {/* ── 스타 운세 배너 ─────────────────────────────── */}
      <button className="hs-mystar-banner" onClick={() => go('/star-fortune')}>
        <span className="hs-mystar-icon">🌟</span>
        <div className="hs-mystar-text">
          <span className="hs-mystar-title">스타 운세</span>
          <span className="hs-mystar-sub">최애 스타의 오늘 운세·궁합·그룹 운세 모아보기</span>
        </div>
        <span className="hs-mystar-arrow">›</span>
      </button>

      {/* ── 결정 상담 (간판 유료 상품) — 동화풍 카드 ─────────── */}
      <section className="hs-decision" onClick={() => go('/decision')}>
        <div className="hs-decision-frame">
          <div className="hs-decision-badge">✦ 마음의 갈림길</div>
          <h3 className="hs-decision-title">결정이 어려울 때, 사주가 답해드려요</h3>
          <p className="hs-decision-sub">재회 · 이별 · 고백 · 결혼 — 지금이 맞는 때일까?</p>
          <div className="hs-decision-chips">
            <span className="hs-decision-chip">💔 재회</span>
            <span className="hs-decision-chip">🚪 이별</span>
            <span className="hs-decision-chip">💌 고백</span>
            <span className="hs-decision-chip">💒 결혼</span>
          </div>
          <span className="hs-decision-cta">상담 펼쳐 보기 →</span>
        </div>
      </section>

      {/* ── 오늘 펼쳐볼 페이지 (책갈피형 퀵) ──────────────────── */}
      <section className="hs-quick">
        {QUICK.map((q) => (
          <button key={q.label} className="hs-mark" onClick={() => go(q.path)}>
            <span className="hs-mark-icon">
              <MenuIcon name={q.icon} size={22} />
            </span>
            <span className="hs-mark-label">{q.label}</span>
          </button>
        ))}
      </section>

      {/* ── 출석 카드 (로그인 시) ─────────────────────────────── */}
      {loggedIn && (
        <div className="hs-att">
          <AttendanceCard refreshKey={attendanceRefreshKey} />
        </div>
      )}

      {/* ── 챕터 페이지들 ─────────────────────────────────────── */}
      {CHAPTERS.map((c) => (
        <StoryPage key={c.title} {...c} onNav={go} />
      ))}

      <footer className="hs-foot">
        <span className="hs-foot-rule" aria-hidden="true" />
        <p className="hs-foot-text">
          <span aria-hidden="true">✦</span> 이야기는 내일도 계속돼요 <span aria-hidden="true">✦</span>
        </p>
      </footer>
    </div>
  );
}

export default HomeStory;
