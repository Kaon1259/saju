/**
 * 1:1연애 앱 인트로 효과음 모음
 * Web Audio API - 단일 공유 AudioContext
 */

let _ctx = null;

function ctx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function note(c, freq, start, dur, vol, type = 'sine') {
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now + start);
  g.gain.setValueAtTime(vol, now + start);
  g.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now + start);
  osc.stop(now + start + dur + 0.05);
}

function kick(c, start, vol = 0.2) {
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, now + start);
  osc.frequency.exponentialRampToValueAtTime(40, now + start + 0.15);
  g.gain.setValueAtTime(vol, now + start);
  g.gain.exponentialRampToValueAtTime(0.001, now + start + 0.15);
  osc.connect(g); g.connect(c.destination);
  osc.start(now + start); osc.stop(now + start + 0.2);
}

function noise(c, start, dur, vol) {
  const size = c.sampleRate * dur;
  const buf = c.createBuffer(1, size, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  src.connect(g); g.connect(c.destination);
  src.start(c.currentTime + start);
}

// 필터드 노이즈 - 카드 소리에 가까운 밴드패스 노이즈
function cardNoise(c, start, dur, vol, freq = 3000, q = 1.5) {
  const size = c.sampleRate * Math.max(dur, 0.01);
  const buf = c.createBuffer(1, size, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource(); src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = q;
  const g = c.createGain();
  const now = c.currentTime + start;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(filt); filt.connect(g); g.connect(c.destination);
  src.start(now);
}

// 카드 한 장 탁 놓는 소리
function cardSlap(c, start, vol = 0.15) {
  // 임팩트 (넓은 대역 노이즈, 짧고 강하게)
  cardNoise(c, start, 0.025, vol * 1.2, 2000, 0.8);
  // 바닥 울림 (낮은 톤)
  note(c, 150, start, 0.08, vol * 0.4, 'triangle');
  // 카드 떨림 (높은 주파수)
  cardNoise(c, start + 0.01, 0.04, vol * 0.3, 5000, 2);
}

// 리플 셔플 (촤르르르)
function rippleShuffle(c, start, dur, vol = 0.12) {
  const count = Math.floor(dur / 0.015);
  for (let i = 0; i < count; i++) {
    const t = start + i * (dur / count);
    const v = vol * (0.6 + Math.random() * 0.4);
    cardNoise(c, t, 0.02, v, 2500 + Math.random() * 2000, 1.5);
  }
}

// ─── 홈: 신비로운 종소리 아르페지오 ───
export function playHomeChime() {
  const c = ctx(); if (!c) return;
  [[523.25,0,0.6,0.18],[659.25,0.12,0.5,0.15],[783.99,0.24,0.55,0.13],[1046.5,0.36,0.7,0.10]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
  note(c, 1318.5, 0.4, 0.8, 0.04, 'triangle');
}

// ─── 1:1연애: 두근두근 하트비트 + 달콤한 멜로디 ───
export function playLovebeat() {
  const c = ctx(); if (!c) return;
  kick(c, 0); kick(c, 0.25);
  [[659.25,0.5,0.3,0.12],[783.99,0.65,0.3,0.12],[880,0.8,0.4,0.10],[1046.5,0.95,0.6,0.08]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
  note(c, 1318.5, 1.1, 0.7, 0.03, 'triangle');
}

// ─── 오늘운세: 수정구슬 반짝임 ───
export function playCrystalBall() {
  const c = ctx(); if (!c) return;
  [[880,0,0.25,0.10],[1175,0.08,0.25,0.10],[1397,0.16,0.3,0.09],[1760,0.24,0.35,0.08],[2093,0.32,0.5,0.06]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
  note(c, 523.25, 0.1, 1.0, 0.06, 'triangle');
}

// ─── 궁합: 두 음이 만나는 하모니 ───
export function playHarmony() {
  const c = ctx(); if (!c) return;
  note(c,392,0,0.5,0.12); note(c,493.88,0.15,0.5,0.10);
  note(c,587.33,0.3,0.5,0.12); note(c,698.46,0.45,0.5,0.10);
  [392,493.88,587.33,783.99].forEach(f => note(c,f,0.7,0.8,0.06));
  note(c, 987.77, 0.8, 0.6, 0.03, 'triangle');
}

// ─── 정통사주: 동양풍 5음계 (궁상각치우) ───
export function playOriental() {
  const c = ctx(); if (!c) return;
  [[523.25,0,0.35,0.14],[587.33,0.15,0.3,0.12],[659.25,0.3,0.3,0.11],[783.99,0.45,0.35,0.10],[523.25,0.65,0.6,0.08]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
  note(c, 261.63, 0, 1.2, 0.06, 'triangle');
}

// ─── 타로: 신비로운 카드 소환 ───
export function playTarotReveal() {
  const c = ctx(); if (!c) return;

  // 깊고 따뜻한 화음 - 천천히 펼쳐지며
  note(c, 261.63, 0, 2.5, 0.05, 'triangle');
  note(c, 329.63, 0.3, 2.2, 0.04, 'triangle');
  note(c, 392,    0.6, 2.0, 0.04, 'triangle');
  note(c, 523.25, 0.9, 1.8, 0.035, 'triangle');
  note(c, 659.25, 1.2, 1.5, 0.03, 'sine');
  note(c, 783.99, 1.5, 1.5, 0.025, 'sine');
  note(c, 783.99, 2.4, 1.0, 0.02, 'sine');
}

// ─── 타로: 카드 마구 섞기 (2초) ───
export function playCardShuffle() {
  const c = ctx(); if (!c) return;

  // 빠르게 카드 섞는 소리 2초간 (촤르르 촤르르 촤르르)
  rippleShuffle(c, 0, 0.35, 0.12);
  cardSlap(c, 0.38, 0.08);
  rippleShuffle(c, 0.45, 0.4, 0.14);
  cardSlap(c, 0.88, 0.09);
  rippleShuffle(c, 0.95, 0.35, 0.13);
  cardSlap(c, 1.33, 0.08);
  rippleShuffle(c, 1.4, 0.3, 0.11);
  cardSlap(c, 1.73, 0.10);

  // 마지막 정리 탁탁
  cardSlap(c, 1.85, 0.07);
  cardSlap(c, 1.93, 0.06);
}

// ─── 타로: 배경 ASMR 루프 ───
export function startTarotAmbient() {
  const c = ctx(); if (!c) return null;
  let stopped = false;
  let timer = null;

  function playLoop() {
    if (stopped) return;
    const now = c.currentTime;

    // 카드 집기 (스윽)
    cardNoise(c, 0, 0.1, 0.06, 2000, 1);

    // 리플 셔플 1 (촤르르르)
    rippleShuffle(c, 0.2, 0.5, 0.08);

    // 카드 모으기 (탁)
    cardSlap(c, 0.8, 0.07);

    // 리플 셔플 2
    rippleShuffle(c, 1.1, 0.6, 0.09);

    // 정리 (탁탁)
    cardSlap(c, 1.8, 0.06);
    cardSlap(c, 1.95, 0.05);

    // 카드 슬라이드 + 놓기
    cardNoise(c, 2.3, 0.08, 0.05, 2500, 1.2);
    cardSlap(c, 2.4, 0.06);

    // 잠시 쉬고 반복 (3.5초 사이클)
    timer = setTimeout(() => { if (!stopped) playLoop(); }, 3500);
  }

  playLoop();

  // stop 함수 반환
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

// ─── 마이페이지: 부드러운 알림 ───
export function playProfilePing() {
  const c = ctx(); if (!c) return;
  note(c,880,0,0.2,0.10); note(c,1108.7,0.1,0.3,0.08); note(c,880,0.25,0.4,0.06);
}

// ─── 꿈해몽: 몽환적 웨이브 ───
export function playDreamWave() {
  const c = ctx(); if (!c) return;
  [[329.63,0,0.5,0.10],[440,0.2,0.5,0.08],[554.37,0.4,0.6,0.07],[659.25,0.6,0.7,0.05]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v,'triangle'));
}

// ─── 별자리: 별빛 반짝임 ───
export function playStarTwinkle() {
  const c = ctx(); if (!c) return;
  [[1046.5,0,0.2,0.08],[1318.5,0.1,0.2,0.09],[1568,0.2,0.2,0.08],[2093,0.3,0.4,0.06],[1568,0.5,0.3,0.05],[2093,0.65,0.5,0.04]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
}

// ─── 심리테스트: 호기심 자극 팝 ───
export function playPsychPop() {
  const c = ctx(); if (!c) return;
  [[523.25,0,0.15,0.12],[659.25,0.1,0.15,0.12],[783.99,0.2,0.15,0.13],[1046.5,0.3,0.3,0.10],[783.99,0.45,0.2,0.07],[1046.5,0.55,0.4,0.06]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
}

// ─── MBTI: 경쾌한 팝 ───
export function playMbtiPop() {
  const c = ctx(); if (!c) return;
  [[587.33,0,0.15,0.12],[783.99,0.12,0.15,0.12],[987.77,0.24,0.2,0.10],[1174.7,0.36,0.35,0.08]]
    .forEach(([f,s,d,v]) => note(c,f,s,d,v));
}

// ─── 혈액형: 물방울 드롭 ───
export function playBloodDrop() {
  const c = ctx(); if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(g); g.connect(c.destination);
  osc.start(now); osc.stop(now + 0.35);
  note(c,880,0.2,0.25,0.10); note(c,1046.5,0.35,0.3,0.07);
}

// ─── 관상: 카메라 셔터 느낌 ───
export function playShutter() {
  const c = ctx(); if (!c) return;
  noise(c, 0, 0.06, 0.15);
  note(c,1046.5,0.12,0.2,0.08); note(c,1318.5,0.22,0.3,0.06);
}

// ─── 바이오리듬: 파동 느낌 ───
export function playBioWave() {
  const c = ctx(); if (!c) return;
  [392,523.25,659.25,783.99,659.25,523.25].forEach((f,i) => note(c,f,i*0.1,0.25,0.08,'triangle'));
}

// ─── 토정비결: 고풍스러운 종 ───
export function playAncientBell() {
  const c = ctx(); if (!c) return;
  note(c,261.63,0,0.8,0.12,'triangle'); note(c,329.63,0.3,0.6,0.08,'triangle'); note(c,392,0.5,0.7,0.06,'triangle');
}

// ─── 만세력: 시계 똑딱 + 차임 ───
export function playClockChime() {
  const c = ctx(); if (!c) return;
  [0,0.2,0.4].forEach(t => noise(c, t, 0.02, 0.10));
  note(c,783.99,0.55,0.4,0.10); note(c,1046.5,0.7,0.5,0.07);
}
