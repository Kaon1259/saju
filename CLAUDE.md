[진행중] 타로 페이지 정제 — 2026-05-17
- Phase 3 — 설정 화면 단순화: 분야→카드수→확인 3단계 위저드를 한 페이지(setup-onepage)로 통합
  - 단계 점/뒤로 로직 제거, 섹션 라벨(①분야 ②카드수)로 한 화면. 시작 버튼 disabled(분야·카드수 미선택 시)
  - 펼치기 방식 이모지(🎴🃏🌙) → 텍스트(한 장씩/전체/부채꼴), 질문 토글 ✏️ 제거
  - 스프레드 num/desc 버그 수정(parseInt(s.id) NaN → s.count/s.desc 직접 사용)
- 가독성: 덱 이름 그라데이션텍스트 → 솔리드, 카테고리 화면 라이트 모드 텍스트 흰색(배경이 다크 카드이미지)
- 덱 화살표 축소·배경 별 절제·프레임 오버레이 제거

[진행중] 타로 페이지 정제 (Phase 1) — 2026-05-17
- 진단: 타로는 "디자인 시스템 섬" — MenuIcon 0개(이모지 사용), btn-primary 0개(버튼 7종 제각각), StreamingCard 0개, CSS 6292줄
- Phase 1-a 완료 — 버튼 통일: 7종 시각 스킨을 primary(보라+골드 그라데이션)/ghost(글래스+골드 테두리) 2종으로
- Phase 1-b 완료 — 이모지 → MenuIcon SVG: TAROT_MAIN_CATS·TAROT_MORE_CATS 카테고리 아이콘 15종(heart/search/
  crystalBall/money/work/health/wedding/heartArrow/letter/handshake/couple/clock/moon/sparkleHeart) + 렌더 3곳
  + 인라인(덱명 search·히스토리 history·코스트 heart). MenuIcon import. 장식 ✦/✧는 유지
  - 잔여(후속): 갤러리 속도(🐢▶⚡)·픽모드(🎴🃏🌙)·챕터 토글(▲▼) — MenuIcon 대응 없어 보류
- Phase 2 진행 — 결과 화면 정제: 제목 이모지 → MenuIcon SVG(🃏→tarot·📜→book·🌟→star·📤→share·🔄/↻→refresh),
  중복 "다시하기" 버튼 3개 → 2개로 정리(tarot-overall-retry 제거). 결과 화면은 이미 glass-card·FortuneCard 사용 중
  - 잔여: tarot-framed-card 액자 오버레이 절제 여부(의도된 타로 미감이라 보류), 6292줄 CSS 정리

[완료] 크레파스 데코 레이어 + 주간운세 days 토큰 잘림 수정 (2026-05-17)
- StoryDecor 컴포넌트 신규: data-homestyle="story" 일 때 전 페이지 모서리에 크레파스 손그림(달·별·구름·반짝임·꽃) 데코 표시. roughen 필터, App.jsx 전역 렌더(CSS로 노출 제어)
- 주간운세 days 미표시 진짜 원인: max_tokens=1600 — JSON 맨 끝 days 배열이 잘려 나감
  - WeeklyFortuneController(스트리밍)·WeeklyFortuneService(비스트리밍) 1600 → 4500
  - 이미 잘린 채 캐시된 결과 무효화: cacheKey "weekly" → "weekly-v2" (3개소)
  - 서버 변경 → Railway 재배포 필요. 재배포 후 주간운세 재생성 시 7일 카드 정상 표시

[완료] 주간운세 일별 재구성 + 동화 홈 다섯 빛 탭 연결 (2026-05-17)
- 주간운세: 7일치(days 배열)가 작은 가로 스크롤로만 보이던 것 → 월~일 풀폭 일별 카드(wf-dayrow)로 재구성
  - 각 일별 카드: 요일·날짜 + 점수 + 가로 점수바 + 키워드 + tip + advice + BEST/주의 뱃지
  - 주간 종합 카드(애정/재물/직장/조언)는 "이번 주 전체 흐름" 섹션 제목 달고 일별 아래로
  - 서버 변경 없음 — days 데이터는 이미 생성되고 있었음(WeeklyFortuneService). 클라 레이아웃만 재구성
- 동화 홈 "오늘의 다섯 빛": 클릭 안 되던 div → button, 탭 시 /my(오늘의 운세) 이동 + 안내 문구

[진행중] 홈 스타일 전역 스킨 — data-homestyle 글로벌 적용 (2026-05-17)
- 피드백: 선택한 홈 테마를 나머지 페이지(40여 개)에도 적용. 감성=그대로, 심플=기본, 동화=크레파스 곳곳
- 방식 확정: 글로벌 스킨(전 페이지 일괄) + 크레파스 데코 점진 적용
- 1단계 완료 — 글로벌 스킨 기반:
  - App.jsx useHomeStyleAttr: <html data-homestyle="classic|new|story"> 속성 노출(라우트 변경마다 동기화)
  - homestyle.css 신규: [data-homestyle="story"] 전 페이지 배경=파스텔 노을 + body::after 크레파스 그레인 오버레이 + 별필드 off + glass-card=종이 카드. classic/new는 기본 톤 유지(규칙 없음)
  - Settings selectHomeStyle: 선택 즉시 data-homestyle 반영
