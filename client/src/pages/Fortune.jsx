import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FortuneCard from '../components/FortuneCard';
import FortuneLoading from '../components/FortuneLoading';
import { getFortuneByZodiacStream, getFortuneByUserStream } from '../api/fortune';
import DeepAnalysis from '../components/DeepAnalysis';
import StreamText from '../components/StreamText';
import HeartCost from '../components/HeartCost';
import './MyFortune.css';
import './Fortune.css';

const ZODIAC_EMOJI = {
  '쥐': '🐭', '소': '🐂', '호랑이': '🐅', '토끼': '🐇',
  '용': '🐉', '뱀': '🐍', '말': '🐴', '양': '🐑',
  '원숭이': '🐵', '닭': '🐓', '개': '🐕', '돼지': '🐷',
};

const CATEGORY_CONFIG = [
  { key: 'overall', icon: '\u2B50', title: '\uCD1D\uC6B4', field: 'overall' },
  { key: 'love', icon: '\uD83D\uDC95', title: '\uC560\uC815\uC6B4', field: 'love' },
  { key: 'money', icon: '\uD83D\uDCB0', title: '\uC7AC\uBB3C\uC6B4', field: 'money' },
  { key: 'health', icon: '\uD83D\uDCAA', title: '\uAC74\uAC15\uC6B4', field: 'health' },
  { key: 'work', icon: '\uD83D\uDCBC', title: '\uC9C1\uC7A5\uC6B4', field: 'work' },
];

