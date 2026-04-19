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