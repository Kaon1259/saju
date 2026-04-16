import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CELEBRITIES, { CELEB_CATEGORIES } from '../data/celebrities';
import StarHero from '../components/StarHero';
import './MyStar.css';

const STORAGE_KEY = 'myStarList';

function getMyStars() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveMyStars(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function MyStar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('userId');
  const [myStars, setMyStars] = useState(getMyStars);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const isSaved = useCallback((celeb) => {
    return myStars.some(s => s.name === celeb.name && s.birth === celeb.birth);
  }, [myStars]);

  const addStar = (celeb) => {
    if (!isLoggedIn) { navigate('/register'); return; }
    if (isSaved(celeb)) return;
    const next = [...myStars, { name: celeb.name, birth: celeb.birth, gender: celeb.gender, category: celeb.category, group: celeb.group, agency: celeb.agency }];
    setMyStars(next);
    saveMyStars(next);
  };

  const removeStar = (celeb) => {
    const next = myStars.filter(s => !(s.name === celeb.name && s.birth === celeb.birth));
    setMyStars(next);
    saveMyStars(next);
    setRemoveConfirm(null);
  };

  const filtered = useMemo(() => {
    let list = CELEBRITIES;
    if (activeCategory !== 'all') list = list.filter(c => c.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.group && c.group.toLowerCase().includes(q)));
    }
    return list;
  }, [activeCategory, searchQuery]);

  // ─── 비로그인 상태 ───
  if (!isLoggedIn) {
    return (
      <div className="mystar-page">
        <button className="mystar-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>
        <StarHero
          icon="⭐"
          title="나의 스타"
          desc="나만의 최애 스타를 등록하고 관리하세요"
          color="#FF9800"
          particles={['⭐','✨','💫','🌟','✦']}
        />

        <section className="mystar-login-card glass-card">
          <span className="mystar-login-icon">🔒</span>
          <h2 className="mystar-login-title">로그인이 필요해요</h2>
          <p className="mystar-login-desc">나의 스타를 등록하고 관리하려면<br/>로그인 또는 회원가입을 해주세요</p>
          <div className="mystar-login-btns">
            <button className="mystar-login-btn mystar-login-btn--primary" onClick={() => navigate('/register')}>
              회원가입 / 로그인
            </button>
          </div>
        </section>

        <section className="mystar-quick">
          <button className="mystar-quick-btn" onClick={() => navigate('/celeb-compatibility')}>
            <span>💫</span> 스타와 궁합 보기
          </button>
          <button className="mystar-quick-btn" onClick={() => navigate('/celeb-fortune')}>
            <span>🌟</span> 스타 오늘의 운세
          </button>
        </section>
      </div>
    );
  }

  // ─── 로그인 상태: 나의 스타 목록 ───
  return (
    <div className="mystar-page">
      <button className="mystar-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>
      <StarHero
        icon="⭐"
        title="나의 스타"
        desc="나만의 최애 스타를 등록하고 관리하세요"
        color="#FF9800"
        particles={['⭐','✨','💫','🌟','✦']}
      />

      {/* 나의 스타 목록 */}
      {myStars.length > 0 ? (
        <section className="mystar-list-section">
          <h2 className="mystar-section-title">내가 등록한 스타 <span className="mystar-count">{myStars.length}명</span></h2>
          <div className="mystar-list">
            {myStars.map((star, i) => (
              <div key={`${star.name}-${star.birth}-${i}`} className="mystar-item"
                onClick={() => navigate('/celeb-compatibility', { state: { selectedCeleb: star } })}
                style={{ cursor: 'pointer' }}>
                <span className={`mystar-sym ${star.gender === 'M' ? 'mystar-sym--m' : 'mystar-sym--f'}`}>
                  {star.gender === 'M' ? '♂' : '♀'}
                </span>
                <div className="mystar-item-info">
                  <span className="mystar-item-name">{star.name}</span>
                  <span className="mystar-item-detail">
                    {star.group && <span className="mystar-tag">{star.group}</span>}
                    <span>{star.birth?.slice(0, 4)}년생</span>
                  </span>
                </div>
                <div className="mystar-item-actions">
                  <button className="mystar-compat-btn" onClick={(e) => { e.stopPropagation(); navigate('/celeb-compatibility', { state: { selectedCeleb: star } }); }} title="궁합 보기">💫</button>
                  {removeConfirm === i ? (
                    <div className="mystar-confirm-wrap">
                      <button className="mystar-confirm-yes" onClick={() => removeStar(star)}>삭제</button>
                      <button className="mystar-confirm-no" onClick={() => setRemoveConfirm(null)}>취소</button>
                    </div>
                  ) : (
                    <button className="mystar-remove-btn" onClick={() => setRemoveConfirm(i)} title="삭제">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mystar-empty glass-card">
          <span className="mystar-empty-icon">🌟</span>
          <p className="mystar-empty-text">아직 등록한 스타가 없어요</p>
          <p className="mystar-empty-sub">아래에서 좋아하는 스타를 추가해보세요!</p>
        </section>
      )}

      {/* 스타 추가 토글 */}
      <button className="mystar-add-toggle" onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? '접기 ▲' : '⭐ 스타 추가하기 ▼'}
      </button>

      {/* 스타 검색 & 추가 */}
      {showAdd && (
        <section className="mystar-add-section fade-in">
          <div className="mystar-search-wrap">
            <input className="mystar-search" type="text" placeholder="스타 이름 또는 그룹 검색..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="mystar-categories">
            {CELEB_CATEGORIES.map(cat => (
              <button key={cat.key} className={`mystar-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}>{cat.label}</button>
            ))}
          </div>

          <div className="mystar-add-list">
            {filtered.slice(0, 50).map((celeb, i) => {
              const saved = isSaved(celeb);
              return (
                <button key={`${celeb.name}-${celeb.birth}-${i}`}
                  className={`mystar-add-item ${saved ? 'mystar-add-item--saved' : ''}`}
                  onClick={() => !saved && addStar(celeb)} disabled={saved}>
                  <span className={`mystar-sym mystar-sym--sm ${celeb.gender === 'M' ? 'mystar-sym--m' : 'mystar-sym--f'}`}>
                    {celeb.gender === 'M' ? '♂' : '♀'}
                  </span>
                  <div className="mystar-add-item-info">
                    <span className="mystar-add-item-name">{celeb.name}</span>
                    <span className="mystar-add-item-detail">
                      {celeb.group && <span className="mystar-tag">{celeb.group}</span>}
                    </span>
                  </div>
                  <span className="mystar-add-check">{saved ? '⭐' : '☆'}</span>
                </button>
              );
            })}
            {filtered.length > 50 && (
              <p className="mystar-more-hint">검색어를 입력하면 더 많은 스타를 찾을 수 있어요</p>
            )}
          </div>
        </section>
      )}

      {/* 빠른 바로가기 */}
      <section className="mystar-quick">
        <button className="mystar-quick-btn" onClick={() => navigate('/celeb-compatibility')}>
          <span>💫</span> 스타와 궁합 보기
        </button>
        <button className="mystar-quick-btn" onClick={() => navigate('/celeb-fortune')}>
          <span>🌟</span> 스타 오늘의 운세
        </button>
      </section>
    </div>
  );
}

export default MyStar;