- 다음: 핵심 페이지(운세/타로/궁합 등)에 크레파스 일러스트 데코 점진 추가

[완료] 동화 홈 히어로 크레파스 손그림 일러스트 (2026-05-17)
- 피드백: 동화 홈 상단 그림이 밋밋함 → new.png처럼 크레파스로 그린 듯한 느낌 요청
- HeroArt — CSS div(언덕/달/나무) → 인라인 SVG 일러스트로 교체
  - feTurbulence + feDisplacementMap "roughen" 필터를 일러스트 그룹 전체에 적용 → 모든 윤곽선이 손그림처럼 울렁임
  - 풍경 구성: 노을 하늘 + 구름 2 + 언덕 3겹 + 둥근잎 나무 5그루(Tree) + 다섯잎 꽃 3송이(Flower) + 별 10 + 달(점수)
  - 나무=소프트 그린, 꽃=핑크, 달=크림 — 크레파스 풍 컬러. 윤곽선 stroke로 손그림 테두리
  - 점수 text는 roughen 그룹 밖 → 또렷하게 유지. 그레인 오버레이로 왁스 질감
- 로컬 개발용 .env.development VITE_API_URL 주석 처리(커밋 제외) — '/api' 상대경로 → vite proxy(localhost:8080) 경유로 CORS/502 해소

[완료] 홈 데이터 AI 실연동 + 설정 홈 선택 개선 (2026-05-17)
- 심플 홈(HomeNew)·동화 홈(HomeStory) 모두 시드 산출이던 항목들을 AI 분석값에 실연동
  - 레이더 5항목/다섯 빛: 서버가 이미 내려주던 loveScore/moneyScore/healthScore/workScore 사용
    (MyFortuneController — cachedFortune. aiAnalyzed 시). 인간관계/인연은 AI 항목 없음 → 연애·직장 평균
  - 오늘의 행운: luckyColor/luckyNumber 실연동. "행운의 장소"(시드) → "행운의 방향"(luckyDirection 실연동)
  - aiAnalyzed=false(오늘 분석 전)면 기존대로 시드 산출 폴백 — buildRadar/buildLights
- 출석 토스트 버그 수정: HomeNew/HomeStory 가 toast?.success?.(msg) 호출 → useToast는 (msg,type) 함수라
  실제로 안 뜨던 것을 toast?.(msg,'success') 로 수정
- Settings 홈 화면 스타일: /choose-home 이동 행 1개 → 3가지(감성/심플/동화) 인라인 선택기로 개선
  탭 즉시 적용 + 토스트, "큰 미리보기" 링크로 /choose-home 보존. 글자크기 피커와 동일 톤
- 서버/스키마 변경 없음 — 클라 전용. 앱 반영은 npm run build → npx cap sync 필요

[완료] 동화 홈 신설 + 거친 질감 전면 재작업 — 세 번째 홈 스타일 (2026-05-17)
- new.png(인스타 SNS 화면) 참고 요청 → 사용자 의도는 "파스텔 톤 + 거친 질감의 동화 일러스트 분위기"
- HomeStory.jsx/css 신규 — 감성 홈(Home)/심플 홈(HomeNew)에 이은 세 번째 홈. homeStyle='story'
- 1차(커밋 a9f4e36): 클린 카드형 → 사용자 피드백 "심플 홈과 너무 비슷, 동화 감성 부족" → 2차 전면 재작업:
  - 거친 그레인(SVG feTurbulence 노이즈) 텍스처 페이지 전체 + 장면에 mix-blend overlay
  - 삽화 히어로 = 노을 하늘 풍경(언덕 3겹 + 나무 실루엣 + 달=점수 + 별/구름) + 종이 쪽지(시적 한 줄)
  - 챕터를 4열 아이콘 그리드(심플 홈과 동일) → 2열 일러스트 패널(아이콘+제목+서브카피) + 장식 액자(이중 테두리+모서리 ✦)로 차별화
  - 손그림 느낌의 비대칭 border-radius, 매달린 별빛(다섯 빛, sway), 책갈피형 퀵(clip-path)
  - 점수: HomeNew와 동일 — saju.score(aiAnalyzed) 우선, 없으면 시드 결정적 산출(hashFloat). 다섯 빛=5항목 별점
- App.jsx HomeRouter: homeStyle 'new'→HomeNew / 'story'→HomeStory / 그 외→Home 3분기
- ChooseHome: 동화 홈 옵션 카드 + PreviewStory(노을 삽화 미리보기), 안내문 "두 가지"→"세 가지"
- Settings: 홈 화면 스타일 값 표기에 '동화 홈' 추가
- 라이트=피치~핑크~라벤더 노을 / 다크=트와일라잇 퍼플. 스키마/서버 변경 없음 — 클라 전용
- 앱 반영은 npm run build → npx cap sync 필요. new.png/gpt추천.png(참고 스크린샷)은 커밋 제외

