# 🧪 소녀 타로 실사 테스트 — m00 The Fool

## ⚠️ 주의사항

1. **URL 끝의 `&` 제거됨** (트레일링 앰퍼샌드 금지)
2. **URL 중간 공백 없음** — 복사 후 공백 섞여 들어오면 에러
3. 아래 코드블록을 **한 줄 통째로** 복사 → 디스코드 `/imagine` 뒤에 붙여넣기

---

## 🎴 테스트 프롬프트 (복사용)

```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands at cliff edge in flowing white silk dress with small backpack, one foot gently stepping forward, white puppy beside her, holding a single golden rose, mountain peaks behind, title "THE FOOL" --cref https://cdn.discordapp.com/attachments/1491778774440738826/1495348282296242336/girl_cover.jpg?ex=69e5eb1c&is=69e4999c&hm=eb22816b1ad788e3621b8e9df72448670460383f2f9a4b2430c4914ff882722a --cw 60 --ar 2:3 --style raw --v 6.1
```

---

## 🔗 CREF URL (단독 확인용)

```
https://cdn.discordapp.com/attachments/1491778774440738826/1495348282296242336/girl_cover.jpg?ex=69e5eb1c&is=69e4999c&hm=eb22816b1ad788e3621b8e9df72448670460383f2f9a4b2430c4914ff882722a
```

**체크리스트 (붙여넣기 전)**
- [ ] URL 끝이 `...2722a` 로 끝남 (뒤에 `&` 없음)
- [ ] `ex=69e5eb1c` 에서 `69e` 와 `5eb1c` 사이 공백 없음
- [ ] URL 어디에도 개행(줄바꿈) 없음

---

## 🔄 여전히 에러 나면 시도해 볼 순서

### A안: URL을 prompt 맨 앞으로
```
https://cdn.discordapp.com/attachments/1491778774440738826/1495348282296242336/girl_cover.jpg?ex=69e5eb1c&is=69e4999c&hm=eb22816b1ad788e3621b8e9df72448670460383f2f9a4b2430c4914ff882722a hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands at cliff edge in flowing white silk dress with small backpack, one foot gently stepping forward, white puppy beside her, holding a single golden rose, mountain peaks behind, title "THE FOOL" --cw 60 --ar 2:3 --style raw --v 6.1
```

### B안: --cref 대신 --sref (스타일만 참조)
```
hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette with subtle pastels, film grain, ornate rose gold tarot card border with cherry blossom filigree corners, card title banner at bottom in elegant serif, 2:3 portrait ratio, trading card layout, no text artifacts except title, photorealistic skin texture and hair detail, she stands at cliff edge in flowing white silk dress with small backpack, one foot gently stepping forward, white puppy beside her, holding a single golden rose, mountain peaks behind, title "THE FOOL" --sref https://cdn.discordapp.com/attachments/1491778774440738826/1495348282296242336/girl_cover.jpg?ex=69e5eb1c&is=69e4999c&hm=eb22816b1ad788e3621b8e9df72448670460383f2f9a4b2430c4914ff882722a --ar 2:3 --style raw --v 6.1
```

### C안: Discord URL이 만료됐을 수도 있음
- 디스코드 attachment URL은 `ex=69e5eb1c` 파라미터가 만료 타임스탬프
- 오래된 URL은 무효화됨 → 파일 다시 업로드 후 새 URL 복사

---

## 🖼️ 테두리 강조 테스트 (프레임 누락 해결)

> **문제**: 기본 prompt로는 "ornate rose gold tarot card border" 키워드가 묻혀서 테두리가 안 그려짐.
> 해결: 테두리 문구를 **맨 앞으로 이동** + 더 강한 표현 + 스타일 디렉티브 강화.

### 테스트 ① — 테두리 맨 앞 이동 + 두꺼운 프레임 강조
```
ornate rose gold art nouveau tarot card frame with thick decorative border visible on all four edges, cherry blossom filigree corner ornaments, gold foil inlay, scalloped inner trim, classical trading card layout with clear frame around central illustration, title banner cartouche at bottom in elegant serif saying "THE FOOL", inside the frame: hyperrealistic cinematic portrait photography, young East Asian woman with long flowing dark brown hair, delicate facial features, soft natural makeup, ethereal fantasy atmosphere, golden hour warm backlight, floating golden rose petals and cherry blossoms, Canon EOS R5 85mm f/1.2 lens, shallow depth of field bokeh, dreamy cream and gold color palette, film grain, photorealistic skin texture, she stands at cliff edge in flowing white silk dress with small backpack, one foot gently stepping forward, white puppy beside her, holding a single golden rose, mountain peaks behind, 2:3 portrait trading card ratio --cref https://cdn.discordapp.com/attachments/1491778774440738826/1495348282296242336/girl_cover.jpg?ex=69e5eb1c&is=69e4999c&hm=eb22816b1ad788e3621b8e9df72448670460383f2f9a4b2430c4914ff882722a --cw 60 --ar 2:3 --style raw --v 6.1
```

### 테스트 ② — "tarot card with visible frame" 명시 + 여백 강제
```
vintage tarot card design with thick ornate rose gold decorative frame border surrounding central illustration, clear visible gold filigree edge on top bottom left right, cherry blossom and vine corner flourishes, inner scalloped gold trim, bottom nameplate banner reading "THE FOOL" in serif letters, illustration within the frame shows: hyperrealistic cinematic photograph of young East Asian woman with long flowing dark brown hair in flowing white silk dress, standing at cliff edge with small backpack one foot stepping forward, small white puppy beside her, holding single golden rose, mountain peaks behind, golden hour backlight, floating golden rose petals, Canon EOS R5 85mm f/1.2 bokeh, dreamy cream and gold palette, film grain, photorealistic skin and hair detail, full view of tarot card showing all four frame edges, 2:3 aspect ratio trading card --cref https://cdn.discordapp.com/attachments/1491778774440738826/1495348282296242336/girl_cover.jpg?ex=69e5eb1c&is=69e4999c&hm=eb22816b1ad788e3621b8e9df72448670460383f2f9a4b2430c4914ff882722a --cw 60 --ar 2:3 --style raw --v 6.1
```

---

## 📝 권장 시도 순서

1. **테스트 ①** 먼저 — 공통 prefix 구조 유지하면서 프레임만 앞으로 이동
2. ①도 프레임 약하면 **테스트 ②** — "full view of tarot card showing all four frame edges" 문구가 핵심
3. 둘 다 만족스러우면 그 prefix로 78장 프롬프트 파일 전체 갱신

## 💡 참고

기존 덱(명화·K-드라마·셀레스티얼) 중 프레임이 선명한 덱들의 공통점:
- 프레임 키워드가 prompt **앞쪽 30% 이내**에 배치
- "trading card layout", "card border", "frame corners" 중 최소 2개 명시
- `--style raw` 유지 (artistic 모드는 프레임을 무시하는 경향)
