# 📸 소녀 타로 (실사 리메이크) 78장 미드저니 프롬프트

> **컨셉**: 기존 소녀 타로 커버(`girl_cover.jpg`)의 분위기를 실사 시네마틱 포토로 재해석.
> 동일 여주인공 일관성을 위해 **cref(character reference)** 필수.
>
> **레퍼런스 업로드 방법**:
> 1. 미드저니 디스코드에 `client/public/tarot-effects/deck-intro/girl_cover.jpg` 드래그 업로드
> 2. 업로드된 이미지 우클릭 → "링크 복사"
> 3. ⚠️ **복사한 URL 끝에 `&`가 붙어 있으면 반드시 삭제** — 미드저니가 파라미터 구분자로 오인해 `Invalid parameter: Character reference must be an image URL, not text` 에러 발생
> 4. 아래 프롬프트의 `{{CREF_URL}}` 부분을 정리된 URL로 전체 치환
>
> **출력**: 261×500 JPG 변환 후 `client/public/tarot-girl-real/m{NN}_v{0-3}.jpg`
> (기존 `tarot-girl/`은 유지하고 `tarot-girl-real/`로 분리. 덱 ID는 `girl_real` 또는 기존 `girl`에 덮어쓰기 택1)

---

## 🎨 공통 스타일 prefix

```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail
```

## ⚙️ 공통 suffix (cref 톤 + 일관성)