[완료] 심플 홈 신설 — gpt추천 시안 기반 클린 홈 + 홈 스타일 선택 화면 (2026-05-16)
- 기존 감성 홈(Home.jsx)은 그대로 보존, 심플 홈(HomeNew.jsx/css) 신규 — 두 홈 중 택1 구조
- HomeNew 구성: 인사말 + 히어로(오늘의 총 운세 점수 + 오각형 레이더 차트) + 오늘의 행운 띠 + 퀵액션 패널(4) + 출석카드 + 섹션 3개(연애/시즌/정통)
  - 레이더 5항목(연애/재물/인간관계/건강/직장): 유저ID+날짜 시드 결정적 산출(hashFloat). 총운은 실제 saju.score(aiAnalyzed) 있으면 사용, 없으면 시드값
  - 섹션 카드: 흰 박스 제거 → 4열 아이콘 타일+타이틀 2줄(가운데 정렬). 퀵액션은 1개 패널에 타일 4개로 묶음
- ChooseHome.jsx/css 신규 — /choose-home 선택 화면(감성 홈/심플 홈 미리보기 2카드, 현재 스타일 프리셀렉트)
- App.jsx: / 가 localStorage.homeStyle('classic'|'new')에 따라 Home/HomeNew 분기(HomeRouter), /choose-home 라우트, useHomeStyleRedirect(미선택자 1회 유도 — 첫방문 비로그인은 /welcome 먼저 양보), safePaths에 /choose-home 등록
- Settings: 화면 섹션에 "홈 화면 스타일" 행 추가 → 탭 시 /choose-home 이동(재선택 동선)
- 라이트 모드 개선: HomeNew 페이지에 따뜻한 연그레이 배경(#f1edf0) → 흰 카드 부각(흰 배경+흰 카드=허전 해소), 히어로 코랄 그라데이션. 다크 모드는 변경 없음. data-theme는 main.jsx에서 항상 설정(기본 dark)
- 스키마/서버 변경 없음 — 클라 전용. 앱 반영은 npm run build → npx cap sync 필요
- 후속 미결정: 레이더 5항목 점수 AI 실연동(현재 결정적 산출값), 퀵/섹션 타일 vs AttendanceCard 톤 통일

[완료] 출시 준비 8차 — 무료 하트 적립 균형 조정 (2026-05-16)
- 미결정 3종 중 #3(무료 적립 과다) 처리. 방향=균형 조정(적립 절반 수준) + PROFILE_COMPLETE 실연동
- 적립 하향: SIGNUP_BONUS 70→40 / DAILY_ATTENDANCE 5→3 / 마일스톤 ATTENDANCE_7·14·30DAY 20·50·100→15·30·60
  - HeartPointConfigInitializer(init cost) + AttendanceService(BASE_REWARD/BONUS_7·14·30DAY 상수) + HeartPointService(DEFAULT_SIGNUP_BONUS 폴백) 3중 동기화
  - 적극 사용자 월 누적 약 430→270하트로 무한 적립 억제
- PROFILE_COMPLETE(30) 실연동: 죽은 config였던 것을 UserService.updateUser 에 연결 — 생년월일+성별 처음 채워지면 1회 +30
  - User.profileBonusClaimed(Boolean) 플래그 신규로 재지급 차단. 진성 유저 40+30=70(이전과 동일) / 봇·일회용 계정 40만 → 적립총량↓ + 실사용자 무손해
- 클라 표기 동기화: Attendance.jsx(MILESTONES·CTA·보상안내), AttendanceCard.jsx(fallback), Landing.jsx(가입 슬라이드 +3/+15, "70하트 즉시"→"가입+프로필 70하트")
- 스키마: User.profileBonusClaimed 컬럼만 ddl-auto:update 자동 추가. 기존 row NULL=미지급 처리되어 안전(백필 불필요)
- 서버=Railway 재배포 시 config 자동 업데이트 / 앱=npx cap sync 후 재빌드 필요
- 미결정 잔여 2종: ① AdMob 실연동(adMob.js Phase 0) ② IAP 유료 충전 경로 부재

[완료] 출시 준비 7차 — 하트 운영툴 점검 + 게스트 자동정리 + 초대 상한 (2026-05-15, 커밋 e780025)
- 하트 차감 전략 점검: 모든 AI 컨트롤러 basic→checkPoints(확인만)→캐시히트 무료→onComplete deductPoints 패턴 일관 확인
- 운영툴(management) 하트 관리 화면: getConfigsByPage defs 에 신규 키 12개 페이지 배치(DAILY_TAROT→타로, WEATHER_COMPAT→날씨궁합 신설, 시스템 보너스 4섹션 — 가입·프로필/출석/초대/평점). "미분류" 누락 해소
- 운영툴 getAiModelMap 보강: DAILY_TAROT·WEATHER_COMPAT→Haiku, 시스템 보너스 9종→"-" ("미매핑" 배지 해소)
- 운영툴 NPE 수정: adjustHeartPoints/bulkGrantHearts 가 heartPoints null 유저에서 터지던 문제 → null-safe
- 운영툴 게스트 제외: 유저 목록·검색·대시보드 통계에서 guest_* 필터, guestUsers 수 별도 표시
- 게스트 자동정리: GuestCleanupScheduler 신설(매일 04시, 생성 14일 경과 게스트 계정+하트로그 일괄 삭제), ServerApplication @EnableScheduling
- 초대 어뷰징 방어: ReferralService 초대자 보너스 1인당 최대 20명 상한(MAX_INVITER_REWARDS), 초과분은 피초대자만 지급(inviterCapped 플래그)
- 스키마 변경 없음 → DB 마이그레이션 불필요. 서버=Railway 자동 재배포 / 운영툴=별도 호스팅 재배포 필요
- 출시 전 미결정 3종(비즈니스 판단 대기): ① AdMob 실연동(현재 adMob.js Phase 0 시뮬레이션) ② IAP 유료 충전 경로 부재 ③ 무료 적립 과다(신규 즉시 150하트+출석 매일+5)

[완료] 출시 준비 6차 — 라이트 v3 Jeomsin 톤 + Hero 통합 + 게스트 모달 + 하트 v2 + 출석 시스템 (2026-05-10, 커밋 017500f~c2583d5)
- 라이트 모드 v3: 핑크 펄 → 따뜻한 아이보리(#fdfcfa), 메인 #ff5a7e 코랄 로즈, soft shadow, 시간대 6단계 명확화, 카테고리 시그니처 컬러 7종
- 홈 카드 톤다운: home-love-banner 라이트 풀컬러 → 화이트+좌측 컬러박스, 시즌·종합·연애·추천 모두 outline SVG 통일
- MenuIcon 13종 추가: couple/heart/sparkleHeart/target/heartArrow/letter/crystalBall/star/ring/phone/moon/handshake/attendance
- Hero 통합: 별도 운세요약 카드 제거 → 연애 온도 미니 카드 + 총운 요약 카드(텍스트+점수). 비로그인/데이터없음 가드. CTA 버튼 제거
- 게스트 무료 운세: GuestFortuneModal 풀스크린 모달(폼→광고→Progressive 카드 스트리밍→결과). RewardedAdModal+adMob.js Phase 0 시뮬레이션. 홈 인라인 폼/결과 영역 제거
- 하트 가격 재조정: 가입 500→70 / 심화 일반 15→30 / 심화 프리미엄 200→80 / 타로 100→50 등 (1하트≈5원 기준 마진 70%+)
- 출석 시스템: DailyAttendance 엔티티 + AttendanceController(status/checkin/history) + AttendanceCard(홈) + /attendance 페이지(30일 캘린더+마일스톤). +5/20/50/100 4단계 보너스
- 핫픽스: HeartPointService multi-catch 컴파일 에러(직전 6개 push 모두 빌드 실패의 진짜 원인) + DailyAttendance @Index DESC 제거 + 서버/클라 graceful try-catch
- dev 환경: client/.env.development VITE_API_URL을 Railway 백엔드로 (로컬 백엔드 토글 코멘트)

[완료] Claude API 비용 최적화 Phase 1 (2026-04-18)
- 심화분석 UI 완전 차단: DeepAnalysis.jsx에 DEEP_ANALYSIS_HIDDEN 플래그 → 버튼/자동호출 모두 차단 (캐시 결과는 계속 노출)
- 오늘의 운세(내 운세 탭) 자동 호출 제거 → 수동 버튼 ("오늘의 운세 보기" 클릭 시만 AI 호출)
- 스트리밍 캐시 anchor 전수 수정 (핵심 버그: SpecialFortune.fortuneDate = LocalDate.now()로 저장되어 매일 미스)
  - 주기 anchor: 토정비결/신년운세(연도1월1일), 월간운세(월1일), 주간운세(주 월요일)
  - 영속 anchor: 사주궁합/꿈해몽/심리테스트/1:1연애등/타로 (LocalDate.of(2000,1,1) 고정)
  - 캐시 키 보강: 토정비결에 gender/targetType/targetName 추가
  - 일간 anchor 유지: 혈액형/별자리/MBTI/띠/바이오리듬/관상/사주 오늘운세 (매일 바뀌는 설계)

[완료] 라이트 모드 전면 가독성 개선 - 흰색 배경 기반, glass-card 불투명도 88%, 텍스트 대비 강화, 시간대별 배경 흰색 기반

[완료] AI 엔진 Haiku → Sonnet 4.6 변경 (model: claude-sonnet-4-6)

[완료] AI 톤 전면 개선 - "~거든!, ~인 거야" 패턴 강제 → "카페에서 친구한테 수다 떨듯이 자연스러운 대화체" 로 13개 서비스 전체 변경

[완료] 사주 궁합 AI 프롬프트 개선 - "사람1/사람2" → "남자/여자" 자연스러운 호칭, 성별 파라미터 서버 전달

[완료] 전체 AI 분석 SSE 스트리밍 적용 (14개 페이지)
- 적용 완료: 1:1연애운, 사주궁합, 홈 연애모달, 오늘의 운세, 타로, 별자리, 혈액형, MBTI, 꿈해몽, 심리테스트, 관상분석, 신년운세, 월간운세, 주간운세, 토정비결
- 패턴: basic(캐시체크) → 캐시 있으면 즉시 반환 / 없으면 스트리밍 → 서버 onComplete 콜백으로 자동 캐시 저장
- StreamText 공용 컴포넌트: 자동 스크롤 + 커서 깜빡임, 전 페이지 통일 적용
- JSON 노출 방지: cleanAiText 유틸, 서버/클라이언트 이중 필터링

[완료] 1:1연애 페이지 개선
- 버튼명 "연애운" → "1:1연애" 변경
- 연애상태 칩 UI 심플화 (desc 제거, 아이콘+라벨만)
- 하트/점수 크기 최적화 (78px/32px), fontsize 제한 제외 (!important)
- 라이트모드 점수 가독성 (#c2185b)
- 궁합이 맞는 연예인 TOP5 기능 (배치 스코어 API + 팝업 상세 궁합)

[완료] 홈 화면 UX 전면 개선
- Hero + 연애온도 통합 (임팩트 있는 히어로)
- 비로그인 CTA 상단 이동
- 핵심 동선 3개 (1:1연애운/사주궁합/스타궁합) 큰 카드로 최상단 배치
- 2026 신년운세 배너 추가 (핵심동선 바로 아래, 골드+레드 그라데이션)
- 연애 카테고리 축소 (인기 6개 + 더보기 토글)
- 바로가기 + 빠른메뉴 → 9개 3열 통합 그리드
- 연애 모달: 하단 바텀시트 → 상단 팝업으로 변경, 스트리밍 적용
- 원본 백업: Home.jsx.backup, Home.css.backup

[완료] 스타와 나의 궁합 페이지 개선
- "홈으로" 버튼 제거, 히어로 컴팩트화
- 카테고리 2줄 횡스크롤 (grid + overflow-x)
- 리스트 flex:1로 화면 꽉 채우기 (max-height 제거)
- 라이트모드 가독성 강화 (아이템 #fff 배경 + box-shadow, 카테고리/검색창 border 강화)
- 직접입력 라이트모드 스타일 추가

[완료] 사주 궁합 결과 공유 버튼 정리 - 상단 제거, 하단만 유지

[완료] 오늘의 운세 (MyFortune) 3탭 구조 + 스트리밍 캐시 수정
- 3탭: 내 운세 / 연인 운세 / 다른 사람
- 연인 운세: 프로필 연인정보 자동 입력 → 스트리밍 분석
- 다른 사람 운세: 수동 입력 폼 → 스트리밍 분석 (analyzeSajuStream 신규)
- 다른 사람 운세 결과 순서: 총운 먼저 → 성격분석 나중으로 변경
- 결과 하단에 공유하기 + 다시보기 버튼 추가
- 서버: ClaudeApiService onComplete 콜백을 emitter 전에 실행 (캐시 누락 방지)
- 서버: /api/saju/analyze/stream 스트리밍 엔드포인트 신규
- 서버: SajuService 캐시 조회/저장 메서드 추가

[완료] 신년운세 (YearFortune) 3탭 구조 + 전면 재작성
- 3탭: 내 운세 / 연인 운세 / 다른 사람
- 내 운세: 프로필 정보 자동 표시 → 스트리밍 분석
- 연인 운세: 연인 정보 자동 표시 → 스트리밍 분석
- 다른 사람: 수동 입력 폼 → 스트리밍 분석
- 모든 탭에 공유하기 + 다시보기 하단 배치
- renderResult/renderLoading 공통 함수로 중복 제거

[완료] 오늘의 운세 내일/지정일 운세 기능
- 모드탭 아래에 "내일의 운세 보기" + "날짜 지정 운세 보기" 버튼
- 서버: stream 엔드포인트에 date 파라미터 추가, 날짜별 캐시
- 내일/지정일 선택 시 해당 날짜의 천기(天氣) 기반 AI 분석
- 심화분석도 날짜별 분리 (extra 파라미터로 날짜 전달)

[완료] 연애상태별 맞춤 운세 프롬프트
- 솔로/썸/연애중/기혼/복잡 상태에 따라 AI 해석 방향 조정
- 프로필 편집에 기혼(MARRIED) 옵션 추가

[완료] 심화분석 캐시 저장 + 스트리밍 자동스크롤
- DeepAnalysisController: onComplete 콜백 추가 (기존 누락)
- StreamText 컴포넌트 적용, parseAiJson 유틸 적용
- 섹션 간 빈공간 축소

[완료] 스타 궁합/그룹 운세 스트리밍 적용
- CelebCompatibility.jsx: 스타 운세 보기에 analyzeSajuStream 스트리밍 + StreamText 적용
- CelebCompatibility.jsx: starFortune 필드 접근 수정 (todayFortune 중첩 처리)
- GroupFortune.jsx: 그룹 운세 보기에 analyzeSajuStream 스트리밍 + StreamText 적용

[완료] AI 응답 JSON 파싱 전면 수정 (10개 페이지)
- parseAiJson 공통 유틸 신규 (client/src/utils/parseAiJson.js)
- 마크다운 코드블록(```) 자동 제거 + 잘린 JSON 괄호 복구
- 적용: 신년운세, 월별운세, 주간운세, 토정비결, 혈액형, 별자리, 꿈해몽, 관상, MBTI, 심리테스트
- 원인: AI가 ```json 코드블록으로 감싸서 응답 → 기존 regex 파싱 실패 → 결과 화면 안 나옴

[완료] 주간운세 0점 버그 수정 - 서버는 overallScore 키 / 클라이언트는 score로 접근 → (overallScore ?? score) 매핑

[완료] 페이지 전환 인트로 크기 수정
- fontsize 스케일링이 trans-symbol을 15px로 강제 축소하던 버그 수정
- trans-symbol 100px + drop-shadow 글로우 적용
- FortuneLoading 오브/아이콘 크기 확대 (100px/48px)

[완료] 그룹운세 멤버 선택 시 운세 대상 변경
- 멤버 선택 시 운세 타이틀/버튼/분석 대상이 해당 멤버로 변경
- 멤버 전환 시 운세+궁합 결과 자동 리셋

[완료] 홈 임팩트 개선 (saju3)
- Hero에 로그인 사용자 오늘 운세 점수+한줄 미리보기 추가 (클릭→운세 페이지)
- 운세 미리보기: 카드+버튼 연결 렉트앵글 디자인 (골드 그라데이션 버튼)
- 핵심 동선 카드 아이콘/라벨 확대 (36px/15px), 설명 텍스트 제거
- 스타궁합 → 최애스타궁합 명칭 변경
- 빠른메뉴 제거 (바로가기와 중복)
- 신년운세 배너 바로가기 위로 이동
- 바로가기~빠른메뉴 간격 축소
- Hero 하트/온도 축소 (36px/22px), "님의 사랑운" 제거
- 라이트모드 운세 미리보기 강조 (점수 #d4380d, 텍스트 굵게)
- 백업: Home.jsx.saju3, Home.css.saju3

[완료] 사주궁합 UX 개선
- 인트로 컴팩트화 (애니메이션 장면 → 💕 아이콘+타이틀 한 줄)
- 태어난 시간 접기/펼치기 (기본 숨김, 토글 버튼)
- 결과 카드 더보기 (핵심 3개 기본, 나머지 접기)
- 폼 컨트롤 전체 컴팩트화 (패딩/간격/폰트 축소)
- 내 정보로 채우기 버튼 폼 최상단 이동
- 비로그인 시 카카오 로그인 CTA 버튼 추가
- 백업: Compatibility.jsx.backup, Compatibility.css.backup

[완료] 1:1연애운 개선
- 연애상태 5개 (솔로/썸/연애중/기혼/복잡) - 캡슐형 칩 가로 배치
- 비로그인 시 카카오 로그인 CTA 버튼 추가
- 폼 전체 컴팩트화

[완료] 메뉴 명칭 정리
- 커플운세 → 데이트운
- 스타궁합 → 최애스타궁합
- 인기 카테고리: 이상형→짝사랑→소개팅→데이트운→고백운→썸진단

[완료] 이상형 분석 전면 개선
- 전용 JSON 템플릿 (기존 공통 템플릿에서 분리)
- 전용 결과 UI: 점수/하트 제거 → 👩‍❤️‍👨 나의 이상형 분석 타이틀
- 7개 카드: 외모/분위기, 성격/가치관, 띠 TOP3, MBTI 추천, 연예인 3명, 만남 장소, 만날 시기
- 상대방 정보 입력 숨김, 토큰 2500으로 증가
- 인기 카테고리 첫번째로 배치

[완료] StreamText 애니메이션 개선
- 헤더 가운데 정렬 (아이콘 32px + 라벨 + 점 3개 로딩)
- 라벨 텍스트 그라데이션 색상 시프트 (골드→핑크→퍼플→블루→그린)

[완료] 연예인 DB 확대 (473명 → 498명)
- 트로트 15명: 박현빈, 류지광, 김수찬, 박서진, 신유, 안성훈, 장윤정, 주현미, 김용임, 강혜연, 요요미, 별사랑, 두리 등
- 배우 10명: 전종서, 채원빈, 노윤서, 안효섭, 추영우, 이재욱, 공유, 이준호, 최현욱 등

[완료] 다른사람 운세에 스타 정보로 채우기 버튼 추가

[완료] 연인/다른사람 운세에 심화분석 추가 + 공유/다시보기 정렬

[완료] 심화분석 캐시 히트 수정 - SSE cached 이벤트 Thread 처리

[완료] extractJson 코드블록 파싱 강화 (줄바꿈 없는 패턴 처리)

[완료] 홈 인트로 하트 분홍색 적용

[완료] 만세력/바이오리듬 애니메이션 강화
- 만세력: 기둥 카드 순차 등장(translateY+scale), 시진 카드 스케일인, 해석 슬라이드인
- 바이오리듬: 게이지 바운스(scale+translateY), 링 드로우 페이드인 강화

[모바일 앱] Capacitor 기반 Android 하이브리드 앱
- 방식: WebView로 React 웹앱을 네이티브 앱으로 래핑
- 프레임워크: Capacitor 8.3 (@capacitor/android, @capacitor/core, @capacitor/cli)
- 패키지명: com.love.onetoone / 앱이름: 1:1연애
- 경로: client/android/ (Android Studio 프로젝트)
- 설정: client/capacitor.config.json
- 빌드 흐름: npm run build → npx cap sync → Android Studio에서 APK/AAB 빌드
- Gradle JDK: Java 21 필요 (Android Studio 번들 JBR 사용, gradle.properties에 설정됨)
- webDir: "dist" (Vite 빌드 출력)

[모바일 앱] 연결 구조
- 프론트엔드(React): 앱 안에 내장됨 (dist → android/app/src/main/assets/public)
  - npm run build + npx cap sync 으로 업데이트
  - WebView origin: https://localhost (Capacitor androidScheme: "https")
- 백엔드(Spring): Railway 클라우드에서 실행 (별도 배포 필요)
  - API URL: https://saju-production-ac3c.up.railway.app/api
  - 서버 코드 수정 시 Railway 재배포 필요 (로컬 수정만으로는 반영 안 됨)
- 앱 안의 React가 API 호출 시 Railway 원격 서버로 요청

[모바일 앱] 카카오 로그인 OAuth 흐름 (완료)
- 문제1: WebView에서 외부 URL 이동 시 시스템 브라우저(Chrome) 열림 → 구글 로그인 화면
- 문제2: allowNavigation으로 WebView 안에서 카카오 로그인 후, https://localhost로 redirect 시 ERR_CONNECTION_REFUSED
- 해결 방향: allowNavigation + 서버 경유 딥링크 조합
  1) WebView에서 카카오 로그인 (allowNavigation: kauth.kakao.com, accounts.kakao.com, Railway서버)
  2) 카카오 인증 완료 → 서버 /api/auth/kakao/app-callback 으로 redirect (WebView 안에서)
  3) 서버가 com.love.onetoone://auth/kakao/callback?code=xxx 커스텀 스킴으로 redirect
  4) Android intent-filter가 커스텀 스킴 감지 → MainActivity.onNewIntent 호출
  5) MainActivity가 code 추출 → getBridge().getWebView().loadUrl()로 WebView에 콜백 URL 로드
  6) React Router가 /auth/kakao/callback 매칭 → code로 로그인 API 호출
