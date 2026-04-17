import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSajuCompatibility, analyzeSajuStream, isGuest } from '../api/fortune';
import parseAiJson from '../utils/parseAiJson';
import GROUPS, { GROUP_TYPES } from '../data/groups';
import CELEBRITIES from '../data/celebrities';
import BirthDatePicker from '../components/BirthDatePicker';
import FortuneCard from '../components/FortuneCard';
import AnalysisMatrix from '../components/AnalysisMatrix';
import StarHero from '../components/StarHero';
import { shareResult } from '../utils/share';
import HeartCost, { useHeartGuard } from '../components/HeartCost';
import { playAnalyzeStart, startAnalyzeAmbient } from '../utils/sounds';
import './GroupFortune.css';

const CATEGORY_CONFIG = [
  { key: 'overall', icon: '🌟', title: '총운', field: 'overall' },
  { key: 'love', icon: '💕', title: '애정운', field: 'love' },
  { key: 'money', icon: '💰', title: '재물운', field: 'money' },
  { key: 'health', icon: '💪', title: '건강운', field: 'health' },
  { key: 'work', icon: '💼', title: '활동운', field: 'work' },
];

function GroupFortune() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('list'); // list, fortune, compat, memberCompat
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  // 다른 페이지에서 그룹을 선택해서 넘어온 경우 바로 상세 화면으로
  useEffect(() => {
    if (location.state?.selectedGroup) {
      setSelectedGroup(location.state.selectedGroup);
      setMode('fortune');
      // state 소비 후 제거 (뒤로가기 시 중복 방지)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  // 운세
  const [fortuneLoading, setFortuneLoading] = useState(false);
  const [matrixShown, setMatrixShown] = useState(false);
  const [matrixExiting, setMatrixExiting] = useState(false);
  const [matrixLabel, setMatrixLabel] = useState('');
  const [matrixTheme, setMatrixTheme] = useState('group');
  const [fortuneResult, setFortuneResult] = useState(null);
  const [fortuneStreamText, setFortuneStreamText] = useState('');
  const [fortuneStreaming, setFortuneStreaming] = useState(false);
  const fortuneCleanupRef = useRef(null);
  const stopAmbientRef = useRef(null);

  useEffect(() => () => { try { stopAmbientRef.current?.(); } catch {} }, []);

  // 궁합
  const [myBirth, setMyBirth] = useState('');
  const [myGender, setMyGender] = useState('');
  const [myCalType, setMyCalType] = useState('SOLAR');
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatResult, setCompatResult] = useState(null);

  // 멤버 선택
  const [selectedMember, setSelectedMember] = useState(null);

  const [shareMsg, setShareMsg] = useState('');
  const [fortuneOpen, setFortuneOpen] = useState(true);
  const [compatOpen, setCompatOpen] = useState(true);
  const memberRef = useRef(null);
  const resultRef = useRef(null);

  const filtered = useMemo(() => {
    let list = GROUPS;
    if (activeType !== 'all') list = list.filter(g => g.type === activeType);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(g => g.name.toLowerCase().includes(q));
    }
    return list;
  }, [activeType, searchQuery]);

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedMember(null); // 기본: 그룹 자체 선택
    setMode('fortune');
    setFortuneResult(null);
    setCompatResult(null);
  };

  // 현재 궁합/운세 대상 이름과 생년월일
  const fortuneTargetName = selectedMember ? selectedMember.name : selectedGroup?.name;
  const fortuneTargetBirth = selectedMember ? selectedMember.birth : selectedGroup?.debut;
  const fortuneTargetGender = selectedMember ? selectedMember.gender : undefined;
  const compatTargetName = fortuneTargetName;
  const compatTargetBirth = fortuneTargetBirth;

  const { guardedAction: guardGroupFortune } = useHeartGuard('GROUP_FORTUNE');
  const { guardedAction: guardGroupCompat } = useHeartGuard('GROUP_COMPAT');

  // 오늘의 운세 (멤버 또는 그룹, 스트리밍)
  const handleGroupFortune = () => {
    const bd = fortuneTargetBirth;
    const g = fortuneTargetGender;
    if (!bd) return;
    setFortuneLoading(true);
    setFortuneStreamText('');
    setFortuneStreaming(false);
    setFortuneResult(null);
    setMatrixTheme('star');
    setMatrixLabel(`${fortuneTargetName}의 오늘 운세를 분석하고 있어요`);
    setMatrixShown(true);
    setMatrixExiting(false);
    fortuneCleanupRef.current?.();
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}

    fortuneCleanupRef.current = analyzeSajuStream(bd, undefined, 'SOLAR', g, { context: 'idol', targetType: 'celebrity', targetName: fortuneTargetName,
      onCached: (data) => {
        setFortuneResult(data); setFortuneLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
      onChunk: (text) => { setFortuneStreaming(true); setFortuneStreamText(prev => prev + text); },
      onDone: (fullText) => {
        setFortuneStreaming(false);
        setFortuneStreamText('');
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
        const parsed = parseAiJson(fullText);
        if (parsed) {
          // AI JSON에서 todayFortune 구조 생성
          setFortuneResult({ todayFortune: { overall: parsed.overall, love: parsed.love, money: parsed.money, health: parsed.health, work: parsed.work, score: parsed.score || 70, luckyNumber: parsed.luckyNumber, luckyColor: parsed.luckyColor } });
        }
        setFortuneLoading(false);
      },
      onError: () => {
        setFortuneStreaming(false); setFortuneStreamText(''); setFortuneLoading(false);
        try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
      },
    });
  };

  // 멤버/그룹 선택 → 운세 + 궁합 결과 모두 리셋
  const handleSelectTarget = (memberName) => {
    if (memberName === null) {
      setSelectedMember(null);
    } else {
      const celeb = CELEBRITIES.find(c => c.name === memberName);
      if (!celeb) return;
      setSelectedMember(celeb);
    }
    // 대상이 바뀌면 운세/궁합 결과 초기화
    fortuneCleanupRef.current?.();
    setFortuneResult(null);
    setFortuneStreamText('');
    setFortuneStreaming(false);
    setFortuneLoading(false);
    setCompatResult(null);
    setCompatOpen(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  };

  useEffect(() => {
    if ((fortuneResult || compatResult) && matrixShown) {
      setMatrixExiting(true);
      const t = setTimeout(() => setMatrixShown(false), 700);
      return () => clearTimeout(t);
    }
  }, [fortuneResult, compatResult, matrixShown]);

  // 궁합 분석 (그룹이든 멤버든 통합)
  const handleCompat = async () => {
    if (!myBirth || !compatTargetBirth) return;
    setCompatLoading(true);
    setMatrixTheme('group');
    setMatrixLabel(`AI가 나와 ${compatTargetName} 궁합을 분석하고 있어요`);
    setMatrixShown(true);
    setMatrixExiting(false);
    try { playAnalyzeStart(); } catch {}
    try { stopAmbientRef.current?.(); } catch {}
    try { stopAmbientRef.current = startAnalyzeAmbient(); } catch {}
    try {
      const data = await getSajuCompatibility(myBirth, compatTargetBirth, undefined, undefined, myCalType, 'SOLAR');
      data._groupName = selectedGroup.name;
      data._celebName = compatTargetName;
      setCompatResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e) { console.error(e); }
    finally {
      setCompatLoading(false);
      try { stopAmbientRef.current?.(); } catch {} stopAmbientRef.current = null;
    }
  };

  const handleAutoFill = () => {
    try {
      const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (p.birthDate) setMyBirth(p.birthDate);
      if (p.gender) setMyGender(p.gender);
      if (p.calendarType) setMyCalType(p.calendarType);
    } catch {}
  };

  const handleShare = async (text) => {
    const res = await shareResult({ title: '그룹 운세', text });
    if (res === 'copied') { setShareMsg('클립보드에 복사됨!'); setTimeout(() => setShareMsg(''), 2000); }
  };

  // ─── 그룹 리스트 ───
  if (mode === 'list') {
    return (
      <div className="gf-page">
        <button className="gf-nav-back" onClick={() => navigate('/')}>← 홈으로</button>
        <StarHero
          icon="🌟"
          title="보이그룹·걸그룹 궁합"
          desc="좋아하는 그룹과 사주 궁합을 확인해보세요"
          color="#9B59B6"
          particles={['🌟','💫','✨','💜','⭐']}
        />

        <input className="gf-search" type="text" placeholder="그룹 이름 검색..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

        <div className="gf-types">
          {GROUP_TYPES.map(t => (
            <button key={t.key} className={`gf-type-btn ${activeType === t.key ? 'active' : ''}`}
              onClick={() => setActiveType(t.key)}>{t.label}</button>
          ))}
        </div>

        <div className="gf-list">
          {filtered.map((group, i) => (
            <button key={i} className="gf-item" onClick={() => handleSelectGroup(group)}>
              <span className={`gf-item-badge ${group.type === 'boy' ? 'gf-badge--boy' : 'gf-badge--girl'}`}>
                {group.type === 'boy' ? '♂' : '♀'}
              </span>
              <div className="gf-item-info">
                <span className="gf-item-name">{group.name}</span>
                <span className="gf-item-detail">
                  <span className="celeb-tag celeb-tag--agency">{group.agency}</span>
                  {group.members.length}명 · {group.debut.slice(0, 4)}년 데뷔
                </span>
              </div>
              <span className="gf-item-arrow">›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── 그룹 상세 (운세 + 궁합 + 멤버) ───
  return (
    <div className="gf-page">
      {matrixShown && (
        <AnalysisMatrix theme={matrixTheme} label={matrixLabel} streamText={fortuneStreamText} exiting={matrixExiting} />
      )}
      {/* 뒤로가기 */}
      <button className="celeb-back-btn" onClick={() => { setMode('list'); setSelectedGroup(null); setFortuneResult(null); setCompatResult(null); }}>← 그룹 목록으로</button>

      {/* 그룹 헤더 */}
      <section className="gf-group-header glass-card">
        <span className={`gf-item-badge gf-badge--lg ${selectedGroup.type === 'boy' ? 'gf-badge--boy' : 'gf-badge--girl'}`}>
          {selectedGroup.type === 'boy' ? '♂' : '♀'}
        </span>
        <div className="gf-group-info">
          <h2 className="gf-group-name">{selectedGroup.name}</h2>
          <span className="gf-group-detail">
            <span className="celeb-tag celeb-tag--agency">{selectedGroup.agency}</span>
            데뷔: {selectedGroup.debut}
          </span>
        </div>
      </section>

      {/* 궁합 대상 선택 (그룹 + 멤버) */}
      <section className="gf-members">
        <h3 className="gf-section-title">궁합 대상 선택</h3>
        <div className="gf-member-chips">
          {/* 그룹 자체 */}
          <button className={`gf-member-chip gf-chip--group ${!selectedMember ? 'active' : ''}`}
            onClick={() => handleSelectTarget(null)}>
            <span className="gf-chip-sym" style={{ color: '#C084FC' }}>★</span>
            {selectedGroup.name}
          </button>
          {/* 멤버들 */}
          {selectedGroup.members.map((m, i) => {
            const inDB = CELEBRITIES.find(c => c.name === m);
            return (
              <button key={i} className={`gf-member-chip ${selectedMember?.name === m ? 'active' : ''} ${inDB ? '' : 'gf-chip--dim'}`}
                onClick={() => inDB && handleSelectTarget(m)}>
                <span className={`gf-chip-sym ${selectedGroup.type === 'boy' ? 'gf-chip--m' : 'gf-chip--f'}`}>
                  {selectedGroup.type === 'boy' ? '♂' : '♀'}
                </span>
                {m}
              </button>
            );
          })}
        </div>
      </section>

      {/* 그룹 오늘의 운세 */}
      <section className="gf-fortune-section glass-card">
        <div className="gf-section-header">
          <h3 className="gf-section-title">🌟 {fortuneTargetName} 오늘의 운세</h3>
          {fortuneResult && (
            <button className="gf-fold-btn" onClick={() => setFortuneOpen(!fortuneOpen)}>
              {fortuneOpen ? '접기 ▲' : '펼치기 ▼'}
            </button>
          )}
        </div>
        {fortuneResult ? (
          <>
            {/* 접혀도 점수는 항상 표시 */}
            <div className="gf-fortune-score">
              <span className="gf-fortune-num">{fortuneResult.todayFortune?.score || 0}</span>
              <span className="gf-fortune-unit">점</span>
            </div>
            {fortuneOpen && (
              <div className="gf-fortune-result fade-in">
                <div className="gf-fortune-cards">
                  {CATEGORY_CONFIG.map((cat, idx) => (
                    <FortuneCard key={cat.key} icon={cat.icon} title={cat.title}
                      description={fortuneResult.todayFortune?.[cat.field] || ''} delay={idx * 80} />
                  ))}
                </div>
                <button className="gf-share-btn" onClick={() => handleShare(
                  `[1:1연애 💕 스타 운세]\n${fortuneTargetName} 오늘의 운세: ${fortuneResult.todayFortune?.score || 0}점\n\nhttps://recipepig.kr`
                )}>📤 공유</button>
                {shareMsg && <p className="gf-share-msg">{shareMsg}</p>}
              </div>
            )}
          </>
        ) : fortuneLoading || fortuneStreaming ? (
          <div style={{ minHeight: 120 }} />
        ) : (
          <button className="btn-gold" onClick={() => guardGroupFortune(handleGroupFortune)} style={{ width: '100%' }}>
            🌟 {fortuneTargetName} 오늘의 운세 보기 <HeartCost category="GROUP_FORTUNE" />
          </button>
        )}
      </section>

      {/* 나와 궁합 */}
      <section className="gf-compat-section glass-card" ref={resultRef}>
        <div className="gf-section-header">
          <h3 className="gf-section-title">💕 나와 {compatTargetName} 궁합</h3>
          {compatResult && (
            <button className="gf-fold-btn" onClick={() => setCompatOpen(!compatOpen)}>
              {compatOpen ? '접기 ▲' : '펼치기 ▼'}
            </button>
          )}
        </div>
        {!compatResult && !compatLoading && (
          <div className="gf-compat-form">
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
              <label className="form-label">생년월일</label>
              <BirthDatePicker value={myBirth} onChange={setMyBirth} calendarType={myCalType} />
            </div>
            {!selectedMember && (
              <p className="gf-compat-group-hint">
                ⚠️ 그룹 전체와의 궁합은 분석할 수 없어요. 위에서 멤버를 선택해주세요.
              </p>
            )}
            <button
              className="btn-gold"
              onClick={() => guardGroupCompat(handleCompat)}
              disabled={!myBirth || !selectedMember}
              style={{ width: '100%', opacity: (myBirth && selectedMember) ? 1 : 0.5 }}
            >
              💕 {compatTargetName}와(과) 궁합 분석하기 <HeartCost category="GROUP_COMPAT" />
            </button>
          </div>
        )}
        {compatLoading && <div style={{ minHeight: 120 }} />}
        {compatResult && (
          <div className="gf-compat-result fade-in">
            <div className="gf-compat-score">
              <span className="gf-compat-num">{compatResult.score || 0}</span>
              <span className="gf-compat-unit">점</span>
              <span className="gf-compat-grade" style={{ color: compatResult.score >= 80 ? '#ff3d7f' : compatResult.score >= 60 ? '#fbbf24' : '#94a3b8' }}>
                {compatResult.grade}
              </span>
            </div>
            {compatOpen && (
              <>
                {compatResult.aiAnalysis && <p className="gf-compat-text">{compatResult.aiAnalysis}</p>}
                {compatResult.aiLoveCompat && (
                  <div className="gf-compat-card"><span>💕</span><p>{compatResult.aiLoveCompat}</p></div>
                )}
                <button className="gf-share-btn" onClick={() => handleShare(
                  `[1:1연애 💕 궁합]\n나와 ${compatTargetName}의 궁합: ${compatResult.score}점 (${compatResult.grade})\n\nhttps://recipepig.kr`
                )}>📤 공유</button>
                {shareMsg && <p className="gf-share-msg">{shareMsg}</p>}
              </>
            )}
            <button className="gf-reset-btn" onClick={() => { setCompatResult(null); setCompatOpen(true); }}>
              다시 분석하기
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default GroupFortune;
