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

  // ─── 연애 배너 8종 (outline 통일) ───────────────────────
  // 나의 연인 — 두 사람 실루엣
  couple: (
    <>
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M3.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" />
      <path d="M11.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" />
    </>
  ),
  // 1:1 연애운 — 부드러운 하트 (single)
  heart: (
    <>
      <path d="M12 20.3l-1.2-1.1C5.7 14.6 3 12 3 8.5 3 6 5 4 7.5 4c1.5 0 2.9.7 3.8 1.8l.7.8.7-.8C13.6 4.7 15 4 16.5 4 19 4 21 6 21 8.5c0 3.5-2.7 6.1-7.8 10.7L12 20.3z" />
    </>
  ),
  // 사주 궁합 — 하트 + 스파클 (관계의 케미)
  sparkleHeart: (
    <>
      <path d="M11 17.5l-.9-.8C6.4 13.4 4 11.4 4 8.7 4 6.7 5.6 5 7.6 5c1.1 0 2.2.5 2.9 1.4.7-.9 1.8-1.4 2.9-1.4C15.4 5 17 6.7 17 8.7c0 2.7-2.4 4.7-6.1 8L11 17.5z" />
      <path d="M19 13l.6 1.5L21 15l-1.4.5L19 17l-.6-1.5L17 15l1.4-.5z" />
      <path d="M19 4l.4 1L20.5 5.5 19.4 6 19 7l-.4-1L17.5 5.5 18.6 5z" />
    </>
  ),
  // 썸 진단 — 과녁 (조준)
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // 짝사랑 — 하트에 큐피드 화살
  heartArrow: (
    <>
      <path d="M12 19l-1-.9C6.5 14.4 4 12.4 4 9.7 4 7.7 5.6 6 7.6 6c1.1 0 2.2.5 2.9 1.4.7-.9 1.8-1.4 2.9-1.4 2 0 3.6 1.7 3.6 3.7 0 2.7-2.5 4.7-7 8.4L12 19z" />
      <path d="M3 4l5 5M2.5 6.5l3-1 1-3M16 13l5 5M19.5 18l-1 3-3 1" strokeLinecap="round" />
    </>
  ),
  // 고백 타이밍 — 봉투 (러브레터)
  letter: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2" />
      <path d="M3.5 7.5l8.5 6 8.5-6" />
      <path d="M12 13.8l1 1.7 1.9.3-1.4 1.3.3 1.9-1.8-.9-1.8.9.3-1.9-1.4-1.3 1.9-.3z" opacity="0.5" />
    </>
  ),
  // 만남 시기 — 수정구슬 + 받침대
  crystalBall: (
    <>
      <circle cx="12" cy="11" r="6.5" />
      <path d="M6.5 17l-1 3.5h13L17.5 17" strokeLinejoin="round" />
      <path d="M9.5 8.5c-.8.6-1.3 1.5-1.5 2.5" strokeLinecap="round" opacity="0.55" />
      <circle cx="9" cy="9" r="0.6" fill="currentColor" stroke="none" opacity="0.7" />
    </>
  ),
  // 최애 스타 궁합 — 별 (단일)
  star: (
    <>
      <path d="M12 3l2.6 6.1 6.4 1-4.6 4.5 1.1 6.4L12 17.7 6.5 21l1.1-6.4L3 10.1l6.4-1L12 3z" />
    </>
  ),

  // ─── 추천/액션 아이콘 ────────────────────────────────────
  // 반지 — 결혼/약혼
  ring: (
    <>
      <path d="M9 4l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15.5" r="5.5" />
      <path d="M10 13.5l1 1.5-1 1.5" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  // 휴대폰 — 연락
  phone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 18h4" strokeLinecap="round" />
      <circle cx="12" cy="6" r="0.6" fill="currentColor" stroke="none" opacity="0.6" />
    </>
  ),
  // 달 — 재회/회복/밤의 운세
  moon: (
    <>
      <path d="M20 14a8 8 0 11-9.5-9.7 6 6 0 008.7 7.7c.5-.1.6.5.8 2z" />
    </>
  ),
  // 악수 — 만남/소개팅
  handshake: (
    <>
      <path d="M3 11l3-3h3l4 4-2 2-2-2-3 3-3-1V11z" strokeLinejoin="round" />
      <path d="M21 11l-3-3h-3l-4 4 2 2 2-2 3 3 3-1V11z" strokeLinejoin="round" />
      <path d="M11 13l1.5 1.5" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  // 출석부 — 달력 + 체크마크
  attendance: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // ─── 보조/세부 아이콘 ────────────────────────────────────
  // 학업·자기계발 — 책
  academic: (
    <>
      <path d="M4 4.5h6a2.5 2.5 0 012.5 2.5v13H6a2 2 0 01-2-2V4.5z" />
      <path d="M20 4.5h-6a2.5 2.5 0 00-2.5 2.5v13H18a2 2 0 002-2V4.5z" />
      <path d="M7 9h3M7 12h3M14 9h3M14 12h3" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  // 스파클 — ✨ 별빛
  sparkle: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18 14l.7 1.8 1.8.7-1.8.7L18 19l-.7-1.8L15.5 16.5l1.8-.7z" />
      <path d="M5 16l.5 1.4L7 18l-1.5.6L5 20l-.5-1.4L3 18l1.5-.6z" opacity="0.6" />
    </>
  ),
  // 보석 — 💎 다이아몬드 (성격/가치)
  gem: (
    <>
      <path d="M5 9l3.5-4.5h7L19 9l-7 11.5L5 9z" strokeLinejoin="round" />
      <path d="M5 9h14M8.5 4.5L12 9l3.5-4.5M9 9l3 11.5L15 9" />
    </>
  ),
  // 발자국 — 🐾 띠/동물
  paw: (
    <>
      <ellipse cx="6.5" cy="9.5" rx="1.7" ry="2.3" />
      <ellipse cx="10.5" cy="6.5" rx="1.7" ry="2.3" />
      <ellipse cx="14.5" cy="6.5" rx="1.7" ry="2.3" />
      <ellipse cx="18.5" cy="9.5" rx="1.7" ry="2.3" />
      <path d="M8.5 14.5c0-2.2 1.6-3.5 4-3.5s4 1.3 4 3.5c0 3-2 5-4 5s-4-2-4-5z" />
    </>
  ),
  // DNA — 🧬 유전자/MBTI
  dna: (
    <>
      <path d="M7 3c4 3 6 6 6 9s2 6 6 9" />
      <path d="M17 3c-4 3-6 6-6 9s-2 6-6 9" />
      <path d="M9 6h6M9 18h6M10 9h4M10 15h4" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  // 위치 핀 — 📍 장소
  pin: (
    <>
      <path d="M12 3a7 7 0 017 7c0 5-7 11-7 11S5 15 5 10a7 7 0 017-7z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  // 시간/시계 — 일정/시기
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" />
    </>
  ),
  // 달력 — 생일/날짜 (깔끔한 캘린더)
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" strokeLinecap="round" />
    </>
  ),
  // 전구 — 조언/팁/아이디어 (💡 대체)
  lightbulb: (
    <>
      <path d="M12 3a6 6 0 00-3.6 10.8c.5.4.8 1 .9 1.6l.2 1h5l.2-1c.1-.6.4-1.2.9-1.6A6 6 0 0012 3z" />
      <path d="M9.5 19h5M10.5 21.5h3" strokeLinecap="round" />
    </>
  ),
  // 검색/돋보기
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </>
  ),
  // 그래프/통계
  chart: (
    <>
      <path d="M4 20V8M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
    </>
  ),
  // 사용자 — 마이/프로필
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.5 3.5-8 8-8s8 3.5 8 8" />
    </>
  ),
  // 홈
  home: (
    <>
      <path d="M3 11.5L12 3l9 8.5V20a1.5 1.5 0 01-1.5 1.5h-4v-7h-7v7h-4A1.5 1.5 0 013 20v-8.5z" strokeLinejoin="round" />
    </>
  ),
  // 히스토리 — 시계 + 화살표
  history: (
    <>
      <path d="M3 12a9 9 0 109-9c-2.5 0-4.7 1-6.4 2.6L3 8" />
      <path d="M3 4v4h4" strokeLinecap="round" />
      <path d="M12 8v4l3 2" strokeLinecap="round" />
    </>
  ),
  // 설정 — 톱니바퀴
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" />
    </>
  ),
  // 종/알림
  bell: (
    <>
      <path d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 004 0" strokeLinecap="round" />
    </>
  ),
  // 카메라
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 20H4a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 014 8z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  // 공유
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8 11l8-5M8 13l8 5" strokeLinecap="round" />
    </>
  ),
  // 잠금 — 보안/유료
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  // 행운 — 클로버
  clover: (
    <>
      <path d="M12 12c0-2 1-4 3-4s3 2 3 4-2 3-3 3-3-1-3-3z" />
      <path d="M12 12c0-2-1-4-3-4s-3 2-3 4 2 3 3 3 3-1 3-3z" />
      <path d="M12 12c-2 0-4 1-4 3s2 3 4 3 3-2 3-3-1-3-3-3z" />
      <path d="M12 12c2 0 4-1 4-3s-2-3-4-3-3 2-3 3 1 3 3 3z" />
    </>
  ),
  // 팔레트 — 행운의 색
  palette: (
    <>
      <path d="M12 3a9 9 0 100 18c.8 0 1.5-.4 1.5-1.2 0-.5-.3-.9-.6-1.2-.3-.3-.5-.7-.5-1.1 0-1 .9-1.5 2-1.5h2c2 0 3.6-1.6 3.6-4 0-4.5-3.6-9-8-9z" />
      <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="9" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // 해시 — 행운 숫자
  hash: (
    <>
      <path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16" strokeLinecap="round" />
    </>
  ),
  // 나침반 — 방위
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l2.5 7L7 16l5-9z" strokeLinejoin="round" />
    </>
  ),
  // 음식/그릇 — 행운의 음식
  food: (
    <>
      <path d="M4 11h16a8 8 0 01-8 8 8 8 0 01-8-8z" strokeLinejoin="round" />
      <path d="M3 11h18" strokeLinecap="round" />
      <path d="M9 7c0-1.5 1-2.5 1.5-3M13 7c0-1.5 1-2.5 1.5-3" strokeLinecap="round" opacity="0.6" />
    </>
  ),
  // 옷 — 추천 스타일
  shirt: (
    <>
      <path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3-2 2c-.6.6-1.4 1-2 1s-1.4-.4-2-1l-2-2z" strokeLinejoin="round" />
    </>
  ),
  // 선물 — 행운 아이템
  gift: (
    <>
      <rect x="3.5" y="9" width="17" height="11" rx="1.5" />
      <path d="M3.5 13h17" />
      <path d="M12 9v11" />
      <path d="M8.5 5c0-1 .7-2 1.7-2C12 3 12 7 12 7s0-4 1.8-4c1 0 1.7 1 1.7 2 0 2-1.5 4-3.5 4S8.5 7 8.5 5z" strokeLinejoin="round" />
    </>
  ),
  // 사람들 — 행운의 사람
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14 19c0-2.2 1.7-4 4-4s2.5.8 3 2" strokeLinecap="round" />
    </>
  ),
  // 입술 — 스킨십
  kiss: (
    <>
      <path d="M3.5 11c0-2 2-3 4-3 1.5 0 3 .8 4.5 2 1.5-1.2 3-2 4.5-2 2 0 4 1 4 3 0 1.5-1 2.5-2.5 3.5 1.5 1 2.5 2 2.5 3.5 0 2-2 3-4 3-1.5 0-3-.8-4.5-2-1.5 1.2-3 2-4.5 2-2 0-4-1-4-3 0-1.5 1-2.5 2.5-3.5C4.5 13.5 3.5 12.5 3.5 11z" />
      <path d="M3.5 11l4 3.5L11.5 11M20.5 11l-4 3.5L12.5 11" opacity="0.5" />
    </>
  ),
  // 결혼식 — 더 화려한 결혼/예식
  wedding: (
    <>
      <path d="M5 20h14" strokeLinecap="round" />
      <path d="M7 20l-1-8 4 2 2-7 2 7 4-2-1 8" strokeLinejoin="round" />
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
    </>
  ),
  // 컵/음료
  cup: (
    <>
      <path d="M5 7h12v8a4 4 0 01-4 4H9a4 4 0 01-4-4V7z" />
      <path d="M17 9h2a2 2 0 010 4h-2" />
      <path d="M9 3c0 1 1 1 1 2M12 3c0 1 1 1 1 2" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  // 비행기 — 여행/행운
  plane: (
    <>
      <path d="M10 4l-2 5L3 11l2 1 1 3 2-1 3 7 1-3 4-4 5 2-2-5-7-2-3-5z" strokeLinejoin="round" />
    </>
  ),
  // 책 — 학업/일지
  book: (
    <>
      <path d="M4 4.5h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4.5z" />
      <path d="M4 4.5a2 2 0 100 4h11" />
      <path d="M18 17H7a2 2 0 100 4h11" opacity="0.5" />
    </>
  ),
  // 마이크 — 활동/방송
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 12a7 7 0 0014 0M12 19v3M9 22h6" strokeLinecap="round" />
    </>
  ),
  // 채팅
  chat: (
    <>
      <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-9l-4 3v-3H6a2 2 0 01-2-2V6z" strokeLinejoin="round" />
      <circle cx="9" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  // 해 — 오늘의 운세
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" strokeLinecap="round" />
    </>
  ),
  // 점/별 기타
  spark: (
    <>
      <path d="M12 4v6M12 14v6M4 12h6M14 12h6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  // 에러 — 구름 빗금 (네트워크 끊김 / 실패)
  cloudOff: (
    <>
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M17 17H7a4 4 0 01-1.5-7.7" />
      <path d="M9 7.3A5 5 0 0117.6 9.5a4 4 0 012.4 6.5" />
    </>
  ),
  // 경고 — 느낌표 삼각형
  alert: (
    <>
      <path d="M12 3.5L21 19H3z" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // 새로고침 — 다시 시도
  refresh: (
    <>
      <path d="M3 12a9 9 0 0115.5-6.3L21 8" strokeLinecap="round" />
      <path d="M21 3v5h-5" strokeLinecap="round" />
      <path d="M21 12a9 9 0 01-15.5 6.3L3 16" strokeLinecap="round" />
      <path d="M3 21v-5h5" strokeLinecap="round" />
    </>
  ),
  // 빈 상자 — 데이터 없음
  inbox: (
    <>
      <path d="M3 13l3-8h12l3 8v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M3 13h5l1 3h6l1-3h5" />
    </>
  ),
  // 왼쪽 셰브론 — 뒤로가기
  chevronLeft: (
    <path d="M15 5l-7 7 7 7" />
  ),
  // 체크 — 긍정/완료/예 (✅✔ 대체)
  check: (
    <path d="M5 13l4 4 10-12" strokeLinecap="round" strokeLinejoin="round" />
  ),
  // 금지 — 부정/아니오/피할 것 (🛑⛔ 대체)
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" strokeLinecap="round" />
    </>
  ),
  // 깨진 하트 — 이별/헤어짐 (💔🚪 대체)
  heartBroken: (
    <>
      <path d="M12 20.3l-1.2-1.1C5.7 14.6 3 12 3 8.5 3 6 5 4 7.5 4c1.5 0 2.9.7 3.8 1.8l.7.8.7-.8C13.6 4.7 15 4 16.5 4 19 4 21 6 21 8.5c0 3.5-2.7 6.1-7.8 10.7L12 20.3z" />
      <path d="M12.5 5.5l-2 4 3 2.2-2 3.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
