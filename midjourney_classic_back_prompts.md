# Classic (Mystical Neoclassical) 덱 뒷면 프롬프트 4종

카드 앞면 스타일: `mystical neoclassical tarot illustration, rich painterly`
- 앞면 톤에 맞춰 네오클래시컬(고전주의 회화) × 미스티컬 × 금박 장식 방향
- 4가지 변형: Royal / Twilight / Ivory / Emerald — 같은 구도/모티프 계열, 색조만 다르게

## 공통 파라미터
- `--ar 2:3` 타로카드 비율 (세로 긴 직사각형)
- `--s 750` 스타일라이즈 높게
- `--v 6.1`
- `perfectly mirrored top-to-bottom` 상하 대칭
- `no text, flat card illustration`

---

## 1. Royal Indigo (로열 인디고)

```
Mystical neoclassical tarot card back design, symmetrical baroque ornamental pattern, deep royal indigo and antique 24k gold leaf, central sun-face medallion with radiating rays surrounded by laurel wreath and acanthus scrolls, ornate gilded filigree border with small crescent moons and eight-pointed stars at corners, oil painted chiaroscuro texture with aged parchment undertones, Renaissance cathedral fresco feel, perfectly mirrored top-to-bottom composition, no text, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 2. Twilight Violet (트와일라잇 바이올렛)

```
Mystical neoclassical tarot card back design, symmetrical baroque ornamental pattern, twilight violet and deep midnight purple with rose gold highlights, central crescent moon medallion cradled by twin classical angels with flowing robes, ornate filigree border of ivy vines and floating stars, painterly oil fresco texture with soft candlelit glow, aged Renaissance manuscript feel, perfectly mirrored top-to-bottom composition, no text, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 3. Ivory Gold (아이보리 골드)

```
Mystical neoclassical tarot card back design, symmetrical baroque ornamental pattern, warm ivory cream and burnished antique gold with soft sepia shadows, central classical lyre medallion surrounded by laurel wreath and grape vine scrolls, ornate gilded filigree border with small suns and moons at corners, painterly oil texture resembling old masters Rembrandt glow, aged vellum parchment background, perfectly mirrored top-to-bottom composition, no text, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 4. Emerald Alchemy (에메랄드 알케미)

```
Mystical neoclassical tarot card back design, symmetrical baroque ornamental pattern, deep emerald green and aged brass gold with copper patina accents, central alchemical ouroboros serpent coiled around a classical urn medallion, ornate filigree border of olive branches and tiny celestial symbols at corners, painterly oil fresco texture with mossy verdigris undertones, Renaissance apothecary feel, perfectly mirrored top-to-bottom composition, no text, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

---

## 적용 가이드

- 저장 경로: `/client/public/tarot-backs/classic_0.jpg` ~ `classic_3.jpg`
- `Tarot.jsx`의 `DECK_LIST`에 추가 시:
  ```js
  { id: 'classic', name: '클래식 타로', sub: 'Mystical Neoclassical',
    img: '/tarot-effects/deck-intro/classic_cover.jpg',
    gif: '/tarot-effects/deck-intro/classic_0.webp',
    backs: [0,1,2,3].map(i => `/tarot-backs/classic_${i}.jpg`),
    hasVariants: true }
  ```
- 덱 카드 경로: `/tarot-classic/m00_v0.jpg` ~ `m56_v3.jpg` (57장 × 4변형)
