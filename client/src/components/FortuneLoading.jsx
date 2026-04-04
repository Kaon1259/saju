import { useState, useEffect } from 'react';
import './FortuneLoading.css';

const LOADING_PHASES = {
  default: [
    { msg: '사주팔자를 펼치고 있어요...', icon: '🔮' },
    { msg: '음양오행을 배치하는 중...', icon: '☯' },
    { msg: '천간지지를 읽고 있어요...', icon: '📜' },
    { msg: '운세의 흐름을 감지하는 중...', icon: '🌊' },
    { msg: '별자리의 기운을 모으는 중...', icon: '✨' },
    { msg: '당신만의 운세를 정리하고 있어요...', icon: '💫' },
  ],
  love: [
    { msg: '연애 기운을 감지하고 있어요...', icon: '💕' },
    { msg: '사랑의 별자리를 읽는 중...', icon: '⭐' },
    { msg: '인연의 실타래를 풀고 있어요...', icon: '🧵' },
    { msg: '두 사람의 기운을 분석 중...', icon: '💞' },
    { msg: '하트 에너지를 충전하는 중...', icon: '💗' },
    { msg: '연애운을 정리하고 있어요...', icon: '💌' },
  ],
  tarot: [
    { msg: '타로 카드를 셔플하고 있어요...', icon: '🃏' },
    { msg: '카드의 기운을 읽는 중...', icon: '✨' },
    { msg: '카드가 당신에게 말하고 있어요...', icon: '🔮' },
    { msg: '숨겨진 메시지를 해석하는 중...', icon: '📖' },
    { msg: '운명의 카드가 펼쳐지는 중...', icon: '🌙' },
    { msg: '타로 리딩을 완성하고 있어요...', icon: '💫' },
  ],
  dream: [
    { msg: '꿈의 세계로 들어가는 중...', icon: '🌙' },
    { msg: '꿈 속 상징을 분석하고 있어요...', icon: '🔍' },
    { msg: '무의식의 메시지를 해독 중...', icon: '🧠' },
    { msg: '꿈의 의미를 풀어내는 중...', icon: '✨' },
    { msg: '해몽 결과를 정리하고 있어요...', icon: '📜' },
  ],
  compatibility: [
    { msg: '두 사람의 사주를 비교하는 중...', icon: '⚖️' },
    { msg: '궁합의 기운을 분석 중...', icon: '💑' },
    { msg: '오행의 조화를 살피는 중...', icon: '☯' },
    { msg: '인연의 깊이를 측정하는 중...', icon: '💕' },
    { msg: '궁합 결과를 정리하고 있어요...', icon: '💫' },
  ],
};

export default function FortuneLoading({ type = 'default', streaming = false, streamText = '' }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phases = LOADING_PHASES[type] || LOADING_PHASES.default;

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex(prev => (prev + 1) % phases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phases.length]);

  const phase = phases[phaseIndex];

  return (
    <div className="fortune-loading">
      <div className="fortune-loading__orb">
        <div className="fortune-loading__orb-inner">
          <span className="fortune-loading__icon">{phase.icon}</span>
        </div>
        <div className="fortune-loading__ring" />
        <div className="fortune-loading__ring fortune-loading__ring--2" />
      </div>

      <p className="fortune-loading__msg" key={phaseIndex}>
        {phase.msg}
      </p>

      <div className="fortune-loading__dots">
        {phases.map((_, i) => (
          <span key={i} className={`fortune-loading__dot ${i === phaseIndex ? 'fortune-loading__dot--active' : ''}`} />
        ))}
      </div>

      {streaming && streamText && (
        <div className="fortune-loading__stream">
          <div className="fortune-loading__stream-text">
            {streamText}
            <span className="fortune-loading__cursor" />
          </div>
        </div>
      )}
    </div>
  );
}
