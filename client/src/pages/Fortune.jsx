import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FortuneCard from '../components/FortuneCard';
import SpeechButton from '../components/SpeechButton';
import { getFortuneByZodiac, getFortuneByUser } from '../api/fortune';
import DeepAnalysis from '../components/DeepAnalysis';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchFortune = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (zodiacParam) {
          data = await getFortuneByZodiac(zodiacParam);
        } else {
          const userId = localStorage.getItem('userId');
          if (userId) {
            data = await getFortuneByUser(userId);
          } else {
            navigate('/');
            return;
          }
        }
        setFortune(data);
      } catch (err) {
        console.error('Failed to fetch fortune:', err);
        setError('운세 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchFortune();
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
      '- 사주운세 앱에서 확인하세요 -',
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

  if (loading) {
    const emoji = zodiacParam ? (ZODIAC_EMOJI[zodiacParam] || '🔮') : '🔮';
    return (
      <div className="fortune-page">
        <div className="fortune-loading">
          <div className="fortune-animal-scene">
            <div className="fortune-animal-circle">
              <span className="fortune-animal-emoji">{emoji}</span>
            </div>
            <div className="fortune-animal-ring" />
            <div className="fortune-animal-ring fortune-animal-ring--2" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="fortune-animal-particle" style={{
                '--angle': `${i * 45}deg`,
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
          <p className="fortune-loading-text">
            {zodiacParam ? `${zodiacParam}띠의 운세를 살피고 있습니다...` : '운세를 확인하고 있습니다...'}
          </p>
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

      {/* Speech Button */}
      {fortune && (
        <div style={{ margin: '12px 0' }}>
          <SpeechButton
            label="운세 읽어주기"
            text={[
              fortune.zodiacAnimal ? `${fortune.zodiacAnimal}띠 오늘의 운세입니다.` : '',
              fortune.score ? `운세 점수는 ${fortune.score}점입니다.` : '',
              fortune.overall ? `총운입니다. ${fortune.overall}` : '',
              fortune.love ? `애정운입니다. ${fortune.love}` : '',
              fortune.money ? `재물운입니다. ${fortune.money}` : '',
              fortune.health ? `건강운입니다. ${fortune.health}` : '',
              fortune.work ? `직장운입니다. ${fortune.work}` : '',
              fortune.luckyNumber ? `행운의 숫자는 ${fortune.luckyNumber}입니다.` : '',
              fortune.luckyColor ? `행운의 색상은 ${fortune.luckyColor}입니다.` : '',
            ].filter(Boolean).join(' ')}
            summaryText={[
              fortune.zodiacAnimal ? `${fortune.zodiacAnimal}띠 오늘의 운세입니다.` : '',
              fortune.score ? `운세 점수는 ${fortune.score}점입니다.` : '',
              fortune.overall ? `총운: ${fortune.overall.split('.').slice(0,2).join('.')}.` : '',
              fortune.luckyNumber ? `행운의 숫자 ${fortune.luckyNumber},` : '',
              fortune.luckyColor ? `행운의 색상 ${fortune.luckyColor}.` : '',
            ].filter(Boolean).join(' ')}
          />
        </div>
      )}

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
          <DeepAnalysis type="today" birthDate={bd} birthTime={profile.birthTime} gender={profile.gender} calendarType={profile.calendarType} />
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
