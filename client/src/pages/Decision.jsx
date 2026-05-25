import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDecisionBasic, getDecisionStream, getUser, getHistory } from '../api/fortune';
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
  reunion:  { label: '재회',   icon: '💔', iconKey: 'refresh',      color: '#A78BFA',
              title: '재회 결정 상담',
              question: '헤어진 사람과 다시 만나야 할까?',
              partnerLabel: '헤어진 사람 정보',
              situationPlaceholder: '얼마나 만났는지, 누가 먼저 헤어지자 했는지, 지금 연락 상태는 어떤지...',
              historyPlaceholder: '헤어진 후 다시 연락이 닿은 적이 있는지, 미련이 어느 정도인지...',
              particles: ['💔','💧','✨','💫','🌙'] },
  breakup:  { label: '이별',   icon: '🚪', iconKey: 'moon',         color: '#94A3B8',
              title: '이별 결정 상담',
              question: '이 관계를 끝내야 할까?',
              partnerLabel: '상대방 정보',
              situationPlaceholder: '얼마나 만났는지, 어떤 점이 힘든지, 무엇 때문에 헤어지고 싶은지...',
              historyPlaceholder: '얼마나 자주 다투는지, 권태기인지 본질적 갈등인지...',
              particles: ['🚪','💧','✨','🌙','💫'] },
  confess:  { label: '고백',   icon: '💌', iconKey: 'letter',       color: '#EC4899',
              title: '고백 결정 상담',
              question: '이 마음을 전해도 될까?',
              partnerLabel: '좋아하는 사람 정보',
              situationPlaceholder: '어떻게 알게 됐는지, 얼마나 좋아했는지, 상대 반응은 어떤지...',
              historyPlaceholder: '연락은 얼마나 자주 하는지, 둘만 만난 적이 있는지...',
              particles: ['💌','💘','💗','✨','🌹'] },
  marriage: { label: '결혼',   icon: '💒', iconKey: 'ring',         color: '#F472B6',
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

function VerdictBadge({ verdict, label, confidence, color }) {
  const v = VERDICT_LABELS[verdict] || VERDICT_LABELS.wait;
  return (
    <div className="dec-verdict-card" style={{ '--vc': color || v.color }}>
      <div className="dec-verdict-icon"><MenuIcon name={v.iconKey} size={34} /></div>
      <div className="dec-verdict-label">{label || v.label}</div>
      <div className="dec-verdict-confidence">
        <span className="dec-vc-num">{confidence ?? 60}</span>
        <span className="dec-vc-unit">% 확신</span>
      </div>
      <div className="dec-verdict-bar">
        <div className="dec-verdict-bar-fill" style={{ width: `${confidence ?? 60}%` }} />
      </div>
    </div>
  );
}

function Decision() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const userId = localStorage.getItem('userId');

  const initialCat = location.state?.category && CATEGORIES[location.state.category]
    ? location.state.category : 'reunion';
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
  const [history, setHistory] = useState('');
  const [showPartner, setShowPartner] = useState(true);

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

  const { guardedAction } = useHeartGuard('DECISION_CONSULT');

  const buildPartnerInfo = () => {
    if (!partnerDate) return null;
    let s = `생년월일: ${partnerDate}`;
    if (partnerGender) s += ` / 성별: ${partnerGender === 'M' ? '남' : '여'}`;
    if (partnerCalendarType === 'LUNAR') s += ' / 음력';
    return s;
  };

  const handleAnalyze = async () => {
    if (!birth) return;
    setLoading(true);
    setResult(null);
    setMatrixShown(true);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    const partnerInfo = buildPartnerInfo();

    try {
      // 캐시 선조회
      const basic = await getDecisionBasic(category, {
        birthDate: birth, gender: gender || 'M',
        partnerInfo, situation, history,
      });
      if (basic.aiAnalyzed && basic.overall) {
        setResult(basic);
        setLoading(false);
        setMatrixShown(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        return;
      }

      // 스트리밍
      setStreaming(true);
      setStreamFields({}); setDoneFields(new Set());
      let buffer = '';
      const PROG_FIELDS = ['headline', 'overall', 'timing', 'bestPeriod', 'actionPlan', 'conditions', 'closing'];
      cleanupRef.current = getDecisionStream(category, {
        birthDate: birth,
        birthTime: birthTime || null,
        gender: gender || 'M',
        partnerInfo, situation, history,
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
          const parsed = parseAiJson(fullText || '');
          if (parsed) {
            pendingResultRef.current = {
              category, categoryKr: info.title,
              birthDate: birth,
              verdict: parsed.verdict || 'wait',
              verdictLabel: parsed.verdictLabel || '',
              confidence: parsed.confidence ?? 60,
              headline: parsed.headline || '',
              overall: parsed.overall || '',
              timing: parsed.timing || '',
              bestPeriod: parsed.bestPeriod || '',
              worstPeriod: parsed.worstPeriod || '',
              actionPlan: parsed.actionPlan || '',
              conditions: parsed.conditions || '',
              redFlags: parsed.redFlags || '',
              ownerNote: parsed.ownerNote || '',
              closing: parsed.closing || '',
            };
          } else {
            pendingResultRef.current = {
              category, categoryKr: info.title, birthDate: birth,
              verdict: 'wait', confidence: 60,
              overall: fullText || ''
            };
          }
          setStreamFields({}); setDoneFields(new Set());
          setMatrixShown(false);
          setCompleting(true);
        },
        onError: (err) => {
          setStreaming(false); setLoading(false); setMatrixShown(false);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
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
        <div className="dec-hero-particles">
          {info.particles.map((p, i) => (
            <span key={i} className="dec-hero-particle" style={{ '--p-i': i, '--p-delay': `${i * 0.4}s` }}>{p}</span>
          ))}
        </div>
        <div className="dec-hero-badge">간판 · 결정 상담</div>
        <h1 className="dec-hero-title">결정이 어려울 때</h1>
        <p className="dec-hero-desc">사주의 흐름이 알려주는 <b>지금의 답</b></p>
      </div>

      {/* ═══ 카테고리 탭 ═══ */}
      <div className="dec-tabs">
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <button key={key}
            className={`dec-tab ${category === key ? 'dec-tab--active' : ''}`}
            onClick={() => setCategory(key)}
            style={category === key ? { '--tc': c.color } : {}}>
            <span className="dec-tab-icon"><MenuIcon name={c.iconKey} size={22} /></span>
            <span className="dec-tab-label">{c.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ 카테고리별 질문 헤더 ═══ */}
      <div className="dec-q-banner" style={{ '--tc': info.color }}>
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

      {/* ═══ 입력 폼 ═══ */}
      {!result && !loading && !streaming && (
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

          <div className="dec-guide-block">
            <h3 className="dec-guide-title">
              <MenuIcon name="chat" size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              지금 상황 알려줘
              <span className="dec-opt"> (선택 — 더 정확한 상담을 위해)</span>
            </h3>
            <textarea className="dec-textarea"
              placeholder={info.situationPlaceholder}
              value={situation} onChange={(e) => setSituation(e.target.value.slice(0, 300))}
              rows={3} maxLength={300} />
            <div className="dec-chars">{situation.length}/300</div>
          </div>

          <div className="dec-guide-block">
            <h3 className="dec-guide-title">
              <MenuIcon name="history" size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              관계의 흐름
              <span className="dec-opt"> (선택)</span>
            </h3>
            <textarea className="dec-textarea"
              placeholder={info.historyPlaceholder}
              value={history} onChange={(e) => setHistory(e.target.value.slice(0, 300))}
              rows={3} maxLength={300} />
            <div className="dec-chars">{history.length}/300</div>
          </div>

          <button className="dec-submit" onClick={() => guardedAction(handleAnalyze)}
            disabled={!birth}>
            {info.iconKey ? <MenuIcon name={info.iconKey} size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : info.icon}
            {' '}{info.title} 시작 <HeartCost category="DECISION_CONSULT" />
          </button>

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
            confidence={result.confidence}
            color={info.color}
          />

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
