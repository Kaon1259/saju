/**
 * 메뉴/카테고리용 outline SVG 아이콘 (24x24, stroke 1.6)
 * - 흰색 stroke + 투명 fill (사람이 그린 듯한 외곽선 느낌)
 * - 이모지 대체용 — 카드 안에 width/height 36~48px 로 사용
 *
 * key 별 매핑:
 *  시즌:  newyear / tojeong / monthly / weekly
 *  종합:  constellation / zodiac / tarot / traditional / bloodtype / mbti / face / psych / dream / biorhythm
 *  요약:  overall / love / money / work / health
 */
const PATHS = {
  // ─── 시즌 ─────────────────────────────────────────────
  // 신년 — 폭죽/꽃 (스파클 모티프)
  newyear: (
    <>
      <path d="M5 19l4-9 4 9" />
      <path d="M9 10V4" />
      <path d="M5 4l4 2 4-2" />
      <path d="M16 6l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
      <path d="M19 14l.5 1.5L21 16l-1.5.5L19 18l-.5-1.5L17 16l1.5-.5z" />
    </>
  ),
  // 토정 — 두루마리/책
  tojeong: (
    <>
      <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" />
      <path d="M5 4a2 2 0 100 4h11" />
      <path d="M19 17H8a2 2 0 100 4h11" />
    </>
  ),
  // 월간 — 달력
  monthly: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="12" cy="14" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  // 주간 — 7일 스트라이프
  weekly: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2" strokeLinecap="round" />
    </>
  ),

  // ─── 종합·특수 ────────────────────────────────────────
  // 별자리 — 별자리 연결
  constellation: (
    <>
      <circle cx="6" cy="7" r="1.4" />
      <circle cx="13" cy="5" r="1.4" />
      <circle cx="18" cy="11" r="1.4" />
      <circle cx="11" cy="14" r="1.4" />
      <circle cx="7" cy="18" r="1.4" />
      <path d="M7.2 7.5L11.7 5.5M14 6L17 10M16.8 12L12 14M10 14.5L7.7 17" />
    </>
  ),
  // 띠 — 동물 머리 (12간지 추상)
  zodiac: (
    <>
      <path d="M5 11c0-3 2-5 5-5s5 2 5 5v3c0 3-2 5-5 5s-5-2-5-5v-3z" />
      <path d="M5 9l-2-3M15 9l2-3" />
      <circle cx="8.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <path d="M9.2 15.5c.5.5 1.1.5 1.6 0" strokeLinecap="round" />
    </>
  ),
  // 타로 — 카드 한 장
  tarot: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="1.5" />
      <path d="M12 8l1.6 3 3.4.5-2.5 2.4.6 3.4L12 15.7l-3.1 1.6.6-3.4L7 11.5l3.4-.5L12 8z" />
    </>
  ),
  // 사주 정통 — 음양
  traditional: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a4.5 4.5 0 010 9 4.5 4.5 0 000 9" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.5" r="1" stroke="none" fill="none" />
    </>
  ),
  // 혈액형 — 물방울
  bloodtype: (
    <>
      <path d="M12 3.5l5 7.5a6 6 0 11-10 0L12 3.5z" />
      <path d="M9 13.5c0 1.7 1.3 3 3 3" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  // MBTI — 뇌 (사고 유형)
  mbti: (
    <>
      <path d="M9 5c-2 0-3.5 1.5-3.5 3.5 0 .5.1 1 .3 1.5C4.5 10.5 4 11.7 4 13c0 1.5.8 2.7 2 3.3.2 1.5 1.5 2.7 3 2.7h6c1.5 0 2.8-1.2 3-2.7 1.2-.6 2-1.8 2-3.3 0-1.3-.5-2.5-1.8-3 .2-.5.3-1 .3-1.5C18.5 6.5 17 5 15 5c-1 0-1.9.4-2.5 1-.6-.6-1.5-1-2.5-1z" />
      <path d="M12 6v13" opacity="0.45" />
    </>
  ),
  // 관상 — 얼굴
  face: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9.5" cy="11" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11" r="0.7" fill="currentColor" stroke="none" />
      <path d="M9 15.5c1.5 1.3 4.5 1.3 6 0" strokeLinecap="round" />
    </>
  ),
  // 심리 — 뇌+물음표
  psych: (
    <>
      <path d="M12 4c-3 0-5 2-5 4.5 0 1 .3 1.8.8 2.5l-.3.5C6.5 12.5 6 13.7 6 15c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4 0-1.3-.5-2.5-1.5-3.5l-.3-.5c.5-.7.8-1.5.8-2.5C17 6 15 4 12 4z" />
      <path d="M11 11.5c0-.6.4-1 1-1s1 .4 1 1c0 .4-.3.7-.7.9-.2.1-.3.3-.3.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  // 꿈 — 구름 + 달
  dream: (
    <>
      <path d="M7 14a3 3 0 010-6 4 4 0 017.5-1A3 3 0 0118 14H7z" />
      <path d="M16.5 5.5a3 3 0 002.5 4.5 3.5 3.5 0 11-2.5-4.5z" />
    </>
  ),
  // 바이오리듬 — 사인파 3개
  biorhythm: (
    <>
      <path d="M3 8c2 0 3-3 5-3s3 6 5 6 3-6 5-6 3 3 5 3" opacity="0.7" />
      <path d="M3 12c2 0 3-3 5-3s3 6 5 6 3-6 5-6 3 3 5 3" />
      <path d="M3 16c2 0 3-3 5-3s3 6 5 6 3-6 5-6 3 3 5 3" opacity="0.45" />
    </>
  ),

  // ─── 운세 요약 5종 ────────────────────────────────────
  // 총운 — 별
  overall: (
    <>
      <path d="M12 3l2.5 6 6.5 1-4.7 4.5L17.5 21 12 17.7 6.5 21l1.2-6.5L3 10l6.5-1L12 3z" />
    </>
  ),
  // 애정 — 하트
  love: (
    <>
      <path d="M12 21l-1.5-1.4C5.4 14.9 2 11.8 2 8c0-3 2.4-5.5 5.5-5.5 1.7 0 3.3.8 4.5 2.1 1.2-1.3 2.8-2.1 4.5-2.1C19.6 2.5 22 5 22 8c0 3.8-3.4 6.9-8.5 11.6L12 21z" />
    </>
  ),
  // 재물 — 동전
  money: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" strokeLinecap="round" />
    </>
  ),
  // 직장 — 가방
  work: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
      <path d="M3 13h18" />
    </>
  ),
  // 건강 — 활동 그래프 (심박)
  health: (
    <>
      <path d="M3 12h4l2-5 4 10 2-5h6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export default function MenuIcon({ name, size = 36, className = '', style }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`menu-icon ${className}`}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