- 수정된 파일:
  - client/capacitor.config.json: allowNavigation 추가 (kakao + Railway 서버)
  - client/android/app/src/main/AndroidManifest.xml: 커스텀 스킴 intent-filter 추가
  - client/android/app/src/main/java/.../MainActivity.java: 딥링크 핸들러 추가
  - client/src/pages/Register.jsx: Capacitor 감지 → 앱용 redirect URI 분기
  - client/src/api/fortune.js: kakaoLogin에 redirectUri 파라미터 추가
  - server/.../KakaoAuthController.java: GET /app-callback 엔드포인트 추가
  - server/.../KakaoAuthService.java: getAccessToken에 clientRedirectUri 파라미터 추가

[완료-모바일] 카카오 로그인 (2026-04-06)
- 서버 Railway 재배포 완료 (app-callback 엔드포인트 + CORS https://localhost 허용)
- 카카오 개발자 콘솔 redirect URI 등록 완료
- 앱에서 카카오 로그인 테스트 성공

[완료]client_web GIF 전면 제거 → 정적 커버 JPG + CSS 애니메이션 대체
- Tarot.jsx: DECK_LIST img→cover JPG, gifs/TAROT_INTRO_GIFS/DECK_INTROS/BgGif 제거
- TarotIntro: GIF→커버 JPG + Ken Burns CSS
- 덱 선택: GIF 크로스페이드→정적 이미지 + shimmer/breathe CSS
- 톤 화면: GIF→커버 JPG + Ken Burns CSS
- Setup/Shuffle/Pick/Reveal/Result: GIF 변수 제거 (기존 정적 이미지 유지)
- GIF 파일 7개(~100MB) 삭제, boy_cover.jpg 신규 생성
- Tarot.css: GIF 관련 클래스 제거, CSS 애니메이션 추가
[완료]client_app은 현재 GIF 버전 그대로 유지 (GIF 7개 보존)

═══════════════════════════════════════════════════════════════
[규칙] 타로 덱 추가 파이프라인 (Deck Creation Guide)
═══════════════════════════════════════════════════════════════

## 📦 1. 입력 폴더 구조
- 원본 폴더: `saju/{한글이름}/` 또는 `saju/{영문id}/` (예: `kdrama/`, `스텔라/`, `lady/`)
- 미드저니 파일명 패턴: `u{user_id}_{prompt_prefix}_{uuid}_{variant}.png`
- 각 UUID는 4변형 (_0, _1, _2, _3), 일부는 GIF 변형 (_1.gif 등)
- 필요 파일 유형:
  - **앞면 (fronts)**: 카드 프롬프트 시작 prefix로 구분 (예: `cinematic_still`, `celestial_cosmic`, `vintage_tarot_card`)
  - **뒷면 (backs)**: `ornate_tarot_card_back` 프롬프트
  - **커버 (cover)**: `cinematic_key_art` 또는 `hyperrealistic_cinematic_key_art` 프롬프트. **⚠️ 반드시 프레임 있는 카드 스타일로 생성** (레이디 덱 사고: 프레임 없는 key_art로 생성해서 재작업 필요했음)
  - **인트로 GIF (선택)**: 같은 prefix의 GIF 1개. 없으면 기존 덱 webp 재사용 가능

## ⚙️ 2. 변환 스크립트 (convert_{deckid}.py)
- 기준 파일: `convert_masterpiece.py` / `convert_kdrama.py` / `convert_celestial.py` / `convert_lady.py`
- 새 덱 추가 시 해당 스크립트 복사 → 상수 4개만 교체:
  - `SRC = BASE / "{원본폴더명}"`
  - `DST_FRONT = BASE / "client/public/tarot-{deckid}"`
  - `DECK_ID = "{deckid}"`
  - `classify()` 안의 prompt prefix 매칭 문자열 3개 (fronts/backs/covers)

### 공통 스펙
- **카드 사이즈**: 261×500 (2:3 비율), JPEG
- **앞면 Quality**: 85
- **뒷면 Quality**: 88 (뒷면이 항상 보이므로 약간 고화질)
- **커버 width**: 600 (원본 896~1024 폭에서 리사이즈), Quality 88~90
- **WebP 변환**: quality 75, method 6, 애니메이션 유지 (`save_all=True, append_images=frames[1:]`)

### 분류 로직 핵심
```python
# mtime 기준 정렬 + complete-first 우선순위 (4변형 모두 있는 UUID 먼저)
sorted_uuids = sorted(fronts.keys(), key=lambda u: mtime(fronts[u]))
complete = [u for u in sorted_uuids if len(fronts[u]) == 4]
partial = [u for u in sorted_uuids if len(fronts[u]) < 4]
prioritized = (complete + partial)[:78]
```
- 사용자는 대개 프롬프트 파일 순서대로 생성 → mtime 순서 ≈ 프롬프트 순서
- 4변형 완전한 UUID 우선 → 빠진 변형 때문에 카드 번호 밀림 방지
- 상위 78개만 m00~m77로 매핑. 초과분(79+개)은 버림

## 📁 3. 출력 경로
- 앞면: `client/public/tarot-{deckid}/m{NN}_v{0-3}.jpg` (312장 = 78×4)
- 뒷면: `client/public/tarot-backs/{deckid}_{N}.jpg` (보통 12~16장)
- 커버: `client/public/tarot-effects/deck-intro/{deckid}_cover.jpg` (600 width)
- 인트로 WebP: `client/public/tarot-effects/deck-intro/{deckid}_0.webp`

## 📝 4. 코드 등록 (5개소)

### A. `client/src/pages/Tarot.jsx` DECK_LIST (line ~169)
```js
{ id: '{deckid}', name: '{한글명}', sub: '{English sub}',
  img: '/tarot-effects/deck-intro/{deckid}_cover.jpg',
  gif: '/tarot-effects/deck-intro/{deckid}_0.webp',
  backs: Array.from({length: N}, (_, i) => `/tarot-backs/{deckid}_${i}.jpg`),
  hasVariants: true },
```

### B. `Tarot.jsx` bgPaths (2개소, line ~657, ~1503)
`cartoon_boy: '/tarot-cartoon-boy', ..., {deckid}: '/tarot-{deckid}' }`

### C. `Tarot.jsx` 갤러리 isMulti (line ~1133)
`['newclassic', ..., '{deckid}'].includes(galleryDeck.id)`

### D. `Tarot.jsx` 갤러리 deckPaths (line ~1134)
`{deckid}: '/tarot-{deckid}'`

### E. `client/src/components/TarotCardArt.jsx` (line ~30, 47)
- `DECK_PATHS`에 `{deckid}: '/tarot-{deckid}'` 추가
- `MULTI_VARIANT_DECKS` Set에 `'{deckid}'` 추가

## 🗂️ 5. 원본 이동 (필수 마감 작업)
```bash
mv saju/{원본폴더} saju/_origin/{영문id}
```
- `_origin/`은 `.gitignore`에 등록되어 있어 Git 추적 안 됨
- 한글 폴더명은 영문으로 변경해 이동 (예: `스텔라/` → `_origin/stellar/`)

## ⚠️ 6. 미드저니 프롬프트 작성 규칙
- **URL 끝 `&` 절대 금지**: 디스코드 attachment URL 복사 시 자동 추가되는 `&`는 미드저니가 인자 구분자로 오인 → `Invalid parameter` 에러. 반드시 삭제.
- **URL 중간 공백 금지**: 복사 후 확인 필수 (이전 반복 사고 있음)
- **프레임 강조 문법**: 프레임 없이 나오는 문제 방지
  - "vintage tarot card design with thick ornate rose gold decorative frame border surrounding central illustration" 같이 **prefix 맨 앞**에 배치
  - "full view of tarot card showing all four frame edges" 문구 추가
  - "clear visible gold filigree edge on top bottom left right" 명시
- **--cref 고정값**: `--cw 60` 권장 (80+ 얼굴만 복제되어 장면 다양성 부족, 40- 얼굴 변함)
- **--style raw 유지**: artistic 모드는 프레임 무시 경향

## 🎨 7. 커버 이미지 품질 기준
- **반드시 프레임 있어야 함** (다른 덱들과 일관성 — 레이디 덱 재작업 사례 주의)
- key_art 프롬프트도 프레임 명시 필요. 프레임 없이 생성됐으면 카드 중 하나를 원본 PNG에서 600폭으로 리사이즈해 커버로 사용
- 커버는 카드 한 장 영웅샷 또는 "fanned spread + 제목" 레이아웃 둘 다 허용

## ✅ 8. 완료 체크리스트
- [ ] `convert_{deckid}.py` 실행 성공 (`fronts=78 backs=N cover=1` 확인)
- [ ] `client/public/tarot-{deckid}/` 에 312개 파일
- [ ] `tarot-backs/{deckid}_*.jpg` 존재
- [ ] `deck-intro/{deckid}_cover.jpg` + `{deckid}_0.webp` 존재
- [ ] 커버에 프레임 보임 (다른 덱과 일관성)
- [ ] DECK_LIST + bgPaths 2개소 + 갤러리 isMulti/deckPaths + TarotCardArt 2개소 등록
- [ ] `npm run build` 성공
- [ ] 원본 → `_origin/` 이동
- [ ] 커밋 + Railway 푸시 (서버 수정 없으면 Railway 재배포 불필요)