import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getSajuCompatibilityBasic,
  getCompatibilityStream,
  saveCompatCache,
  getLoveFortuneStream,
  getCompatibilityDeepStream,
  isGuest,
  getHistory,
  getUser,
} from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import PageTopBar from '../components/PageTopBar';
import FortuneCard from '../components/FortuneCard';
import StreamText from '../components/StreamText';
import AnalysisComplete from '../components/AnalysisComplete';
import parseAiJson from '../utils/parseAiJson';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './MyLoveCompat.css';

const TABS = [
  { id: 'saju',     icon: '🔮', label: '정통궁합' },
  { id: 'marriage', icon: '💒', label: '결혼궁합' },
  { id: 'skinship', icon: '💋', label: '스킨십궁합' },
];

const ELEMENT_COLORS = { '목': '#4ade80', '화': '#f87171', '토': '#fbbf24', '금': '#e2e8f0', '수': '#60a5fa' };
const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getScoreColor(score) {
  if (score >= 80) return '#ff3d7f';
  if (score >= 60) return '#fbbf24';
  return '#94a3b8';
}

function MyLoveCompat() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('userId');
  const [tab, setTab] = useState(() => {
    const preset = location.state?.presetTab;
    return (preset === 'marriage' || preset === 'skinship') ? preset : 'saju';
  });

  // 사주 입력
  const [bd1, setBd1] = useState('');
  const [g1, setG1] = useState('M');
  const [bt1, setBt1] = useState('');
  const [bd2, setBd2] = useState('');
  const [g2, setG2] = useState('F');
  const [bt2, setBt2] = useState('');
  const [showTime, setShowTime] = useState(false);

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [result, setResult] = useState(null);
  // 심화분석
  const [deepResult, setDeepResult] = useState(null);
  const [deepStreaming, setDeepStreaming] = useState(false);
  const [deepStreamText, setDeepStreamText] = useState('');
  const [deepCompleting, setDeepCompleting] = useState(false);
  // 일반 분석 완료 애니 (matrix 페이드아웃 후 → 애니 1.6s → 결과)
  const [completing, setCompleting] = useState(false);
  // 접기/펼치기 (true=펼침)
  const [basicExpanded, setBasicExpanded] = useState(true);
  const [deepExpanded, setDeepExpanded] = useState(true);

  // 심화분석이 생기면 일반은 자동 접힘, 심화는 펼침
  useEffect(() => {
    if (deepResult) {
      setBasicExpanded(false);
      setDeepExpanded(true);
    } else {
      setBasicExpanded(true);
    }
  }, [deepResult]);
  const cleanupRef = useRef(null);
  const deepCleanupRef = useRef(null);
  const resultRef = useRef(null);
  const deepRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);
  useEffect(() => () => deepCleanupRef.current?.(), []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 홈 드로어에서 넘어온 restoreHistoryId 복원 (skinship_compat/marriage_compat/my_love_compat)
  useEffect(() => {
    const hid = location.state?.restoreHistoryId;
    if (!hid) return;
    (async () => {
      try {
        const full = await getHistory(hid);
        const p = full?.payload;
        if (!p) return;
        if (full?.type === 'skinship_compat') {
          setTab('skinship');
          setBd1(p.birthDate || '');
          setBd2(p.partnerDate || '');
          setG1(p.gender || 'M');
          setG2(p.partnerGender || 'F');
          try {
            const base = await getSajuCompatibilityBasic(
              p.birthDate, p.partnerDate,
              p.birthTime || undefined, undefined,
              'SOLAR', 'SOLAR', p.gender || 'M', p.partnerGender || 'F'
            );
            setResult({
              ...base,
              _g1: p.gender || 'M',
              _g2: p.partnerGender || 'F',
              _kind: 'skinship',
              score: p.score || base.score,
              grade: p.grade || base.grade,
              aiAnalysis: p.overall,
              aiTiming: p.timing,
              aiAdvice: p.advice,
              aiCaution: p.caution,
              aiMindsetBoost: p.mindsetBoost,
              aiOneLiner: p.oneLiner,
              aiLuckyDay: p.luckyDay,
              aiLuckyPlace: p.luckyPlace,
              aiLuckyColor: p.luckyColor,
            });
          } catch {}
          return;
        }
        // marriage/saju 공용 payload 복원
        p._g1 = p.gender1 || 'M';
        p._g2 = p.gender2 || 'F';
        // 레거시 필드 정규화 (aiOverall 저장분 → aiAnalysis로)
        if (p.aiOverall && !p.aiAnalysis) p.aiAnalysis = p.aiOverall;
        if (full?.type === 'marriage_compat') {
          p._kind = 'marriage';
          setTab('marriage');
        }
        // person1/person2 누락된 옛 payload 보강 — 화면 렌더 조건(result.person1) 충족
        if (!p.person1 || !p.person2) {
          try {
            const base = await getSajuCompatibilityBasic(
              p.birthDate1, p.birthDate2,
              p.birthTime1 || undefined, p.birthTime2 || undefined,
              p.calendarType1 || 'SOLAR', p.calendarType2 || 'SOLAR',
              p._g1, p._g2,
              full?.type === 'marriage_compat' ? { mode: 'marriage' } : {}
            );
            if (base?.person1) p.person1 = base.person1;
            if (base?.person2) p.person2 = base.person2;
            if (!p.score && base?.score) p.score = base.score;
            if (!p.grade && base?.grade) p.grade = base.grade;
          } catch {}
        }
        setBd1(p.birthDate1 || '');
        setBd2(p.birthDate2 || '');
        setBt1(p.birthTime1 || '');
        setBt2(p.birthTime2 || '');
        setG1(p._g1);
        setG2(p._g2);
        setResult(p);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.restoreHistoryId]);

  useEffect(() => {
    if (result && matrixShown && !completing) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown, completing]);

  /** 일반 분석 onDone 공통 흐름: matrix 페이드아웃(0.7s) → 완료 애니(1.6s) → 결과 표시 */
  const finishWithCompleteAnimation = (finalResult) => {
    setMatrixExiting(true);
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    setTimeout(() => {
      setMatrixShown(false);
      setStreamText('');
      setCompleting(true);
      setTimeout(() => {
        setCompleting(false);
        setResult(finalResult);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }, 1600);
    }, 700);
  };

  const handleAutoFill = async () => {
    // 서버에서 최신 프로필 조회 (localStorage 캐시가 파트너 정보 미포함일 수 있어 우선)
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
    if (p.birthDate) setBd1(p.birthDate);
    if (p.birthTime) setBt1(p.birthTime);
    if (p.gender) setG1(p.gender);
    if (p.partnerBirthDate) setBd2(p.partnerBirthDate);
    if (p.partnerBirthTime) setBt2(p.partnerBirthTime);
    const partnerG = p.gender === 'M' ? 'F' : p.gender === 'F' ? 'M' : 'F';
    setG2(partnerG);
  };

  const handleTabChange = (id) => {
    if (id === tab) return;
    setTab(id);
    setResult(null);
    setStreamText('');
    setAiStreaming(false);
    setMatrixShown(false);
    setMatrixExiting(false);
    setDeepResult(null);
    setDeepStreaming(false);
    setDeepStreamText('');
    setDeepCompleting(false);
    setCompleting(false);
    cleanupRef.current?.();
    deepCleanupRef.current?.();
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
  };

  const handleReset = () => {
    cleanupRef.current?.();
    deepCleanupRef.current?.();
    try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    setResult(null);
    setStreamText('');
    setAiStreaming(false);
    setLoading(false);
    setMatrixShown(false);
    setMatrixExiting(false);
    setDeepResult(null);
    setDeepStreaming(false);
    setDeepStreamText('');
    setDeepCompleting(false);
    setCompleting(false);
    setBd1(''); setBd2(''); setBt1(''); setBt2('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { guardedAction: guardSajuCompat } = useHeartGuard('COMPATIBILITY');
  const { guardedAction: guardMarriageCompat } = useHeartGuard('COMPATIBILITY');
  const { guardedAction: guardSkinshipCompat } = useHeartGuard('LOVE_COUPLE');
  const { guardedAction: guardDeepSajuCompat } = useHeartGuard('DEEP_COMPATIBILITY');
  const { guardedAction: guardDeepMarriageCompat } = useHeartGuard('DEEP_MARRIAGE_COMPAT');

  // 심화분석 시작 (사주 or 결혼)
  const [deepStreamingType, setDeepStreamingType] = useState(null);
  const startDeepCompat = (deepType) => {
    if (!result || !bd1 || !bd2) return;
    // 캐시에 이미 있으면 스트리밍 없이 즉시 노출
    if (result.deepCache) {
      setDeepResult(result.deepCache);
      setTimeout(() => deepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      return;
    }
    // 기존 분석 결과를 context로 전달
    const ctxParts = [];
    if (result.aiSummary) ctxParts.push('요약: ' + result.aiSummary);
    if (result.aiAnalysis) ctxParts.push('총평: ' + result.aiAnalysis);
    if (deepType === 'compatibility') {
      if (result.aiLoveCompat) ctxParts.push('연애궁합: ' + result.aiLoveCompat);
      if (result.aiWorkCompat) ctxParts.push('일궁합: ' + result.aiWorkCompat);
      if (result.aiConflictPoint) ctxParts.push('갈등: ' + result.aiConflictPoint);
      if (result.aiAdvice) ctxParts.push('조언: ' + result.aiAdvice);
    } else if (deepType === 'marriage_compat') {
      if (result.aiMarriageTiming) ctxParts.push('결혼시기: ' + result.aiMarriageTiming);
      if (result.aiFamilyHarmony) ctxParts.push('가정화합: ' + result.aiFamilyHarmony);
      if (result.aiChildLuck) ctxParts.push('자녀운: ' + result.aiChildLuck);
      if (result.aiSpouseTrait) ctxParts.push('배우자성향: ' + result.aiSpouseTrait);
      if (result.aiInLawRelation) ctxParts.push('양가관계: ' + result.aiInLawRelation);
      if (result.aiFinanceTogether) ctxParts.push('공동재물: ' + result.aiFinanceTogether);
      if (result.aiAdvice) ctxParts.push('조언: ' + result.aiAdvice);
    }
    const context = ctxParts.join('\n');

    setDeepStreaming(true);
    setDeepStreamText('');
    setDeepStreamingType(deepType);
    // 일반 분석과 동일한 AnalysisMatrix 효과 발동
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    deepCleanupRef.current = getCompatibilityDeepStream(
      deepType, bd1, bt1 || '', g1, bd2, bt2 || '', g2,
      {
        context,
        onCached: (cached) => {
          setDeepStreaming(false); setDeepStreamText('');
          setMatrixExiting(true);
          setTimeout(() => { setMatrixShown(false); setStreamText(''); }, 700);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          setDeepResult(cached);
        },
        onChunk: (text) => {
          setDeepStreamText((prev) => prev + text);
          setStreamText((prev) => prev + text); // matrix 안에도 텍스트 흐름
        },
        onDone: (fullText) => {
          const parsed = parseAiJson(fullText);
          const finalData = parsed || { detailAnalysis: fullText };
          setDeepStreaming(false);
          // matrix 페이드아웃
          setMatrixExiting(true);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          setTimeout(() => {
            setMatrixShown(false);
            setStreamText('');
            // 완료 애니 1.6초 → 결과
            setDeepCompleting(true);
            setTimeout(() => {
              setDeepCompleting(false);
              setDeepStreamText('');
              setDeepResult(finalData);
              setTimeout(() => deepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }, 1600);
          }, 700);
        },
        onError: () => {
          setDeepStreaming(false); setDeepStreamText('');
          setDeepCompleting(false);
          setMatrixExiting(true);
          setTimeout(() => { setMatrixShown(false); setStreamText(''); }, 700);
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        },
      }
    );
  };

  // ─── 사주 궁합 ───
  const analyzeSaju = async () => {
    if (!bd1 || !bd2) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      const data = await getSajuCompatibilityBasic(
        bd1, bd2, bt1 || undefined, bt2 || undefined, 'SOLAR', 'SOLAR', g1, g2,
        { historyType: 'my_love_compat' }
      );
      data._g1 = g1;
      data._g2 = g2;

      if (data.aiAnalysis || data.aiSummary) {
        setResult(data);
        if (data.deepCache) setDeepResult(data.deepCache);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        return;
      }

      setLoading(false);
      setAiStreaming(true);

      cleanupRef.current = getCompatibilityStream(
        bd1, bd2, bt1 || '', bt2 || '', 'SOLAR', 'SOLAR', g1, g2,
        data.score, data.elementRelation || '', data.branchRelation || '',
        {
          historyType: 'my_love_compat',
          onChunk: (text) => setStreamText((prev) => prev + text),
          onDone: (fullText) => {
            setAiStreaming(false);
            const parsed = parseAiJson(fullText);
            const finalResult = parsed ? {
              ...data,
              aiSummary: parsed.summary || null,
              aiAnalysis: parsed.overall || null,
              aiLoveCompat: parsed.loveCompat || null,
              aiWorkCompat: parsed.workCompat || null,
              aiConflictPoint: parsed.conflictPoint || null,
              aiAdvice: parsed.advice || null,
            } : { ...data, aiAnalysis: fullText };
            saveCompatCache({
              birthDate1: bd1, birthDate2: bd2,
              birthTime1: bt1 || null, birthTime2: bt2 || null,
              gender1: g1, gender2: g2,
              score: finalResult.score,
              aiSummary: finalResult.aiSummary,
              aiAnalysis: finalResult.aiAnalysis,
              aiLoveCompat: finalResult.aiLoveCompat,
              aiWorkCompat: finalResult.aiWorkCompat,
              aiConflictPoint: finalResult.aiConflictPoint,
              aiAdvice: finalResult.aiAdvice,
            }).catch(() => {});
            finishWithCompleteAnimation(finalResult);
          },
          onError: () => {
            setAiStreaming(false); setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  // ─── 결혼 궁합 ───
  const analyzeMarriage = async () => {
    if (!bd1 || !bd2) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      const data = await getSajuCompatibilityBasic(
        bd1, bd2, bt1 || undefined, bt2 || undefined, 'SOLAR', 'SOLAR', g1, g2,
        { historyType: 'marriage_compat', mode: 'marriage' }
      );
      data._g1 = g1;
      data._g2 = g2;
      data._kind = 'marriage';

      // 결혼궁합 캐시 히트 — AI 호출 없이 즉시 결과 표시
      if (data.aiAnalysis || data.aiSummary || data.aiMarriageTiming) {
        setResult({
          ...data,
          aiSummary: data.aiSummary || null,
          aiAnalysis: data.aiAnalysis || null,
          aiMarriageTiming: data.aiMarriageTiming || null,
          aiFamilyHarmony: data.aiFamilyHarmony || null,
          aiChildLuck: data.aiChildLuck || null,
          aiSpouseTrait: data.aiSpouseTrait || null,
          aiInLawRelation: data.aiInLawRelation || null,
          aiFinanceTogether: data.aiFinanceTogether || null,
          aiAdvice: data.aiAdvice || null,
        });
        if (data.deepCache) setDeepResult(data.deepCache);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        return;
      }

      setLoading(false);
      setAiStreaming(true);

      cleanupRef.current = getCompatibilityStream(
        bd1, bd2, bt1 || '', bt2 || '', 'SOLAR', 'SOLAR', g1, g2,
        data.score, data.elementRelation || '', data.branchRelation || '',
        {
          historyType: 'marriage_compat',
          mode: 'marriage',
          onChunk: (text) => setStreamText((prev) => prev + text),
          onDone: (fullText) => {
            setAiStreaming(false);
            const parsed = parseAiJson(fullText);
            const finalResult = parsed ? {
              ...data,
              score: parsed.score || data.score,
              grade: parsed.grade || data.grade,
              aiSummary: parsed.summary || null,
              aiAnalysis: parsed.overall || null,
              aiMarriageTiming: parsed.marriageTiming || null,
              aiFamilyHarmony: parsed.familyHarmony || null,
              aiChildLuck: parsed.childLuck || null,
              aiSpouseTrait: parsed.spouseTrait || null,
              aiInLawRelation: parsed.inLawRelation || null,
              aiFinanceTogether: parsed.financeTogether || null,
              aiAdvice: parsed.advice || null,
            } : { ...data, aiAnalysis: fullText };
            finishWithCompleteAnimation(finalResult);
          },
          onError: () => {
            setAiStreaming(false); setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  // ─── 스킨십 궁합 ───
  const analyzeSkinship = async () => {
    if (!bd1 || !bd2) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      const base = await getSajuCompatibilityBasic(
        bd1, bd2, bt1 || undefined, bt2 || undefined, 'SOLAR', 'SOLAR', g1, g2,
        { historyType: 'skinship_compat' }
      );
      base._g1 = g1;
      base._g2 = g2;
      base._kind = 'skinship';

      setLoading(false);
      setAiStreaming(true);

      cleanupRef.current = getLoveFortuneStream('skinship', bd1, bt1 || '', g1, 'SOLAR', bd2, g2, '', '', '', {
        onCached: (cached) => {
          setAiStreaming(false); setStreamText('');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          setResult({
            ...base,
            score: cached.score || base.score,
            grade: cached.grade || base.grade,
            aiAnalysis: cached.overall || null,
            aiTiming: cached.timing || null,
            aiAdvice: cached.advice || null,
            aiCaution: cached.caution || null,
            aiMindsetBoost: cached.mindsetBoost || null,
            aiOneLiner: cached.oneLiner || null,
            aiLuckyDay: cached.luckyDay || null,
            aiLuckyPlace: cached.luckyPlace || null,
            aiLuckyColor: cached.luckyColor || null,
          });
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        },
        onChunk: (text) => setStreamText((prev) => prev + text),
        onDone: (fullText) => {
          setAiStreaming(false);
          const parsed = parseAiJson(fullText);
          const merged = parsed ? {
            ...base,
            score: parsed.score || base.score,
            grade: parsed.grade || base.grade,
            aiAnalysis: parsed.overall || null,
            aiTiming: parsed.timing || null,
            aiAdvice: parsed.advice || null,
            aiCaution: parsed.caution || null,
            aiMindsetBoost: parsed.mindsetBoost || null,
            aiOneLiner: parsed.oneLiner || null,
            aiLuckyDay: parsed.luckyDay || null,
            aiLuckyPlace: parsed.luckyPlace || null,
            aiLuckyColor: parsed.luckyColor || null,
          } : { ...base, aiAnalysis: fullText };
          finishWithCompleteAnimation(merged);
        },
        onError: () => {
          setAiStreaming(false); setStreamText('');
          try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        },
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMatrixShown(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const matrixLabel = deepStreaming
    ? (deepStreamingType === 'marriage_compat'
        ? 'AI가 결혼 궁합을 더 깊이 분석하고 있어요'
        : 'AI가 사주 궁합을 더 깊이 분석하고 있어요')
    : (tab === 'saju'     ? 'AI가 사주 궁합을 분석하고 있어요' :
       tab === 'marriage' ? 'AI가 결혼 궁합을 분석하고 있어요' :
                            'AI가 스킨십 궁합을 분석하고 있어요');

  return (
    <div className="mlc-page">
      <PageTopBar onReset={handleReset} color="#E91E63" />

      {/* 히어로 */}
      <section className="mlc-hero">
        <div className="mlc-hero-bg" />
        <div className="mlc-hero-couple">
          <span className="mlc-sym mlc-sym--m">♂</span>
          <div className="mlc-hero-bond">
            <span className="mlc-bond-heart">♥</span>
            {[...Array(5)].map((_, i) => <span key={i} className="mlc-hero-sparkle" style={{ '--sp-i': i }}>✦</span>)}
          </div>
          <span className="mlc-sym mlc-sym--f">♀</span>
        </div>
        <h1 className="mlc-title">나의 연인과의 궁합</h1>
        <p className="mlc-subtitle">사주·결혼·스킨십, 세 가지 궁합으로 우리를 깊이 알아봐요</p>
      </section>

      {/* 탭 */}
      <div className="mlc-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`mlc-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            <span className="mlc-tab-icon">{t.icon}</span>
            <span className="mlc-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 입력 폼 (결과/로딩 중엔 숨김) */}
      {!result && !loading && !aiStreaming && (
        <div className="mlc-form fade-in">
          {userId ? (
            <button className="mlc-autofill-btn" onClick={handleAutoFill}>✨ 내 정보 / 연인 정보로 채우기</button>
          ) : (
            <button
              className="mlc-login-cta"
              onClick={() => navigate('/register', { state: { from: '/my-love-compat' } })}
            >
              💕 로그인하고 연인과 궁합보기
            </button>
          )}

          {/* ═══ 사주 ═══ */}
          {tab === 'saju' && (
            <>
              <div className="mlc-person-block">
                <h3 className="mlc-person-title">👤 내 정보</h3>
                <BirthDatePicker value={bd1} onChange={setBd1} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g1 === 'M' ? 'active' : ''}`} onClick={() => setG1('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span>
                    <span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g1 === 'F' ? 'active' : ''}`} onClick={() => setG1('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span>
                    <span>여자</span>
                  </button>
                </div>
              </div>

              <div className="mlc-person-block">
                <h3 className="mlc-person-title">💕 연인 정보</h3>
                <BirthDatePicker value={bd2} onChange={setBd2} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g2 === 'M' ? 'active' : ''}`} onClick={() => setG2('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span>
                    <span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g2 === 'F' ? 'active' : ''}`} onClick={() => setG2('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span>
                    <span>여자</span>
                  </button>
                </div>
              </div>

              <button className="mlc-submit" onClick={() => guardSajuCompat(analyzeSaju)} disabled={!bd1 || !bd2}>
                🔮 사주 궁합 보기 <HeartCost category="COMPATIBILITY" />
              </button>
            </>
          )}

          {/* ═══ 결혼궁합 ═══ */}
          {tab === 'marriage' && (
            <>
              <div className="mlc-person-block">
                <h3 className="mlc-person-title">👤 내 정보</h3>
                <BirthDatePicker value={bd1} onChange={setBd1} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g1 === 'M' ? 'active' : ''}`} onClick={() => setG1('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span><span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g1 === 'F' ? 'active' : ''}`} onClick={() => setG1('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span><span>여자</span>
                  </button>
                </div>
              </div>

              <div className="mlc-person-block">
                <h3 className="mlc-person-title">💕 연인 정보</h3>
                <BirthDatePicker value={bd2} onChange={setBd2} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g2 === 'M' ? 'active' : ''}`} onClick={() => setG2('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span><span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g2 === 'F' ? 'active' : ''}`} onClick={() => setG2('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span><span>여자</span>
                  </button>
                </div>
              </div>

              <p className="mlc-marriage-hint">💒 결혼 시기·자녀운·양가관계·공동재물까지 결혼에 초점 맞춘 분석</p>

              <button className="mlc-submit" onClick={() => guardMarriageCompat(analyzeMarriage)} disabled={!bd1 || !bd2}>
                💒 결혼 궁합 보기 <HeartCost category="COMPATIBILITY" />
              </button>
            </>
          )}

          {/* ═══ 스킨십궁합 ═══ */}
          {tab === 'skinship' && (
            <>
              <div className="mlc-person-block">
                <h3 className="mlc-person-title">👤 내 정보</h3>
                <BirthDatePicker value={bd1} onChange={setBd1} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g1 === 'M' ? 'active' : ''}`} onClick={() => setG1('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span><span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g1 === 'F' ? 'active' : ''}`} onClick={() => setG1('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span><span>여자</span>
                  </button>
                </div>
              </div>

              <div className="mlc-person-block">
                <h3 className="mlc-person-title">💕 연인 정보</h3>
                <BirthDatePicker value={bd2} onChange={setBd2} />
                <div className="mlc-toggle">
                  <button className={`mlc-toggle-btn ${g2 === 'M' ? 'active' : ''}`} onClick={() => setG2('M')}>
                    <span className="mlc-g-circle mlc-g-male">♂</span><span>남자</span>
                  </button>
                  <button className={`mlc-toggle-btn ${g2 === 'F' ? 'active' : ''}`} onClick={() => setG2('F')}>
                    <span className="mlc-g-circle mlc-g-female">♀</span><span>여자</span>
                  </button>
                </div>
              </div>

              <p className="mlc-marriage-hint">💋 오행별 스킨십 스타일·단계별 타이밍·분위기 세팅까지 케미 분석</p>

              <button className="mlc-submit" onClick={() => guardSkinshipCompat(analyzeSkinship)} disabled={!bd1 || !bd2}>
                💋 스킨십 궁합 보기 <HeartCost category="LOVE_COUPLE" />
              </button>
            </>
          )}
        </div>
      )}

      {/* 매트릭스 로딩 */}
      {matrixShown && (
        <AnalysisMatrix theme="love" label={matrixLabel} streamText={streamText} exiting={matrixExiting} />
      )}

      {/* 분석 완료 애니메이션은 finishWithCompleteAnimation의 setTimeout으로 자동 진행 — 공용 컴포넌트로 분리 */}
      <AnalysisComplete show={completing} theme="love" onDone={() => {}} duration={1600} />

      {/* ═══ 결과 ═══ */}
      {result && (
        <div className="mlc-result fade-in" ref={resultRef}>
          {/* 사주 결과 */}
          {tab === 'saju' && result.person1 && (
            <>
              <div className="mlc-score-hero">
                <div className="mlc-vs-row">
                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g1 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g1 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person1.dayMasterElement] || '#fbbf24' }}>
                      {result.person1.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person1.birthDate}</span>
                  </div>

                  <div className="mlc-score-ring-wrap">
                    <svg viewBox="0 0 100 100" className="mlc-score-ring">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 264} 264`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="mlc-score-inner">
                      <span className="mlc-score-num">{result.score}</span>
                      <span className="mlc-score-unit">점</span>
                    </div>
                  </div>

                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g2 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g2 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person2.dayMasterElement] || '#a78bfa' }}>
                      {result.person2.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person2.birthDate}</span>
                  </div>
                </div>
                <span className="mlc-grade-badge" style={{ color: GRADE_COLORS[result.grade] || getScoreColor(result.score) }}>
                  {result.grade}
                </span>
              </div>

              {(result.aiSummary || result.aiAnalysis) && (() => {
                const cards = (
                  <>
                    {result.aiSummary && <FortuneCard icon="💕" title="한 줄 요약" description={result.aiSummary} delay={0} />}
                    {result.aiAnalysis && <FortuneCard icon="🔮" title="종합 분석" description={result.aiAnalysis} delay={80} />}
                    {result.aiLoveCompat && <FortuneCard icon="💖" title="연애 궁합" description={result.aiLoveCompat} delay={160} />}
                    {result.aiWorkCompat && <FortuneCard icon="🤝" title="일 / 협력 궁합" description={result.aiWorkCompat} delay={240} />}
                    {result.aiConflictPoint && <FortuneCard icon="⚠️" title="갈등 포인트" description={result.aiConflictPoint} delay={320} />}
                    {result.aiAdvice && <FortuneCard icon="💡" title="관계 조언" description={result.aiAdvice} delay={400} />}
                  </>
                );
                return deepResult ? (
                  <div className="mlc-section">
                    <button className={`mlc-section-toggle ${basicExpanded ? 'open' : ''}`} onClick={() => setBasicExpanded((v) => !v)}>
                      <span className="mlc-section-title">📋 일반 분석</span>
                      <span className="mlc-section-chevron">▾</span>
                    </button>
                    {basicExpanded && <div className="mlc-section-body">{cards}</div>}
                  </div>
                ) : cards;
              })()}

              {/* ─── 정통궁합 심화분석 ─── */}
              <div ref={deepRef} className="mlc-deep-section">
                {!deepResult && !deepStreaming && !deepCompleting && (
                  <button className="mlc-deep-btn" onClick={() => guardDeepSajuCompat(() => startDeepCompat('compatibility'))}>
                    🔍 심화분석 보기 <HeartCost category="DEEP_COMPATIBILITY" />
                  </button>
                )}
                {deepCompleting && (
                  <div className="mlc-deep-complete">
                    <div className="mlc-deep-complete-burst">
                      <span className="mlc-deep-complete-icon">✨</span>
                      <span className="mlc-deep-complete-ring" />
                      <span className="mlc-deep-complete-ring mlc-deep-complete-ring-2" />
                    </div>
                    <p className="mlc-deep-complete-text">분석이 끝났어요!</p>
                    <p className="mlc-deep-complete-sub">결과를 보여드릴게요</p>
                  </div>
                )}
                {deepResult && !deepCompleting && (
                  <div className="mlc-section mlc-section--deep">
                    <button className={`mlc-section-toggle mlc-section-toggle--deep ${deepExpanded ? 'open' : ''}`} onClick={() => setDeepExpanded((v) => !v)}>
                      <span className="mlc-section-title">✨ 심화분석</span>
                      <span className="mlc-section-chevron">▾</span>
                    </button>
                    {deepExpanded && (
                      <div className="mlc-section-body">
                        {deepResult.deepSummary && <FortuneCard icon="🌟" title="심화 요약" description={deepResult.deepSummary} delay={0} />}
                        {deepResult.conflictScenario && <FortuneCard icon="⚡" title="갈등 시나리오" description={deepResult.conflictScenario} delay={80} />}
                        {deepResult.synergyPoint && <FortuneCard icon="✨" title="시너지 포인트" description={deepResult.synergyPoint} delay={160} />}
                        {deepResult.elementChemistry && <FortuneCard icon="🌈" title="오행 케미" description={deepResult.elementChemistry} delay={240} />}
                        {deepResult.timelineChange && <FortuneCard icon="⏳" title="시기별 변화" description={deepResult.timelineChange} delay={320} />}
                        {deepResult.crisisHandling && <FortuneCard icon="🛡️" title="위기 극복법" description={deepResult.crisisHandling} delay={400} />}
                        {deepResult.longTermStrategy && <FortuneCard icon="🎯" title="지속 전략" description={deepResult.longTermStrategy} delay={480} />}
                        {deepResult.hiddenMessage && <FortuneCard icon="🔮" title="천기누설" description={deepResult.hiddenMessage} delay={560} />}
                        {deepResult.detailAnalysis && !deepResult.deepSummary && <FortuneCard icon="🔍" title="심화 분석" description={deepResult.detailAnalysis} delay={0} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 결혼궁합 결과 */}
          {tab === 'marriage' && result._kind === 'marriage' && result.person1 && (
            <>
              <div className="mlc-score-hero">
                <div className="mlc-vs-row">
                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g1 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g1 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person1.dayMasterElement] || '#fbbf24' }}>
                      {result.person1.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person1.birthDate}</span>
                  </div>
                  <div className="mlc-score-ring-wrap">
                    <svg viewBox="0 0 100 100" className="mlc-score-ring">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 264} 264`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="mlc-score-inner">
                      <span className="mlc-score-num">{result.score}</span>
                      <span className="mlc-score-unit">점</span>
                    </div>
                  </div>
                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g2 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g2 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person2.dayMasterElement] || '#a78bfa' }}>
                      {result.person2.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person2.birthDate}</span>
                  </div>
                </div>
                <span className="mlc-grade-badge" style={{ color: GRADE_COLORS[result.grade] || getScoreColor(result.score) }}>
                  💒 {result.grade}
                </span>
              </div>

              {(result.aiSummary || result.aiAnalysis) && (() => {
                const cards = (
                  <>
                    {result.aiSummary && <FortuneCard icon="💕" title="한 줄 요약" description={result.aiSummary} delay={0} />}
                    {result.aiAnalysis && <FortuneCard icon="💒" title="결혼궁합 총평" description={result.aiAnalysis} delay={80} />}
                    {result.aiMarriageTiming && <FortuneCard icon="📅" title="결혼 시기" description={result.aiMarriageTiming} delay={160} />}
                    {result.aiFamilyHarmony && <FortuneCard icon="🏡" title="가정 화합" description={result.aiFamilyHarmony} delay={240} />}
                    {result.aiChildLuck && <FortuneCard icon="👶" title="자녀운" description={result.aiChildLuck} delay={320} />}
                    {result.aiSpouseTrait && <FortuneCard icon="💼" title="배우자 성향" description={result.aiSpouseTrait} delay={400} />}
                    {result.aiInLawRelation && <FortuneCard icon="🏠" title="양가 관계" description={result.aiInLawRelation} delay={480} />}
                    {result.aiFinanceTogether && <FortuneCard icon="💰" title="공동 재물" description={result.aiFinanceTogether} delay={560} />}
                    {result.aiAdvice && <FortuneCard icon="💡" title="결혼 준비 조언" description={result.aiAdvice} delay={640} />}
                  </>
                );
                return deepResult ? (
                  <div className="mlc-section">
                    <button className={`mlc-section-toggle ${basicExpanded ? 'open' : ''}`} onClick={() => setBasicExpanded((v) => !v)}>
                      <span className="mlc-section-title">📋 일반 분석</span>
                      <span className="mlc-section-chevron">▾</span>
                    </button>
                    {basicExpanded && <div className="mlc-section-body">{cards}</div>}
                  </div>
                ) : cards;
              })()}

              {/* ─── 결혼궁합 심화분석 ─── */}
              <div ref={deepRef} className="mlc-deep-section">
                {!deepResult && !deepStreaming && !deepCompleting && (
                  <button className="mlc-deep-btn" onClick={() => guardDeepMarriageCompat(() => startDeepCompat('marriage_compat'))}>
                    🔍 결혼궁합 심화분석 보기 <HeartCost category="DEEP_MARRIAGE_COMPAT" />
                  </button>
                )}
                {deepCompleting && (
                  <div className="mlc-deep-complete">
                    <div className="mlc-deep-complete-burst">
                      <span className="mlc-deep-complete-icon">✨</span>
                      <span className="mlc-deep-complete-ring" />
                      <span className="mlc-deep-complete-ring mlc-deep-complete-ring-2" />
                    </div>
                    <p className="mlc-deep-complete-text">분석이 끝났어요!</p>
                    <p className="mlc-deep-complete-sub">결과를 보여드릴게요</p>
                  </div>
                )}
                {deepResult && !deepCompleting && (
                  <div className="mlc-section mlc-section--deep">
                    <button className={`mlc-section-toggle mlc-section-toggle--deep ${deepExpanded ? 'open' : ''}`} onClick={() => setDeepExpanded((v) => !v)}>
                      <span className="mlc-section-title">✨ 결혼궁합 심화분석</span>
                      <span className="mlc-section-chevron">▾</span>
                    </button>
                    {deepExpanded && (
                      <div className="mlc-section-body">
                        {deepResult.deepSummary && <FortuneCard icon="🌟" title="심화 요약" description={deepResult.deepSummary} delay={0} />}
                        {deepResult.marriageTimingDeep && <FortuneCard icon="📅" title="결혼 시기 심화" description={deepResult.marriageTimingDeep} delay={80} />}
                        {deepResult.spouseRole && <FortuneCard icon="🤝" title="부부 역할 분담" description={deepResult.spouseRole} delay={160} />}
                        {deepResult.childRaisingDeep && <FortuneCard icon="👨‍👩‍👧" title="자녀 양육 심화" description={deepResult.childRaisingDeep} delay={240} />}
                        {deepResult.inLawDeep && <FortuneCard icon="🏠" title="양가 관계 심화" description={deepResult.inLawDeep} delay={320} />}
                        {deepResult.financeDesign && <FortuneCard icon="💰" title="재정 설계" description={deepResult.financeDesign} delay={400} />}
                        {deepResult.crisisManagement && <FortuneCard icon="🛡️" title="위기 관리" description={deepResult.crisisManagement} delay={480} />}
                        {deepResult.longTermVision && <FortuneCard icon="🎯" title="장기 비전" description={deepResult.longTermVision} delay={560} />}
                        {deepResult.hiddenMessage && <FortuneCard icon="🔮" title="천기누설" description={deepResult.hiddenMessage} delay={640} />}
                        {deepResult.detailAnalysis && !deepResult.deepSummary && <FortuneCard icon="🔍" title="심화 분석" description={deepResult.detailAnalysis} delay={0} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 스킨십궁합 결과 */}
          {tab === 'skinship' && result._kind === 'skinship' && result.person1 && (
            <>
              <div className="mlc-score-hero">
                <div className="mlc-vs-row">
                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g1 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g1 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person1.dayMasterElement] || '#fbbf24' }}>
                      {result.person1.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person1.birthDate}</span>
                  </div>
                  <div className="mlc-score-ring-wrap">
                    <svg viewBox="0 0 100 100" className="mlc-score-ring">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor(result.score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 264} 264`} transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="mlc-score-inner">
                      <span className="mlc-score-num">{result.score}</span>
                      <span className="mlc-score-unit">점</span>
                    </div>
                  </div>
                  <div className="mlc-person-card">
                    <span className="mlc-person-icon" style={{ color: result._g2 === 'F' ? '#F472B6' : '#60A5FA' }}>
                      {result._g2 === 'F' ? '♀' : '♂'}
                    </span>
                    <span className="mlc-person-pillar" style={{ color: ELEMENT_COLORS[result.person2.dayMasterElement] || '#a78bfa' }}>
                      {result.person2.dayMaster}
                    </span>
                    <span className="mlc-person-date">{result.person2.birthDate}</span>
                  </div>
                </div>
                <span className="mlc-grade-badge" style={{ color: GRADE_COLORS[result.grade] || getScoreColor(result.score) }}>
                  💋 {result.grade}
                </span>
              </div>

              {result.aiOneLiner && (
                <div className="mlc-oneliner">
                  <span className="mlc-oneliner-text">{result.aiOneLiner}</span>
                </div>
              )}
              {result.aiAnalysis && <FortuneCard icon="💋" title="케미 진단" description={result.aiAnalysis} delay={0} />}
              {result.aiTiming && <FortuneCard icon="⏰" title="스킨십 타이밍" description={result.aiTiming} delay={80} />}
              {result.aiAdvice && <FortuneCard icon="💡" title="케미 올리는 팁" description={result.aiAdvice} delay={160} />}
              {result.aiCaution && <FortuneCard icon="⚠️" title="주의할 점" description={result.aiCaution} delay={240} />}
              {result.aiMindsetBoost && <FortuneCard icon="💪" title="멘탈 부스터" description={result.aiMindsetBoost} delay={320} />}
              {(result.aiLuckyDay || result.aiLuckyPlace || result.aiLuckyColor) && (
                <div className="mlc-lucky">
                  {result.aiLuckyDay && <div className="mlc-lucky-item"><span className="mlc-lucky-label">행운의 날</span><span className="mlc-lucky-value">{result.aiLuckyDay}</span></div>}
                  {result.aiLuckyPlace && <div className="mlc-lucky-item"><span className="mlc-lucky-label">분위기 좋은 장소</span><span className="mlc-lucky-value">{result.aiLuckyPlace}</span></div>}
                  {result.aiLuckyColor && <div className="mlc-lucky-item"><span className="mlc-lucky-label">매력 UP 컬러</span><span className="mlc-lucky-value">{result.aiLuckyColor}</span></div>}
                </div>
              )}
            </>
          )}

          <button className="mlc-reset-btn" onClick={handleReset}>🔄 다시 보기</button>
        </div>
      )}

      {/* 하단 pull-up drawer — 탭별 히스토리 타입 분기 */}
      {!isGuest() && (
        <HistoryDrawer
          type={tab === 'marriage' ? 'marriage_compat' : tab === 'skinship' ? 'skinship_compat' : 'my_love_compat'}
          label={tab === 'marriage' ? '📚 최근 본 결혼 궁합' : tab === 'skinship' ? '📚 최근 본 스킨십 궁합' : '📚 최근 본 연인 궁합'}
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              const p = full?.payload;
              if (!p) return;
              if (full?.type === 'skinship_compat') {
                // payload는 SpecialFortune 스키마 (birthDate/partnerDate/overall/...)
                setTab('skinship');
                setBd1(p.birthDate || '');
                setBd2(p.partnerDate || '');
                setG1(p.gender || 'M');
                setG2(p.partnerGender || 'F');
                // skinship 결과 재현에는 person1/person2 사주 정보가 필요 → basic 재호출
                try {
                  const base = await getSajuCompatibilityBasic(
                    p.birthDate, p.partnerDate,
                    p.birthTime || undefined, undefined,
                    'SOLAR', 'SOLAR', p.gender || 'M', p.partnerGender || 'F'
                  );
                  setResult({
                    ...base,
                    _g1: p.gender || 'M',
                    _g2: p.partnerGender || 'F',
                    _kind: 'skinship',
                    score: p.score || base.score,
                    grade: p.grade || base.grade,
                    aiAnalysis: p.overall,
                    aiTiming: p.timing,
                    aiAdvice: p.advice,
                    aiCaution: p.caution,
                    aiMindsetBoost: p.mindsetBoost,
                    aiOneLiner: p.oneLiner,
                    aiLuckyDay: p.luckyDay,
                    aiLuckyPlace: p.luckyPlace,
                    aiLuckyColor: p.luckyColor,
                  });
                } catch {}
                return;
              }
              p._g1 = p.gender1 || 'M';
              p._g2 = p.gender2 || 'F';
              if (p.aiOverall && !p.aiAnalysis) p.aiAnalysis = p.aiOverall;
              if (full?.type === 'marriage_compat') {
                p._kind = 'marriage';
                setTab('marriage');
              }
              setResult(p);
            } catch {}
          }}
        />
      )}
    </div>
  );
}

export default MyLoveCompat;
