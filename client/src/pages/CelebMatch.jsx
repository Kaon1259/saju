import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSajuCompatibility } from '../api/fortune';
import CELEBRITIES, { CELEB_CATEGORIES } from '../data/celebrities';
import GROUPS from '../data/groups';
import { shareResult } from '../utils/share';
import './CelebMatch.css';

// ─── 사주 오행 기반 간이 궁합 계산 ───
const GAN_OHENG = [0,0,1,1,2,2,3,3,4,4];
const JI_OHENG = [4,2,0,0,2,1,1,2,3,3,2,4];
const SANG_SAENG = [[0,1],[1,2],[2,3],[3,4],[4,0]];
const SANG_GEUK = [[0,2],[2,4],[4,1],[1,3],[3,0]];
const YUKHAP = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];

function getGanJi(year) {
  return { gan: (year - 4) % 10, ji: (year - 4) % 12 };
}

function calcCompatScore(birth1, birth2) {
  const d1 = new Date(birth1), d2 = new Date(birth2);
  const y1 = d1.getFullYear(), y2 = d2.getFullYear();
  const m1 = d1.getMonth() + 1, m2 = d2.getMonth() + 1;
  const day1 = d1.getDate(), day2 = d2.getDate();
  const gj1 = getGanJi(y1), gj2 = getGanJi(y2);
  let score = 50;
  const oh1 = GAN_OHENG[gj1.gan], oh2 = GAN_OHENG[gj2.gan];
  if (oh1 === oh2) score += 8;
  if (SANG_SAENG.some(([a,b]) => (a===oh1&&b===oh2)||(a===oh2&&b===oh1))) score += 15;
  if (SANG_GEUK.some(([a,b]) => (a===oh1&&b===oh2)||(a===oh2&&b===oh1))) score -= 10;
  const jiOh1 = JI_OHENG[gj1.ji], jiOh2 = JI_OHENG[gj2.ji];
  if (jiOh1 === jiOh2) score += 5;
  if (SANG_SAENG.some(([a,b]) => (a===jiOh1&&b===jiOh2)||(a===jiOh2&&b===jiOh1))) score += 12;
  if (SANG_GEUK.some(([a,b]) => (a===jiOh1&&b===jiOh2)||(a===jiOh2&&b===jiOh1))) score -= 8;
  const jiDiff = Math.abs(gj1.ji - gj2.ji);
  if (jiDiff === 4 || jiDiff === 8) score += 10;
  if (YUKHAP.some(([a,b]) => (gj1.ji===a&&gj2.ji===b)||(gj1.ji===b&&gj2.ji===a))) score += 12;
  const monthDiff = Math.abs(m1 - m2);
  if (monthDiff <= 1 || monthDiff === 11) score += 5;
  else if (monthDiff === 6) score += 8;
  else if (monthDiff >= 4 && monthDiff <= 8) score -= 3;
  const daySum = (day1 + day2) % 10;
  if (daySum === 0 || daySum === 5) score += 6;
  if (daySum === 3 || daySum === 7) score += 4;
  const ageDiff = Math.abs(y1 - y2);
  if (ageDiff <= 3) score += 5; else if (ageDiff <= 6) score += 2; else if (ageDiff >= 12) score -= 3;
  const hash = (y1*31 + m1*17 + day1*13 + y2*29 + m2*19 + day2*11) % 21 - 10;
  score += hash;
  return Math.max(20, Math.min(99, Math.round(score)));
}

function getGrade(score) {
  if (score >= 85) return '천생연분';
  if (score >= 70) return '좋은 인연';
  if (score >= 55) return '보통';
  if (score >= 40) return '노력 필요';
  return '상극';
}

const MY_STAR_KEY = 'myStarList';
function getMyStars() { try { return JSON.parse(localStorage.getItem(MY_STAR_KEY)||'[]'); } catch { return []; } }
function saveMyStars(list) { localStorage.setItem(MY_STAR_KEY, JSON.stringify(list)); }

// 카테고리에 그룹 추가
const ALL_CATEGORIES = [
  ...CELEB_CATEGORIES,
  { key: 'group', label: '그룹' },
];

