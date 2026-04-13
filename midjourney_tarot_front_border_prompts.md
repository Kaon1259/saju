# 타로카드 앞면 테두리(프레임) 미드저니 프롬프트 10종

## 용도
- 카드 앞면의 실사 일러스트 위에 오버레이할 장식 테두리
- 중앙은 비워두고 가장자리 프레임만 생성
- PNG 투명 배경으로 후처리하여 카드 위에 합성

## 공통 파라미터
- `--ar 2:3` : 타로카드 비율
- `--s 750` : 높은 스타일라이즈
- `--v 6.1` : 미드저니 최신 버전
- `transparent center` + `empty center` : 중앙 비움 (후처리로 투명 처리)
- `ornamental border frame only` : 테두리만 생성

---

## 1. Classic RWS (클래식 타로)

```
Tarot card ornamental border frame only, empty transparent center, antique gold and royal blue decorative frame, Art Deco geometric corners with sun and moon motifs, thin inner line with dot pattern, top banner area with Roman numeral placeholder, bottom banner area with scroll ribbon, aged gilded metal texture, classical Rider-Waite style ornamentation, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 2. Dark Gothic (다크 고딕)

```
Tarot card ornamental border frame only, empty transparent center, dark silver and crimson decorative frame, Gothic cathedral arch top with pointed spires, twisted iron thorns and barbed vine border, corner gargoyle head ornaments, bottom banner with bat wing scroll, oxidized dark metal texture with blood red gem inlays, Gothic Revival architectural details, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 3. Romantic Rose (로맨틱 로즈)

```
Tarot card ornamental border frame only, empty transparent center, rose gold and pearl pink decorative frame, Art Nouveau flowing curves with blooming rose corner pieces, delicate vine tendrils along edges, top arch with ribbon bow, bottom banner with heart-shaped locket centerpiece, soft watercolor gold leaf texture, tiny pearl beads along inner border line, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 4. Western Classic (웨스턴 클래식)

```
Tarot card ornamental border frame only, empty transparent center, burnished copper and turquoise decorative frame, tooled leather border with Western scroll engraving, corner conchos with turquoise stones, top banner with horseshoe arch, bottom banner with rope lasso frame, desert sun rays at top corners, weathered bronze metal texture with patina, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 5. Girl Tarot (소녀 타로)

```
Tarot card ornamental border frame only, empty transparent center, pastel lavender and mint gold decorative frame, magical girl wand corner ornaments with star tips, crescent moon top arch with tiny hanging stars, border of floating crystal gems and small flowers, bottom banner with bow ribbon, holographic rainbow shimmer edge, soft rounded frame shape, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 6. Boy Tarot (소년 타로)

```
Tarot card ornamental border frame only, empty transparent center, navy blue and bronze decorative frame, steampunk mechanical gear corner ornaments, compass rose top center with brass rivets along edges, border of chain links and small shield crests, bottom banner with crossed swords, industrial bolt details, dark patinated bronze metal texture, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 7. Oriental / Mystic East (동양 신비)

```
Tarot card ornamental border frame only, empty transparent center, vermillion red and gold leaf decorative frame, traditional Korean dancheong pattern border, dragon head corner ornaments with cloud scrolls, top arch with lotus flower crown, bottom banner with traditional knot tassel, jade green accent gems at midpoints, silk brocade texture on frame surface, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 8. Celestial Cosmos (우주/별자리)

```
Tarot card ornamental border frame only, empty transparent center, midnight purple and iridescent silver decorative frame, zodiac symbol corner medallions, top arch with radiant all-seeing eye, thin constellation line pattern along edges, bottom banner with crescent moon phases in a row, nebula glow effect on frame edges, tiny scattered stars as border dots, holographic shimmer texture, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 9. Enchanted Forest (마법의 숲)

```
Tarot card ornamental border frame only, empty transparent center, emerald green and warm brown decorative frame, living tree branch border with twisted bark texture, corner ornaments of curled fern fronds, top arch formed by two branches meeting with hanging moss, bottom banner with mushroom and acorn details, tiny bioluminescent firefly dots along inner edge, ancient woodland carved wood texture, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 10. Royal Velvet (로열 벨벳)

```
Tarot card ornamental border frame only, empty transparent center, deep purple and 24k gold decorative frame, Victorian baroque acanthus leaf scrollwork border, heraldic lion head corner ornaments, top arch with jeweled crown, bottom banner with fleur-de-lis centerpiece, diamond-cut crystal inlays at midpoints, rich embossed velvet texture on frame surface, royal coat of arms style, flat design on solid black background, ultra detailed --ar 2:3 --s 750 --v 6.1
```

---

## 후처리 가이드

### 미드저니 생성 후 작업 순서
1. **배경 제거**: 검은 배경(`solid black background`)으로 생성 → Photoshop/GIMP에서 검은색 영역 선택 후 삭제
2. **중앙 투명화**: 테두리 안쪽 영역도 투명 처리
3. **PNG 저장**: 투명 배경 PNG로 저장
4. **오버레이 합성**: 실사 카드 일러스트 위에 테두리 PNG를 레이어로 합성

### 파일 네이밍 규칙 (제안)
```
/tarot-{deck}/border.png
예: /tarot-classic-rws/border.png
    /tarot-dark/border.png
    /tarot-romantic/border.png
```

### CSS 오버레이 적용 (참고)
```css
.tarot-card {
  position: relative;
}
.tarot-card .card-art {
  width: 100%;
  height: 100%;
}
.tarot-card .card-border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
```

## 매칭 가이드

| # | 프롬프트 | 기존 덱 매칭 | 스타일 키워드 |
|---|---------|-------------|-------------|
| 1 | Classic RWS | classic_rws | Art Deco, 금+파랑 |
| 2 | Dark Gothic | dark | 고딕 아치, 은+적 |
| 3 | Romantic Rose | romantic | Art Nouveau, 로즈골드 |
| 4 | Western Classic | western | 가죽 공예, 구리+터키석 |
| 5 | Girl Tarot | girl | 마법소녀, 파스텔+홀로그램 |
| 6 | Boy Tarot | boy | 스팀펑크, 네이비+브론즈 |
| 7 | Oriental | oriental | 단청, 주홍+금박 |
| 8 | Celestial Cosmos | 확장용 | 별자리, 보라+은빛 |
| 9 | Enchanted Forest | 확장용 | 나무/숲, 초록+갈색 |
| 10 | Royal Velvet | 확장용 | 빅토리안, 보라+금 |
