# 🎭 광대(Jester) 덱 뒷면 프롬프트 4종

카드 앞면 스타일: `ornate renaissance jester tarot illustration, rich painterly oil-on-canvas with gilded baroque filigree borders`
- 앞면 톤과 매칭: 르네상스 궁정 광대 × 할리퀸 다이아몬드 × 방울모자 × 금박 장식
- 4가지 변형: Royal Crimson / Twilight Harlequin / Ivory Bells / Emerald Masquerade — 같은 구도 계열, 색조만 변주

## 공통 파라미터
- `--ar 2:3` 타로카드 비율
- `--s 750` 스타일라이즈 높게
- `--v 6.1`
- `perfectly mirrored top-to-bottom` 상하 대칭
- `no text, no face, flat card illustration`
- 중앙 방울모자(cap-and-bells) / 할리퀸 다이아몬드 / 가면 모티프 반복

---

## 1. Royal Crimson (로열 크림슨)

```
Ornate renaissance jester tarot card back design, symmetrical baroque ornamental pattern, deep royal crimson and antique 24k gold leaf with black accents, central medallion featuring a four-pointed jester cap-and-bells crown intersected by two crossed scepter-batons, harlequin diamond-pattern lattice framing in red and gold, ruffled collar scallops along the inner border, small theatrical half-masks and golden bells at the four corners, oil painted chiaroscuro texture with aged velvet undertones, Renaissance court tapestry feel, perfectly mirrored top-to-bottom composition, no text, no face, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 2. Twilight Harlequin (트와일라잇 할리퀸)

```
Ornate renaissance jester tarot card back design, symmetrical baroque ornamental pattern, twilight deep violet and midnight indigo with rose gold and silver moonlight highlights, central medallion featuring a crescent moon cradling a bell-tipped jester cap, harlequin diamond-pattern lattice woven with starry motifs in violet and silver, ruffled collar scallops glowing soft lavender, tiny masquerade masks and crescent bells at the four corners, painterly oil fresco texture with candlelit melancholy glow, Commedia dell'arte night atmosphere, perfectly mirrored top-to-bottom composition, no text, no face, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 3. Ivory Bells (아이보리 벨스)

```
Ornate renaissance jester tarot card back design, symmetrical baroque ornamental pattern, warm ivory cream and burnished antique gold with soft sepia shadows and blush pink undertones, central medallion featuring a three-pointed jester bell cap encircled by a laurel wreath and two curling ribbons, harlequin diamond-pattern lattice in cream and gold with subtle grape-vine scrolls, ruffled collar scallops with delicate lace filigree, tiny smiling-mask cherubs and golden bells at the four corners, painterly oil texture resembling old masters Rembrandt glow, aged vellum parchment background, perfectly mirrored top-to-bottom composition, no text, no face, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

## 4. Emerald Masquerade (에메랄드 마스커레이드)

```
Ornate renaissance jester tarot card back design, symmetrical baroque ornamental pattern, deep emerald green and aged brass gold with copper patina and verdigris accents, central medallion featuring a grand Venetian masquerade half-mask crowned with a four-pointed bell cap, harlequin diamond-pattern lattice in green and gold interwoven with olive branch scrolls, ruffled collar scallops with tiny bells along the edge, small lute and flute instruments crossed at each of the four corners, painterly oil fresco texture with mossy Renaissance apothecary mood, perfectly mirrored top-to-bottom composition, no text, no face, flat card illustration, ultra detailed --ar 2:3 --s 750 --v 6.1
```

---

## 적용 가이드

- 저장 경로: `jester_back/` 폴더 (classic 때 `classic_back/` 방식과 동일)
- 4장 생성 후 각 4변형(Upscale)까지 만들면 최대 16장 뒷면 풀 확보
- 변환 후 저장 경로: `/client/public/tarot-backs/jester_0.jpg ~ jester_7.jpg` (또는 15까지)
- `Tarot.jsx`의 `DECK_LIST`에 추가 예정:
  ```js
  { id: 'jester', name: '광대 타로', sub: 'Renaissance Jester',
    img: '/tarot-effects/deck-intro/jester_cover.jpg',
    gif: '/tarot-effects/deck-intro/jester_0.webp',
    backs: Array.from({length: 8}, (_, i) => `/tarot-backs/jester_${i}.jpg`),
    hasVariants: true }
  ```

## 매칭 포인트
- 4종 모두 **중앙 방울모자 메달리온** + **할리퀸 다이아몬드 격자** + **주름칼라(ruff) 스캘럽** + **모서리 가면·벨** 공통 → 랜덤 선택돼도 같은 덱이라는 일관성 유지
- 색조만 달라서 카드 앞면 어떤 것과 붙어도 자연스럽게 어울림
