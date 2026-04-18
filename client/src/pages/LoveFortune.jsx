import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoveFortuneBasic, getLoveFortuneStream, saveLoveFortuneCache, getCelebMatch, getSajuCompatibility, isGuest, getHistory } from '../api/fortune';
import HistoryDrawer from '../components/HistoryDrawer';
import CELEBRITIES from '../data/celebrities';
import FortuneCard from '../components/FortuneCard';
import BirthDatePicker from '../components/BirthDatePicker';
import AnalysisMatrix from '../components/AnalysisMatrix';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './LoveFortune.css';

const RELATION_STATUSES = [
  { value: 'SINGLE', label: '솔로', icon: '💫' },
  { value: 'SOME', label: '썸', icon: '💗' },
  { value: 'IN_RELATIONSHIP', label: '연애중', icon: '💕' },
  { value: 'MARRIED', label: '기혼', icon: '💍' },
  { value: 'COMPLICATED', label: '복잡', icon: '💔' },
];

const GRADE_COLORS = { '대길': '#ff3d7f', '길': '#ff6b9d', '보통': '#fbbf24', '흉': '#94a3b8' };

function getHeartColor(score) {
  const s = Math.max(0, Math.min(100, score || 50));
  const sat = 30 + s * 0.7;
  const light = 85 - s * 0.4;
  return `hsl(340, ${sat}%, ${light}%)`;
}

function FloatingHearts({ score }) {
  const color = getHeartColor(score);
  const count = Math.max(3, Math.floor((score || 50) / 12));
  return (
    <div className="lf-hearts-container">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="lf-floating-heart" style={{
          '--heart-color': color,
          '--float-delay': `${i * 0.4}s`,
          '--float-duration': `${2 + Math.random() * 2}s`,
          '--heart-x': `${10 + Math.random() * 80}%`,
          '--heart-size': `${12 + Math.random() * 14}px`,
        }}>&#x2764;</span>
      ))}
    </div>
  );
}

