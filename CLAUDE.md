# 1:1연애 - 연애운세 특화 앱

## 프로젝트 구조
```
saju/
├── client/          # React 18 + Vite (포트 3000)
│   ├── src/
│   │   ├── api/fortune.js      # 모든 API 호출 (axios)
│   │   ├── components/         # 공용 컴포넌트
│   │   ├── pages/              # 페이지 컴포넌트
│   │   └── utils/              # sounds.js, share.js
│   ├── .env                    # 로컬 개발용 (VITE_KAKAO_*)
│   └── .env.production         # 프로덕션 빌드용
├── server/          # Spring Boot 3.2 + Gradle (포트 8080, Java 17)
│   └── src/main/java/com/saju/server/
│       ├── controller/         # REST 컨트롤러
│       ├── service/            # 비즈니스 로직 + AI 호출
│       ├── entity/             # JPA 엔티티
│       ├── repository/         # Spring Data JPA
│       ├── dto/                # 요청/응답 DTO
│       └── config/             # WebConfig (CORS)
└── CLAUDE.md
```

## 기술 스택
- **Frontend**: React 18, Vite, Capacitor (모바일)
- **Backend**: Spring Boot 3.2, Gradle, Java 17
- **DB**: MySQL (localhost:3306/saju_db)
- **AI**: Claude Haiku (claude-haiku-4-5-20251001) via Anthropic API
- **인증**: 카카오 OAuth 로그인
- **배포**: Railway (GitHub push → 자동 배포)

## 로컬 개발
```bash
# 서버 시작
cd server && ./gradlew bootRun

# 클라이언트 시작
cd client && npm run dev
```
- Vite 프록시: localhost:3000/api → localhost:8080/api

## 핵심 서비스
- `ClaudeApiService.java` — AI API 호출 (일반 + SSE 스트리밍)
- `DeepAnalysisService.java` — 심화분석 (캐싱 + 프롬프트 빌드)
- `KakaoAuthService.java` — 카카오 OAuth 토큰교환/사용자정보
- `FortunePromptBuilder.java` — 운세 프롬프트 생성

## 카카오 로그인
- REST API 키: application.yml의 kakao.rest-api-key
- **Client Secret 활성화됨** — 토큰 교환 시 client_secret 필수
- 흐름: 카카오 인가코드 → 서버 토큰교환 → 회원 자동생성 → 프로필 미완성시 입력폼

## AI 분석 흐름
1. 클라이언트 요청 → Controller
2. DB 캐시 확인 (SpecialFortuneRepository)
3. 캐시 없으면 → ClaudeApiService.generate() 또는 generateStream()
4. JSON 파싱 → 응답 반환 + DB 캐시 저장
- 스트리밍: /deep/fortune/stream (SSE) → EventSource로 수신

## 글자 크기 설정
- `data-fontsize` 속성 (small/normal/large/xlarge)
- `--fs-scale` CSS 변수로 calc() 기반 전체 자동 적용
- localStorage('fontSize')에 저장

## 주의사항
- Railway 환경변수에 KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI 필요
- .env.production에 VITE_KAKAO_JS_KEY, VITE_KAKAO_REDIRECT_URI 추가 필요
- CLAUDE_API_KEY 끝에 `6AAAA` 포함 필수
- Claude Code와 서버 앱이 같은 org rate limit 공유 (Tier 1)
