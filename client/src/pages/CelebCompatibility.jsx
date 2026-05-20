import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSajuCompatibility, getSajuCompatibilityBasic, getCompatibilityStream, saveCompatCache, searchCeleb, getCelebCommunity, analyzeSajuStream, isGuest, getHistory } from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import parseAiJson, { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import StreamingCard from '../components/StreamingCard';
import CELEBRITIES from '../data/celebrities';
import GROUPS from '../data/groups';
import BirthDatePicker from '../components/BirthDatePicker';
import GenderPicker from '../components/GenderPicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import AnalysisComplete from '../components/AnalysisComplete';
import StarHero from '../components/StarHero';
import HeroIconButtons from '../components/HeroIconButtons';
import { shareResult } from '../utils/share';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import { useToast } from '../components/Toast';
import './CelebCompatibility.css';

const GRADE_COLORS = { '천생연분': '#ff3d7f', '좋은 인연': '#ff6b9d', '보통': '#fbbf24', '노력 필요': '#94a3b8', '상극': '#64748b' };
const USER_CELEBS_KEY = 'userCelebrities';

// 카테고리별 시그니처 컬러 — 아바타 그라데이션·뱃지 톤
const CATEGORY_COLORS = {
  idol:         { from: '#ec4899', to: '#a855f7', label: '아이돌',      emoji: '✨' },
  actor:        { from: '#f59e0b', to: '#ef4444', label: '배우',        emoji: '🎬' },
  singer:       { from: '#06b6d4', to: '#3b82f6', label: '가수',        emoji: '🎤' },
  entertainer:  { from: '#10b981', to: '#22d3ee', label: '예능인',      emoji: '🎙️' },
  athlete:      { from: '#84cc16', to: '#22c55e', label: '운동선수',    emoji: '🏆' },
  model:        { from: '#d946ef', to: '#ec4899', label: '모델',        emoji: '👗' },
  influencer:   { from: '#f43f5e', to: '#fb7185', label: '인플루언서',  emoji: '📱' },
  trot:         { from: '#fbbf24', to: '#f59e0b', label: '트로트',      emoji: '🎼' },
  custom:       { from: '#a855f7', to: '#ec4899', label: '스타',        emoji: '🌟' },
};
function catColor(celeb) {
  const k = celeb?.category || 'custom';
  return CATEGORY_COLORS[k] || CATEGORY_COLORS.custom;
}
// 이름 첫 글자 (아바타용)
function initial(name) {
  if (!name) return '★';
  // 한글/영문 첫 1자
  return name.trim().slice(0, 1).toUpperCase();
}

function getUserCelebs() {
  try { return JSON.parse(localStorage.getItem(USER_CELEBS_KEY) || '[]'); }
  catch { return []; }
}
function saveUserCeleb(celeb) {
  const list = getUserCelebs();
  if (!list.find(c => c.name === celeb.name && c.birth === celeb.birth)) {
    list.push(celeb);
    localStorage.setItem(USER_CELEBS_KEY, JSON.stringify(list));
  }
}

function CelebCompatibility() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const initCeleb = location.state?.selectedCeleb || null;
  const [step, setStep] = useState(initCeleb ? 'input' : 'select');
  const [selectedCeleb, setSelectedCeleb] = useState(initCeleb);
  const [searchQuery, setSearchQuery] = useState('');

  // 직접 입력
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualBirth, setManualBirth] = useState('');
  const [manualGender, setManualGender] = useState('');

  // AI 검색 팝업
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAiPopup, setShowAiPopup] = useState(false);

  // 내 정보
  const [myBirth, setMyBirth] = useState('');
  const [myGender, setMyGender] = useState('');
  const [myCalType, setMyCalType] = useState('SOLAR');
  const [myBirthTime, setMyBirthTime] = useState('');

  const [result, setResult] = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const resultRef = useRef(null);

  // 스타 운세
  const [starFortune, setStarFortune] = useState(null);
  const [starFortuneLoading, setStarFortuneLoading] = useState(false);
  const [starStreamText, setStarStreamText] = useState('');
  const [starStreaming, setStarStreaming] = useState(false);
  const starCleanupRef = useRef(null);

  // 매트릭스 오버레이 (메인 궁합 + 스타 운세)
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [matrixLabel, setMatrixLabel] = useState('');
  const [streamText, setStreamText] = useState('');
  const [compatStreamFields, setCompatStreamFields] = useState({});
  const [compatDoneFields, setCompatDoneFields] = useState(new Set());
  const [starStreamFields, setStarStreamFields] = useState({});
  const [starDoneFields, setStarDoneFields] = useState(new Set());
  const compatBufferRef = useRef('');
  const starBufferRef = useRef('');
  const compatCleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);
  const [completing, setCompleting] = useState(false);
  const pendingCompatRef = useRef(null);
  const pendingStarRef = useRef(null);

  useEffect(() => () => compatCleanupRef.current?.(), []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // state 소비 후 제거 (뒤로가기 중복 방지)
  useEffect(() => {
    if (location.state?.selectedCeleb) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  // 커뮤니티 DB (서버 — 모든 사용자가 검색한 연예인 풀)
  const [communityCelebs, setCommunityCelebs] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const list = await getCelebCommunity();
        // 서버 응답 → 내장 DB 형식으로 정규화 (group/birth/category/name)
        const normalized = (list || []).map((c) => ({
          name: c.name,
          birth: c.birth,
          gender: c.gender,
          category: c.category || 'custom',
          group: c.group || null,
          info: c.info || '',
          _community: true, // 출처 표시 (UI 뱃지용)
        }));
        setCommunityCelebs(normalized);
      } catch {}
    })();
  }, []);

  // 내장 DB + 커뮤니티 DB + 로컬 사용자 추가 DB 병합 (이름 중복 제거)
  const allCelebs = useMemo(() => {
    const merged = [...CELEBRITIES, ...communityCelebs, ...getUserCelebs()];
    const seen = new Set();
    return merged.filter((c) => {
      const k = `${c.name}|${c.birth}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [communityCelebs, step]);

  // 통합 목록: 그룹 + 모든 개인 스타. 검색어로만 필터링 (카테고리 탭 폐지)
  const filteredItems = useMemo(() => {
    const items = [];
    const q = searchQuery.trim().toLowerCase();

    // 그룹
    let groups = GROUPS;
    if (q) groups = groups.filter(g => g.name.toLowerCase().includes(q));
    groups.forEach(g => items.push({ _type: 'group', ...g }));

    // 개인 스타
    let celebs = allCelebs;
    if (q) {
      celebs = celebs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.group && c.group.toLowerCase().includes(q))
      );
    }
    celebs.forEach(c => items.push({ _type: 'celeb', ...c }));

    return items;
  }, [searchQuery, allCelebs]);

  const handleSelectCeleb = (celeb) => {
    setSelectedCeleb(celeb);
    setStep('input');
  };

  const handleSelectGroup = (group) => {
    navigate('/celeb-fortune', { state: { selectedGroup: group } });
  };

  // 직접 입력 → 확인 버튼
  const handleManualConfirm = async () => {
    if (!manualName.trim()) return;

    // 1) 내장 + 사용자 DB에서 검색
    const q = manualName.trim().toLowerCase();
    const dbMatch = allCelebs.find(c => c.name.toLowerCase() === q);
    if (dbMatch) {
      setSelectedCeleb(dbMatch);
      setStep('input');
      return;
    }

    // 2) AI 검색
    setAiSearching(true);
    try {
      const res = await searchCeleb(manualName.trim());
      if (res.found) {
        setAiResult(res);
        setShowAiPopup(true);
      } else {
        // AI도 못 찾음 → 직접 입력 폼 표시
        setAiResult(null);
        setShowAiPopup(false);
      }
    } catch {
      // 에러 시 직접 입력으로 진행
    }
    setAiSearching(false);
  };

  // AI 결과 확인 → DB 저장 + 궁합 진행
  const handleAiConfirm = () => {
    const celeb = {
      name: aiResult.name,
      birth: aiResult.birth,
      gender: aiResult.gender,
      category: aiResult.category || 'custom',
      group: aiResult.group || null,
    };
    saveUserCeleb(celeb);
    setSelectedCeleb(celeb);
    setShowAiPopup(false);
    setAiResult(null);
    setStep('input');
  };

  // AI 결과 거절 → 직접 입력한 값으로 궁합만 (DB 저장 X)
  const handleAiReject = () => {
    setShowAiPopup(false);
    setAiResult(null);
    // 직접 입력 폼이 보이도록 유지
  };

  // 직접 입력 폼으로 궁합 보기 (DB 저장 X)
  const handleManualSelect = () => {
    if (!manualName || !manualBirth || !manualGender) return;
    setSelectedCeleb({ name: manualName, birth: manualBirth, gender: manualGender, category: 'custom' });
    setStep('input');
  };

  const handleAutoFill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setMyBirth(p.birthDate);
      if (p.gender) setMyGender(p.gender);
      if (p.birthTime) setMyBirthTime(p.birthTime);
      if (p.calendarType) setMyCalType(p.calendarType);
    } catch {}
  };

  const { guardedAction: guardCelebCompat } = useHeartGuard('CELEB_COMPAT');
  const { guardedAction: guardCelebFortune } = useHeartGuard('CELEB_FORTUNE');

  const handleAnalyze = async () => {
    if (!myBirth || !selectedCeleb) return;
    setStep('loading');
    setStreamText('');
    setMatrixLabel(`AI가 나와 ${selectedCeleb.name}의 운명을 분석하고 있어요`);
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      // 1) 기본(사주 계산) — 캐시에 AI 있으면 즉시 반환
      const myG = myGender || 'M';
      const celebG = selectedCeleb.gender || 'F';
      const data = await getSajuCompatibilityBasic(
        myBirth, selectedCeleb.birth,
        myBirthTime || undefined, undefined,
        myCalType, 'SOLAR', myG, celebG,
        { historyType: 'celeb_compatibility', celebName: selectedCeleb.name }
      );
      data._celebName = selectedCeleb.name;
      data._celebGroup = selectedCeleb.group;

      if (data.aiAnalysis || data.aiSummary) {
        setResult(data);
        setStep('result');
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        return;
      }

      // 2) AI 스트리밍 — 매트릭스에 실시간 텍스트 공급
      compatCleanupRef.current = getCompatibilityStream(
        myBirth, selectedCeleb.birth, myBirthTime || '', '',
        myCalType, 'SOLAR', myG, celebG,
        data.score, data.elementRelation || '', data.branchRelation || '',
        {
          historyType: 'celeb_compatibility',
          celebName: selectedCeleb.name,
          onChunk: (text) => {
            compatBufferRef.current += text;
            setStreamText((prev) => prev + text);
            const CM_FIELDS = ['summary', 'overall', 'loveCompat', 'workCompat', 'conflictPoint', 'advice'];
            const partial = extractStreamingFieldsPartial(compatBufferRef.current, CM_FIELDS);
            const next = {}; const newDone = [];
            for (const k of CM_FIELDS) {
              const p = partial[k];
              if (p !== undefined) {
                next[k] = p.value;
                if (p.done) newDone.push(k);
              }
            }
            if (Object.keys(next).length > 0) setCompatStreamFields(prev => ({ ...prev, ...next }));
            if (newDone.length > 0) setCompatDoneFields(prev => {
              const n = new Set(prev); newDone.forEach(f => n.add(f)); return n;
            });
          },
          onDone: (fullText) => {
            setStreamText('');
            setCompatStreamFields({}); setCompatDoneFields(new Set()); compatBufferRef.current = '';
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
            const parsed = parseAiJson(fullText);
            const merged = parsed ? {
              ...data,
              aiSummary: parsed.summary || null,
              aiAnalysis: parsed.overall || null,
              aiLoveCompat: parsed.loveCompat || null,
              aiWorkCompat: parsed.workCompat || null,
              aiConflictPoint: parsed.conflictPoint || null,
              aiAdvice: parsed.advice || null,
            } : { ...data, aiAnalysis: fullText };
            pendingCompatRef.current = merged;
            setMatrixShown(false);
            setCompleting(true);
            saveCompatCache({
              birthDate1: myBirth, birthDate2: selectedCeleb.birth,
              birthTime1: myBirthTime || null, birthTime2: null,
              gender1: myG, gender2: celebG,
              score: merged.score,
              aiSummary: merged.aiSummary,
              aiAnalysis: merged.aiAnalysis,
              aiLoveCompat: merged.aiLoveCompat,
              aiWorkCompat: merged.aiWorkCompat,
              aiConflictPoint: merged.aiConflictPoint,
              aiAdvice: merged.aiAdvice,
            }).catch(() => {});
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          },
          onError: () => {
            setStreamText(''); setStep('input'); setMatrixShown(false);
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (e) {
      console.error(e);
      setStep('input');
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  // 결과 도착 시 매트릭스 페이드아웃
  // 궁합 결과: step이 'result'로 변할 때 (loading 중에는 숨기지 않음)
  // 스타 운세: starFortune이 실제로 도착했을 때
  const [prevStep, setPrevStep] = useState('select');
  useEffect(() => {
    const stepJustChanged = step === 'result' && prevStep === 'loading';
    const starJustArrived = starFortune && !starFortuneLoading;
    if ((stepJustChanged || starJustArrived) && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      setPrevStep(step);
      return () => clearTimeout(t);
    }
    setPrevStep(step);
  }, [step, starFortune, starFortuneLoading, matrixShown]);

  const handleShare = async () => {
    if (!result) return;
    const text = `[1:1연애 💕 스타 궁합]\n나와 ${result._celebName}${result._celebGroup ? `(${result._celebGroup})` : ''}의 궁합: ${result.score}점 (${result.grade})\n${result.aiSummary || ''}\n\nhttps://recipepig.kr`;
    const res = await shareResult({ title: '스타 궁합 결과', text });
    if (res === 'copied') { setShareMsg('클립보드에 복사됨!'); setTimeout(() => setShareMsg(''), 2000); }
  };

  const handleStarFortune = () => {
    if (!selectedCeleb) return;
    setStarFortuneLoading(true);
    setStarStreamText('');
    setStarStreaming(false);
    setStarFortune(null);
    setMatrixLabel(`${selectedCeleb.name}의 오늘 운세를 분석하고 있어요`);
    setMatrixShown(true);
    setMatrixExiting(false);
    starCleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    starCleanupRef.current = analyzeSajuStream(selectedCeleb.birth, undefined, 'SOLAR', selectedCeleb.gender, {
      context: 'idol', targetType: 'celebrity', targetName: selectedCeleb.name,
      onCached: (data) => {
        setStarFortune(data.todayFortune || data);
        setStarFortuneLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
      onChunk: (text) => {
        setStarStreaming(true);
        starBufferRef.current += text;
        setStarStreamText(prev => prev + text);
        const SF_FIELDS = ['personalityReading', 'overall', 'love', 'money', 'health', 'work', 'academic'];
        const partial = extractStreamingFieldsPartial(starBufferRef.current, SF_FIELDS);
        const next = {}; const newDone = [];
        for (const k of SF_FIELDS) {
          const p = partial[k];
          if (p !== undefined) {
            next[k] = p.value;
            if (p.done) newDone.push(k);
          }
        }
        if (Object.keys(next).length > 0) setStarStreamFields(prev => ({ ...prev, ...next }));
        if (newDone.length > 0) setStarDoneFields(prev => {
          const n = new Set(prev); newDone.forEach(f => n.add(f)); return n;
        });
      },
      onDone: (fullText) => {
        setStarStreaming(false);
        setStarStreamText('');
        setStarStreamFields({}); setStarDoneFields(new Set()); starBufferRef.current = '';
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        const parsed = parseAiJson(fullText);
        if (parsed) {
          pendingStarRef.current = {
            personalityReading: parsed.personalityReading,
            overall: parsed.overall,
            love: parsed.love,
            money: parsed.money,
            health: parsed.health,
            work: parsed.work,
            academic: parsed.academic,
            score: parsed.score || 70,
            luckyNumber: parsed.luckyNumber,
            luckyColor: parsed.luckyColor,
          };
          setMatrixShown(false);
          setCompleting(true);
        }
        setStarFortuneLoading(false);
      },
      onInsufficientHearts: () => {
        setMatrixShown(false);
        setStarFortuneLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        toast('하트가 부족합니다. 하트를 충전해주세요!', 'error');
      },
      onError: (err) => {
        setStarStreaming(false); setStarStreamText(''); setStarFortuneLoading(false);
        setMatrixShown(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        console.error('[StarFortune] error:', err);
      },
    });
  };

  const handleReset = () => {
    starCleanupRef.current?.();
    setStep('select');
    setSelectedCeleb(null);
    setResult(null);
    setStarFortune(null);
    setStarStreamText('');
    setStarStreaming(false);
    setSearchQuery('');
    setShowManual(false);
    setManualName('');
    setManualBirth('');
    setManualGender('');
  };

  // ─── 연예인 선택 화면 ───
  if (step === 'select') {
    return (
      <div className="celeb-page celeb-page--select">
        {/* 컴팩트 타이틀 — 뒤로가기 제거, 패딩 최소화 */}
        <div className="celeb-compact-hero">
          <h1 className="celeb-compact-title">💫 스타와 나의 궁합</h1>
        </div>

        {/* 스타 운세 진입 배너 */}
        <button className="celeb-mystar-banner" onClick={() => navigate('/star-fortune')}>
          <span className="celeb-mystar-icon">🌟</span>
          <div className="celeb-mystar-text">
            <span className="celeb-mystar-title">스타 운세</span>
            <span className="celeb-mystar-sub">최애 스타의 오늘 운세·궁합·그룹 운세 모아보기</span>
          </div>
          <span className="celeb-mystar-arrow">›</span>
        </button>

        <div className="celeb-search-wrap">
          <span className="celeb-search-icon" aria-hidden="true">🔍</span>
          <input className="celeb-search" type="text" placeholder="스타 이름 또는 그룹 검색"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && (
            <button className="celeb-search-clear" onClick={() => setSearchQuery('')} aria-label="검색어 지우기">✕</button>
          )}
        </div>

        <div className="celeb-list">
          {filteredItems.length > 0 ? filteredItems.map((item, i) => (
            item._type === 'group' ? (
              <button key={`group-${item.name}`} className="celeb-item celeb-item--group" onClick={() => handleSelectGroup(item)}>
                <span className={`celeb-avatar celeb-avatar--${item.type === 'boy' ? 'boy' : 'girl'}`}>
                  <span className="celeb-avatar-text">{initial(item.name)}</span>
                  <span className="celeb-avatar-deco" aria-hidden="true">{item.type === 'boy' ? '♂' : '♀'}</span>
                </span>
                <div className="celeb-item-info">
                  <span className="celeb-item-name">{item.name}</span>
                  <span className="celeb-item-detail">
                    <span className="celeb-tag celeb-tag--group">{item.type === 'boy' ? '보이그룹' : '걸그룹'}</span>
                    <span className="celeb-tag celeb-tag--count">👥 {item.members.length}명</span>
                    {item.agency && <span className="celeb-tag celeb-tag--agency">{item.agency}</span>}
                  </span>
                </div>
                <span className="celeb-item-arrow">›</span>
              </button>
            ) : (() => {
              const cc = catColor(item);
              return (
                <button key={`${item.name}-${item.birth}-${i}`} className="celeb-item"
                  onClick={() => handleSelectCeleb(item)}
                  style={{ '--cc-from': cc.from, '--cc-to': cc.to }}>
                  <span className="celeb-avatar celeb-avatar--celeb">
                    <span className="celeb-avatar-text">{initial(item.name)}</span>
                    <span className="celeb-avatar-deco" aria-hidden="true">{cc.emoji}</span>
                  </span>
                  <div className="celeb-item-info">
                    <span className="celeb-item-name">
                      {item.name}
                      {item._community && <span className="celeb-tag celeb-tag--community">팬 추가</span>}
                    </span>
                    <span className="celeb-item-detail">
                      <span className="celeb-tag celeb-tag--cat">{cc.label}</span>
                      {item.group && <span className="celeb-tag celeb-tag--group">{item.group}</span>}
                      {item.agency && <span className="celeb-tag celeb-tag--agency">{item.agency}</span>}
                      <span className="celeb-item-year">{item.birth.slice(0, 4)}년생</span>
                    </span>
                  </div>
                  <span className="celeb-item-arrow">›</span>
                </button>
              );
            })()
          )) : (
            <div className="celeb-empty">
              <div className="celeb-empty-icon">🔍</div>
              <p className="celeb-empty-title">찾으시는 스타가 없네요</p>
              <p className="celeb-empty-sub">검색어를 바꿔보거나 아래에서 직접 입력해 보세요</p>
              <button className="celeb-empty-cta" onClick={() => { setShowManual(true); setManualName(searchQuery); }}>
                ✏️ "{searchQuery}" 직접 추가
              </button>
            </div>
          )}
        </div>

        <button className={`celeb-manual-toggle ${showManual ? 'celeb-manual-toggle--open' : ''}`}
          onClick={() => setShowManual(!showManual)}>
          {showManual ? '▲ 직접 입력 접기' : '✏️ 찾는 스타가 없나요? 직접 입력 / AI 검색'}
        </button>

        {showManual && (
          <div className="celeb-manual glass-card fade-in">
            <h3 className="celeb-manual-title">직접 입력</h3>
            <div className="form-group">
              <label className="form-label">이름</label>
              <div className="celeb-manual-name-row">
                <input className="form-input" placeholder="스타 이름" value={manualName} onChange={e => setManualName(e.target.value)} />
                <button className="celeb-confirm-btn" onClick={handleManualConfirm} disabled={!manualName.trim() || aiSearching}>
                  {aiSearching ? '검색중...' : '확인'}
                </button>
              </div>
            </div>

            {/* AI가 못 찾았을 때 직접 입력 폼 */}
            <div className="form-group">
              <label className="form-label">생년월일</label>
              <BirthDatePicker value={manualBirth} onChange={setManualBirth} />
            </div>
            <div className="form-group">
              <label className="form-label">성별</label>
              <GenderPicker value={manualGender} onChange={setManualGender} />
            </div>
            <button className="btn-gold" onClick={handleManualSelect} disabled={!manualName || !manualBirth || !manualGender}
              style={{ opacity: manualName && manualBirth && manualGender ? 1 : 0.5 }}>
              직접 입력한 정보로 궁합 보기
            </button>
          </div>
        )}

        {/* AI 검색 결과 팝업 */}
        {showAiPopup && aiResult && (
          <div className="celeb-ai-overlay" onClick={() => setShowAiPopup(false)}>
            <div className="celeb-ai-popup glass-card" onClick={e => e.stopPropagation()}>
              <h3 className="celeb-ai-popup-title">🔍 AI 검색 결과</h3>
              <div className="celeb-ai-info">
                <span className={`celeb-item-sym celeb-sym--lg ${aiResult.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>
                  {aiResult.gender === 'M' ? '♂' : '♀'}
                </span>
                <div className="celeb-ai-detail">
                  <span className="celeb-ai-name">{aiResult.name}</span>
                  {aiResult.realName && <span className="celeb-ai-sub">본명: {aiResult.realName}</span>}
                  <span className="celeb-ai-sub">생년월일: {aiResult.birth}</span>
                  {aiResult.group && <span className="celeb-ai-sub">그룹: {aiResult.group}</span>}
                  {aiResult.info && <span className="celeb-ai-sub">{aiResult.info}</span>}
                </div>
              </div>
              <p className="celeb-ai-notice">이 정보가 맞나요? 확인하면 DB에 저장됩니다.</p>
              <div className="celeb-ai-btns">
                <button className="celeb-ai-btn celeb-ai-btn--confirm" onClick={handleAiConfirm}>✅ 확인</button>
                <button className="celeb-ai-btn celeb-ai-btn--reject" onClick={handleAiReject}>❌ 거절</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── 내 정보 입력 ───
  if (step === 'input') {
    return (
      <div className="celeb-page">
        <AnalysisComplete
          show={completing}
          theme="star"
          onDone={() => {
            setCompleting(false);
            if (pendingCompatRef.current) {
              setResult(pendingCompatRef.current);
              setStep('result');
              pendingCompatRef.current = null;
              setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
            }
            if (pendingStarRef.current) {
              setStarFortune(pendingStarRef.current);
              pendingStarRef.current = null;
            }
          }}
        />
        <button className="celeb-back-btn" onClick={() => { setStep('select'); setStarFortune(null); }}>← 스타 목록으로</button>

        {(() => {
          const cc = catColor(selectedCeleb);
          return (
            <section className="celeb-selected glass-card" style={{ '--cc-from': cc.from, '--cc-to': cc.to }}>
              <div className="celeb-selected-aura" aria-hidden="true" />
              <span className="celeb-avatar celeb-avatar--lg celeb-avatar--celeb">
                <span className="celeb-avatar-text">{initial(selectedCeleb.name)}</span>
                <span className="celeb-avatar-deco celeb-avatar-deco--lg" aria-hidden="true">{cc.emoji}</span>
              </span>
              <div className="celeb-selected-info">
                <span className="celeb-selected-cat">{cc.label} · 선택된 스타</span>
                <span className="celeb-selected-name">{selectedCeleb.name}</span>
                <span className="celeb-selected-detail">
                  {selectedCeleb.group && <span className="celeb-tag celeb-tag--group">{selectedCeleb.group}</span>}
                  {selectedCeleb.agency && <span className="celeb-tag celeb-tag--agency">{selectedCeleb.agency}</span>}
                  <span className="celeb-selected-birth">📅 {selectedCeleb.birth}</span>
                </span>
              </div>
            </section>
          );
        })()}

        {/* 스타 운세 보기 */}
        <div className="celeb-star-fortune glass-card">
          <div className="celeb-sf-intro">
            <span className="celeb-sf-intro-icon">🔮</span>
            <div>
              <div className="celeb-sf-intro-title">{selectedCeleb.name}의 사주로 보는 오늘</div>
              <div className="celeb-sf-intro-sub">성격·매력 + 5가지 분야 운세를 한 번에</div>
            </div>
          </div>
          <button className="celeb-star-fortune-btn" onClick={() => guardCelebFortune(handleStarFortune)} disabled={starFortuneLoading || starStreaming}>
            {starFortuneLoading || starStreaming ? '🔮 AI 분석중...' : <>{`🌟 ${selectedCeleb.name}의 오늘 운세 보기`} <HeartCost category="CELEB_FORTUNE" /></>}
          </button>
          {starFortune && (
            <div className="celeb-star-fortune-result fade-in">
              {starFortune.personalityReading && (
                <div className="celeb-sf-item celeb-sf-item--purple">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">🔮 사주로 본 성격·매력</span>
                  <p>{starFortune.personalityReading}</p>
                </div>
              )}
              {starFortune.overall && (
                <div className="celeb-sf-item celeb-sf-item--gold">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">🌟 오늘의 총운</span>
                  <p>{starFortune.overall}</p>
                </div>
              )}
              {starFortune.love && (
                <div className="celeb-sf-item celeb-sf-item--pink">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">💕 애정운</span>
                  <p>{starFortune.love}</p>
                </div>
              )}
              {starFortune.money && (
                <div className="celeb-sf-item celeb-sf-item--green">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">💰 재물운</span>
                  <p>{starFortune.money}</p>
                </div>
              )}
              {starFortune.health && (
                <div className="celeb-sf-item celeb-sf-item--mint">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">💪 건강운</span>
                  <p>{starFortune.health}</p>
                </div>
              )}
              {starFortune.work && (
                <div className="celeb-sf-item celeb-sf-item--blue">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">💼 활동운</span>
                  <p>{starFortune.work}</p>
                </div>
              )}
              {starFortune.academic && (
                <div className="celeb-sf-item celeb-sf-item--cyan">
                  <div className="celeb-sf-bar" />
                  <span className="celeb-sf-label">📚 자기계발·도전운</span>
                  <p>{starFortune.academic}</p>
                </div>
              )}
              {(starFortune.luckyColor || starFortune.luckyNumber) && (
                <div className="celeb-sf-lucky-card">
                  {starFortune.luckyColor && (
                    <div className="celeb-sf-lucky-item">
                      <span className="celeb-sf-lucky-key">행운의 색</span>
                      <span className="celeb-sf-lucky-val">{starFortune.luckyColor}</span>
                    </div>
                  )}
                  {starFortune.luckyNumber && (
                    <div className="celeb-sf-lucky-item">
                      <span className="celeb-sf-lucky-key">행운의 숫자</span>
                      <span className="celeb-sf-lucky-val">{starFortune.luckyNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="celeb-form glass-card">
          <h3 className="celeb-form-title">내 정보 입력 (궁합 분석)</h3>
          {localStorage.getItem('userId') && (
            <button className="sf-autofill-btn" onClick={handleAutoFill}>✨ 내 정보로 채우기</button>
          )}
          <div className="form-group">
            <label className="form-label">성별</label>
            <GenderPicker value={myGender} onChange={setMyGender} />
          </div>
          <div className="form-group">
            <label className="form-label">생년월일</label>
            <BirthDatePicker value={myBirth} onChange={setMyBirth} calendarType={myCalType} onCalendarTypeChange={setMyCalType} />
          </div>
          <button className="btn-gold" onClick={() => guardCelebCompat(handleAnalyze)} disabled={!myBirth || !selectedCeleb} style={{ opacity: (myBirth && selectedCeleb) ? 1 : 0.5 }}>
            💫 {selectedCeleb.name}와(과) 궁합 분석하기 <HeartCost category="CELEB_COMPAT" />
          </button>
        </div>
        {/* 하단 pull-up drawer — 최근 본 스타궁합 */}
        {!isGuest() && (
          <HistoryDrawer
            type="celeb_compatibility"
            label="📚 최근 본 스타궁합"
            onOpen={async (item) => {
              try {
                const full = await getHistory(item.id);
                const p = full?.payload;
                if (p) {
                  p._celebName = p.celebName || '';
                  p._g1 = p.gender1 || 'M';
                  p._g2 = p.gender2 || 'F';
                  if (p.aiOverall && !p.aiAnalysis) p.aiAnalysis = p.aiOverall;
                  setResult(p);
                  setStep('result');
                }
              } catch {}
            }}
          />
        )}
      </div>
    );
  }

  // ─── 로딩 ───
  if (step === 'loading') {
    return (
      <div className="celeb-page">
        <AnalysisComplete
          show={completing}
          theme="star"
          onDone={() => {
            setCompleting(false);
            if (pendingCompatRef.current) {
              setResult(pendingCompatRef.current);
              setStep('result');
              pendingCompatRef.current = null;
              setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
            }
            if (pendingStarRef.current) {
              setStarFortune(pendingStarRef.current);
              pendingStarRef.current = null;
            }
          }}
        />
        {matrixShown && (() => {
          const st = (key) => {
            if (compatDoneFields.has(key)) return 'done';
            if (compatStreamFields[key]) return 'streaming';
            return 'pending';
          };
          return (
            <div className="celeb-streaming-wrap">
              <div className="celeb-streaming-header">
                <span className="celeb-streaming-orb">💫</span>
                <span className="celeb-streaming-title">{matrixLabel}</span>
                <span className="streaming-dots"><i/><i/><i/></span>
              </div>
              <div className="celeb-streaming-cards">
                <StreamingCard icon="💕" title="한 줄 요약"     text={compatStreamFields.summary       || ''} status={st('summary')}       delay={0}   />
                <StreamingCard icon="🔮" title="종합 분석"     text={compatStreamFields.overall       || ''} status={st('overall')}       delay={80}  />
                <StreamingCard icon="💖" title="연애 궁합"     text={compatStreamFields.loveCompat    || ''} status={st('loveCompat')}    delay={160} />
                <StreamingCard icon="🤝" title="일 / 협력 궁합" text={compatStreamFields.workCompat    || ''} status={st('workCompat')}    delay={240} />
                <StreamingCard icon="⚠️" title="갈등 포인트"   text={compatStreamFields.conflictPoint || ''} status={st('conflictPoint')} delay={320} />
                <StreamingCard icon="💡" title="관계 조언"     text={compatStreamFields.advice        || ''} status={st('advice')}        delay={400} />
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ─── 결과 ───
  if (step === 'result' && result) {
    const score = result.score || 0;
    const scoreColor = score >= 80 ? '#ff3d7f' : score >= 60 ? '#fbbf24' : '#94a3b8';
    return (
      <div className="celeb-page analysis-result-reveal" ref={resultRef}>
        <AnalysisComplete
          show={completing}
          theme="star"
          onDone={() => {
            setCompleting(false);
            if (pendingStarRef.current) {
              setStarFortune(pendingStarRef.current);
              pendingStarRef.current = null;
            }
          }}
        />
        {matrixShown && starStreaming && (() => {
          const st = (key) => {
            if (starDoneFields.has(key)) return 'done';
            if (starStreamFields[key]) return 'streaming';
            return 'pending';
          };
          return (
            <div className="celeb-streaming-wrap">
              <div className="celeb-streaming-header">
                <span className="celeb-streaming-orb">⭐</span>
                <span className="celeb-streaming-title">{matrixLabel}</span>
                <span className="streaming-dots"><i/><i/><i/></span>
              </div>
              <div className="celeb-streaming-cards">
                <StreamingCard icon="🌟" title="총운"   text={starStreamFields.overall || ''} status={st('overall')} delay={0}   />
                <StreamingCard icon="💕" title="애정운" text={starStreamFields.love    || ''} status={st('love')}    delay={80}  />
                <StreamingCard icon="💰" title="재물운" text={starStreamFields.money   || ''} status={st('money')}   delay={160} />
                <StreamingCard icon="💪" title="건강운" text={starStreamFields.health  || ''} status={st('health')}  delay={240} />
                <StreamingCard icon="💼" title="직장운" text={starStreamFields.work    || ''} status={st('work')}    delay={320} />
              </div>
            </div>
          );
        })()}
        {matrixShown && !starStreaming && (
          <AnalysisMatrix theme="star" label={matrixLabel} streamText={streamText} exiting={matrixExiting} />
        )}
        <button className="celeb-back-btn" onClick={handleReset}>← 스타 목록으로</button>
        <section className="celeb-result-hero">
          <h2 className="celeb-result-title">나 ♥ {result._celebName}</h2>
          {result._celebGroup && <p className="celeb-result-group">{result._celebGroup}</p>}
          <div className="celeb-score-wrap">
            <svg viewBox="0 0 120 120" className="celeb-score-ring">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 327} 327`} transform="rotate(-90 60 60)" className="celeb-score-progress" />
            </svg>
            <div className="celeb-score-inner">
              <span className="celeb-score-num">{score}</span>
              <span className="celeb-score-unit">점</span>
            </div>
          </div>
          <span className="celeb-grade" style={{ color: GRADE_COLORS[result.grade] || scoreColor }}>{result.grade}</span>
          <div className="celeb-result-actions">
            <button className="celeb-share-btn" onClick={handleShare}>📤 공유하기</button>
          </div>
          {shareMsg && <p className="celeb-share-msg">{shareMsg}</p>}
        </section>

        <section className="celeb-result-cards">
          {result.aiSummary && (
            <div className="celeb-card glass-card celeb-card--summary"><p className="celeb-summary-text">{result.aiSummary}</p></div>
          )}
          {result.aiAnalysis && (
            <div className="celeb-card glass-card celeb-card--ai"><div className="celeb-card-header"><span>🔮</span><h3>종합 분석</h3></div><p className="celeb-card-text">{result.aiAnalysis}</p></div>
          )}
          {result.aiLoveCompat && (
            <div className="celeb-card glass-card celeb-card--ai"><div className="celeb-card-header"><span>💕</span><h3>연애 궁합</h3></div><p className="celeb-card-text">{result.aiLoveCompat}</p></div>
          )}
          <div className="celeb-card glass-card"><div className="celeb-card-header"><span>☯️</span><h3>음양 조화</h3></div><p className="celeb-card-text">{result.yinyangBalance}</p></div>
          {result.aiWorkCompat && (
            <div className="celeb-card glass-card celeb-card--ai"><div className="celeb-card-header"><span>🤝</span><h3>성격 궁합</h3></div><p className="celeb-card-text">{result.aiWorkCompat}</p></div>
          )}
          {result.aiConflictPoint && (
            <div className="celeb-card glass-card celeb-card--ai"><div className="celeb-card-header"><span>⚠️</span><h3>갈등 포인트</h3></div><p className="celeb-card-text">{result.aiConflictPoint}</p></div>
          )}
          {result.aiAdvice && (
            <div className="celeb-card glass-card celeb-card--ai"><div className="celeb-card-header"><span>💡</span><h3>이상형 매칭도</h3></div><p className="celeb-card-text">{result.aiAdvice}</p></div>
          )}
          <div className="celeb-card glass-card"><div className="celeb-card-header"><span>⚡</span><h3>오행 관계</h3></div><p className="celeb-card-text">{result.elementRelation}</p></div>
        </section>

        <button className="celeb-reset-btn" onClick={handleReset}>다른 스타와 궁합 보기</button>
      </div>
    );
  }

  return null;
}

export default CelebCompatibility;
