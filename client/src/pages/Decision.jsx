import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDecisionBasic, getDecisionStream, getDecisionSchema, getUser, getHistory } from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import FortuneCard from '../components/FortuneCard';
import MenuIcon from '../components/MenuIcon';
import StreamingCard from '../components/StreamingCard';
import { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import BirthDatePicker from '../components/BirthDatePicker';
import GenderPicker from '../components/GenderPicker';
import AnalysisComplete from '../components/AnalysisComplete';
import parseAiJson from '../utils/parseAiJson';
import { shareResult } from '../utils/share';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import { useToast } from '../components/Toast';
import HeroIconButtons from '../components/HeroIconButtons';
import WaitMessages from '../components/WaitMessages';
import { WAIT_MESSAGES } from '../data/waitMessages';
import './Decision.css';

const CATEGORIES = {
  reunion:  { label: '재회',   icon: '💔', iconKey: 'refresh',      color: '#A78BFA', soft: '#f1ecfe',
              title: '재회 결정 상담',
              question: '헤어진 사람과 다시 만나야 할까?',
              partnerLabel: '헤어진 사람 정보',
              situationPlaceholder: '얼마나 만났는지, 누가 먼저 헤어지자 했는지, 지금 연락 상태는 어떤지...',
              historyPlaceholder: '헤어진 후 다시 연락이 닿은 적이 있는지, 미련이 어느 정도인지...',
              particles: ['💔','💧','✨','💫','🌙'] },
  breakup:  { label: '이별',   icon: '🚪', iconKey: 'heartBroken',  color: '#94A3B8', soft: '#eef1f6',
              title: '이별 결정 상담',
              question: '이 관계를 끝내야 할까?',
              partnerLabel: '상대방 정보',
              situationPlaceholder: '얼마나 만났는지, 어떤 점이 힘든지, 무엇 때문에 헤어지고 싶은지...',
              historyPlaceholder: '얼마나 자주 다투는지, 권태기인지 본질적 갈등인지...',
              particles: ['🚪','💧','✨','🌙','💫'] },
  confess:  { label: '고백',   icon: '💌', iconKey: 'letter',       color: '#EC4899', soft: '#fdeaf4',
              title: '고백 결정 상담',
              question: '이 마음을 전해도 될까?',
              partnerLabel: '좋아하는 사람 정보',
              situationPlaceholder: '어떻게 알게 됐는지, 얼마나 좋아했는지, 상대 반응은 어떤지...',
              historyPlaceholder: '연락은 얼마나 자주 하는지, 둘만 만난 적이 있는지...',
              particles: ['💌','💘','💗','✨','🌹'] },
  marriage: { label: '결혼',   icon: '💒', iconKey: 'ring',         color: '#F472B6', soft: '#fdeef6',
              title: '결혼 결정 상담',
              question: '이 사람과 평생을 약속해도 될까?',
              partnerLabel: '예비 배우자 정보',
              situationPlaceholder: '얼마나 만났는지, 양가 분위기는 어떤지, 무엇이 마음에 걸리는지...',
              historyPlaceholder: '큰 갈등이나 가치관 차이가 있었는지, 어떻게 풀어왔는지...',
              particles: ['💒','💍','💐','✨','👰'] },
};

const VERDICT_LABELS = {
  yes:  { label: '진행해도 좋아', color: '#10B981', iconKey: 'check' },
  no:   { label: '조심스럽게 멈춰', color: '#F43F5E', iconKey: 'ban' },
  wait: { label: '조금만 더 기다려', color: '#F59E0B', iconKey: 'clock' },
};

// 판정은 서버 규칙이 사용자가 고른 현실 상황으로 확정한다. 숫자 확신도는 근거가 없어 쓰지 않고,
// "판단 근거 충분도"만 보여준다.
function VerdictBadge({ verdict, label, evidence, color }) {
  const v = VERDICT_LABELS[verdict] || VERDICT_LABELS.wait;
  return (
    <div className="dec-verdict-card" style={{ '--vc': color || v.color }}>
      <div className="dec-verdict-icon"><MenuIcon name={v.iconKey} size={34} /></div>
      <div className="dec-verdict-label">{label || v.label}</div>
      {evidence && (
        <div className="dec-verdict-evidence">
          판단 근거 <b>{evidence}</b>
        </div>
      )}
    </div>
  );
}

const GRADE_COLORS = { '유리': '#10B981', '보통': '#94A3B8', '주의': '#F59E0B' };

// 월별 타이밍 — 서버가 월운(지지 합충형해·보완 오행·기세)으로 계산한 등급
function TimingGrid({ grid }) {
  if (!Array.isArray(grid) || grid.length === 0) return null;
  return (
    <div className="dec-tgrid">
      <div className="dec-tgrid-title">
        <MenuIcon name="calendar" size={15} /> 향후 6개월 사주 타이밍
      </div>
      {grid.map((m) => (
        <div className="dec-tgrid-row" key={m.ym}>
          <span className="dec-tgrid-month">{m.month}월</span>
          <span className="dec-tgrid-grade" style={{ '--gc': GRADE_COLORS[m.grade] || '#94A3B8' }}>{m.grade}</span>
          <span className="dec-tgrid-why">{m.summary}</span>
        </div>
      ))}
    </div>
  );
}

// 위기(폭력·위협·자해) 입력 시 운세 대신 안내를 보여준다. AI 호출·하트 차감 없음.
function SafetyNotice({ message, onBack }) {
  return (
    <div className="dec-safety fade-in" role="alert">
      <div className="dec-safety-title"><MenuIcon name="alert" size={20} /> 안전이 먼저예요</div>
      <p className="dec-safety-msg">{message}</p>
      <p className="dec-safety-sub">이 상담은 운세의 관점으로 보는 참고용이라, 안전과 관련된 결정에는 쓰지 않는 게 좋아요. 하트는 차감되지 않았어요.</p>
      <button className="dec-reset" onClick={onBack}>돌아가기</button>
    </div>
  );
}

function Decision() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const userId = localStorage.getItem('userId');

  // 선택 카테고리 출처 우선순위: ?cat= (딥링크·새로고침에도 유지) → navigate state → 기본값
  const qsCat = new URLSearchParams(location.search).get('cat');
  const initialCat = qsCat && CATEGORIES[qsCat]
    ? qsCat
    : (location.state?.category && CATEGORIES[location.state.category]
        ? location.state.category : 'reunion');
  const [category, setCategory] = useState(initialCat);
  const info = CATEGORIES[category];

  const [birth, setBirth] = useState('');
  const [gender, setGender] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [birthTime, setBirthTime] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [partnerGender, setPartnerGender] = useState('');
  const [partnerCalendarType, setPartnerCalendarType] = useState('SOLAR');
  const [situation, setSituation] = useState('');
  const [showPartner, setShowPartner] = useState(true);

  // 구조화 입력: 질문 스키마는 서버가 단일 출처. 답변은 카테고리별로 보관(탭 전환해도 유지).
  const [schema, setSchema] = useState(null);
  const [answersByCat, setAnswersByCat] = useState({});
  const [safety, setSafety] = useState(null);     // { message } — 위기 입력 안내
  const [preview, setPreview] = useState(null);   // 서버 판정 미리보기(스트리밍 중 표시)
  const answers = answersByCat[category] || { safety: 'none' };
  const setAnswer = (key, code) =>
    setAnswersByCat((prev) => ({ ...prev, [category]: { safety: 'none', ...(prev[category] || {}), [key]: code } }));
  const questions = schema?.[category] || [];
  const requiredMissing = questions.filter((q) => q.required && !answers[q.key]);

  useEffect(() => {
    let alive = true;
    getDecisionSchema().then((s) => { if (alive) setSchema(s); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamFields, setStreamFields] = useState({});
  const [doneFields, setDoneFields] = useState(new Set());
  const [matrixShown, setMatrixShown] = useState(false);
  const [result, setResult] = useState(null);
  const [completing, setCompleting] = useState(false);
  const pendingResultRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 카테고리 전환 시 결과/스트리밍 초기화 (입력은 유지)
  useEffect(() => {
    setResult(null);
    setSafety(null);
    setPreview(null);
    setMatrixShown(false);
    setStreamFields({});
    setDoneFields(new Set());
    cleanupRef.current?.();
  }, [category]);

  // 자동 채움 — 로그인 마운트 시
  const handleAutoFill = async () => {
    let p = null;
    try {
      const uid = localStorage.getItem('userId');
      if (uid) {
        p = await getUser(uid);
        if (p) localStorage.setItem('userProfile', JSON.stringify(p));
      }
    } catch {}
    if (!p) {
      try { p = JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { p = {}; }
    }
    if (p.birthDate) setBirth(p.birthDate);
    if (p.gender) setGender(p.gender);
    if (p.calendarType) setCalendarType(p.calendarType);
    if (p.birthTime) setBirthTime(p.birthTime);
    if (p.partnerBirthDate) {
      setPartnerDate(p.partnerBirthDate);
      if (p.partnerCalendarType) setPartnerCalendarType(p.partnerCalendarType);
      const pg = p.gender === 'M' ? 'F' : p.gender === 'F' ? 'M' : '';
      if (pg) setPartnerGender(pg);
    }
  };
  useEffect(() => {
    if (!userId) return;
    if (location.state?.restoreHistoryId) return;
    if (birth) return;
    handleAutoFill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 히스토리 복원
  useEffect(() => {
    const hid = location.state?.restoreHistoryId;
    if (!hid) return;
    (async () => {
      try {
        const full = await getHistory(hid);
        if (full?.payload) {
          setResult(full.payload);
          if (full.payload.category) setCategory(full.payload.category);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.restoreHistoryId]);

  // 탭 전환 시 URL 도 같이 바꿔 새로고침·공유에도 선택이 유지된다.
  // state 는 그대로 넘겨 히스토리 복원(restoreHistoryId) 흐름을 깨지 않는다.
  const selectCategory = (key) => {
    setCategory(key);
    navigate(`/decision?cat=${key}`, { replace: true, state: location.state });
  };

  const { guardedAction } = useHeartGuard('DECISION_CONSULT');

  const buildPartnerInfo = () => {
    if (!partnerDate) return null;
    let s = `생년월일: ${partnerDate}`;
    if (partnerGender) s += ` / 성별: ${partnerGender === 'M' ? '남' : '여'}`;
    if (partnerCalendarType === 'LUNAR') s += ' / 음력';
    return s;
  };

  const stopAmbient = () => { try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null; };

  const handleAnalyze = async () => {
    if (!birth || requiredMissing.length > 0) return;
    setLoading(true);
    setResult(null);
    setSafety(null);
    setPreview(null);
    setMatrixShown(true);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const partnerInfo = buildPartnerInfo();

    try {
      // 서버 판정(AI 호출 없음) + 캐시 선조회
      const basic = await getDecisionBasic(category, {
        birthDate: birth, birthTime: birthTime || null, gender: gender || 'M',
        partnerInfo, answers, situation,
      });
      if (basic.safety) {
        // 위기 입력 — 운세 대신 안내. AI 호출·차감 없음.
        setSafety({ message: basic.safetyMessage });
        setLoading(false); setMatrixShown(false); stopAmbient();
        return;
      }
      if (basic.aiAnalyzed && basic.overall) {
        setResult(basic);
        setLoading(false);
        setMatrixShown(false);
        stopAmbient();
        return;
      }
      setPreview(basic);

      // 스트리밍
      setStreaming(true);
      setStreamFields({}); setDoneFields(new Set());
      let buffer = '';
      const PROG_FIELDS = ['headline', 'overall', 'timing', 'bestPeriod', 'actionPlan', 'conditions', 'closing'];
      cleanupRef.current = getDecisionStream(category, {
        birthDate: birth,
        birthTime: birthTime || null,
        gender: gender || 'M',
        partnerInfo, answers, situation,
        onChunk: (text) => {
          buffer += text;
          const partial = extractStreamingFieldsPartial(buffer, PROG_FIELDS);
          const next = {}; const newDone = [];
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
          setStreaming(false); setLoading(false);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          // done 페이로드 = 서버가 검증·정리한 최종 결과(판정은 서버 확정값). verdict 가 없으면 검증/파싱 실패.
          const parsed = parseAiJson(fullText || '');
          if (parsed && parsed.verdict && parsed.overall) {
            pendingResultRef.current = parsed;
            setStreamFields({}); setDoneFields(new Set());
            setMatrixShown(false);
            setCompleting(true);
          } else {
            pendingResultRef.current = null;
            setStreamFields({}); setDoneFields(new Set());
            setMatrixShown(false); setPreview(null);
            toast('결과를 만들지 못했어요. 하트는 차감되지 않았어요. 다시 시도해 주세요.', 'error');
          }
        },
        onError: (err) => {
          setStreaming(false); setLoading(false); setMatrixShown(false);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          if (err === 'safety') { setSafety({ message: '안전이 먼저예요. 상황이 위험하다면 112 또는 1366에 연락해 주세요.' }); return; }
          if (err && err !== 'profile_required') toast('분석에 실패했어요. 다시 시도해 주세요.', 'error');
        },
      });
    } catch (e) {
      console.error(e);
      setLoading(false); setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const handleReset = () => {
    setResult(null);
    setSafety(null);
    setPreview(null);
    setMatrixShown(false);
    setStreamFields({}); setDoneFields(new Set());
    cleanupRef.current?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const themeStyle = { '--dec-color': info.color };

  return (
    <div className="dec-page" style={themeStyle}>
      <AnalysisComplete
        show={completing}
        theme="love"
        onDone={() => {
          setCompleting(false);
          if (pendingResultRef.current) {
            setResult(pendingResultRef.current);
            pendingResultRef.current = null;
          }
        }}
      />

      {/* ═══ 히어로 ═══ */}
      <div className="dec-hero" style={{ position: 'relative', paddingLeft: 48, paddingRight: 48 }}>
        <HeroIconButtons color={info.color} onReset={result ? handleReset : undefined} />
        <div className="dec-hero-bg" />
        {/* 이모지 파티클 제거 — 중앙에서 방사형으로 퍼지며 제목 위를 지나가 글자와 겹쳤고,
            홈 간판(외곽선 아이콘·깔끔한 면)과 톤이 맞지 않았다. 배경 글로우만 유지. */}
        <div className="dec-hero-badge">사주 기반 결정 상담</div>
        <h1 className="dec-hero-title">결정이 어려울 때</h1>
        <p className="dec-hero-desc">사주의 흐름이 알려주는 <b>지금의 답</b></p>
      </div>

      {/* ═══ 카테고리 탭 ═══ */}
      <div className="dec-tabs">
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <button key={key}
            className={`dec-tab ${category === key ? 'dec-tab--active' : ''}`}
            onClick={() => selectCategory(key)}
            aria-pressed={category === key}
            style={category === key ? { '--tc': c.color } : {}}>
            <span className="dec-tab-icon"><MenuIcon name={c.iconKey} size={22} /></span>
            <span className="dec-tab-label">{c.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ 카테고리별 질문 헤더 ═══ */}
      <div className="dec-q-banner" style={{ '--tc': info.color, '--tc-soft': info.soft }}>
        <div className="dec-q-title">{info.title}</div>
        <div className="dec-q-text">"{info.question}"</div>
      </div>

      {/* ═══ 최근 본 결정 상담 ═══ */}
      {userId && !loading && !streaming && !result && (
        <HistoryDrawer
          type="decision"
          label="📚 최근 본 결정 상담"
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              if (full?.payload) {
                setResult(full.payload);
                if (full.payload.category) setCategory(full.payload.category);
              }
            } catch {}
          }}
        />
      )}

      {/* ═══ 위기 안내 (운세 대신) ═══ */}
      {safety && !result && !loading && !streaming && (
        <SafetyNotice message={safety.message} onBack={() => setSafety(null)} />
      )}

      {/* ═══ 입력 폼 ═══ */}
      {!result && !loading && !streaming && !safety && (
        <div className="dec-form fade-in">
          {userId && (
            <button className="dec-autofill" onClick={handleAutoFill}>
              <MenuIcon name="sparkle" size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              내 정보 / 상대 정보로 채우기
            </button>
          )}

          <div className="dec-person-block">
            <h3 className="dec-person-title">
              <MenuIcon name="user" size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              내 정보
            </h3>
            <BirthDatePicker value={birth} onChange={setBirth}
              calendarType={calendarType} onCalendarTypeChange={setCalendarType} />
            <div style={{ marginTop: 10 }}>
              <GenderPicker value={gender} onChange={setGender} />
            </div>
          </div>

          <div className="dec-person-block">
            <h3 className="dec-person-title">
              <MenuIcon name="heart" size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {info.partnerLabel}
              <span className="dec-opt"> (선택 — 입력 시 더 정확)</span>
            </h3>
            <BirthDatePicker value={partnerDate} onChange={setPartnerDate}
              calendarType={partnerCalendarType} onCalendarTypeChange={setPartnerCalendarType} />
            <div style={{ marginTop: 10 }}>
              <GenderPicker value={partnerGender} onChange={setPartnerGender} />
            </div>
          </div>

          {/* 구조화 질문 — 선택지는 서버 규칙이 판정에 쓰는 현실 근거. 같은 상황이면 같은 판정이 나온다. */}
          <div className="dec-guide-block">
            <h3 className="dec-guide-title">
              <MenuIcon name="chat" size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              지금 상황을 골라줘
            </h3>
            {!schema && <div className="dec-opt">질문을 불러오는 중…</div>}
            {questions.map((q) => (
              <div className="dec-q" key={q.key}>
                <div className="dec-q-label">
                  {q.label}{!q.required && <span className="dec-opt"> (선택)</span>}
                </div>
                <div className="dec-q-chips" role="group" aria-label={q.label}>
                  {q.options.map((op) => (
                    <button key={op.code} type="button"
                      className={`dec-q-chip ${answers[q.key] === op.code ? 'dec-q-chip--on' : ''}`}
                      aria-pressed={answers[q.key] === op.code}
                      onClick={() => setAnswer(q.key, op.code)}>
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="dec-guide-block">
            <h3 className="dec-guide-title">
              <MenuIcon name="history" size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              더 하고 싶은 말
              <span className="dec-opt"> (선택 — 판정은 위 선택지로 정해져요)</span>
            </h3>
            <textarea className="dec-textarea"
              placeholder={info.situationPlaceholder}
              value={situation} onChange={(e) => setSituation(e.target.value.slice(0, 300))}
              rows={3} maxLength={300} />
            <div className="dec-chars">{situation.length}/300</div>
          </div>

          <button className="dec-submit" onClick={() => guardedAction(handleAnalyze)}
            disabled={!birth || !schema || requiredMissing.length > 0}>
            {info.iconKey ? <MenuIcon name={info.iconKey} size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : info.icon}
            {' '}{info.title} 시작 <HeartCost category="DECISION_CONSULT" />
          </button>
          {schema && birth && requiredMissing.length > 0 && (
            <p className="dec-need">위 질문 {requiredMissing.length}개에 답해 주세요</p>
          )}

          <p className="dec-disclaimer">
            ※ 결정 상담은 사주의 흐름으로 보는 <b>참고 분석</b>이에요.
            인생의 중요한 결정은 본인의 마음과 충분한 대화를 거쳐 내리는 게 가장 좋아요.
          </p>
        </div>
      )}

      {/* ═══ Progressive 스트리밍 ═══ */}
      {matrixShown && !result && (() => {
        const st = (key) => {
          if (!streaming) return 'pending';
          if (doneFields.has(key)) return 'done';
          if (streamFields[key]) return 'streaming';
          return 'pending';
        };
        return (
          <div className="dec-streaming-wrap">
            <div className="dec-streaming-header">
              <div className="dec-streaming-title">
                <span className="dec-streaming-orb"><MenuIcon name={info.iconKey} size={26} /></span>
                <span>사주의 흐름을 읽고 있어요</span>
                <span className="streaming-dots"><i/><i/><i/></span>
              </div>
              <WaitMessages messages={WAIT_MESSAGES.love} interval={6000} variant="large" />
            </div>
            {preview?.verdict && (
              <VerdictBadge verdict={preview.verdict} label={preview.verdictLabel}
                evidence={preview.evidence} color={info.color} />
            )}
            <div className="dec-streaming-cards">
              <StreamingCard icon="🎯" title="한 줄 요지"     text={streamFields.headline   || ''} status={st('headline')}   delay={0} />
              <StreamingCard icon="📖" title="종합 분석"     text={streamFields.overall    || ''} status={st('overall')}    delay={80} />
              <StreamingCard icon="⏳" title="타이밍 분석"   text={streamFields.timing     || ''} status={st('timing')}     delay={160} />
              <StreamingCard icon="📅" title="가장 좋은 시기" text={streamFields.bestPeriod || ''} status={st('bestPeriod')} delay={240} />
              <StreamingCard icon="🗺️" title="행동 로드맵"   text={streamFields.actionPlan || ''} status={st('actionPlan')} delay={320} />
              <StreamingCard icon="✅" title="결정 조건"     text={streamFields.conditions || ''} status={st('conditions')} delay={400} />
              <StreamingCard icon="💌" title="마무리 한 마디" text={streamFields.closing    || ''} status={st('closing')}    delay={480} />
            </div>
          </div>
        );
      })()}

      {/* ═══ 결과 ═══ */}
      {result && (
        <div className="dec-result fade-in">
          <VerdictBadge
            verdict={result.verdict}
            label={result.verdictLabel}
            evidence={result.evidence}
            color={info.color}
          />

          {Array.isArray(result.reasons) && result.reasons.length > 0 && (
            <div className="dec-reasons">
              <div className="dec-reasons-title">이렇게 판단했어요 <span className="dec-opt">(내가 고른 상황 기준)</span></div>
              <ul>{result.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {result.headline && (
            <div className="dec-headline" style={{ '--tc': info.color }}>
              <span className="dec-headline-mark">"</span>
              {result.headline}
              <span className="dec-headline-mark">"</span>
            </div>
          )}

          {result.overall && (
            <FortuneCard iconKey="book" title="종합 분석" description={result.overall} delay={0} />
          )}
          {result.timing && (
            <FortuneCard iconKey="clock" title="타이밍 분석" description={result.timing} delay={80} />
          )}

          <TimingGrid grid={result.timingGrid} />

          {(result.bestPeriod || result.worstPeriod) && (
            <div className="dec-period-grid">
              {result.bestPeriod && (
                <div className="dec-period dec-period--best">
                  <div className="dec-period-label"><MenuIcon name="calendar" size={15} /> 가장 좋은 시기</div>
                  <div className="dec-period-text">{result.bestPeriod}</div>
                </div>
              )}
              {result.worstPeriod && (
                <div className="dec-period dec-period--worst">
                  <div className="dec-period-label"><MenuIcon name="ban" size={15} /> 피해야 할 시기</div>
                  <div className="dec-period-text">{result.worstPeriod}</div>
                </div>
              )}
            </div>
          )}

          {result.actionPlan && (
            <FortuneCard iconKey="compass" title="행동 로드맵" description={result.actionPlan} delay={160} />
          )}
          {result.conditions && (
            <FortuneCard iconKey="check" title="결정 조건" description={result.conditions} delay={240} />
          )}
          {result.redFlags && (
            <FortuneCard iconKey="alert" title="주의 신호" description={result.redFlags} delay={320} />
          )}

          {Array.isArray(result.basis) && result.basis.length > 0 && (
            <details className="dec-basis">
              <summary>풀이 근거 보기 <span className="dec-opt">(사주 계산값 · 추정 포함)</span></summary>
              <ul>{result.basis.map((b) => <li key={b.id}>{b.text}</li>)}</ul>
              {result.strength && <p className="dec-basis-note">신강·신약, 보완 오행은 월령·지장간 기준의 <b>추정 후보</b>예요 ({result.strength}).</p>}
            </details>
          )}

          {result.ownerNote && (
            <div className="dec-owner-note">
              <span className="dec-owner-icon"><MenuIcon name="lightbulb" size={18} /></span>
              <div>{result.ownerNote}</div>
            </div>
          )}
          {result.closing && (
            <div className="dec-closing" style={{ '--tc': info.color }}>
              {result.closing}
            </div>
          )}

          <button className="dec-share" onClick={async () => {
            const text = `[${info.title}]\n"${result.headline || ''}"\n${(result.overall || '').split('.').slice(0, 2).join('.')}.\n\nhttps://recipepig.kr`;
            const res = await shareResult({ title: `${info.title} 결과`, text });
            if (res === 'copied') toast('클립보드에 복사되었습니다', 'success');
          }}><MenuIcon name="share" size={16} /> 공유하기</button>
          <button className="dec-reset" onClick={handleReset}>다시 보기</button>
        </div>
      )}
    </div>
  );
}

export default Decision;
