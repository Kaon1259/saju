# 타로카드 외곽 프레임 미드저니 프롬프트 10종

## 핵심 컨셉
- **내부 완전 공백** — 카드 일러스트와 겹치지 않도록 안쪽은 100% 빈 공간
- 외곽 테두리 프레임만 존재 (액자처럼)
- 생성 후 내부 영역 투명 처리 → PNG로 카드 위에 합성

## 공통 파라미터
- `--ar 2:3` : 타로카드 비율
- `--s 750` : 높은 스타일라이즈
- `--v 6.1` : 미드저니 최신 버전
- `--no center image, illustration, figure, face, symbol` : 내부 이미지 생성 차단

## 프롬프트 핵심 키워드 설명
- `picture frame with completely empty interior` : 빈 내부의 액자
- `hollow center, nothing inside` : 안에 아무것도 없음을 강조
- `solid black rectangle fills the inside` : 내부를 검정으로 채움 (후처리 제거 쉽게)
- `--no` 네거티브 프롬프트로 내부 요소 차단

---

## 1. Classic RWS (클래식 타로)

```
Ornate antique picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, gilded gold and royal blue wooden frame, Art Deco geometric carved edges, sun and crescent moon reliefs on corners, aged gold leaf texture with patina, thin inner bead molding, top center cartouche and bottom ribbon scroll, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 2. Dark Gothic (다크 고딕)

```
Dark gothic picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, blackened iron and tarnished silver frame, pointed cathedral arch at top, twisted thorny iron vine carvings along all four edges, gargoyle head reliefs at four corners, blood red ruby inlays on side centers, oxidized dark metal texture, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 3. Romantic Rose (로맨틱 로즈)

```
Romantic Art Nouveau picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, rose gold and pearl white frame, flowing organic curves with blooming rose carvings at corners, trailing vine tendrils along edges, tiny pearl bead inner border, ribbon bow at top center, heart locket at bottom center, soft matte gold texture, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 4. Western Classic (웨스턴 클래식)

```
Western frontier picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, burnished copper and aged leather frame, tooled leather scroll engravings on all edges, round silver concho ornaments at four corners with turquoise stones, horseshoe motif at top center, lasso rope inner border detail, weathered bronze patina texture, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 5. Girl Tarot (소녀 타로)

```
Magical girl picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, pastel lavender and soft mint with sparkle gold frame, star-tipped magic wand ornaments at four corners, crescent moon arch at top, tiny floating crystal gems and flowers along edges, ribbon bow at bottom, holographic iridescent shimmer texture, rounded soft edges, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 6. Boy Tarot (소년 타로)

```
Steampunk adventure picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, dark navy and brushed bronze frame, mechanical gear ornaments at four corners, compass rose at top center, chain link and small shield crests along edges, brass rivet studs as inner border, crossed swords at bottom center, industrial patinated bronze texture, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 7. Oriental / Mystic East (동양 신비)

```
Traditional Korean dancheong picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, vermillion red and gold leaf frame, dragon head carvings at top corners, phoenix carvings at bottom corners, lotus flower and cloud scroll patterns along all edges, jade green accent gems at side centers, traditional geometric lattice inner border, silk brocade texture on frame surface, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 8. Celestial Cosmos (우주/별자리)

```
Cosmic astrology picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, midnight purple and iridescent silver frame, zodiac symbol medallions at four corners, radiant eye at top center, crescent moon phases row at bottom, thin constellation line pattern along edges, tiny scattered star dots as inner border, nebula glow effect on frame surface, holographic shimmer, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 9. Enchanted Forest (마법의 숲)

```
Enchanted forest picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, living twisted tree branch frame in emerald green and warm brown, curled fern frond ornaments at four corners, two branches meeting to form arch at top, mushroom and acorn details at bottom, tiny bioluminescent firefly dots along inner edge, ancient carved bark wood texture, hanging moss wisps, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

## 10. Royal Velvet (로열 벨벳)

```
Luxurious Victorian baroque picture frame for tarot card, completely empty hollow center filled with solid black, only the border frame exists, deep purple velvet and 24k gold frame, heraldic lion head reliefs at four corners, jeweled crown at top center, fleur-de-lis at bottom center, acanthus leaf scrollwork along all edges, diamond-cut crystal inlays at side centers, rich embossed velvet texture, viewed straight on, flat product photo on black background, ultra detailed --ar 2:3 --s 750 --v 6.1 --no center image illustration figure face symbol drawing painting
```

---

## 후처리 가이드

### 생성 후 작업 순서
1. **미드저니 생성** — 내부가 검정으로 채워진 액자 프레임 이미지 생성
2. **내부 검정 영역 제거** — Photoshop 마법봉/색상범위 선택 → 삭제 (검정 내부만)
3. **배경 검정도 제거** — 외곽 배경도 투명 처리
4. **PNG 저장** — 프레임만 남은 투명 배경 PNG
5. **카드에 합성** — 카드 일러스트 위에 프레임 PNG를 z-index 레이어로 올림

### 핵심 포인트
| 기법 | 목적 |
|------|------|
| `picture frame` | "프레임/액자"라는 물리적 오브젝트로 인식시킴 |
| `completely empty hollow center` | 내부를 비우라는 명시적 지시 |
| `solid black rectangle fills the inside` | 내부를 균일한 검정으로 채워서 후처리 분리 쉽게 |
| `--no center image illustration...` | 네거티브 프롬프트로 내부 요소 생성 차단 |
| `viewed straight on, flat product photo` | 정면 촬영 느낌으로 원근 왜곡 방지 |

### 파일 네이밍 (제안)
```
/tarot-frames/classic_rws_frame.png
/tarot-frames/dark_frame.png
/tarot-frames/romantic_frame.png
/tarot-frames/western_frame.png
/tarot-frames/girl_frame.png
/tarot-frames/boy_frame.png
/tarot-frames/oriental_frame.png
/tarot-frames/celestial_frame.png
/tarot-frames/forest_frame.png
/tarot-frames/royal_frame.png
```

## 매칭 가이드

| # | 프롬프트 | 덱 매칭 | 프레임 소재 |
|---|---------|---------|-----------|
| 1 | Classic RWS | classic_rws | 금박 나무 액자 |
| 2 | Dark Gothic | dark | 흑철+은, 가시 |
| 3 | Romantic Rose | romantic | 로즈골드, 장미 |
| 4 | Western Classic | western | 구리+가죽, 콘초 |
| 5 | Girl Tarot | girl | 파스텔, 마법봉+크리스탈 |
| 6 | Boy Tarot | boy | 네이비+브론즈, 기어 |
| 7 | Oriental | oriental | 단청, 용+봉황 |
| 8 | Celestial Cosmos | 확장용 | 보라+은, 별자리 |
| 9 | Enchanted Forest | 확장용 | 나무가지, 반딧불 |
| 10 | Royal Velvet | 확장용 | 벨벳+금, 사자문양 |
