// 카드 탭/클릭 시 핑크 하트 버블 이펙트
// 글로벌 이벤트 위임으로 동작 — 각 카드 컴포넌트 수정 없이 셀렉터만 추가하면 적용됨.

// 카드 종류 → 버블 심볼 매핑 (없으면 기본 하트)
const KIND_SYMBOLS = {
  heart:    ['♥', '♥', '♡', '♥'],
  star:     ['★', '✦', '✧', '⋆'],
  sparkle:  ['✨', '✦', '⋆'],
};

// 셀렉터 → 버블 종류 매핑 (구체적인 게 위로)
const TARGETS = [
  { sel: '.attend-card',                    kind: 'star' },
  { sel: '.home-recommend-card',            kind: 'sparkle' },
  { sel: '.home-hero-cs-cta',               kind: 'heart' },
  { sel: '.home-hero-cs-summary',           kind: 'sparkle' },
  { sel: '.home-hero-cs-love',              kind: 'heart' },
  { sel: '.home-love-banner',               kind: 'heart' },
  { sel: '.home-rel-shortcut',              kind: 'heart' },
  { sel: '.home-rel-card',                  kind: 'heart' },
  { sel: '.lf-status-chip',                 kind: 'heart' },
];

const PINK_PALETTE = ['#ec4899', '#f472b6', '#fb7185', '#fda4af', '#f9a8d4'];

function spawnBubbles(x, y, kind) {
  const syms = KIND_SYMBOLS[kind] || KIND_SYMBOLS.heart;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'tap-bubble';
    el.textContent = syms[i % syms.length];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = PINK_PALETTE[i % PINK_PALETTE.length];
    el.style.fontSize = `${14 + Math.random() * 14}px`;
    el.style.setProperty('--bubble-dx', `${(Math.random() - 0.5) * 100}px`);
    el.style.setProperty('--bubble-dy', `${-80 - Math.random() * 90}px`);
    el.style.setProperty('--bubble-rot', `${(Math.random() - 0.5) * 50}deg`);
    el.style.animationDelay = `${Math.random() * 0.08}s`;
    document.body.appendChild(el);
    // 1.2s 후 제거 (애니메이션 끝과 동기화)
    setTimeout(() => el.remove(), 1300);
  }
}

const REPLAY_DELAY = 220; // 버블 보여주고 페이지 이동 — 사용자 체감 0.22초

let initialized = false;
export function initTapBubble() {
  if (initialized) return;
  initialized = true;

  document.addEventListener(
    'click',
    (e) => {
      // 재발사된 이벤트는 통과 (무한루프 방지)
      if (e._tapBubbleReplay) return;

      let target = null;
      let hitKind = null;
      for (const t of TARGETS) {
        if (e.target.closest) {
          const el = e.target.closest(t.sel);
          if (el) { target = el; hitKind = t.kind; break; }
        }
      }
      if (!target || !hitKind) return;

      const x = e.clientX;
      const y = e.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // 원래 이벤트는 막고 효과만 먼저 보여줌
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      spawnBubbles(x, y, hitKind);

      // REPLAY_DELAY 후 같은 타겟에 클릭 재발사 → 페이지 이동/원래 동작 진행
      setTimeout(() => {
        const replay = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
        });
        replay._tapBubbleReplay = true;
        target.dispatchEvent(replay);
      }, REPLAY_DELAY);
    },
    { capture: true } // capture로 잡아야 React onClick보다 먼저 도달
  );
}