function Fortune() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const zodiacParam = searchParams.get('zodiac');

  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cacheChecking, setCacheChecking] = useState(true);
  const cleanupRef = useRef(null);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  // AI 스트리밍 시작 (버튼 클릭 시 호출)
  const startStreaming = () => {
    setLoading(true);
    setError(null);
    setFortune(null);
    setStreamText('');
    setAiStreaming(false);

    const userId = !zodiacParam ? localStorage.getItem('userId') : null;

    const handlers = {
      onCached: (data) => { setFortune(data); setLoading(false); },
      onChunk: (text) => { setLoading(false); setAiStreaming(true); setStreamText(prev => prev + text); },
      onDone: (fullText) => {
        setAiStreaming(false);
        setStreamText('');
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
          setFortune(prev => ({
            ...(prev || {}),
            zodiacAnimal: zodiacParam || prev?.zodiacAnimal || '',
            overall: parsed.overall || prev?.overall || '',
            love: parsed.love || prev?.love || '',
            money: parsed.money || prev?.money || '',
            health: parsed.health || prev?.health || '',
            work: parsed.work || prev?.work || '',
            score: parsed.score || prev?.score || 75,
            luckyNumber: parsed.luckyNumber || prev?.luckyNumber || null,
            luckyColor: parsed.luckyColor || prev?.luckyColor || '',
          }));
        } catch {
          setFortune(prev => prev || {
            zodiacAnimal: zodiacParam || '',
            overall: fullText,
            love: '', money: '', health: '', work: '',
            score: 75, luckyNumber: null, luckyColor: '',
          });
        }
        setLoading(false);
      },
      onError: () => {
        setAiStreaming(false);
        setStreamText('');
        setError('운세 정보를 불러오는데 실패했습니다.');
        setLoading(false);
      },
    };

    if (zodiacParam) {
      cleanupRef.current = getFortuneByZodiacStream(zodiacParam, handlers);
    } else {
      cleanupRef.current = getFortuneByUserStream(userId, handlers);
    }
  };

  // 페이지 진입 시: 캐시 확인 → 있으면 자동 표시, 없으면 버튼 노출
  useEffect(() => {
    cleanupRef.current?.();
    setFortune(null); setStreamText(''); setAiStreaming(false); setError(null);
    setCacheChecking(true);

    const userId = !zodiacParam ? localStorage.getItem('userId') : null;
    if (!zodiacParam && !userId) {
      navigate('/');
      return;
    }

    const cacheHandlers = {
      cacheOnly: true,
      onCached: (data) => { setFortune(data); setCacheChecking(false); },
      onNoCache: () => { setCacheChecking(false); },
      onError: () => { setCacheChecking(false); },
    };
    if (zodiacParam) {
      cleanupRef.current = getFortuneByZodiacStream(zodiacParam, cacheHandlers);
    } else {
      cleanupRef.current = getFortuneByUserStream(userId, cacheHandlers);
    }
    return () => cleanupRef.current?.();
  }, [zodiacParam, navigate]);

  const handleShare = async () => {
    if (!fortune) return;

    const zodiacName = fortune.zodiacAnimal || '';
    const shareText = [
      `[오늘의 운세 - ${zodiacName}띠]`,
      `운세 점수: ${fortune.score || 0}점`,
      '',
      `⭐ 총운: ${fortune.overall || ''}`,
      `💕 애정운: ${fortune.love || ''}`,
      `💰 재물운: ${fortune.money || ''}`,
      `💪 건강운: ${fortune.health || ''}`,
      `💼 직장운: ${fortune.work || ''}`,
      '',
      `🍀 행운의 숫자: ${fortune.luckyNumber || '-'}`,
      `🎨 행운의 색상: ${fortune.luckyColor || '-'}`,
      '',
      '- 연애 앱에서 확인하세요 -',
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: '오늘의 운세', text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !aiStreaming) {
    return (
      <div className="fortune-page">
        <FortuneLoading type="fortune" />
      </div>
    );
  }

  // 스트리밍 중: 텍스트 실시간 표시
  if (aiStreaming) {
    return (
      <div className="fortune-page">
        <div className="fortune-stream-wrap">
          <StreamText text={streamText} icon="🌟" label="AI가 운세를 분석하고 있어요..." color="#FBBF24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fortune-page">
        <div className="fortune-error glass-card">
          <p>{error}</p>
          <button className="btn-gold" onClick={() => navigate('/')}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 캐시 확인중 — 모래시계 애니메이션
  if (cacheChecking && !fortune) {
    return (
      <div className="fortune-page">
        <div className="myf-other-form glass-card myf-cache-check">
          <div className="myf-cache-check-icon" aria-hidden="true">⏳</div>
          <p className="myf-cache-check-text">저장된 운세 확인중</p>
        </div>
      </div>
    );
  }

  // 캐시 없음 → "운세 보기" 버튼 노출
  if (!fortune && !cacheChecking) {
    return (
      <div className="fortune-page">
        <button className="fortune-back" onClick={() => navigate(-1)}>
          <span>&#x2190;</span> 뒤로
        </button>
        <div className="glass-card" style={{ padding: '28px 20px', textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔮</div>
          <h2 style={{ marginBottom: 12 }}>오늘의 {zodiacParam ? `${zodiacParam}띠 ` : ''}운세</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            버튼을 누르면 AI가 오늘의 운세를 분석해드려요
          </p>
          <button className="btn-gold" style={{ width: '100%' }} onClick={startStreaming}>
            오늘의 운세 보기 <HeartCost category="TODAY_FORTUNE" />
          </button>
        </div>
      </div>
    );
  }

  if (!fortune) return null;

  const score = fortune.score || 0;
  const circumference = 2 * Math.PI * 54;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <div className="fortune-page">
      {/* Back Button */}
      <button className="fortune-back" onClick={() => navigate(-1)}>
        <span>&#x2190;</span> 뒤로
      </button>

      {/* Score Section */}
      <section className="fortune-score animate-scale-in">
        <div className="fortune-score__circle">
          <svg viewBox="0 0 120 120" className="fortune-score__svg">
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 60 60)"
              className="fortune-score__progress"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-gold)" />
                <stop offset="100%" stopColor="var(--color-primary-light)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="fortune-score__value">
            <span className="fortune-score__number">{score}</span>
            <span className="fortune-score__label">점</span>
          </div>
        </div>
        <h2 className="fortune-score__zodiac">
          {fortune.zodiacAnimal && `${fortune.zodiacAnimal}띠 오늘의 운세`}
        </h2>
        <p className="fortune-score__date">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </section>

      {/* Fortune Cards */}
      <section className="fortune-cards">
        {CATEGORY_CONFIG.map((cat, index) => (
          <FortuneCard
            key={cat.key}
            icon={cat.icon}
            title={cat.title}
            description={fortune[cat.field] || '정보를 불러올 수 없습니다.'}
            delay={index * 100 + 200}
          />
        ))}
      </section>

      {/* Lucky Info */}
      {(fortune.luckyNumber || fortune.luckyColor) && (
        <section className="fortune-lucky glass-card animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <h3 className="fortune-lucky__title">&#x1F340; 행운 정보</h3>
          <div className="fortune-lucky__items">
            {fortune.luckyNumber != null && (
              <div className="fortune-lucky__item">
                <span className="fortune-lucky__item-label">행운의 숫자</span>
                <span className="fortune-lucky__item-value fortune-lucky__number">
                  {fortune.luckyNumber}
                </span>
              </div>
            )}
            {fortune.luckyColor && (
              <div className="fortune-lucky__item">
                <span className="fortune-lucky__item-label">행운의 색상</span>
                <span className="fortune-lucky__item-value fortune-lucky__color">
                  {fortune.luckyColor}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 심화분석 */}
      {fortune && (() => {
        const profile = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { return {}; } })();
        const bd = profile.birthDate;
        return bd ? (
          <DeepAnalysis type="today" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} previousResult={fortune} />
        ) : null;
      })()}

      {/* Share Button */}
      <section className="fortune-actions animate-fade-in-up" style={{ animationDelay: '800ms' }}>
        <button className="btn-share fortune-share-btn" onClick={handleShare}>
          {copied ? '✅ 복사 완료!' : '📤 운세 공유하기'}
        </button>
      </section>
    </div>
  );
}

export default Fortune;
