import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMyFortune, getMyFortuneStream, analyzeSaju, analyzeSajuStream, isGuest, getHistory, getScoreTrend, getFortuneByZodiac, getConstellationFortune, getConstellationByDate } from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import DeepAnalysis, { hasDeepResult } from '../components/DeepAnalysis';
import AnalysisMatrix from '../components/AnalysisMatrix';
import AnalysisComplete from '../components/AnalysisComplete';
import StreamingCard from '../components/StreamingCard';
import parseAiJson, { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { mapLuckyOutfit } from '../utils/luckyOutfitTemplate';
import { getZodiacByYearList, getZodiacOneLiner } from '../utils/zodiacByYearTemplate';
import CELEBRITIES from '../data/celebrities';
import KakaoLoginCTA from '../components/KakaoLoginCTA';
import './MyFortune.css';

const TIME_ICON = { '아침': '🌅', '점심': '☀️', '오후': '🌤️', '저녁': '🌆', '밤': '🌙' };

function scoreToStars(score) {
  const half = Math.max(0, Math.min(10, Math.round((Number(score) || 70) / 10)));
  const full = Math.floor(half / 2);
  const isHalf = half % 2 === 1;
  const empty = 5 - full - (isHalf ? 1 : 0);
  return { full, isHalf, empty };
}

function StarRating({ score }) {
  const { full, isHalf, empty } = scoreToStars(score);
  return (
    <span className="myf-stars" aria-label={`${score}점 (5점 만점)`}>
      {Array.from({ length: full }).map((_, i) => <span key={'f' + i} className="myf-star myf-star--full">★</span>)}
      {isHalf && <span className="myf-star myf-star--half">★</span>}
      {Array.from({ length: empty }).map((_, i) => <span key={'e' + i} className="myf-star myf-star--empty">★</span>)}
    </span>
  );
}

function LuckyGrid({ f }) {
  if (!f) return null;
  const items = [
    { icon: '🎨', label: '행운의 색', value: f.luckyColor },
    { icon: '🔢', label: '행운의 숫자', value: f.luckyNumber },
    { icon: '🧭', label: '길한 방위', value: f.luckyDirection },
    { icon: '🍀', label: '행운의 음식', value: f.luckyFood },
    { icon: '👕', label: '추천 스타일', value: f.luckyFashion },
    { icon: '🎁', label: '행운의 아이템', value: f.luckyItem },
    { icon: '👥', label: '행운의 사람', value: f.luckyPerson },
  ].filter(it => it.value !== undefined && it.value !== null && it.value !== '');
  if (items.length === 0) return null;
  return (
    <div className="myf-lucky-grid glass-card">
      {items.map((it, i) => (
        <div className="myf-lucky-cell" key={i} style={{ animationDelay: `${i * 60}ms` }}>
          <div className="myf-lucky-cell-icon">{it.icon}</div>
          <div className="myf-lucky-cell-label">{it.label}</div>
          <div className="myf-lucky-cell-value">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/** 행운의 코디 카드 — luckyColor 1개로 정적 템플릿 매핑 (AI 호출 0) */
function LuckyOutfitCard({ color }) {
  const outfit = mapLuckyOutfit(color);
  if (!outfit) return null;
  return (
    <div className="myf-outfit glass-card">
      <div className="myf-outfit-header">
        <span className="myf-outfit-swatch" style={{ background: outfit.hex }} />
        <h4 className="myf-outfit-title">행운의 코디</h4>
      </div>
      <div className="myf-outfit-color">{outfit.color}</div>
      <p className="myf-outfit-desc">{outfit.desc}</p>
      <p className="myf-outfit-combo">💡 {outfit.combo}</p>
    </div>
  );
}

/** 일별 점수 그래프 — 캐시된 점수만, AI 호출 없음 */
function ScoreTrendChart({ zodiac }) {
  const [points, setPoints] = useState([]);
  useEffect(() => {
    if (!zodiac) return;
    let cancelled = false;
    getScoreTrend(zodiac, 7).then((data) => {
      if (!cancelled) setPoints(data);
    });
    return () => { cancelled = true; };
  }, [zodiac]);
  if (points.length < 2) return null;

  const W = 300, H = 100, P = 20;
  const xs = (i) => P + (i * (W - P * 2)) / Math.max(1, points.length - 1);
  const ys = (s) => H - P - ((s - 30) * (H - P * 2)) / 70;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p.score)}`).join(' ');
  return (
    <div className="myf-trend glass-card">
      <h4 className="myf-trend-title">📈 최근 7일 점수 흐름</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="myf-trend-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${xs(points.length - 1)} ${H - P} L ${xs(0)} ${H - P} Z`} fill="url(#trendGrad)" />
        <path d={path} fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xs(i)} cy={ys(p.score)} r="3.5" fill="#fff" stroke="#FBBF24" strokeWidth="2" />
            <text x={xs(i)} y={ys(p.score) - 8} textAnchor="middle" className="myf-trend-score">{p.score}</text>
            <text x={xs(i)} y={H - 4} textAnchor="middle" className="myf-trend-date">{(p.date || '').slice(5)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** 띠 × 출생연도별 오늘의 운세 (사주 일진 룰 기반) */
function ZodiacByYearCard({ zodiac, userBirthYear, fullCard = false }) {
  const list = getZodiacByYearList(zodiac);
  if (list.length === 0) return null;
  if (fullCard) {
    // 점신 스타일 풀카드 — 출생연도별 제목 + 풍부한 4문장
    return (
      <div className="myf-zby-full">
        {list.map((it, i) => {
          const isMine = userBirthYear && it.birthYear === userBirthYear;
          return (
            <div className={`myf-zby-card glass-card ${isMine ? 'myf-zby-card--mine' : ''}`} key={i} style={{ animationDelay: `${i * 70}ms` }}>
              <div className="myf-zby-card-header">
                <span className="myf-zby-card-year">{it.year}</span>
                {isMine && <span className="myf-zby-card-badge">내 운세</span>}
                <span className="myf-zby-card-ganji">{it.ganji}</span>
              </div>
              <h4 className="myf-zby-card-title">{it.title}</h4>
              <p className="myf-zby-card-text">{it.text}</p>
            </div>
          );
        })}
      </div>
    );
  }
  // 컴팩트 (오늘운세 탭 하단용)
  return (
    <div className="myf-zby glass-card">
      <h4 className="myf-zby-title">🐾 {zodiac}띠 출생연도별 운세</h4>
      <div className="myf-zby-list">
        {list.map((it, i) => (
          <div className="myf-zby-row" key={i} style={{ animationDelay: `${i * 50}ms` }}>
            <span className="myf-zby-year">{it.year}</span>
            <span className="myf-zby-text">{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 오늘 태어난 유명인 — 클라이언트 정적 DB에서 month/day 매칭 */
function TodayCelebsCard() {
  const today = new Date();
  const m = today.getMonth() + 1, d = today.getDate();
  const matches = CELEBRITIES.filter((c) => {
    if (!c.birth) return false;
    const [, mm, dd] = c.birth.split('-');
    return parseInt(mm, 10) === m && parseInt(dd, 10) === d;
  }).slice(0, 8);
  if (matches.length === 0) return null;
  return (
    <div className="myf-celebs glass-card">
      <h4 className="myf-celebs-title">🎂 오늘 태어난 유명인</h4>
      <div className="myf-celebs-list">
        {matches.map((c, i) => (
          <div className="myf-celebs-chip" key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="myf-celebs-name">{c.name}</span>
            {c.group && <span className="myf-celebs-group">{c.group}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function HourlyTimeline({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="myf-hourly glass-card">
      <h4 className="myf-hourly-title">⏰ 오늘의 시간대 흐름</h4>
      <div className="myf-hourly-list">
        {items.map((it, i) => {
          const score = Number(it.score) || 70;
          return (
            <div className="myf-hourly-row" key={i} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="myf-hourly-icon">{TIME_ICON[it.time] || '⏰'}</div>
              <div className="myf-hourly-main">
                <div className="myf-hourly-head">
                  <span className="myf-hourly-time">{it.time}</span>
                  <span className="myf-hourly-range">{it.range}</span>
                  <span className="myf-hourly-score">{score}점</span>
                </div>
                <div className="myf-hourly-bar"><div className="myf-hourly-bar-fill" style={{ width: `${score}%` }} /></div>
                <p className="myf-hourly-desc">{it.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiorhythmLink() {
  const nav = useNavigate();
  return (
    <button className="myf-biolink glass-card" onClick={() => nav('/biorhythm')}>
      <span className="myf-biolink-icon">📊</span>
      <span className="myf-biolink-main">
        <span className="myf-biolink-title">오늘의 바이오리듬</span>
        <span className="myf-biolink-sub">신체·감정·지성·직관 4사이클 + 30일 곡선</span>
      </span>
      <span className="myf-biolink-chevron">›</span>
    </button>
  );
}

function MyFortune() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cacheChecking, setCacheChecking] = useState(true); // 페이지/날짜 전환 직후 캐시 확인중 표시
  const [activeTab, setActiveTab] = useState('saju');
  // mine 탭 하단 카테고리 (점신 스타일): today / zodiac / constellation
  const [categoryTab, setCategoryTab] = useState('today');
  const [zodiacFortune, setZodiacFortune] = useState(null);
  const [constellationFortune, setConstellationFortune] = useState(null);
  const [zodiacLoading, setZodiacLoading] = useState(false);
  const [constellationLoading, setConstellationLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamFields, setStreamFields] = useState({}); // progressive 카드 (내 운세)
  const [doneFields, setDoneFields] = useState(new Set());
  const [partnerStreamFields, setPartnerStreamFields] = useState({});
  const [partnerDoneFields, setPartnerDoneFields] = useState(new Set());
  const [otherStreamFields, setOtherStreamFields] = useState({});
  const [otherDoneFields, setOtherDoneFields] = useState(new Set());
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const pendingSetterRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);
  const [viewMode, setViewMode] = useState('mine'); // 'mine' | 'partner' | 'other'

  // 홈 드로어에서 넘어온 restoreHistoryId 복원
  useEffect(() => {
    const hid = location.state?.restoreHistoryId;
    if (!hid) return;
    (async () => {
      try {
        const full = await getHistory(hid);
        const p = full?.payload;
        if (!p) return;
        if (full?.type === 'partner_fortune') {
          setViewMode('partner');
          setPartnerOverride({
            birthDate: p.partnerBirthDate || '',
            birthTime: p.partnerBirthTime || '',
            gender: p.partnerGender || '',
          });
          setPartnerData(p);
        } else if (full?.type === 'other_fortune') {
          setViewMode('other');
          setOtherBirthDate(p.otherBirthDate || '');
          setOtherBirthTime(p.otherBirthTime || '');
          setOtherGender(p.otherGender || '');
          setOtherCalendarType(p.otherCalendarType || 'SOLAR');
          setOtherData(p);
        } else {
          setViewMode('mine');
          setData(p);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.restoreHistoryId]);
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'tomorrow' | 'pick'
  const [pickDate, setPickDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempPickDate, setTempPickDate] = useState('');

  // 연인 운세
  const [partnerData, setPartnerData] = useState(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerStreamText, setPartnerStreamText] = useState('');
  const [partnerStreaming, setPartnerStreaming] = useState(false);
  const [partnerCacheChecking, setPartnerCacheChecking] = useState(false);
  const [partnerOverride, setPartnerOverride] = useState(null); // 히스토리 복원으로 덮어쓰인 파트너 정보
  const partnerCleanupRef = useRef(null);

  // 다른 사람 운세
  const [otherBirthDate, setOtherBirthDate] = useState('');
  const [otherBirthTime, setOtherBirthTime] = useState('');
  const [otherGender, setOtherGender] = useState('');
  const [otherCalendarType, setOtherCalendarType] = useState('SOLAR');
  const [otherData, setOtherData] = useState(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherStreamText, setOtherStreamText] = useState('');
  const [otherStreaming, setOtherStreaming] = useState(false);
  const otherCleanupRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');

  // mine 탭의 카테고리 sub-tab — 띠/별자리 데이터 lazy 로드 (캐시 hit이면 0원)
  useEffect(() => {
    if (viewMode !== 'mine' || !data?.user) return;
    if (categoryTab === 'zodiac' && !zodiacFortune && !zodiacLoading) {
      const zodiac = data.user.zodiacAnimal;
      if (!zodiac) return;
      setZodiacLoading(true);
      getFortuneByZodiac(zodiac)
        .then((res) => setZodiacFortune(res))
        .catch(() => {})
        .finally(() => setZodiacLoading(false));
    }
    if (categoryTab === 'constellation' && !constellationFortune && !constellationLoading) {
      const bd = data.user.birthDate;
      if (!bd) return;
      setConstellationLoading(true);
      // birthDate → 별자리 자동 매핑
      getConstellationByDate(bd)
        .then((res) => {
          if (res?.sign) {
            return getConstellationFortune(res.sign).then((cf) => setConstellationFortune({ ...cf, sign: res.sign, signName: res.signName }));
          }
        })
        .catch(() => {})
        .finally(() => setConstellationLoading(false));
    }
  }, [viewMode, categoryTab, data, zodiacFortune, constellationFortune, zodiacLoading, constellationLoading]);

  // 연인 운세 탭 진입 시 캐시 선조회 (있으면 자동 표시, 없으면 버튼만 노출)
  useEffect(() => {
    if (viewMode !== 'partner') return;
    if (partnerData) return;
    if (partnerLoading || partnerStreaming) return;
    const info = getPartnerInfo();
    if (!info?.birthDate) return;
    setPartnerCacheChecking(true);
    const cleanup = analyzeSajuStream(info.birthDate, info.birthTime || undefined, 'SOLAR', info.gender || undefined, {
      cacheOnly: true,
      targetType: 'partner',
      onCached: (cached) => {
        setPartnerData(cached);
        setPartnerCacheChecking(false);
      },
      onNoCache: () => {
        setPartnerCacheChecking(false);
      },
      onError: () => {
        setPartnerCacheChecking(false);
      },
    });
    return () => { try { cleanup?.(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, partnerOverride]);

  // 날짜 계산
  const getTargetDate = () => {
    if (dateMode === 'tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    if (dateMode === 'pick' && pickDate) return pickDate;
    return null; // today = null (서버 기본값)
  };
  const getDateLabel = () => {
    if (dateMode === 'tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
    if (dateMode === 'pick' && pickDate) {
      const [, m, day] = pickDate.split('-');
      return `${parseInt(m)}월 ${parseInt(day)}일`;
    }
    return '오늘';
  };

  // 프로필에서 연인 정보 가져오기 (히스토리 복원 시 override 우선)
  const getPartnerInfo = () => {
    if (partnerOverride) return partnerOverride;
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!p.partnerBirthDate) return null;
      return {
        birthDate: p.partnerBirthDate,
        birthTime: p.partnerBirthTime || '',
        gender: p.gender === 'M' ? 'F' : p.gender === 'F' ? 'M' : '',
      };
    } catch { return null; }
  };

  // 하트 가드 — 가드를 통과한 후에만 startAnalysis 호출 (onClick에서 사용)
  const { guardedAction: guardTodayFortune } = useHeartGuard('TODAY_FORTUNE');

  // 완료 애니 → 결과 표시 (스트리밍 분석 후 공통)
  const finishWithCompleteAnimation = (finalResult, setter) => {
    pendingResultRef.current = finalResult;
    pendingSetterRef.current = setter;
    setCompleting(true);
  };

  // 스트리밍 분석 공통 함수 (호출 전에 guardTodayFortune으로 감쌀 것)
  const startAnalysis = (birthDate, birthTime, calendarType, gender, setters, extraOpts = {}) => {
    const { setLoading: sL, setStreamText: sST, setStreaming: sS, setData: sD, cleanupRef: cRef, setStreamFields: sSF, setDoneFields: sDF } = setters;
    sL(true); sST(''); sS(false);
    sSF?.({}); sDF?.(new Set());
    let buffer = '';
    cRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    cRef.current = analyzeSajuStream(birthDate, birthTime || undefined, calendarType, gender || undefined, {
      ...extraOpts,
      onCached: (cached) => {
        sD(cached); sL(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
      onChunk: (text) => {
        sS(true);
        buffer += text;
        sST(prev => prev + text);
        if (sSF && sDF) {
          const partial = extractStreamingFieldsPartial(buffer, PROG_FIELDS);
          const next = {};
          const newDone = [];
          for (const k of PROG_FIELDS) {
            const p = partial[k];
            if (p !== undefined) {
              next[k] = p.value;
              if (p.done) newDone.push(k);
            }
          }
          if (Object.keys(next).length > 0) sSF(prev => ({ ...prev, ...next }));
          if (newDone.length > 0) sDF(prev => {
            const n = new Set(prev); newDone.forEach(f => n.add(f)); return n;
          });
        }
      },
      onDone: () => {
        sS(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        (async () => {
          try {
            const r = await analyzeSaju(birthDate, birthTime || undefined, calendarType, gender || undefined);
            sL(false); sST('');
            sSF?.({}); sDF?.(new Set());
            finishWithCompleteAnimation(r, sD);
          }
          catch (e) { console.error(e); sL(false); sST(''); sSF?.({}); sDF?.(new Set()); }
        })();
      },
      onError: () => {
        sS(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        (async () => {
          try { const r = await analyzeSaju(birthDate, birthTime || undefined, calendarType, gender || undefined); sD(r); }
          catch (e) { console.error(e); }
          finally { sL(false); sST(''); sSF?.({}); sDF?.(new Set()); }
        })();
      },
    });
  };

  // progressive 카드 필드 (서버 JSON의 todayFortune 내부 필드와 동일)
  const PROG_FIELDS = ['overall', 'love', 'money', 'health', 'work', 'academic', 'tip'];

  // 카드 상태 계산 헬퍼 (pending/streaming/done)
  const cardStatus = (isStreaming, fields, done, key) => {
    if (!isStreaming) return 'done';
    if (done.has(key)) return 'done';
    if (fields[key]) return 'streaming';
    return 'pending';
  };

  // 스트리밍 중에 progressive 카드 + 스트림텍스트 라이브 보여주는 블록
  const renderStreamingCards = (fields, done, label) => {
    const st = (key) => cardStatus(true, fields, done, key);
    return (
      <div className="myf-streaming-wrap">
        <div className="myf-streaming-header">
          <div className="myf-streaming-title">
            <span className="myf-streaming-orb">🔮</span>
            <span>{label}</span>
            <span className="streaming-dots"><i/><i/><i/></span>
          </div>
        </div>
        <div className="myf-cards">
          <StreamingCard icon="🌟" title="총운"           text={fields.overall  || ''} status={st('overall')}  delay={0}   />
          <StreamingCard icon="💕" title="애정운"         text={fields.love     || ''} status={st('love')}     delay={60}  />
          <StreamingCard icon="💰" title="재물운"         text={fields.money    || ''} status={st('money')}    delay={120} />
          <StreamingCard icon="💪" title="건강운"         text={fields.health   || ''} status={st('health')}   delay={180} />
          <StreamingCard icon="💼" title="직장운"         text={fields.work     || ''} status={st('work')}     delay={240} />
          <StreamingCard icon="📚" title="학업·자기계발운" text={fields.academic || ''} status={st('academic')} delay={300} />
          {fields.tip && <StreamingCard icon="💡" title="꿀팁" text={fields.tip || ''} status={st('tip')} delay={360} />}
        </div>
      </div>
    );
  };

  const handleShare = async (fortuneData, title) => {
    const tf = fortuneData?.todayFortune || fortuneData;
    const shareText = [
      `[${title || '사주 운세 분석'}]`,
      `운세 점수: ${tf?.score || 70}점`,
      '', `🌟 총운: ${tf?.overall || ''}`, `💕 애정운: ${tf?.love || ''}`,
      `💰 재물운: ${tf?.money || ''}`, `💪 건강운: ${tf?.health || ''}`, `💼 직장운: ${tf?.work || ''}`,
      '', `🔢 행운의 숫자: ${tf?.luckyNumber || '-'}`, `🎨 행운의 색: ${tf?.luckyColor || '-'}`,
      tf?.luckyDirection ? `🧭 길한 방위: ${tf.luckyDirection}` : '',
      tf?.luckyFood ? `🍀 추천 음식: ${tf.luckyFood}` : '',
      tf?.luckyFashion ? `👕 추천 스타일: ${tf.luckyFashion}` : '',
      tf?.luckyItem ? `🎁 행운의 아이템: ${tf.luckyItem}` : '',
      '', '- 연애 앱에서 확인하세요 -',
    ].join('\n');
    try {
      if (navigator.share) { await navigator.share({ title, text: shareText }); return; }
      await navigator.clipboard.writeText(shareText);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    }
  };

  const loadMyFortune = (targetDate) => {
    if (!userId) { setLoading(false); return; }
    setData(null); setLoading(true); setStreamText(''); setStreaming(false);
    setStreamFields({}); setDoneFields(new Set());
    let buffer = '';
    cleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    cleanupRef.current = getMyFortuneStream(userId, {
      onCached: (d) => {
        setData(d); setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
      onChunk: (t) => {
        setStreaming(true);
        buffer += t;
        setStreamText(prev => prev + t);
        const partial = extractStreamingFieldsPartial(buffer, PROG_FIELDS);
        const next = {};
        const newDone = [];
        for (const k of PROG_FIELDS) {
          const p = partial[k];
          if (p !== undefined) {
            next[k] = p.value;
            if (p.done) newDone.push(k);
          }
        }
        if (Object.keys(next).length > 0) setStreamFields(prev => ({ ...prev, ...next }));
        if (newDone.length > 0) setDoneFields(prev => {
          const n = new Set(prev); newDone.forEach(f => n.add(f)); return n;
        });
      },
      onDone: (fullText) => {
        setStreaming(false); setStreamText('');
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        // 스트리밍 텍스트에서 직접 파싱 → 완료 애니 후 표시
        const parsed = parseAiJson(fullText);
        if (parsed) {
          const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
          const finalData = {
            user: { name: profile.name || '', zodiacAnimal: profile.zodiacAnimal || '', bloodType: profile.bloodType || '', mbtiType: profile.mbtiType || '' },
            saju: { overall: parsed.overall, love: parsed.love, money: parsed.money, health: parsed.health, work: parsed.work, score: parsed.score || 70, luckyNumber: parsed.luckyNumber, luckyColor: parsed.luckyColor, luckyDirection: parsed.luckyDirection, luckyFood: parsed.luckyFood, luckyFashion: parsed.luckyFashion, luckyItem: parsed.luckyItem, hourlyFortune: Array.isArray(parsed.hourlyFortune) ? parsed.hourlyFortune : null }
          };
          setLoading(false);
          setStreamFields({}); setDoneFields(new Set());
          finishWithCompleteAnimation(finalData, setData);
        } else {
          setLoading(false);
          setStreamFields({}); setDoneFields(new Set());
        }
      },
      onError: () => {
        setStreaming(false); setStreamText('');
        setLoading(false);
        setStreamFields({}); setDoneFields(new Set());
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    }, targetDate);
    return () => cleanupRef.current?.();
  };

  // 날짜/사용자 변경 시: 결과 리셋 + "캐시 확인중" → 캐시 있으면 자동 표시, 없으면 버튼 노출
  useEffect(() => {
    cleanupRef.current?.();
    setData(null); setStreamText(''); setStreaming(false); setLoading(false);
    if (!userId) { setCacheChecking(false); return; }
    setCacheChecking(true);
    cleanupRef.current = getMyFortuneStream(userId, {
      cacheOnly: true,
      onCached: (d) => { setData(d); setCacheChecking(false); },
      onNoCache: () => { setCacheChecking(false); }, // 캐시 없음 → 버튼 노출
      onError: () => { setCacheChecking(false); },   // 에러 → 버튼 노출
    }, getTargetDate());
    return () => cleanupRef.current?.();
  }, [userId, dateMode, pickDate]);

  if (!userId) {
    return (
      <div className="myf-page">
        <div className="myf-empty">
          <div className="myf-empty-icon">🔮</div>
          <h2>나만의 맞춤 운세</h2>
          <p>회원가입하면 사주 + 혈액형 + MBTI를<br />종합한 나만의 운세를 볼 수 있어요</p>
          <KakaoLoginCTA returnTo="/my" className="myf-register-btn">카카오 로그인하고 오늘의 운세 받기</KakaoLoginCTA>
        </div>
      </div>
    );
  }

  // 내 운세 탭에서 분석 중이면 progressive 카드 표시 (다른 탭은 자기 렌더링으로)
  if (viewMode === 'mine' && (loading || streaming) && !completing) {
    const dateLabel = dateMode === 'today' ? '오늘의' : dateMode === 'tomorrow' ? '내일의' : `${getDateLabel()}`;
    return (
      <div className="myf-page">
        {renderStreamingCards(streamFields, doneFields, `AI가 ${dateLabel} 운세를 분석중이에요`)}
      </div>
    );
  }

  const user = (data && data.user) || {};
  const saju = data && data.saju;
  const tabs = [{ id: 'saju', label: '사주 운세', icon: '☯️', data: saju }];
  const active = tabs.find(t => t.id === activeTab) || tabs[0];
  const f = active?.data;
  const partnerInfo = getPartnerInfo();

  /* ── 결과 렌더링 공통 ── */
  const renderResult = (rd, onReset, onShare, label, birthInfo) => (
    <>
      <div className="myf-header">
        <h1 className="myf-title">{label}{birthInfo?.birthDate && hasDeepResult('today', birthInfo.birthDate) && <span className="myf-deep-badge">+ 심화</span>}</h1>
        {rd.dayMaster && (
          <div className="myf-badges">
            <span className="myf-badge myf-badge--saju">{rd.dayMasterHanja} {rd.dayMaster} 일간</span>
          </div>
        )}
      </div>
      <div className="myf-content fade-in">
        <div className="myf-score-wrap">
          <svg viewBox="0 0 120 120" className="myf-score-circle">
            <circle cx="60" cy="60" r="52" className="myf-score-bg" />
            <circle cx="60" cy="60" r="52" className="myf-score-fill"
              style={{ strokeDasharray: `${((rd.todayFortune?.score || 70) / 100) * 327} 327` }} />
          </svg>
          <div className="myf-score-inner">
            <span className="myf-score-num">{rd.todayFortune?.score || 70}</span>
            <span className="myf-score-unit">점</span>
          </div>
        </div>
        <div className="myf-stars-wrap"><StarRating score={rd.todayFortune?.score || 70} /></div>
        {rd.todayFortune && (
          <div className="myf-cards">
            {rd.todayFortune.overall && <FortuneCard icon="🌟" title="총운" description={rd.todayFortune.overall} delay={0} />}
            {rd.todayFortune.love && <FortuneCard icon="💕" title="애정운" description={rd.todayFortune.love} delay={80} />}
            {rd.todayFortune.money && <FortuneCard icon="💰" title="재물운" description={rd.todayFortune.money} delay={160} />}
            {rd.todayFortune.health && <FortuneCard icon="💪" title="건강운" description={rd.todayFortune.health} delay={240} />}
            {rd.todayFortune.work && <FortuneCard icon="💼" title="직장운" description={rd.todayFortune.work} delay={320} />}
            {rd.todayFortune.academic && <FortuneCard icon="📚" title="학업·자기계발운" description={rd.todayFortune.academic} delay={400} />}
          </div>
        )}
        <HourlyTimeline items={rd.todayFortune?.hourlyFortune} />

        {rd.personalityReading && (
          <div className="myf-analysis glass-card">
            <span className="myf-analysis-icon">☯️</span>
            <h4 className="myf-analysis-title">사주 성격 분석</h4>
            <p>{rd.personalityReading}</p>
          </div>
        )}
        <LuckyGrid f={rd.todayFortune} />
        <LuckyOutfitCard color={rd.todayFortune?.luckyColor} />
        <ScoreTrendChart zodiac={rd.zodiacAnimal} />
        <ZodiacByYearCard zodiac={rd.zodiacAnimal} />
        <TodayCelebsCard />
        <BiorhythmLink />
      </div>
      {birthInfo?.birthDate && (
        <DeepAnalysis type="today" birthDate={birthInfo.birthDate} birthTime={birthInfo.birthTime} gender={birthInfo.gender} calendarType={birthInfo.calendarType} previousResult={rd} />
      )}
      <div className="myf-actions">
        <button className="myf-share-btn" onClick={onShare}>{copied ? '✅ 복사 완료!' : '📤 공유하기'}</button>
        <button className="myf-share-btn" onClick={onReset}>🔄 다시 보기</button>
      </div>
    </>
  );

  /* ── 스트리밍/로딩 표시 공통 (progressive 카드) ── */
  const renderLoading = (isLoading, isStreaming, sText, hasData, fields, done) => {
    if ((isLoading || isStreaming) && !hasData && !completing) {
      return renderStreamingCards(fields || {}, done || new Set(), 'AI가 오늘의 운세를 분석중이에요');
    }
    return null;
  };

  return (
    <div className="myf-page">
      {/* 최상단 모드 탭 */}
      <div className="myf-mode-tabs">
        <button className={`myf-mode-tab ${viewMode === 'mine' ? 'active' : ''}`} onClick={() => setViewMode('mine')}>내 운세</button>
        <button className={`myf-mode-tab ${viewMode === 'partner' ? 'active' : ''}`} onClick={() => setViewMode('partner')}>연인 운세</button>
        <button className={`myf-mode-tab ${viewMode === 'other' ? 'active' : ''}`} onClick={() => setViewMode('other')}>다른 사람</button>
      </div>

      {/* 날짜 선택 (내 운세 탭) */}
      {viewMode === 'mine' && (
        <>
          {dateMode === 'today' ? (
            <div className="myf-date-actions">
              <button className="myf-date-action-btn" onClick={() => { setDateMode('tomorrow'); setPickDate(''); }}>
                🌙 내일의 운세
              </button>
              <button className="myf-date-action-btn myf-date-action-btn--pick" onClick={() => {
                setTempPickDate('');
                setShowDatePicker(true);
              }}>
                📅 날짜 지정 운세
              </button>
            </div>
          ) : (
            <div className="myf-date-actions">
              <button className="myf-date-action-btn" onClick={() => { setDateMode('today'); setPickDate(''); setShowDatePicker(false); }}>
                ☀️ 오늘의 운세로 돌아가기
              </button>
            </div>
          )}
          {showDatePicker && (
            <div className="myf-date-picker-inline glass-card">
              <h3 className="myf-date-picker-title">📅 날짜 선택</h3>
              <BirthDatePicker value={tempPickDate} onChange={setTempPickDate} />
              <div className="myf-date-picker-buttons">
                <button className="myf-date-picker-cancel" onClick={() => setShowDatePicker(false)}>취소</button>
                <button className="myf-date-picker-confirm" disabled={!tempPickDate} onClick={() => {
                  setPickDate(tempPickDate);
                  setDateMode('pick');
                  setShowDatePicker(false);
                }}>이 날짜로 보기</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ 연인 운세 ════════ */}
      {viewMode === 'partner' && (
        <div className="myf-other-view">
          {/* 저장된 운세 확인중 */}
          {partnerCacheChecking && !partnerData && !partnerLoading && !partnerStreaming && (
            <div className="myf-other-form glass-card myf-cache-check">
              <div className="myf-cache-check-icon" aria-hidden="true">⏳</div>
              <p className="myf-cache-check-text">저장된 연인 운세 확인중</p>
            </div>
          )}

          {!partnerCacheChecking && (
            renderLoading(partnerLoading, partnerStreaming, partnerStreamText, partnerData, partnerStreamFields, partnerDoneFields) || (
              !partnerData ? (
                <div className="myf-other-form glass-card" style={{ textAlign: 'center' }}>
                  <h2 style={{ marginBottom: 12 }}>💕 연인 운세</h2>
                  {partnerInfo ? (
                    <>
                      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                        프로필에 등록된 연인 정보로 운세를 분석합니다
                      </p>
                      <div className="myf-badges" style={{ justifyContent: 'center', marginBottom: 20 }}>
                        <span className="myf-badge">{partnerInfo.birthDate}</span>
                        {partnerInfo.birthTime && <span className="myf-badge">{partnerInfo.birthTime}</span>}
                        {partnerInfo.gender && <span className="myf-badge">{partnerInfo.gender === 'M' ? '♂ 남성' : '♀ 여성'}</span>}
                      </div>
                      <button className="btn-gold" style={{ width: '100%', marginBottom: 8 }}
                        onClick={() => guardTodayFortune(() => startAnalysis(partnerInfo.birthDate, partnerInfo.birthTime, 'SOLAR', partnerInfo.gender, {
                          setLoading: setPartnerLoading, setStreamText: setPartnerStreamText, setStreaming: setPartnerStreaming,
                          setData: setPartnerData, cleanupRef: partnerCleanupRef,
                          setStreamFields: setPartnerStreamFields, setDoneFields: setPartnerDoneFields,
                        }, { targetType: 'partner' }))}>
                        💕 연인 운세 보기 <HeartCost category="TODAY_FORTUNE" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 48, margin: '20px 0' }}>💔</div>
                      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                        등록된 연인 정보가 없습니다.<br />프로필에서 연인 정보를 먼저 입력해주세요.
                      </p>
                      <button className="btn-gold" style={{ width: '100%' }} onClick={() => navigate('/profile/edit')}>
                        프로필에서 연인 등록하기
                      </button>
                    </>
                  )}
                </div>
              ) : (
                renderResult(partnerData, () => {
                  partnerCleanupRef.current?.(); setPartnerData(null); setPartnerStreamText(''); setPartnerStreaming(false); setPartnerOverride(null);
                }, () => handleShare(partnerData, '연인 운세'), '연인 운세 분석 결과', partnerInfo ? { birthDate: partnerInfo.birthDate, birthTime: partnerInfo.birthTime, gender: partnerInfo.gender, calendarType: 'SOLAR' } : null)
              )
            )
          )}

          {/* 하단 pull-up drawer — 최근 본 연인 운세 */}
          <HistoryDrawer
            type="partner_fortune"
            label="📚 최근 본 연인 운세"
            onOpen={async (item) => {
              try {
                const full = await getHistory(item.id);
                const p = full?.payload;
                if (!p) return;
                setPartnerOverride({
                  birthDate: p.partnerBirthDate || '',
                  birthTime: p.partnerBirthTime || '',
                  gender: p.partnerGender || '',
                });
                setPartnerData(p);
              } catch {}
            }}
          />
        </div>
      )}

      {/* ════════ 다른 사람 운세 ════════ */}
      {viewMode === 'other' && (
        <div className="myf-other-view">
          {renderLoading(otherLoading, otherStreaming, otherStreamText, otherData, otherStreamFields, otherDoneFields) || (
            !otherData ? (
              <div className="myf-other-form glass-card">
                <h2 style={{ textAlign: 'center', marginBottom: 12 }}>다른 사람 운세 보기</h2>
                {(() => {
                  const stars = (() => { try { return JSON.parse(localStorage.getItem('myStarList') || '[]'); } catch { return []; } })();
                  return stars.length > 0 ? (
                    <button className="sf-autofill-btn" style={{ marginBottom: 10 }} onClick={() => {
                      const el = document.getElementById('other-star-picker');
                      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                    }}>⭐ 스타 정보로 채우기</button>
                  ) : null;
                })()}
                <div id="other-star-picker" style={{ display: 'none', marginBottom: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                    {(() => { try { return JSON.parse(localStorage.getItem('myStarList') || '[]'); } catch { return []; } })().map((s, i) => (
                      <button key={i} className="sf-autofill-btn" style={{ justifyContent: 'flex-start', gap: 8 }} onClick={() => {
                        setOtherBirthDate(s.birth);
                        if (s.gender) setOtherGender(s.gender);
                        document.getElementById('other-star-picker').style.display = 'none';
                      }}>
                        <span>{s.gender === 'M' ? '♂' : '♀'}</span>
                        <span>{s.name}</span>
                        <span style={{ opacity: 0.6, fontSize: 12 }}>{s.birth?.slice(0,4)}년생</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">달력 구분</label>
                  <div className="form-toggle">
                    <button type="button" className={`form-toggle__btn ${otherCalendarType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherCalendarType('SOLAR')}>양력</button>
                    <button type="button" className={`form-toggle__btn ${otherCalendarType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherCalendarType('LUNAR')}>음력</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">생년월일</label>
                  <BirthDatePicker value={otherBirthDate} onChange={setOtherBirthDate} calendarType={otherCalendarType} />
                </div>
                <div className="form-group">
                  <label className="form-label">태어난 시간 (선택)</label>
                  <select className="form-input form-select" value={otherBirthTime} onChange={(e) => setOtherBirthTime(e.target.value)}>
                    <option value="">모름 / 선택안함</option>
                    <option value="자시">자시 (23:00~01:00)</option>
                    <option value="축시">축시 (01:00~03:00)</option>
                    <option value="인시">인시 (03:00~05:00)</option>
                    <option value="묘시">묘시 (05:00~07:00)</option>
                    <option value="진시">진시 (07:00~09:00)</option>
                    <option value="사시">사시 (09:00~11:00)</option>
                    <option value="오시">오시 (11:00~13:00)</option>
                    <option value="미시">미시 (13:00~15:00)</option>
                    <option value="신시">신시 (15:00~17:00)</option>
                    <option value="유시">유시 (17:00~19:00)</option>
                    <option value="술시">술시 (19:00~21:00)</option>
                    <option value="해시">해시 (21:00~23:00)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">성별</label>
                  <div className="form-toggle">
                    <button type="button" className={`form-toggle__btn ${otherGender === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherGender('M')}><span className="g-circle g-male">♂</span></button>
                    <button type="button" className={`form-toggle__btn ${otherGender === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setOtherGender('F')}><span className="g-circle g-female">♀</span></button>
                  </div>
                </div>
                <button className="btn-gold" style={{ width: '100%', marginTop: 16, marginBottom: 24 }} disabled={!otherBirthDate || otherLoading || otherStreaming}
                  onClick={() => guardTodayFortune(() => startAnalysis(otherBirthDate, otherBirthTime, otherCalendarType, otherGender, {
                    setLoading: setOtherLoading, setStreamText: setOtherStreamText, setStreaming: setOtherStreaming,
                    setData: setOtherData, cleanupRef: otherCleanupRef,
                    setStreamFields: setOtherStreamFields, setDoneFields: setOtherDoneFields,
                  }, { targetType: 'other' }))}>
                  {otherLoading || otherStreaming ? 'AI 분석중...' : '운세 보기'} <HeartCost category="TODAY_FORTUNE" />
                </button>
              </div>
            ) : (
              renderResult(otherData, () => {
                otherCleanupRef.current?.(); setOtherData(null); setOtherBirthDate(''); setOtherBirthTime(''); setOtherGender(''); setOtherStreamText(''); setOtherStreaming(false);
              }, () => handleShare(otherData, '사주 운세 분석'), '운세 분석 결과', otherBirthDate ? { birthDate: otherBirthDate, birthTime: otherBirthTime, gender: otherGender, calendarType: otherCalendarType } : null)
            )
          )}

          {/* 하단 pull-up drawer — 최근 본 다른사람 운세 */}
          <HistoryDrawer
            type="other_fortune"
            label="📚 최근 본 다른사람 운세"
            onOpen={async (item) => {
              try {
                const full = await getHistory(item.id);
                const p = full?.payload;
                if (!p) return;
                setOtherBirthDate(p.otherBirthDate || '');
                setOtherBirthTime(p.otherBirthTime || '');
                setOtherGender(p.otherGender || '');
                setOtherCalendarType(p.otherCalendarType || 'SOLAR');
                setOtherData(p);
              } catch {}
            }}
          />
        </div>
      )}

      {/* ════════ 내 운세 ════════ */}
      {viewMode === 'mine' && !data && cacheChecking && (
        <div className="myf-other-form glass-card myf-cache-check">
          <div className="myf-cache-check-icon" aria-hidden="true">⏳</div>
          <p className="myf-cache-check-text">저장된 운세 확인중</p>
        </div>
      )}

      {viewMode === 'mine' && !cacheChecking && (
        <HistoryDrawer
          type="today_fortune"
          label="📚 최근 본 내 운세"
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              if (full?.payload) setData(full.payload);
            } catch {}
          }} />
      )}

      {viewMode === 'mine' && !data && !cacheChecking && (
        <div className="myf-other-form glass-card" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>🔮 {dateMode === 'today' ? '오늘의' : dateMode === 'tomorrow' ? '내일의' : getDateLabel()} 운세</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            버튼을 누르면 AI가 {userName || '당신'}님의 사주를 분석해드려요
          </p>
          <button className="btn-gold" style={{ width: '100%' }}
            onClick={() => guardTodayFortune(() => loadMyFortune(getTargetDate()))}>
            {dateMode === 'today' ? '오늘의' : dateMode === 'tomorrow' ? '내일의' : getDateLabel()} 운세 보기 <HeartCost category="TODAY_FORTUNE" />
          </button>
        </div>
      )}

      {viewMode === 'mine' && data && (
      <>
      <div className="myf-header">
        <h1 className="myf-title">{userName || user.name}님의 {dateMode === 'today' ? '오늘의' : dateMode === 'tomorrow' ? '내일의' : getDateLabel()} 운세</h1>
        <div className="myf-badges">
          <span className="myf-badge">{user.zodiacAnimal}띠</span>
          {saju?.dayMaster && <span className="myf-badge myf-badge--saju">{saju.dayMaster}일간</span>}
          {user.bloodType && <span className="myf-badge myf-badge--bt">{user.bloodType}형</span>}
          {user.mbtiType && <span className="myf-badge myf-badge--mbti">{user.mbtiType}</span>}
        </div>
      </div>

      {/* 점신 스타일 카테고리 sub-tab: 오늘 / 띠 / 별자리 */}
      <div className="myf-cat-tabs">
        <button className={`myf-cat-tab ${categoryTab === 'today' ? 'active' : ''}`} onClick={() => setCategoryTab('today')}>오늘의 운세</button>
        <button className={`myf-cat-tab ${categoryTab === 'zodiac' ? 'active' : ''}`} onClick={() => setCategoryTab('zodiac')}>띠 운세</button>
        <button className="myf-cat-tab" onClick={async () => {
          const bd = data?.user?.birthDate;
          if (bd) {
            try {
              const r = await getConstellationByDate(bd);
              if (r?.sign) {
                navigate('/constellation', { state: { autoStart: r.sign } });
                return;
              }
            } catch {}
          }
          navigate('/constellation');
        }}>별자리 운세</button>
      </div>

      {tabs.length > 1 && categoryTab === 'today' && (
        <div className="myf-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`myf-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <span className="myf-tab-icon">{tab.icon}</span>
              <span className="myf-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {f && categoryTab === 'today' && (
        <div className="myf-content fade-in" key={activeTab}>
          <div className="myf-score-wrap">
            <svg viewBox="0 0 120 120" className="myf-score-circle">
              <circle cx="60" cy="60" r="52" className="myf-score-bg" />
              <circle cx="60" cy="60" r="52" className="myf-score-fill"
                style={{ strokeDasharray: `${((f.score || 70) / 100) * 327} 327` }} />
            </svg>
            <div className="myf-score-inner">
              <span className="myf-score-num">{f.score || 70}</span>
              <span className="myf-score-unit">점</span>
            </div>
          </div>
          <div className="myf-stars-wrap"><StarRating score={f.score || 70} /></div>

          {activeTab === 'blood' && f.dayAnalysis && (
            <div className="myf-analysis glass-card"><span className="myf-analysis-icon">☯️</span><p>{f.dayAnalysis}</p></div>
          )}

          <div className="myf-cards">
            {f.overall && <FortuneCard icon="🌟" title="총운" description={f.overall} delay={0} />}
            {f.love && <FortuneCard icon="💕" title="애정운" description={f.love} delay={80} />}
            {f.money && <FortuneCard icon="💰" title="재물운" description={f.money} delay={160} />}
            {f.health && <FortuneCard icon="💪" title="건강운" description={f.health} delay={240} />}
            {f.work && <FortuneCard icon="💼" title="직장운" description={f.work} delay={320} />}
            {f.academic && <FortuneCard icon="📚" title="학업·자기계발운" description={f.academic} delay={400} />}
          </div>
          <HourlyTimeline items={f.hourlyFortune} />

          {activeTab === 'saju' && saju?.personalityReading && (
            <div className="myf-analysis glass-card">
              <span className="myf-analysis-icon">☯️</span>
              <h4 className="myf-analysis-title">사주 성격 분석</h4>
              <p>{saju.personalityReading}</p>
            </div>
          )}

          {f.tip && (<div className="myf-tip glass-card"><span>💡</span><p>{f.tip}</p></div>)}

          <LuckyGrid f={f} />
          <LuckyOutfitCard color={f.luckyColor} />
          <ScoreTrendChart zodiac={user?.zodiacAnimal} />
          {user?.zodiacAnimal && <ZodiacByYearCard zodiac={user.zodiacAnimal} />}
          <TodayCelebsCard />
          <BiorhythmLink />

          {activeTab === 'saju' && (() => {
            try {
              const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
              if (!profile.birthDate) return null;
              return <DeepAnalysis key={dateMode + pickDate} type="today" birthDate={profile.birthDate} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} extra={getTargetDate() || new Date().toISOString().slice(0, 10)} previousResult={data} />;
            } catch { return null; }
          })()}
        </div>
      )}

      {/* ═══ 띠 운세 탭 — 점신 스타일: 띠 한 줄 + 출생연도별 카드 ═══ */}
      {categoryTab === 'zodiac' && user?.zodiacAnimal && (() => {
        const myBirthYear = user.birthDate ? parseInt(user.birthDate.slice(0, 4), 10) : null;
        const oneLiner = getZodiacOneLiner(user.zodiacAnimal);
        return (
          <div className="myf-content fade-in" key="zodiac">
            <div className="myf-zodiac-hero glass-card">
              <div className="myf-zodiac-hero-icon">🐾</div>
              <div className="myf-zodiac-hero-name">{user.zodiacAnimal}띠</div>
              {oneLiner && <p className="myf-zodiac-hero-line">{oneLiner}</p>}
            </div>
            <ZodiacByYearCard zodiac={user.zodiacAnimal} userBirthYear={myBirthYear} fullCard />
          </div>
        );
      })()}


      {f && (
        <>
        <div className="myf-actions">
          <button className="myf-share-btn" onClick={() => handleShare(data, '오늘의 사주 운세')}>
            {copied ? '✅ 복사 완료!' : '📤 운세 공유하기'}
          </button>
        </div>

        </>
      )}
      </>
      )}
      <AnalysisComplete
        show={completing}
        theme="star"
        onDone={() => {
          setCompleting(false);
          const r = pendingResultRef.current;
          const setter = pendingSetterRef.current;
          pendingResultRef.current = null;
          pendingSetterRef.current = null;
          if (r && setter) setter(r);
        }}
      />
    </div>
  );
}

export default MyFortune;