```
--cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

> `--cw 60` = 얼굴/헤어/의상 스타일 60% 고정 (100은 너무 고정 → 다양성 부족, 40은 너무 자유 → 일관성 부족)

---

## 🌟 메이저 아르카나 (22장)

### 0. The Fool (m00)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands at cliff edge in flowing white silk dress with small backpack, one foot gently stepping forward, white puppy beside her, holding a single golden rose, mountain peaks behind, title "THE FOOL" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 1. The Magician (m01)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands in white off-shoulder gown at a marble altar, one hand pointing up with glowing wand other hand down, infinity halo of golden light, altar with crystal cup silver sword gold coin wooden wand, lilies and roses, title "THE MAGICIAN" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 2. The High Priestess (m02)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she sits serenely in blue moonlit gown between two stone pillars, crescent moon crown in hair, holding a glowing scroll, pomegranate veil behind, still pool at feet, title "THE HIGH PRIESTESS" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 3. The Empress (m03)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she reclines on silk pillow throne in flowing pink gown, twelve-star tiara of constellations, holding golden scepter, wheat field and waterfall backdrop, venus pendant, title "THE EMPRESS" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 4. The Emperor (m04)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in crimson armored gown seated on stone throne carved with ram heads, holding ankh scepter and golden orb, red mountain range behind, authoritative gaze, title "THE EMPEROR" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 5. The Hierophant (m05)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands in red and white ceremonial robe between two stone pillars of a temple, right hand raised in blessing, two kneeling figures in white robes, crossed silver keys at feet, title "THE HIEROPHANT" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 6. The Lovers (m06)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands naked in Eden garden beside a young Korean man, angel Raphael with golden wings blessing from above, sun halo, apple tree on her side fire tree on his, reaching hands, title "THE LOVERS" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 7. The Chariot (m07)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in starry silver armor rides ornate chariot pulled by one black sphinx one white sphinx, city towers behind, six-star canopy above, holding reins of light, title "THE CHARIOT" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 8. Strength (m08)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in pure white silk dress with flower crown gently closes mouth of a friendly golden lion, infinity halo above her head, meadow of white flowers, title "STRENGTH" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 9. The Hermit (m09)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in grey hooded cloak on snowy mountain peak at twilight, holding brass lantern with six-pointed star glowing, wooden staff in hand, thoughtful gaze, title "THE HERMIT" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 10. Wheel of Fortune (m10)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands before giant golden zodiac wheel with twelve constellations rotating in starry sky, four cosmic creatures angel eagle lion bull in corners reading starbooks, arms raised, title "WHEEL OF FORTUNE" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 11. Justice (m11)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in deep purple robe with crown seated between starlit marble pillars, right hand holding silver sword upright left hand holding golden scales, direct gaze, title "JUSTICE" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 12. The Hanged Man (m12)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she hangs upside-down by one ankle from cherry blossom tree branch, other leg crossed, arms folded behind, serene smile, golden solar halo around head, white silk dress flowing downward, title "THE HANGED MAN" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 13. Death (m13)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in long black veil cloak walks along path of falling red maple and ginkgo leaves at twilight, white rose motif on dress, distant sunrise between twin towers, title "DEATH" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 14. Temperance (m14)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she as graceful angel with large golden wings pouring stream of liquid light between two silver chalices, one foot on water one on land, triangle sun symbol on chest, iris flowers, title "TEMPERANCE" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 15. The Devil (m15)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she in black lace dress stands beside a goat-horned figure in crimson cavern, loose golden chain on wrist suggesting she can break free, inverted pentagram glow above, title "THE DEVIL" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 16. The Tower (m16)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, dramatic lightning strike hitting tall cosmic tower at stormy night, she in white dress falls through air as cherry blossoms scatter around, fire at tower crown, crown falling, title "THE TOWER" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 17. The Star (m17)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she kneels at cosmic pool in white slip dress pouring water from two crystal jars one into sea one onto grass, giant eight-pointed star with seven smaller stars overhead, ibis bird nearby, title "THE STAR" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 18. The Moon (m18)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands at middle of a stone bridge under enormous full moon with crescent face, wolf and jackal howling from either end, koi crayfish rising from dark pool, dew drops, title "THE MOON" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 19. The Sun (m19)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she joyfully rides white pony in sunflower field at noon, enormous golden sun with face shining overhead, red banner flag in hand, laughing freely, title "THE SUN" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 20. Judgement (m20)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, angel archangel Gabriel with golden wings blowing trumpet from clouds with red cross banner, she rises with arms open from crystal grave alongside two others, first snow falling, title "JUDGEMENT" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 21. The World (m21)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she dances gracefully in flowing violet silk sash inside oval laurel wreath of cherry blossoms and gold stars, holding two glowing wands, four corner constellations angel eagle lion bull, swirling galaxy core behind, title "THE WORLD" --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

---

## 🔥 완드 수트 — 열정 (14장, m22~m35)

> **참고**: 이하 마이너 아르카나 55장은 RWS 전통 상징을 유지하되 동일 여주인공(cref)을 중심으로 재구성.
> 각 카드는 위 메이저와 동일한 prefix + suffix 구조를 사용하며, **씬 설명만 교체**합니다.
> 메이저 아르카나 22장을 먼저 생성해서 톤을 확정한 뒤, 동일 패턴으로 마이너를 진행하는 것이 안전합니다.

### 씬 설명 치환 목록 (m22~m77)

> 아래 각 씬 텍스트를 위 prefix와 `, SCENE, title "..." --cref` 사이에 끼워 넣으세요. 예시 1장은 아래 완드 에이스로 제공.

| 번호 | 카드 | 타이틀 | 씬 설명 |
|---|---|---|---|
| m22 | Ace of Wands | "ACE OF WANDS" | her hand emerges from warm cloud holding a single glowing wooden wand sprouting green leaves and flame tip, distant castle on hill |
| m23 | Two of Wands | "TWO OF WANDS" | she in deep violet coat stands on rooftop holding small golden globe in one hand tall wand in other, second wand fixed to wall, city skyline sunrise |
| m24 | Three of Wands | "THREE OF WANDS" | she from behind on cliff watching three golden ships sail at sunrise, three wands planted around, cape flowing in wind |
| m25 | Four of Wands | "FOUR OF WANDS" | she joyfully dances under four tall wands with canopy of flowers and ribbons, hanok wedding courtyard, guests cheering |
| m26 | Five of Wands | "FIVE OF WANDS" | she in white athletic dress sparring with wooden wand amid four others on dusty training ground, dynamic motion |
| m27 | Six of Wands | "SIX OF WANDS" | she as victorious rider on white horse through cheering crowd, laurel crown, raising single wand with flag, five wands raised by supporters |
| m28 | Seven of Wands | "SEVEN OF WANDS" | she on rocky cliff holding single wand defensively against six wands rising from below, wind whipping coat, bold stance |
| m29 | Eight of Wands | "EIGHT OF WANDS" | eight glowing wands flying through golden sunset sky like arrows of light, she watches from riverbank waving |
| m30 | Nine of Wands | "NINE OF WANDS" | weary but vigilant she with bandaged forehead leaning on single wand at gate, eight more wands fenced behind, resolute |
| m31 | Ten of Wands | "TEN OF WANDS" | she in white shirt carrying ten heavy wooden wands in arms toward small village house on country road |
| m32 | Page of Wands | "PAGE OF WANDS" | curious she in bright orange cape on desert rock field holding tall wand with sprouting leaves, gazing at tip with wonder |
| m33 | Knight of Wands | "KNIGHT OF WANDS" | she on rearing red horse in maple forest, holding single wand aloft like flag, orange racing coat with flame patch |
| m34 | Queen of Wands | "QUEEN OF WANDS" | she in golden silk gown seated on throne on rooftop garden, holding wand with sunflower top, black cat at feet, sunflowers |
| m35 | King of Wands | "KING OF WANDS" | she in crimson suit seated on ornate throne, holding tall wand scepter with green sprout, salamander motif on chair |

---

## 💕 컵 수트 — 사랑 (14장, m36~m49)

| 번호 | 카드 | 타이틀 | 씬 설명 |
|---|---|---|---|
| m36 | Ace of Cups | "ACE OF CUPS" | her hand emerges from cloud holding silver chalice overflowing with five streams of rose-gold water, white dove descending with wafer, lotus pond |
| m37 | Two of Cups | "TWO OF CUPS" | she faces a young Korean man exchanging crystal cups in hanok courtyard, caduceus of snakes and winged lion head above |
| m38 | Three of Cups | "THREE OF CUPS" | she with two friends in pastel dresses raising wine cups in toast circle at rooftop bachelorette, fruit and flowers, laughter |
| m39 | Four of Cups | "FOUR OF CUPS" | she sitting cross-legged under cherry tree with arms folded, three cups on ground ignored, fourth floating in cloud offered by unseen hand |
| m40 | Five of Cups | "FIVE OF CUPS" | she in long black coat head bowed on rainy bridge, three spilled cups, two upright cups behind unseen, distant village |
| m41 | Six of Cups | "SIX OF CUPS" | nostalgic scene of her as younger giving flower-filled cup to a boy in school uniform at village alley, six cups of flowers around, warm tone |
| m42 | Seven of Cups | "SEVEN OF CUPS" | she silhouette gazing at seven floating cloud cups each holding different vision - face castle jewels snake laurel dragon veil, dream sky |
| m43 | Eight of Cups | "EIGHT OF CUPS" | she in long travel coat walking away with cane toward misty mountain, eight stacked cups left behind on rocks, eclipsed moon |
| m44 | Nine of Cups | "NINE OF CUPS" | satisfied she in navy apron sitting arms folded content smile before shelf of nine golden cups on blue cloth, wish fulfilled |
| m45 | Ten of Cups | "TEN OF CUPS" | happy scene she with husband two small children arms raised joyfully in front of suburban house, rainbow of ten cups arching overhead |
| m46 | Page of Cups | "PAGE OF CUPS" | dreamy she in blue floral dress with wavy hair holding golden cup from which a tiny goldfish leaps, beach shore, whimsical |
| m47 | Knight of Cups | "KNIGHT OF CUPS" | romantic she on white horse offering silver cup with bouquet, winged heart pin on blazer, stream and mountain path, chivalrous |
| m48 | Queen of Cups | "QUEEN OF CUPS" | compassionate she in pale blue silk gown on stone throne at ocean cliff, gazing into ornate closed chalice with angel handles, sea foam at feet |
| m49 | King of Cups | "KING OF CUPS" | wise she in navy captain coat on stone throne floating on calm sea, holding simple cup and short scepter, fish leaping and ship sailing |

---

## ⚔️ 소드 수트 — 이성·갈등 (14장, m50~m63)

| 번호 | 카드 | 타이틀 | 씬 설명 |
|---|---|---|---|
| m50 | Ace of Swords | "ACE OF SWORDS" | her hand from cloud holding upright silver sword piercing golden crown wreathed with olive and palm, mountain crags, storm clearing |
| m51 | Two of Swords | "TWO OF SWORDS" | blindfolded she in grey dress seated on stone bench at pier, two silver swords crossed over chest, crescent moon above, still water |
| m52 | Three of Swords | "THREE OF SWORDS" | symbolic glowing red heart pierced by three silver swords floating in rainy night sky, neon signs blurred below, she walks past with umbrella |
| m53 | Four of Swords | "FOUR OF SWORDS" | she in white knit resting eyes closed hands folded on chapel stone bed, one sword under bed three on wall, stained glass of mother and child |
| m54 | Five of Swords | "FIVE OF SWORDS" | smug she with three swords in arms on windy field, two defeated figures walking away weeping, two swords on ground, jagged clouds |
| m55 | Six of Swords | "SIX OF SWORDS" | quiet she and child seated low in small wooden ferry rowed by cloaked figure across calm river, six swords upright in bow |
| m56 | Seven of Swords | "SEVEN OF SWORDS" | sneaky she tiptoeing away from festival tent holding five swords awkwardly glancing back, two swords left stuck in ground, lanterns |
| m57 | Eight of Swords | "EIGHT OF SWORDS" | blindfolded she in red dress loosely bound with white cloth standing in shallow tidal flat, eight silver swords planted around her like cage |
| m58 | Nine of Swords | "NINE OF SWORDS" | distressed she sitting up on bed at 3am face in hands, nine silver swords floating horizontally on wall behind, rose zodiac quilt on lap |
| m59 | Ten of Swords | "TEN OF SWORDS" | she lying face down on riverbank at dawn with ten silver swords in back in even row, dawn breaking yellow, calm water, rock bottom |
| m60 | Page of Swords | "PAGE OF SWORDS" | alert she in denim jacket on windy rooftop holding silver sword upright both hands, hair blown back, clouds swirling, sharp gaze |
| m61 | Knight of Swords | "KNIGHT OF SWORDS" | fierce she on galloping white horse charging forward with silver sword raised high, steel grey armored jacket, wind-torn clouds, reckless |
| m62 | Queen of Swords | "QUEEN OF SWORDS" | sharp perceptive she in charcoal pantsuit on marble throne, upright silver sword in right hand left extended, single butterfly at shoulder |
| m63 | King of Swords | "KING OF SWORDS" | wise judge she in navy robe on stone throne, upright silver sword tilted right, butterfly motifs on throne back, stern fair expression |

---

## 🪙 펜타클 수트 — 현실·안정 (14장, m64~m77)

| 번호 | 카드 | 타이틀 | 씬 설명 |
|---|---|---|---|
| m64 | Ace of Pentacles | "ACE OF PENTACLES" | her hand from cloud offering single large gold coin with pentacle star over blooming yuchae garden, arch of white roses, path to mountain |
| m65 | Two of Pentacles | "TWO OF PENTACLES" | playful she in green cap juggling two gold coins linked by golden infinity ribbon on bridge crosswalk, two cargo ships rising and falling |
| m66 | Three of Pentacles | "THREE OF PENTACLES" | she as craftsman architect carving on scaffolding inside gallery archway, monk and designer holding blueprints beside, three coins on arch |
| m67 | Four of Pentacles | "FOUR OF PENTACLES" | rigid she in grey suit tightly clutching single huge gold coin to chest, one coin on head two under feet, city behind, stiff posture |
| m68 | Five of Pentacles | "FIVE OF PENTACLES" | two figures in worn coats huddling in first snow past stained glass cathedral window with five pentacle stars, she on crutches other holding hand |
| m69 | Six of Pentacles | "SIX OF PENTACLES" | kind she in red coat at street giving gold coins to two kneeling recipients, brass balance scale in left hand, six coins floating around |
| m70 | Seven of Pentacles | "SEVEN OF PENTACLES" | patient she in linen leaning on wooden hoe in countryside, gazing at vine trellis growing seven ripe gold coins like fruit |
| m71 | Eight of Pentacles | "EIGHT OF PENTACLES" | diligent she at wooden workbench carving gold coin with tiny hammer and chisel, six finished coins hung on tree behind, one at feet, focused |
| m72 | Nine of Pentacles | "NINE OF PENTACLES" | elegant she in golden designer dress alone in private garden vineyard, falcon on gloved hand, nine gold coins floating among grape vines, snail |
| m73 | Ten of Pentacles | "TEN OF PENTACLES" | three generation family at traditional hanok courtyard, elderly grandfather with two hounds, she with husband and child, ten coins tree of life |
| m74 | Page of Pentacles | "PAGE OF PENTACLES" | studious she in brown school uniform in rural meadow holding single gold coin up admiring it, tilled earth and mountain behind |
| m75 | Knight of Pentacles | "KNIGHT OF PENTACLES" | steady she on sturdy brown plow horse in autumn rice paddy, holding gold coin carefully in palm, reliable expression, calm |
| m76 | Queen of Pentacles | "QUEEN OF PENTACLES" | nurturing she in green dress on flower-wreathed throne in lush garden, cradling single gold coin in lap, rabbit at foot, roses pears overhead |
| m77 | King of Pentacles | "KING OF PENTACLES" | she in black velvet suit with gold grape pattern on stone throne in rose garden with bull sculptures, gold coin and scepter, castle behind |

---

## 🎴 카드 뒷면 (4종)

### 뒷면 0 — 로즈골드 벚꽃
```
ornate tarot card back design, symmetrical mirrored pattern, deep ivory cream background, rose gold cherry blossom branches curling from four corners toward center, central medallion with silk knot pattern, tiny gold stars scattered, ornate rose gold frame, 2:3 portrait ratio, no text, no figure, no face, pure decorative pattern, high detail, print quality --ar 2:3 --style raw --v 6.1
```

### 뒷면 1 — 골드 필리그리 장미
```
ornate tarot card back design, symmetrical mirrored pattern, warm champagne background, intricate gold filigree rose vine pattern radiating from center medallion, four corner filigree ornaments, gold foil shimmer texture, 2:3 portrait ratio, no text, no figure, no face --ar 2:3 --style raw --v 6.1
```

### 뒷면 2 — 크리스탈 달
```
ornate tarot card back design, symmetrical mirrored pattern, pale pink dawn background, large central crystal crescent moon radiating gold light, surrounded by cherry blossom branches, subtle star particles, rose gold double-line frame, 2:3 portrait ratio, no text, no figure, no face --ar 2:3 --style raw --v 6.1
```

### 뒷면 3 — 매듭 & 나비
```
ornate tarot card back design, symmetrical mirrored pattern, ivory silk background, central Korean traditional silk knot maedeup medallion in rose gold, butterflies flanking the knot, four corner cherry blossom sprigs, rose gold ornate border, luxurious jewelry box aesthetic, 2:3 portrait ratio, no text, no figure, no face --ar 2:3 --style raw --v 6.1
```

---

## 🎞️ 덱 커버 / 인트로

### 커버 (`deck-intro/girl_real_cover.jpg`)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair in flowing white silk dress, swirling golden rose petals surrounding her, warm golden hour backlight, fanned out tarot card spread in foreground glowing rose gold, dreamy atmosphere, ornate rose gold title frame with serif letters reading "GIRL TAROT", 2:3 portrait ratio --cref {{CREF_URL}} --cw 60 --ar 2:3 --style raw --v 6.1
```

