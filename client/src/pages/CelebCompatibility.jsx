import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSajuCompatibility, searchCeleb, analyzeSajuStream } from '../api/fortune';
import parseAiJson from '../utils/parseAiJson';
import CELEBRITIES, { CELEB_CATEGORIES } from '../data/celebrities';
import GROUPS from '../data/groups';
import BirthDatePicker from '../components/BirthDatePicker';
import SpeechButton from '../components/SpeechButton';
import StreamText from '../components/StreamText';
import { shareResult } from '../utils/share';
import './CelebCompatibility.css';

const GRADE_COLORS = { '천생연분': '#ff3d7f', '좋은 인연': '#ff6b9d', '보통': '#fbbf24', '노력 필요': '#94a3b8', '상극': '#64748b' };
const USER_CELEBS_KEY = 'userCelebrities';

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
  const initCeleb = location.state?.selectedCeleb || null;
  const [step, setStep] = useState(initCeleb ? 'input' : 'select');
  const [selectedCeleb, setSelectedCeleb] = useState(initCeleb);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

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

  // state 소비 후 제거 (뒤로가기 중복 방지)
  useEffect(() => {
    if (location.state?.selectedCeleb) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  // 내장 DB + 사용자 추가 DB 병합
  const allCelebs = useMemo(() => [...CELEBRITIES, ...getUserCelebs()], [step]);

  // 통합 목록: 그룹 + 개인 스타를 하나로
  const filteredItems = useMemo(() => {
    const items = [];
    const q = searchQuery.trim().toLowerCase();

    // 보이그룹/걸그룹 카테고리 → 그룹만
    if (activeCategory === 'boygroup' || activeCategory === 'girlgroup') {
      let groups = GROUPS.filter(g => activeCategory === 'boygroup' ? g.type === 'boy' : g.type === 'girl');
      if (q) groups = groups.filter(g => g.name.toLowerCase().includes(q));
      groups.forEach(g => items.push({ _type: 'group', ...g }));
      return items;
    }

    // 전체/아이돌 → 그룹도 포함
    if (activeCategory === 'all' || activeCategory === 'idol') {
      let groups = GROUPS;
      if (q) groups = groups.filter(g => g.name.toLowerCase().includes(q));
      else if (activeCategory === 'idol') { /* 아이돌이면 그룹 전체 표시 */ }
      groups.forEach(g => items.push({ _type: 'group', ...g }));
    }

    // 개인 스타
    let celebs = allCelebs;
    if (activeCategory === 'idol') celebs = celebs.filter(c => c.category === 'idol');
    else if (activeCategory !== 'all') celebs = celebs.filter(c => c.category === activeCategory);
    if (q) {
      celebs = celebs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.group && c.group.toLowerCase().includes(q))
      );
    }
    celebs.forEach(c => items.push({ _type: 'celeb', ...c }));

    return items;
  }, [activeCategory, searchQuery, allCelebs]);

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

  const handleAnalyze = async () => {
    if (!myBirth || !selectedCeleb) return;
    setStep('loading');
    try {
      const data = await getSajuCompatibility(
        myBirth, selectedCeleb.birth,
        myBirthTime || undefined, undefined,
        myCalType, 'SOLAR'
      );
      data._celebName = selectedCeleb.name;
      data._celebGroup = selectedCeleb.group;
      setResult(data);
      setStep('result');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) {
      console.error(e);
      setStep('input');
    }
  };

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
    starCleanupRef.current?.();

    starCleanupRef.current = analyzeSajuStream(selectedCeleb.birth, undefined, 'SOLAR', selectedCeleb.gender, {
      onCached: (data) => {
        setStarFortune(data.todayFortune || data);
        setStarFortuneLoading(false);
      },
      onChunk: (text) => {
        setStarStreaming(true);
        setStarStreamText(prev => prev + text);
      },
      onDone: (fullText) => {
        setStarStreaming(false);
        setStarStreamText('');
        const parsed = parseAiJson(fullText);
        if (parsed) {
          setStarFortune({ overall: parsed.overall, love: parsed.love, money: parsed.money, health: parsed.health, work: parsed.work, score: parsed.score || 70, luckyNumber: parsed.luckyNumber, luckyColor: parsed.luckyColor });
        }
        setStarFortuneLoading(false);
      },
      onError: () => { setStarStreaming(false); setStarStreamText(''); setStarFortuneLoading(false); },
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
      <div className="celeb-page">
        <section className="celeb-hero celeb-hero--compact">
          <span className="celeb-hero-icon">💫</span>
          <h1 className="celeb-hero-title">스타와 나의 궁합</h1>
        </section>

        <div className="celeb-search-wrap">
          <input className="celeb-search" type="text" placeholder="스타 이름 또는 그룹 검색..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="celeb-categories">
          {CELEB_CATEGORIES.map(cat => (
            <button key={cat.key} className={`celeb-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}>{cat.label}</button>
          ))}
        </div>

        <div className="celeb-list">
          {filteredItems.length > 0 ? filteredItems.map((item, i) => (
            item._type === 'group' ? (
              <button key={`group-${item.name}`} className="celeb-item celeb-item--group" onClick={() => handleSelectGroup(item)}>
                <span className={`celeb-item-sym ${item.type === 'boy' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>
                  {item.type === 'boy' ? '♂' : '♀'}
                </span>
                <div className="celeb-item-info">
                  <span className="celeb-item-name">{item.name}</span>
                  <span className="celeb-item-detail">
                    <span className="celeb-tag celeb-tag--group">{item.type === 'boy' ? '보이그룹' : '걸그룹'}</span>
                    <span>{item.members.length}명</span>
                    <span>{item.agency}</span>
                  </span>
                </div>
                <span className="celeb-item-arrow">›</span>
              </button>
            ) : (
              <button key={`${item.name}-${item.birth}-${i}`} className="celeb-item" onClick={() => handleSelectCeleb(item)}>
                <span className={`celeb-item-sym ${item.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>{item.gender === 'M' ? '♂' : '♀'}</span>
                <div className="celeb-item-info">
                  <span className="celeb-item-name">{item.name}</span>
                  <span className="celeb-item-detail">
                    {item.group && <span className="celeb-tag celeb-tag--group">{item.group}</span>}
                    {item.agency && <span className="celeb-tag celeb-tag--agency">{item.agency}</span>}
                    <span>{item.birth.slice(0, 4)}년생</span>
                  </span>
                </div>
                <span className="celeb-item-arrow">›</span>
              </button>
            )
          )) : (
            <div className="celeb-empty">
              <p>검색 결과가 없습니다</p>
            </div>
          )}
        </div>

        <button className="celeb-manual-toggle" onClick={() => setShowManual(!showManual)}>
          {showManual ? '접기' : '찾는 스타가 없나요? ✏️ 직접 입력'}
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
              <div className="form-toggle">
                <button type="button" className={`form-toggle__btn ${manualGender === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setManualGender('M')}><span className="g-circle g-male">♂</span></button>
                <button type="button" className={`form-toggle__btn ${manualGender === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setManualGender('F')}><span className="g-circle g-female">♀</span></button>
              </div>
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
        <button className="celeb-back-btn" onClick={() => { setStep('select'); setStarFortune(null); }}>← 스타 목록으로</button>
        <section className="celeb-selected glass-card">
          <span className={`celeb-item-sym celeb-sym--lg ${selectedCeleb.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f'}`}>
            {selectedCeleb.gender === 'M' ? '♂' : '♀'}
          </span>
          <div className="celeb-selected-info">
            <span className="celeb-selected-name">{selectedCeleb.name}</span>
            <span className="celeb-selected-detail">
              {selectedCeleb.group && <span className="celeb-tag celeb-tag--group">{selectedCeleb.group}</span>}
              {selectedCeleb.agency && <span className="celeb-tag celeb-tag--agency">{selectedCeleb.agency}</span>}
              <span>{selectedCeleb.birth}</span>
            </span>
          </div>
        </section>

        {/* 스타 운세 보기 */}
        <div className="celeb-star-fortune glass-card">
          <button className="celeb-star-fortune-btn" onClick={handleStarFortune} disabled={starFortuneLoading || starStreaming}>
            {starFortuneLoading || starStreaming ? '🔮 AI 분석중...' : `🌟 ${selectedCeleb.name}의 오늘 운세 보기`}
          </button>
          {(starStreaming || starFortuneLoading) && starStreamText && (
            <StreamText text={starStreamText} icon="🌟" label={`${selectedCeleb.name}의 운세를 분석하고 있어요...`} color="#FBBF24" />
          )}
          {starFortune && (
            <div className="celeb-star-fortune-result fade-in">
              {starFortune.overall && <div className="celeb-sf-item"><span className="celeb-sf-label">🌟 총운</span><p>{starFortune.overall}</p></div>}
              {starFortune.love && <div className="celeb-sf-item"><span className="celeb-sf-label">💕 애정운</span><p>{starFortune.love}</p></div>}
              {starFortune.money && <div className="celeb-sf-item"><span className="celeb-sf-label">💰 재물운</span><p>{starFortune.money}</p></div>}
              {starFortune.health && <div className="celeb-sf-item"><span className="celeb-sf-label">💪 건강운</span><p>{starFortune.health}</p></div>}
              {starFortune.work && <div className="celeb-sf-item"><span className="celeb-sf-label">💼 활동운</span><p>{starFortune.work}</p></div>}
              {starFortune.luckyColor && <p className="celeb-sf-lucky">행운의 색: {starFortune.luckyColor} | 행운의 숫자: {starFortune.luckyNumber}</p>}
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
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${myGender === 'M' ? 'form-toggle__btn--active' : ''}`} onClick={() => setMyGender('M')}><span className="g-circle g-male">♂</span></button>
              <button type="button" className={`form-toggle__btn ${myGender === 'F' ? 'form-toggle__btn--active' : ''}`} onClick={() => setMyGender('F')}><span className="g-circle g-female">♀</span></button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">달력 구분</label>
            <div className="form-toggle">
              <button type="button" className={`form-toggle__btn ${myCalType === 'SOLAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setMyCalType('SOLAR')}>☀️ 양력</button>
              <button type="button" className={`form-toggle__btn ${myCalType === 'LUNAR' ? 'form-toggle__btn--active' : ''}`} onClick={() => setMyCalType('LUNAR')}>🌙 음력</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">생년월일</label>
            <BirthDatePicker value={myBirth} onChange={setMyBirth} calendarType={myCalType} />
          </div>
          <button className="btn-gold" onClick={handleAnalyze} disabled={!myBirth} style={{ opacity: myBirth ? 1 : 0.5 }}>
            💫 {selectedCeleb.name}와(과) 궁합 분석하기
          </button>
        </div>
      </div>
    );
  }

  // ─── 로딩 ───
  if (step === 'loading') {
    return (
      <div className="celeb-page">
        <div className="celeb-loading">
          <div className="celeb-loading-stars">
            {[0,1,2].map(i => <span key={i} className="celeb-loading-star" style={{ animationDelay: `${i * 0.3}s` }}>⭐</span>)}
          </div>
          <p className="celeb-loading-text">AI가 나와 {selectedCeleb.name}의 운명을 분석하고 있어요</p>
          <p className="celeb-loading-hint">10~30초 정도 소요됩니다</p>
        </div>
      </div>
    );
  }

  // ─── 결과 ───
  if (step === 'result' && result) {
    const score = result.score || 0;
    const scoreColor = score >= 80 ? '#ff3d7f' : score >= 60 ? '#fbbf24' : '#94a3b8';
    return (
      <div className="celeb-page" ref={resultRef}>
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
            <SpeechButton label="결과 읽어주기"
              text={`나와 ${result._celebName}의 궁합 결과입니다. 점수는 ${score}점, ${result.grade}입니다. ${result.aiAnalysis || ''}`}
              summaryText={`${result._celebName} 궁합 ${score}점, ${result.grade}`} />
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
