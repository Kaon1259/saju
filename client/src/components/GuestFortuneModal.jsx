import { useEffect, useRef, useState } from 'react';
import { analyzeSajuStream } from '../api/fortune';
import parseAiJson, { extractStreamingFieldsPartial } from '../utils/parseAiJson';
import BirthDatePicker from './BirthDatePicker';
import GenderPicker from './GenderPicker';
import RewardedAdModal from './RewardedAdModal';
import StreamingCard from './StreamingCard';
import MenuIcon from './MenuIcon';
import KakaoLoginCTA from './KakaoLoginCTA';
import { useToast } from './Toast';
import './GuestFortuneModal.css';

const BIRTH_TIMES = [
  { value: '', label: '모름/생략' },
  { value: '자시', label: '자시 (23:30~01:30)' },
  { value: '축시', label: '축시 (01:30~03:30)' },
  { value: '인시', label: '인시 (03:30~05:30)' },
  { value: '묘시', label: '묘시 (05:30~07:30)' },
  { value: '진시', label: '진시 (07:30~09:30)' },
  { value: '사시', label: '사시 (09:30~11:30)' },
  { value: '오시', label: '오시 (11:30~13:30)' },
  { value: '미시', label: '미시 (13:30~15:30)' },
  { value: '신시', label: '신시 (15:30~17:30)' },
  { value: '유시', label: '유시 (17:30~19:30)' },
  { value: '술시', label: '술시 (19:30~21:30)' },
  { value: '해시', label: '해시 (21:30~23:30)' },
];

const PROG_FIELDS = ['overall', 'love', 'money', 'health', 'work', 'academic'];

const CARD_DEFS = [
  { key: 'overall',  icon: '🌟', title: '총운',           accent: '#fbbf24' },
  { key: 'love',     icon: '💕', title: '애정운',         accent: '#ec4899' },
  { key: 'money',    icon: '💰', title: '재물운',         accent: '#10b981' },
  { key: 'health',   icon: '💪', title: '건강운',         accent: '#06b6d4' },
  { key: 'work',     icon: '💼', title: '직장운',         accent: '#6366f1' },
  { key: 'academic', icon: '📚', title: '학업·자기계발운', accent: '#8b5cf6' },
];

/**
 * 비로그인 사용자용 무료 사주 운세 모달.
 * 흐름: form → ad(rewarded) → analyzing(progressive cards 스트리밍) → result
 */
