import { useState, useEffect, useRef, useCallback } from 'react';
import './SpeechButton.css';

/**
 * 운세 읽어주기 버튼
 * - 전체 읽기 / 요약 읽기 전환
 * - Clova TTS 우선, 브라우저 TTS 폴백
 */
function SpeechButton({ text, summaryText, label = '읽어주기' }) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState('full'); // 'full' | 'summary'
  const [engine, setEngine] = useState(null);
  const audioRef = useRef(null);
  const utterRef = useRef(null);

  useEffect(() => {
    fetch('/api/tts/status').then(r => r.json())
      .then(d => setEngine(d.available ? 'clova' : 'browser'))
      .catch(() => setEngine('browser'));
    return () => stop();
  }, []);

  const cleanText = (t) => (t || '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/[─═▸•●■□◆◇★☆✦✧🌟💕💰💪💼☯️🩸🧬💡📅🔮⭐💚📚🎴🃏✨💭⏸️⏹]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    .replace(/\.\s*\./g, '.')
    .trim();

  const currentText = mode === 'summary' && summaryText ? summaryText : text;

  // ── Clova TTS ──
  const speakClova = async (t) => {
    try {
      const res = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText(t) }),
      });
      if (!res.ok) throw new Error('TTS fail');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => { setSpeaking(true); setPaused(false); };
      audio.onended = () => { setSpeaking(false); setPaused(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); setPaused(false); };
      await audio.play();
    } catch {
      speakBrowser(t);
    }
  };

  // ── 브라우저 TTS ──
  const getBestVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() || [];
    const ko = voices.filter(v => v.lang === 'ko-KR' || v.lang.startsWith('ko'));
    if (!ko.length) return voices[0];
    return ko.find(v => /online|neural|natural|premium/i.test(v.name))
      || ko.find(v => /sunhi/i.test(v.name))
      || ko.find(v => /google/i.test(v.name))
      || ko[0];
  }, []);

  const speakBrowser = (t) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cleanText(t));
    utter.lang = 'ko-KR';
    utter.rate = 0.92;
    utter.pitch = 1.05;
    const voice = getBestVoice();
    if (voice) utter.voice = voice;
    utter.onstart = () => { setSpeaking(true); setPaused(false); };
    utter.onend = () => { setSpeaking(false); setPaused(false); };
    utter.onerror = () => { setSpeaking(false); setPaused(false); };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  // ── 컨트롤 ──
  const handleSpeak = () => {
    if (!currentText) return;

    if (speaking && !paused) {
      if (audioRef.current && !audioRef.current.paused) { audioRef.current.pause(); setPaused(true); }
      else if (window.speechSynthesis?.speaking) { window.speechSynthesis.pause(); setPaused(true); }
      return;
    }

    if (speaking && paused) {
      if (audioRef.current && audioRef.current.paused) { audioRef.current.play(); setPaused(false); }
      else if (window.speechSynthesis?.paused) { window.speechSynthesis.resume(); setPaused(false); }
      return;
    }

    stop();
    if (engine === 'clova') speakClova(currentText);
    else speakBrowser(currentText);
  };

  const stop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const toggleMode = () => {
    const next = mode === 'full' ? 'summary' : 'full';
    setMode(next);
    if (speaking) {
      stop();
    }
  };

  if (!engine && !('speechSynthesis' in window)) return null;

  const hasSummary = !!summaryText;

  return (
    <div className="speech-btn-wrap">
      {/* 모드 전환 (요약이 있을 때만) */}
      {hasSummary && (
        <button className={`speech-mode-btn ${mode === 'summary' ? 'active' : ''}`} onClick={toggleMode}>
          {mode === 'summary' ? '📋 전체' : '⚡ 요약'}
        </button>
      )}
      <button
        className={`speech-btn ${speaking ? 'speech-btn--active' : ''}`}
        onClick={handleSpeak}
      >
        <span className="speech-btn-icon">
          {speaking && !paused ? '⏸' : '🔊'}
        </span>
        <span className="speech-btn-label">
          {speaking && !paused ? '일시정지' : speaking && paused ? '이어서 듣기' : (hasSummary && mode === 'summary' ? '요약 듣기' : label)}
        </span>
        {speaking && !paused && <span className="speech-btn-wave" />}
      </button>
      {speaking && (
        <button className="speech-stop-btn" onClick={stop}>
          ⏹ 중지
        </button>
      )}
    </div>
  );
}

export default SpeechButton;