### 인트로 루프 시드 (GIF/WebP 생성용)
```
hyperrealistic cinematic still of softly swirling golden rose petals drifting around a fanned array of ornate rose gold tarot cards on ivory silk table, shallow bokeh, warm cream and gold glow, slow motion look, 2:3 portrait ratio, no text, no figure --ar 2:3 --style raw --v 6.1
```

---

## 📋 빠른 체크리스트

- [ ] 기존 `girl_cover.jpg`를 미드저니에 업로드해 CREF URL 확보
- [ ] 메이저 22장 (m00~m21) 생성 → 톤 확정
- [ ] 완드/컵/소드/펜타클 56장 생성 (씬 설명 테이블 참고)
- [ ] 뒷면 4종
- [ ] 커버 1장
- [ ] (선택) 인트로 WebP 시드
- [ ] `saju/소녀실사/` 에 원본 보관 → `convert_girl_real.py` (kdrama 스크립트 복사 후 경로만 변경)
- [ ] `client/public/tarot-girl-real/m{NN}_v{0-3}.jpg` 배치
- [ ] `Tarot.jsx` DECK_LIST에 `girl_real` 등록, 또는 기존 `girl` 슬롯에 덮어쓰기

---

## 🎨 스타일 지침

- **공통 prefix 절대 수정 금지** — 카드 간 피부톤/머리카락/분위기 일관성 보장
- **`--cw 60`이 핵심**: 너무 높으면(80+) 얼굴만 복제되어 장면 다양성 부족, 너무 낮으면(30-) 얼굴이 바뀜
- 피해야 할 요소: 실존 연예인, 과도한 섹시 노출, 어린이 같은 외모
- 변형 v0~v3은 미드저니 Vary (Strong) 사용 권장 — seed 변경보다 자연스러운 변주