function LoveFortune() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const [relationStatus, setRelationStatus] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const resultRef = useRef(null);
  const cleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => { return () => cleanupRef.current?.(); }, []);
  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 결과 등장 시 매트릭스 부드럽게 페이드아웃
  useEffect(() => {
    if (result && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [result, matrixShown]);

  // 연예인 궁합 매칭
  const [celebListOpen, setCelebListOpen] = useState(false);
  const [celebList, setCelebList] = useState([]);
  const [celebLoading, setCelebLoading] = useState(false);
  const [celebPopup, setCelebPopup] = useState(false); // 팝업 열림 여부
  const [selectedCeleb, setSelectedCeleb] = useState(null);
  const [celebResult, setCelebResult] = useState(null);
  const [celebDetailLoading, setCelebDetailLoading] = useState(false);

  // 로그인 유저는 프로필에서 자동 로드
  const handleAutoFill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setBirthDate(p.birthDate);
      if (p.gender) setGender(p.gender);
      if (p.relationshipStatus) setRelationStatus(p.relationshipStatus);
    } catch {}
  };

  const { guardedAction: guardLoveFortune } = useHeartGuard('LOVE_RELATIONSHIP');

  const handleAnalyze = async () => {
    if (!birthDate || !relationStatus) return;
    setLoading(true);
    setResult(null);
    setStreamText('');
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    try {
      // 1단계: 캐시 체크 + 사주 기본 (즉시)
      const data = await getLoveFortuneBasic(
        'relationship', birthDate, null, gender || null, null,
        null, null, null, null, relationStatus
      );

      // 캐시에 AI 분석이 있으면 즉시 표시
      if (data.score && data.overall) {
        setResult(data);
        setLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
        return;
      }

      // 2단계: AI 스트리밍 — 매트릭스에 실시간 텍스트 공급, 완료 시 결과 일괄 렌더
      setAiStreaming(true);

      cleanupRef.current = getLoveFortuneStream(
        'relationship', birthDate, '', gender || '', '',
        '', '', '', '', relationStatus,
        {
          onCached: (cachedData) => {
            setAiStreaming(false); setLoading(false); setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
            setResult(cachedData);
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
          },
          onChunk: (text) => setStreamText(prev => prev + text),
          onDone: (fullText) => {
            setAiStreaming(false); setLoading(false);
            setStreamText('');
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
            try {
              let json = fullText;
              if (json.includes('```')) {
                const s = json.indexOf('\n', json.indexOf('```'));
                const e = json.lastIndexOf('```');
                if (s > 0 && e > s) json = json.substring(s + 1, e);
              }
              const bs = json.indexOf('{');
              const be = json.lastIndexOf('}');
              if (bs >= 0 && be > bs) json = json.substring(bs, be + 1);
              const parsed = JSON.parse(json);
              const finalResult = {
                ...data,
                score: parsed.score || 65,
                grade: parsed.grade || '보통',
                overall: parsed.overall || '',
                timing: parsed.timing || '',
                advice: parsed.advice || '',
                caution: parsed.caution || '',
                luckyDay: parsed.luckyDay || '',
                luckyPlace: parsed.luckyPlace || '',
                luckyColor: parsed.luckyColor || '',
              };
              setResult(finalResult);
              // 캐시 저장
              saveLoveFortuneCache({ ...finalResult, type: 'relationship', birthDate, gender }).catch(() => {});
              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
            } catch {
              setResult({ ...data, score: 65, grade: '보통', overall: fullText });
            }
          },
          onError: () => {
            setAiStreaming(false); setLoading(false);
            try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
          },
        }
      );
    } catch (err) {
      console.error(err);
      setLoading(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const handleCelebMatch = async () => {
    if (!birthDate) return;
    setCelebLoading(true);
    setCelebListOpen(true);
    try {
      const targetGender = gender === 'M' ? 'F' : 'M';
      const candidates = CELEBRITIES.filter(c => c.gender === targetGender);
      const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 30);
      const data = await getCelebMatch(birthDate, null, 'SOLAR', shuffled.map(c => ({
        name: c.name, birth: c.birth, gender: c.gender, group: c.group || ''
      })));
      setCelebList(data);
    } catch (e) { console.error(e); }
    setCelebLoading(false);
  };

  const handleCelebDetail = async (celeb) => {
    setSelectedCeleb(celeb);
    setCelebResult(null);
    setCelebDetailLoading(true);
    setCelebPopup(true);
    try {
      const data = await getSajuCompatibility(
        birthDate, celeb.birth, null, null, 'SOLAR', 'SOLAR',
        gender || 'M', celeb.gender
      );
      data._celebName = celeb.name;
      data._celebGroup = celeb.group;
      setCelebResult(data);
    } catch (e) { console.error(e); }
    setCelebDetailLoading(false);
  };

  const closeCelebPopup = () => {
    setCelebPopup(false);
    setCelebResult(null);
    setSelectedCeleb(null);
  };

  const heartColor = result?.score ? getHeartColor(result.score) : '#ffc0cb';
  const statusInfo = RELATION_STATUSES.find(r => r.value === relationStatus);

  const handleReset = () => {
    setResult(null);
    setBirthDate('');
    setRelationStatus('');
    setGender('');
    setAiStreaming(false);
    setStreamText('');
    setMatrixShown(false);
    setMatrixExiting(false);
    setCelebListOpen(false);
    setCelebList([]);
    setCelebResult(null);
    setSelectedCeleb(null);
    setCelebPopup(false);
    cleanupRef.current?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="lf-page">
      {/* 상단 버튼바 */}
      <div className="lf-topbar">
        <button className="lf-topbtn lf-topbtn--back" onClick={() => navigate(-1)} aria-label="뒤로">
          <span>‹</span> 뒤로
        </button>
        <button className="lf-topbtn lf-topbtn--reset" onClick={handleReset} aria-label="다시하기">
          다시하기 <span>↻</span>
        </button>
      </div>

      {/* 히어로 */}
      <section className="lf-hero">
        <div className="lf-hero-bg" />
        <div className="lf-hero-couple">
          <span className="lf-sym lf-sym--m">♂</span>
          <div className="lf-hero-bond">
            <span className="lf-bond-heart">♥</span>
            {[...Array(5)].map((_, i) => <span key={i} className="lf-hero-sparkle" style={{ '--sp-i': i }}>✦</span>)}
          </div>
          <span className="lf-sym lf-sym--f">♀</span>
        </div>
        <h1 className="lf-title">1:1 연애운</h1>
        <p className="lf-subtitle">두근두근, 오늘 나의 연애 기운은?</p>
      </section>

      {/* 비로그인 CTA */}
      {!userId && !result && !loading && !aiStreaming && (
        <button className="home-cta-btn" style={{ margin: '0 0 10px' }} onClick={() => navigate('/register', { state: { from: '/love-fortune' } })}>
          카카오 로그인하고 맞춤 연애운 받기
        </button>
      )}

      {/* 입력 폼 */}
      {!result && !loading && !aiStreaming && (
        <div className="lf-form fade-in">
          {userId && (
            <button className="lf-autofill-btn" onClick={handleAutoFill}>✨ 내 정보로 채우기</button>
          )}

          {/* 연애 상태 */}
          <div className="lf-form-group">
            <label className="lf-label">지금 연애 상태는?</label>
            <div className="lf-status-grid">
              {RELATION_STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`lf-status-chip ${relationStatus === s.value ? 'active' : ''}`}
                  onClick={() => setRelationStatus(s.value)}
                >
                  <span className="lf-status-icon">{s.icon}</span>
                  <span className="lf-status-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div className="lf-form-group">
            <label className="lf-label">생년월일</label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} />
          </div>

          {/* 성별 */}
          <div className="lf-form-group">
            <label className="lf-label">성별</label>
            <div className="lf-toggle">
              <button className={`lf-toggle-btn ${gender === 'M' ? 'active' : ''}`} onClick={() => setGender('M')}>
                <span className="g-circle g-male">♂</span>
              </button>
              <button className={`lf-toggle-btn ${gender === 'F' ? 'active' : ''}`} onClick={() => setGender('F')}>
                <span className="g-circle g-female">♀</span>
              </button>
            </div>
          </div>

          <button className="lf-submit" onClick={() => guardLoveFortune(handleAnalyze)} disabled={!birthDate || !relationStatus}>
            💕 오늘의 연애운 보기 <HeartCost category="LOVE_RELATIONSHIP" />
          </button>
        </div>
      )}

      {/* 연애 매트릭스 로딩 — 완료 후 부드럽게 페이드아웃 */}
      {matrixShown && (
        <AnalysisMatrix theme="love" label="AI가 연애운을 분석하고 있어요" streamText={streamText} exiting={matrixExiting} />
      )}

      {/* 결과 */}
      {result && (
        <div className="lf-result lf-result-reveal" ref={resultRef} style={{ '--heart-color': heartColor }}>
          {/* 하트 점수 */}
          <div className="lf-heart-score-card">
            <FloatingHearts score={result.score} />
            <div className="lf-heart-aura" style={{ background: `radial-gradient(circle, ${heartColor}, transparent 70%)` }} />
            <div className="lf-heart-center">
              <span className="lf-heart-big" style={{ color: heartColor }}>&#x2764;</span>
              <span className="lf-heart-num">{result.score}</span>
              <span className="lf-heart-unit">점</span>
            </div>
            <span className="lf-heart-grade" style={{ color: GRADE_COLORS[result.grade] || heartColor }}>{result.grade}</span>
            {statusInfo && <span className="lf-heart-status">{statusInfo.icon} {statusInfo.label}</span>}
          </div>

          <FortuneCard icon="💕" title="종합 분석" description={result.overall} delay={0} />
          {result.timing && <FortuneCard icon="📅" title="최적 시기" description={result.timing} delay={80} />}
          {result.advice && <FortuneCard icon="💡" title="행동 조언" description={result.advice} delay={160} />}
          {result.caution && <FortuneCard icon="⚠️" title="주의사항" description={result.caution} delay={240} />}

          <div className="lf-lucky">
            {result.luckyDay && <div className="lf-lucky-item"><span className="lf-lucky-label">행운의 날</span><span className="lf-lucky-value">{result.luckyDay}</span></div>}
            {result.luckyPlace && <div className="lf-lucky-item"><span className="lf-lucky-label">행운의 장소</span><span className="lf-lucky-value">{result.luckyPlace}</span></div>}
            {result.luckyColor && <div className="lf-lucky-item"><span className="lf-lucky-label">행운의 색</span><span className="lf-lucky-value">{result.luckyColor}</span></div>}
          </div>

          <button className="lf-reset" onClick={() => { setResult(null); setBirthDate(''); setRelationStatus(''); setAiStreaming(false); setCelebListOpen(false); setCelebList([]); setCelebResult(null); setSelectedCeleb(null); setCelebPopup(false); }}>🔄 다시 보기</button>

          {/* 궁합이 맞는 연예인 */}
          {!celebListOpen && (
            <button className="lf-celeb-match-btn" onClick={handleCelebMatch}>
              💫 나와 궁합이 맞는 연예인은?
            </button>
          )}

          {/* 연예인 리스트 */}
          {celebListOpen && (
            <div className="lf-celeb-section fade-in">
              <h3 className="lf-celeb-title">💫 나와 궁합이 맞는 연예인 TOP 5</h3>
              {celebLoading ? (
                <div className="lf-celeb-loading">
                  <span className="lf-celeb-loading-icon">💫</span>
                  <p>궁합이 맞는 연예인을 찾고 있어요...</p>
                </div>
              ) : (
                <div className="lf-celeb-list">
                  {celebList.map((celeb, i) => (
                    <button key={i} className="lf-celeb-item glass-card" onClick={() => handleCelebDetail(celeb)}>
                      <span className="lf-celeb-rank">{i + 1}</span>
                      <span className={`lf-celeb-gender ${celeb.gender === 'M' ? 'lf-celeb-gender--m' : 'lf-celeb-gender--f'}`}>
                        {celeb.gender === 'M' ? '♂' : '♀'}
                      </span>
                      <div className="lf-celeb-info">
                        <span className="lf-celeb-name">{celeb.name}</span>
                        {celeb.group && <span className="lf-celeb-group">{celeb.group}</span>}
                      </div>
                      <div className="lf-celeb-score-wrap">
                        <span className="lf-celeb-score" style={{
                          color: celeb.score >= 80 ? '#ff3d7f' : celeb.score >= 60 ? '#fbbf24' : '#94a3b8'
                        }}>{celeb.score}점</span>
                        <span className="lf-celeb-grade">{celeb.grade}</span>
                      </div>
                      <span className="lf-celeb-arrow">›</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="lf-celeb-hide-btn" onClick={() => setCelebListOpen(false)}>접기</button>
            </div>
          )}

          {/* 연예인 상세 궁합 팝업 */}
          {celebPopup && (
            <div className="lf-celeb-popup-overlay" onClick={closeCelebPopup}>
              <div className="lf-celeb-popup" onClick={e => e.stopPropagation()}>
                <button className="lf-celeb-popup-close" onClick={closeCelebPopup}>✕ 닫기</button>
                {celebDetailLoading ? (
                  <AnalysisMatrix theme="love" variant="modal" label="스타와의 궁합을 분석하고 있어요" />
                ) : celebResult ? (
                  <div className="lf-celeb-detail fade-in">
                    <div className="lf-celeb-detail-header">
                      <span className="lf-celeb-detail-name">나 ♥ {celebResult._celebName}</span>
                      {celebResult._celebGroup && <span className="lf-celeb-detail-group">{celebResult._celebGroup}</span>}
                      <div className="lf-celeb-detail-score" style={{
                        color: celebResult.score >= 80 ? '#ff3d7f' : celebResult.score >= 60 ? '#fbbf24' : '#94a3b8'
                      }}>
                        <span className="lf-celeb-detail-num">{celebResult.score}</span>
                        <span>점</span>
                      </div>
                      <span className="lf-celeb-detail-grade">{celebResult.grade}</span>
                    </div>
                    {celebResult.aiSummary && (
                      <div className="lf-celeb-card glass-card">
                        <p className="lf-celeb-card-summary">{celebResult.aiSummary}</p>
                      </div>
                    )}
                    {celebResult.aiAnalysis && (
                      <div className="lf-celeb-card glass-card">
                        <h4>🔮 종합 분석</h4>
                        <p>{celebResult.aiAnalysis}</p>
                      </div>
                    )}
                    {celebResult.aiLoveCompat && (
                      <div className="lf-celeb-card glass-card">
                        <h4>💕 연애 궁합</h4>
                        <p>{celebResult.aiLoveCompat}</p>
                      </div>
                    )}
                    {celebResult.aiAdvice && (
                      <div className="lf-celeb-card glass-card">
                        <h4>💡 조언</h4>
                        <p>{celebResult.aiAdvice}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 하단 pull-up drawer — 최근 본 연애 운세 */}
      {!isGuest() && (
        <HistoryDrawer
          type="love_11"
          label="📚 최근 본 연애 운세"
          limit={10}
          onOpen={async (item) => {
            try {
              const full = await getHistory(item.id);
              const subType = full?.payload?.type || 'relationship';
              navigate(`/love/${subType}`, { state: { restoreHistoryId: item.id } });
            } catch {}
          }}
        />
      )}
    </div>
  );
}

export default LoveFortune;