export default function GuestFortuneModal({ open, onClose }) {
  const toast = useToast();
  const [phase, setPhase] = useState('form'); // form | ad | analyzing | result

  // 폼 상태
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [calendarType, setCalendarType] = useState('SOLAR');
  const [gender, setGender] = useState('');

  // 스트리밍 상태
  const [streamFields, setStreamFields] = useState({});
  const [doneFields, setDoneFields] = useState(new Set());
  const [score, setScore] = useState(null);
  const [luckyNumber, setLuckyNumber] = useState(null);
  const [luckyColor, setLuckyColor] = useState(null);
  const cleanupRef = useRef(null);

  // 모달이 닫히면 모든 상태 초기화 + SSE 정리
  useEffect(() => {
    if (open) return;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setPhase('form');
    setBirthDate(''); setBirthTime(''); setCalendarType('SOLAR'); setGender('');
    setStreamFields({}); setDoneFields(new Set());
    setScore(null); setLuckyNumber(null); setLuckyColor(null);
  }, [open]);

  // 컴포넌트 언마운트 시 SSE 정리
  useEffect(() => () => { cleanupRef.current?.(); }, []);

  if (!open) return null;

  const handleSubmit = () => {
    if (!birthDate) return;
    setPhase('ad');
  };

  const handleAdReward = (reward) => {
    if (!reward?.rewarded) { setPhase('form'); return; }
    setPhase('analyzing');
    runAnalysis();
  };

  const handleAdClose = () => { setPhase('form'); };

  const runAnalysis = () => {
    setStreamFields({}); setDoneFields(new Set());
    setScore(null); setLuckyNumber(null); setLuckyColor(null);
    let buffer = '';
    cleanupRef.current?.();
    cleanupRef.current = analyzeSajuStream(birthDate, birthTime || undefined, calendarType, gender || undefined, {
      freeMode: true,
      targetType: 'me',
      onCached: (cached) => {
        const tf = cached?.todayFortune || {};
        setStreamFields({
          overall: tf.overall || '', love: tf.love || '', money: tf.money || '',
          health: tf.health || '', work: tf.work || '', academic: tf.academic || '',
        });
        setDoneFields(new Set(['overall','love','money','health','work','academic']));
        setScore(tf.score || null);
        setLuckyNumber(tf.luckyNumber ?? null);
        setLuckyColor(tf.luckyColor || null);
        setPhase('result');
      },
      onChunk: (text) => {
        buffer += text;
        const partial = extractStreamingFieldsPartial(buffer, PROG_FIELDS);
        const next = {};
        const newDone = [];
        for (const k of PROG_FIELDS) {
          const p = partial[k];
          if (p !== undefined) {
            next[k] = p.value;
            if (p.done) newDone.push(k);
          }
        }
        if (Object.keys(next).length > 0) setStreamFields(prev => ({ ...prev, ...next }));
        if (newDone.length > 0) setDoneFields(prev => {
          const n = new Set(prev); newDone.forEach(f => n.add(f)); return n;
        });
      },
      onDone: () => {
        const parsed = parseAiJson(buffer);
        if (parsed) {
          setStreamFields({
            overall: parsed.overall || '', love: parsed.love || '', money: parsed.money || '',
            health: parsed.health || '', work: parsed.work || '', academic: parsed.academic || '',
          });
          setDoneFields(new Set(['overall','love','money','health','work','academic']));
          setScore(parsed.score || null);
          setLuckyNumber(parsed.luckyNumber ?? null);
          setLuckyColor(parsed.luckyColor || null);
          setPhase('result');
        } else {
          toast?.error?.('운세 분석 응답을 해석하지 못했습니다.');
          setPhase('form');
        }
      },
      onError: () => {
        toast?.error?.('운세 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
        setPhase('form');
      },
    });
  };

  const cardStatus = (key) => {
    if (phase === 'result') return 'done';
    if (doneFields.has(key)) return 'done';
    if (streamFields[key]) return 'streaming';
    return 'pending';
  };

  const reset = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setPhase('form');
    setStreamFields({}); setDoneFields(new Set());
    setScore(null); setLuckyNumber(null); setLuckyColor(null);
  };

  return (
    <div className="gfm-overlay" role="dialog" aria-modal="true">
      <div className="gfm-sheet">
        <header className="gfm-header">
          <h2 className="gfm-title">
            {phase === 'form' && <><MenuIcon name="crystalBall" size={18} /> 무료 사주 운세</>}
            {phase === 'analyzing' && <><MenuIcon name="sparkle" size={18} /> 오늘의 운세 분석 중</>}
            {phase === 'result' && <><MenuIcon name="star" size={18} /> 오늘의 사주 운세</>}
          </h2>
          <button className="gfm-close" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <div className="gfm-body">
          {phase === 'form' && (
            <div className="gfm-form fade-in">
              <p className="gfm-form-lead">생년월일만 입력하면 광고 시청 후 무료로 분석해 드려요</p>
              <div className="gfm-form-group">
                <label className="gfm-label">생년월일</label>
                <BirthDatePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  calendarType={calendarType}
                  onCalendarTypeChange={setCalendarType}
                />
              </div>
              <div className="gfm-form-group">
                <label className="gfm-label">태어난 시간 (선택)</label>
                <select className="gfm-input" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>
                  {BIRTH_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="gfm-form-group">
                <label className="gfm-label">성별</label>
                <GenderPicker value={gender} onChange={setGender} />
              </div>
              <button className="gfm-submit" onClick={handleSubmit} disabled={!birthDate}>
                오늘의 운세 보기
              </button>
              <div className="gfm-form-foot">
                <span>회원이 되시면 광고 없이 더 자세한 운세를 받을 수 있어요</span>
                <KakaoLoginCTA returnTo="/" className="gfm-kakao">카카오로 가입하고 받기</KakaoLoginCTA>
              </div>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="gfm-analyzing fade-in">
              <div className="gfm-streaming-header">
                <span className="gfm-streaming-orb"><MenuIcon name="crystalBall" size={24} /></span>
                <span>AI가 오늘의 운세를 분석 중...</span>
                <span className="streaming-dots"><i/><i/><i/></span>
              </div>
              <div className="gfm-cards">
                {CARD_DEFS.map((def, idx) => (
                  <StreamingCard
                    key={def.key}
                    icon={def.icon}
                    title={def.title}
                    text={streamFields[def.key] || ''}
                    status={cardStatus(def.key)}
                    delay={idx * 60}
                    accent={def.accent}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="gfm-result fade-in">
              <div className="gfm-result-summary">
                {score != null && (
                  <div className="gfm-result-score">
                    <span className="gfm-result-score-num">{score}</span>
                    <span className="gfm-result-score-suf">점</span>
                  </div>
                )}
                {(luckyNumber != null || luckyColor) && (
                  <div className="gfm-result-lucky">
                    {luckyNumber != null && (
                      <span className="gfm-lucky-item"><MenuIcon name="hash" size={15} /> 행운의 숫자 <strong>{luckyNumber}</strong></span>
                    )}
                    {luckyColor && (
                      <span className="gfm-lucky-item"><MenuIcon name="palette" size={15} /> 행운의 색 <strong>{luckyColor}</strong></span>
                    )}
                  </div>
                )}
              </div>
              <div className="gfm-cards">
                {CARD_DEFS.map((def, idx) => (
                  streamFields[def.key] ? (
                    <StreamingCard
                      key={def.key}
                      icon={def.icon}
                      title={def.title}
                      text={streamFields[def.key]}
                      status="done"
                      delay={idx * 40}
                      accent={def.accent}
                    />
                  ) : null
                ))}
              </div>
              <div className="gfm-result-actions">
                <button className="gfm-action gfm-action--ghost" onClick={reset}>다시 보기</button>
                <KakaoLoginCTA returnTo="/" className="gfm-action gfm-action--primary">
                  카카오로 가입하고 더 보기
                </KakaoLoginCTA>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 광고 모달 — 모달 위 오버레이 */}
      <RewardedAdModal
        open={phase === 'ad'}
        slot="guest_fortune"
        title="잠시 광고를 시청한 후 무료로 분석을 받아보세요"
        subtitle="회원이 되시면 광고 없이 더 풍부한 운세를 보실 수 있습니다"
        onReward={handleAdReward}
        onClose={handleAdClose}
      />
    </div>
  );
}