function CelebMatch() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('userId');
  const [myStars, setMyStars] = useState(getMyStars);
  const [activeCategory, setActiveCategory] = useState('all');
  const [shareMsg, setShareMsg] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [aiScores, setAiScores] = useState({}); // { key: { score, grade, done } }
  const [aiLoading, setAiLoading] = useState(false);
  const aiRanRef = useRef(false);

  const userProfile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userProfile')||'{}'); } catch { return {}; }
  }, []);
  const myBirth = userProfile.birthDate || '';
  const myCalType = userProfile.calendarType || 'SOLAR';

  const isSaved = useCallback((item) => {
    return myStars.some(s => s.name === item.name && s.birth === item.birth);
  }, [myStars]);

  const toggleStar = (item) => {
    if (isSaved(item)) {
      const next = myStars.filter(s => !(s.name === item.name && s.birth === item.birth));
      setMyStars(next); saveMyStars(next);
    } else {
      const next = [...myStars, { name: item.name, birth: item.birth, gender: item.gender || null, category: item.category, group: item.group || null, agency: item.agency || null }];
      setMyStars(next); saveMyStars(next);
    }
  };

  // 전체 스타 + 그룹 궁합 점수 계산
  const allScored = useMemo(() => {
    if (!myBirth) return [];
    const items = [];
    // 개인 스타
    CELEBRITIES.forEach(c => {
      const key = `celeb-${c.name}-${c.birth}`;
      const ai = aiScores[key];
      const baseScore = calcCompatScore(myBirth, c.birth);
      items.push({
        ...c, _type: 'celeb', _key: key,
        score: ai?.done ? ai.score : baseScore,
        grade: ai?.done ? ai.grade : getGrade(baseScore),
        _aiDone: !!ai?.done,
      });
    });
    // 그룹
    GROUPS.forEach(g => {
      const key = `group-${g.name}-${g.debut}`;
      const ai = aiScores[key];
      const baseScore = calcCompatScore(myBirth, g.debut);
      items.push({
        name: g.name, birth: g.debut, gender: null,
        category: 'group', group: null, agency: g.agency,
        _type: 'group', _key: key,
        _groupType: g.type, _members: g.members,
        score: ai?.done ? ai.score : baseScore,
        grade: ai?.done ? ai.grade : getGrade(baseScore),
        _aiDone: !!ai?.done,
      });
    });
    items.sort((a, b) => b.score - a.score);
    return items;
  }, [myBirth, aiScores]);

  // 상위 10명 AI 재분석 (최초 1회)
  useEffect(() => {
    if (!myBirth || !allScored.length || aiRanRef.current) return;
    aiRanRef.current = true;
    const top10 = allScored.slice(0, 10);
    setAiLoading(true);

    (async () => {
      const results = {};
      // 순차 처리 (서버 부하 방지)
      for (const item of top10) {
        try {
          const data = await getSajuCompatibility(myBirth, item.birth, undefined, undefined, myCalType, 'SOLAR');
          results[item._key] = { score: data.score, grade: data.grade, done: true };
          setAiScores(prev => ({ ...prev, [item._key]: results[item._key] }));
        } catch {
          // AI 실패 시 기존 점수 유지
        }
      }
      setAiLoading(false);
    })();
  }, [myBirth, allScored.length > 0]);

  // 카테고리 + 점수 필터링
  const filtered = useMemo(() => {
    let list = allScored.filter(c => c.score >= threshold);
    if (activeCategory !== 'all') {
      if (activeCategory === 'group') list = list.filter(c => c._type === 'group');
      else if (activeCategory === 'boygroup') list = list.filter(c => (c._type === 'group' && c._groupType === 'boy') || (c.category === 'idol' && c.gender === 'M'));
      else if (activeCategory === 'girlgroup') list = list.filter(c => (c._type === 'group' && c._groupType === 'girl') || (c.category === 'idol' && c.gender === 'F'));
      else list = list.filter(c => c.category === activeCategory);
    }
    return list;
  }, [allScored, activeCategory, threshold]);

  // 상위 점수 통계
  const topStats = useMemo(() => {
    if (!allScored.length) return null;
    const top1 = allScored[0];
    const top5avg = Math.round(allScored.slice(0,5).reduce((s,c)=>s+c.score,0)/Math.min(5,allScored.length));
    const count70 = allScored.filter(c=>c.score>=70).length;
    const count80 = allScored.filter(c=>c.score>=80).length;
    return { top1, top5avg, count70, count80 };
  }, [allScored]);

  const handleShare = async () => {
    if (!topStats) return;
    const top = topStats.top1;
    const label = top._type === 'group' ? top.name : `${top.name}${top.group ? `(${top.group})` : ''}`;
    const text = `[1:1연애 💕 나와 궁합이 맞는 스타]\n1위: ${label} - ${top.score}점 (${top.grade})\n\nhttps://recipepig.kr`;
    const res = await shareResult({ title: '나와 궁합이 맞는 스타', text });
    if (res === 'copied') { setShareMsg('클립보드에 복사됨!'); setTimeout(() => setShareMsg(''), 2000); }
  };

  // 비로그인
  if (!isLoggedIn) {
    return (
      <div className="cm-page">
        <section className="cm-hero">
          <span className="cm-hero-icon">🔮</span>
          <h1 className="cm-hero-title">나와 궁합이 맞는 스타</h1>
          <p className="cm-hero-desc">사주로 찾는 운명의 스타</p>
        </section>
        <section className="mystar-login-card glass-card">
          <span className="mystar-login-icon">🔒</span>
          <h2 className="mystar-login-title">로그인이 필요해요</h2>
          <p className="mystar-login-desc">나와 궁합이 맞는 스타를 찾으려면<br/>로그인 또는 회원가입을 해주세요</p>
          <div className="mystar-login-btns">
            <button className="mystar-login-btn mystar-login-btn--primary" onClick={() => navigate('/register')}>회원가입 / 로그인</button>
          </div>
        </section>
        <section className="cm-quick">
          <button className="cm-quick-btn" onClick={() => navigate('/celeb-compatibility')}><span>💫</span> 스타와 궁합 보기</button>
          <button className="cm-quick-btn" onClick={() => navigate('/celeb-fortune')}><span>🌟</span> 보이그룹, 걸그룹과 궁합</button>
        </section>
      </div>
    );
  }

  // 생년월일 없음
  if (!myBirth) {
    return (
      <div className="cm-page">
        <section className="cm-hero">
          <span className="cm-hero-icon">🔮</span>
          <h1 className="cm-hero-title">나와 궁합이 맞는 스타</h1>
          <p className="cm-hero-desc">사주로 찾는 운명의 스타</p>
        </section>
        <section className="cm-no-birth glass-card">
          <span className="cm-no-birth-icon">📝</span>
          <p className="cm-no-birth-text">프로필에 생년월일을 등록해주세요</p>
          <p className="cm-no-birth-sub">생년월일 정보가 있어야 궁합을 분석할 수 있어요</p>
          <button className="mystar-login-btn mystar-login-btn--primary" onClick={() => navigate('/profile/edit')}>프로필 수정하기</button>
        </section>
      </div>
    );
  }

  return (
    <div className="cm-page">
      <button className="cm-back-btn" onClick={() => navigate('/')}>← 홈으로</button>
      <section className="cm-hero">
        <span className="cm-hero-icon">🔮</span>
        <h1 className="cm-hero-title">나와 궁합이 맞는 스타</h1>
        <p className="cm-hero-desc">사주 오행 + AI 분석으로 찾는 운명의 스타</p>
      </section>

      {/* AI 분석 진행 표시 */}
      {aiLoading && (
        <div className="cm-ai-badge">
          <span className="cm-ai-dot" />
          AI가 상위 10명을 정밀 분석중...
        </div>
      )}

      {/* 상위 궁합 요약 */}
      {topStats && (
        <section className="cm-summary glass-card">
          <div className="cm-summary-top">
            <span className="cm-summary-crown">👑</span>
            <div className="cm-summary-top-info">
              <span className="cm-summary-top-label">나의 1위 궁합 {topStats.top1._type === 'group' ? '그룹' : '스타'}</span>
              <span className="cm-summary-top-name">
                {topStats.top1.name}
                {topStats.top1._type === 'celeb' && topStats.top1.group ? ` (${topStats.top1.group})` : ''}
                {topStats.top1._aiDone && <span className="cm-ai-tag">AI</span>}
              </span>
            </div>
            <span className="cm-summary-top-score">{topStats.top1.score}점</span>
          </div>
          <div className="cm-summary-stats">
            <div className="cm-stat"><span className="cm-stat-num">{topStats.count80}</span><span className="cm-stat-label">80점 이상</span></div>
            <div className="cm-stat"><span className="cm-stat-num">{topStats.count70}</span><span className="cm-stat-label">70점 이상</span></div>
            <div className="cm-stat"><span className="cm-stat-num">{topStats.top5avg}</span><span className="cm-stat-label">TOP5 평균</span></div>
          </div>
        </section>
      )}

      {/* 점수 기준 */}
      <div className="cm-threshold">
        <span className="cm-threshold-label">궁합 점수</span>
        <div className="cm-threshold-btns">
          {[60, 70, 80].map(t => (
            <button key={t} className={`cm-threshold-btn ${threshold === t ? 'active' : ''}`}
              onClick={() => setThreshold(t)}>{t}점 이상</button>
          ))}
        </div>
      </div>

      {/* 카테고리 */}
      <div className="cm-categories">
        {ALL_CATEGORIES.map(cat => (
          <button key={cat.key} className={`cm-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}>{cat.label}</button>
        ))}
      </div>

      {/* 스타 + 그룹 리스트 */}
      <section className="cm-results">
        <p className="cm-results-count">{filtered.length}명</p>
        <div className="cm-results-list">
          {filtered.map((star, i) => {
            const scoreColor = star.score >= 85 ? '#ff3d7f' : star.score >= 70 ? '#fbbf24' : '#94a3b8';
            const saved = isSaved(star);
            const isGroup = star._type === 'group';
            return (
              <div key={star._key + '-' + i} className={`cm-result-item glass-card ${i < 3 && activeCategory === 'all' && threshold <= 70 ? 'cm-result--top' : ''}`}>
                <div className="cm-result-rank">
                  <span className={`cm-rank-num ${i < 3 ? 'cm-rank--gold' : ''}`}>{i + 1}</span>
                </div>
                <span className={`cm-result-sym ${isGroup ? (star._groupType === 'boy' ? 'celeb-sym--m' : 'celeb-sym--f') : (star.gender === 'M' ? 'celeb-sym--m' : 'celeb-sym--f')}`}>
                  {isGroup ? '★' : (star.gender === 'M' ? '♂' : '♀')}
                </span>
                <div className="cm-result-info">
                  <span className="cm-result-name">
                    {star.name}
                    {star._aiDone && <span className="cm-ai-tag">AI</span>}
                  </span>
                  <span className="cm-result-detail">
                    {isGroup && <span className="celeb-tag celeb-tag--group">{star._groupType === 'boy' ? '보이그룹' : '걸그룹'}</span>}
                    {!isGroup && star.group && <span className="celeb-tag celeb-tag--group">{star.group}</span>}
                    {star.agency && <span>{star.agency}</span>}
                    <span>{isGroup ? `${star.birth.slice(0,4)}년 데뷔` : `${star.birth.slice(0,4)}년생`}</span>
                  </span>
                  <span className="cm-result-grade" style={{ color: scoreColor }}>{star.grade}</span>
                </div>
                <div className="cm-result-right">
                  <div className="cm-result-score">
                    <span className="cm-score-num" style={{ color: scoreColor }}>{star.score}</span>
                    <span className="cm-score-unit">점</span>
                  </div>
                  <button className={`cm-star-btn ${saved ? 'cm-star-btn--saved' : ''}`}
                    onClick={() => toggleStar(star)} title={saved ? '나의 스타 해제' : '나의 스타 등록'}>
                    {saved ? '⭐' : '☆'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="cm-empty"><p>{threshold}점 이상인 스타가 없어요. 기준을 낮춰보세요!</p></div>
        )}
      </section>

      <div className="cm-bottom-actions">
        <button className="cm-share-btn" onClick={handleShare}>📤 공유하기</button>
        <button className="cm-quick-btn" onClick={() => navigate('/my-star')}>⭐ 나의 스타 관리</button>
      </div>
      {shareMsg && <p className="cm-share-msg">{shareMsg}</p>}
    </div>
  );
}

export default CelebMatch;
