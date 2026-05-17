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
  { key: 'love',   label: '사랑', icon: 'heart' },
  { key: 'money',  label: '재물', icon: 'money' },
  { key: 'social', label: '인연', icon: 'people' },
  { key: 'health', label: '건강', icon: 'clover' },
  { key: 'work',   label: '하루', icon: 'work' },
];

function deriveLights(seed, base) {
  const b = base || 72;
  return LIGHTS.map((a) => {
    const off = Math.round((hashFloat(seed, a.key) - 0.5) * 34); // -17 ~ +17
    const value = Math.max(40, Math.min(98, b + off));
    return { ...a, value, stars: Math.max(1, Math.min(5, Math.round(value / 20))) };
  });
}

function grade(score) {
  if (score >= 88) return { label: '대길', cls: 'best' };
  if (score >= 72) return { label: '길',   cls: 'good' };
  if (score >= 55) return { label: '보통', cls: 'soso' };
  if (score >= 40) return { label: '주의', cls: 'warn' };
  return { label: '흉', cls: 'bad' };
}

/* 동화풍 시적 한 줄 — 등급별 ─────────────────────────────────── */
const STORY_DESC = {
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
    no: '제1장', title: '사랑 이야기', tint: 'rose', more: '/love-fortune',
    items: [
      { label: '1:1연애',   sub: '둘만의 인연',   icon: 'heart',      path: '/my-solo' },
      { label: '썸·짝사랑', sub: '설레는 마음',   icon: 'heartArrow', path: '/my-some-crush' },
      { label: '데이트운',  sub: '함께한 하루',   icon: 'couple',     path: '/my-love-compat' },
      { label: '스타궁합',  sub: '별과 나',       icon: 'star',       path: '/my-star' },
    ],
  },
  {
    no: '제2장', title: '계절 이야기', tint: 'peach', more: '/fortune',
    items: [
      { label: '신년운세', sub: '새해 첫 장',     icon: 'newyear', path: '/year-fortune' },
      { label: '월간운세', sub: '이번 달 이야기', icon: 'monthly', path: '/monthly-fortune' },
      { label: '주간운세', sub: '한 주의 흐름',   icon: 'weekly',  path: '/weekly-fortune' },
      { label: '토정비결', sub: '올해의 길',      icon: 'tojeong', path: '/tojeong' },
    ],
  },
  {
    no: '제3장', title: '운명 이야기', tint: 'lilac', more: '/fortune',
    items: [
      { label: '정통사주', sub: '타고난 기운',   icon: 'traditional',   path: '/traditional' },
      { label: '만세력',   sub: '운명의 책력',   icon: 'compass',       path: '/manseryeok' },
      { label: 'MBTI',     sub: '나라는 사람',   icon: 'mbti',          path: '/mbti' },
      { label: '별자리',   sub: '하늘이 그린',   icon: 'constellation', path: '/constellation' },
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

/* ── 챕터 한 페이지 (장식 액자 + 2열 일러스트 패널) ──────────── */
function StoryPage({ no, title, tint, more, items, onNav }) {
  return (
    <section className="hs-page" data-tint={tint}>
      <div className="hs-page-frame">
        <Corners />
        <div className="hs-page-head">
          <span className="hs-page-no">{no}</span>
          <h2 className="hs-page-title">{title}</h2>
          {more && (
            <button className="hs-page-more" onClick={() => onNav(more)}>
              더보기 <span aria-hidden="true">›</span>
            </button>
          )}
        </div>
        <div className="hs-panels">
          {items.map((it) => (
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
          toast?.success?.(msg);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 점수 — 실제 AI 분석값이 있으면 사용, 없으면 오늘 날짜+유저 시드로 결정적 산출
  const seed = `${userId || 'guest'}:${ymd}`;
  const overall = useMemo(() => {
    const saju = myData?.saju;
    if (saju?.aiAnalyzed && saju?.score != null) return saju.score;
    return 56 + Math.round(hashFloat(seed, 'overall') * 40); // 56~96
  }, [myData, seed]);
  const lights = useMemo(() => deriveLights(seed, overall), [seed, overall]);
  const g = grade(overall);
  const loggedIn = userId && !isGuestUser;

  // 오늘의 행운 (결정적)
  const lucky = useMemo(() => {
    const COLORS = ['코랄 핑크', '아이보리', '라벤더', '민트', '소프트 옐로', '스카이 블루'];
    const PLACES = ['카페', '서점', '공원', '강변 산책로', '미술관', '꽃집'];
    return {
      color: COLORS[Math.floor(hashFloat(seed, 'color') * COLORS.length)],
      number: 1 + Math.floor(hashFloat(seed, 'num') * 45),
      place: PLACES[Math.floor(hashFloat(seed, 'place') * PLACES.length)],
    };
  }, [seed]);

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
          {/* 하늘 — 별 */}
          {Array.from({ length: 11 }).map((_, i) => (
            <span
              key={i}
              className="hs-star"
              style={{
                left: `${(i * 8.7 + 5) % 94}%`,
                top: `${(i * 19 + 7) % 56}%`,
                animationDelay: `${(i * 0.4) % 3}s`,
                fontSize: `${7 + (i % 3) * 4}px`,
              }}
            >
              ✦
            </span>
          ))}
          {/* 구름 */}
          <span className="hs-cloud hs-cloud--a" aria-hidden="true" />
          <span className="hs-cloud hs-cloud--b" aria-hidden="true" />

          {/* 달 = 오늘의 점수 */}
          <div className={`hs-moon hs-moon--${g.cls}`}>
            <span className="hs-moon-halo" aria-hidden="true" />
            {loggedIn ? (
              <>
                <strong className="hs-moon-score">{overall}</strong>
                <span className="hs-moon-cap">오늘의 운세</span>
              </>
            ) : (
              <strong className="hs-moon-score">?</strong>
            )}
          </div>

          {/* 땅 — 언덕과 나무 */}
          <span className="hs-hill hs-hill--3" aria-hidden="true" />
          <span className="hs-hill hs-hill--2" aria-hidden="true" />
          <span className="hs-tree" aria-hidden="true">
            <span className="hs-tree-top" />
            <span className="hs-tree-trunk" />
          </span>
          <span className="hs-hill hs-hill--1" aria-hidden="true" />

          {/* 장면 위 거친 그레인 */}
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
              <div key={l.key} className="hs-lamp" style={{ '--i': i }}>
                <span className="hs-lamp-wire" aria-hidden="true" />
                <span className="hs-lamp-orb">
                  <MenuIcon name={l.icon} size={19} />
                </span>
                <span className="hs-lamp-label">{l.label}</span>
                <span className="hs-lamp-stars" aria-label={`${l.stars}점`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <i key={s} className={s < l.stars ? 'on' : ''}>★</i>
                  ))}
                </span>
              </div>
            ))}
          </div>
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
            <span className="hs-luck-icon"><MenuIcon name="pin" size={17} /></span>
            <span className="hs-luck-key">행운의 장소</span>
            <span className="hs-luck-val">{lucky.place}</span>
          </div>
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
