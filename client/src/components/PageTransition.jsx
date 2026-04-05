import { useState, useEffect, useContext, createContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PageTransition.css';

// ─── Sound functions (Web Audio API) ───

function playSnowChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 부드러운 윈드차임 (고음 사인파 3연속)
    [880, 1047, 1319, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.8);
    });
  } catch {}
}

function playRain() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 3000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 1);
  } catch {}
}

function playWind() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 400; filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 1.2);
  } catch {}
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.6);
    });
  } catch {}
}

function playHeartbeat() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.15].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 60;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch {}
}

function playDrum() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function playDigital() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.15);
    });
  } catch {}
}

// ─── Transition effects config ───

export const TRANSITION_EFFECTS = {
  fortune:       { sound: playSnowChime,  label: '\u536E',   className: 'trans--snow' },
  saju:          { sound: playWind,      label: '\u547D',   className: 'trans--energy' },
  tojeong:       { sound: playRain,      label: '\u79D8',   className: 'trans--rain' },
  star:          { sound: playChime,     label: '\u2726',   className: 'trans--stars' },
  zodiac:        { sound: playDrum,      label: '\uD83D\uDC09', className: 'trans--zodiac' },
  bloodtype:     { sound: playHeartbeat, label: '\uD83E\uDE78', className: 'trans--bloodtype' },
  mbti:          { sound: playDigital,   label: '\uD83E\uDDEC', className: 'trans--mbti' },
  profile:       { sound: playChime,     label: '',             className: 'trans--profile' },
  tarot:         { sound: playChime,     label: '🔮',          className: 'trans--stars' },
  compatibility: { sound: playHeartbeat, label: '💕',          className: 'trans--bloodtype' },
};

// ─── PageTransition Component ───

function PageTransition({ effect, onDone }) {
  const [fadeOut, setFadeOut] = useState(false);
  const config = TRANSITION_EFFECTS[effect] || TRANSITION_EFFECTS.fortune;

  useEffect(() => {
    config.sound();
    const t1 = setTimeout(() => setFadeOut(true), 900);
    const t2 = setTimeout(onDone, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`page-transition ${config.className} ${fadeOut ? 'trans--out' : ''}`}>
      <div className="trans-content">
        <span className="trans-symbol">{config.label}</span>
      </div>

      {effect === 'fortune' && <>
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="trans-snowflake" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
            fontSize: `${8 + Math.random() * 14}px`,
            opacity: 0.4 + Math.random() * 0.5,
          }}>❄</span>
        ))}
        <div className="trans-snow-glow" />
      </>}

      {effect === 'saju' && <>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="trans-energy-particle" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.5}s` }} />
        ))}
        <div className="trans-energy-ring" />
      </>}

      {effect === 'tojeong' && <>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="trans-rain-drop" style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.6}s`, animationDuration: `${0.3 + Math.random()*0.3}s` }} />
        ))}
      </>}

      {effect === 'star' && <>
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="trans-star-particle" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.6}s`, fontSize: `${10 + Math.random()*16}px` }}>{'\u2726'}</span>
        ))}
        <div className="trans-shooting-star" />
        <div className="trans-shooting-star trans-shooting-star--2" />
      </>}

      {effect === 'zodiac' && <>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="trans-zodiac-particle" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.5}s` }} />
        ))}
      </>}

      {effect === 'bloodtype' && <>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="trans-heartbeat-ring" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </>}

      {effect === 'mbti' && <>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="trans-grid-cell" style={{ left: `${(i % 5) * 20 + Math.random()*10}%`, top: `${Math.floor(i / 5) * 20 + Math.random()*10}%`, animationDelay: `${Math.random()*0.5}s` }} />
        ))}
      </>}

      {effect === 'profile' && (() => {
        let profileData = {};
        try { profileData = JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch {}
        const gender = profileData.gender;
        const relStatus = profileData.relationshipStatus;
        const isLovey = relStatus === 'IN_RELATIONSHIP' || relStatus === 'SOME';
        // 띠 이모지
        const zodiacEmojis = { '쥐': '🐭', '소': '🐂', '호랑이': '🐅', '토끼': '🐇', '용': '🐉', '뱀': '🐍', '말': '🐴', '양': '🐑', '원숭이': '🐵', '닭': '🐓', '개': '🐕', '돼지': '🐷' };
        const zodiacEmoji = zodiacEmojis[profileData.zodiacAnimal] || '✦';
        // 별자리 이모지
        const bd = profileData.birthDate;
        let constEmoji = '⭐';
        if (bd) {
          const m = parseInt(bd.split('-')[1]), d = parseInt(bd.split('-')[2]), v = m*100+d;
          const cs = [[120,218,'♒'],[219,320,'♓'],[321,419,'♈'],[420,520,'♉'],[521,621,'♊'],[622,722,'♋'],[723,822,'♌'],[823,922,'♍'],[923,1022,'♎'],[1023,1121,'♏'],[1122,1221,'♐']];
          const found = cs.find(c => v >= c[0] && v <= c[1]);
          constEmoji = found ? found[2] : '♑';
        }
        const genderSymbol = gender === 'F' ? '♀' : '♂';
        return <>
          {/* 별자리 + 성별 + 띠 */}
          <div className="trans-profile-center">
            <span className="trans-profile-const">{constEmoji}</span>
            <span className="trans-profile-gender-symbol" style={{ color: gender === 'F' ? '#F472B6' : '#60A5FA' }}>{genderSymbol}</span>
            <span className="trans-profile-zodiac">{zodiacEmoji}</span>
          </div>
          {/* 반짝이 파티클 */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={`p${i}`} className="trans-shimmer-particle" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.6}s` }} />
          ))}
          {/* 연애중/썸이면 하트 떠오름 */}
          {isLovey && Array.from({ length: 12 }).map((_, i) => (
            <span key={`h${i}`} className="trans-profile-heart" style={{
              left: `${5 + Math.random()*90}%`,
              animationDelay: `${Math.random()*0.8}s`,
              animationDuration: `${0.8 + Math.random()*0.6}s`,
              fontSize: `${14 + Math.random()*14}px`,
            }}>&#x2764;</span>
          ))}
        </>;
      })()}

      {effect === 'constellation' && <>
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="trans-star-particle" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.6}s`, fontSize: `${10 + Math.random()*16}px` }}>{'\u2726'}</span>
        ))}
        <div className="trans-shooting-star" />
        <div className="trans-shooting-star trans-shooting-star--2" />
      </>}
    </div>
  );
}

// ─── Transition Context ───

const TransitionContext = createContext();

export function useTransition() {
  return useContext(TransitionContext);
}

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [transition, setTransition] = useState(null);

  const triggerTransition = (effect, pathOrAction) => {
    setTransition({ effect, pathOrAction });
  };

  const TransitionOverlay = transition ? (
    <PageTransition
      key={Date.now()}
      effect={transition.effect}
      onDone={() => {
        const action = transition.pathOrAction;
        setTransition(null);
        if (typeof action === 'function') action();
        else if (typeof action === 'string') navigate(action);
      }}
    />
  ) : null;

  return (
    <TransitionContext.Provider value={{ triggerTransition, currentPath: location.pathname }}>
      {TransitionOverlay}
      {children}
    </TransitionContext.Provider>
  );
}

export default PageTransition;
