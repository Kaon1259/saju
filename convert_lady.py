"""
lady/ (소녀 실사 타로, id=lady) → tarot-lady 덱 변환
- 앞면: vintage_tarot_card 프롬프트 PNG → 완성본 우선 정렬 → 상위 78 × 4변형 → m00_v0..m77_v3.jpg (261x500, Q85)
- 뒷면: ornate_tarot_card_back PNG → /tarot-backs/lady_0~15.jpg (261x500, Q88)
- 커버: hyperrealistic 첫 UUID의 _0 → /tarot-effects/deck-intro/lady_cover.jpg (width 600, Q88)
- GIF 없음 → 소녀덱 webp 재사용 (별도 단계)
"""

import re
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "lady"
DST_FRONT = BASE / "client" / "public" / "tarot-lady"
DST_BACK = BASE / "client" / "public" / "tarot-backs"
DST_INTRO = BASE / "client" / "public" / "tarot-effects" / "deck-intro"
CARD_SIZE = (261, 500)
FRONT_Q = 85
BACK_Q = 88
COVER_WIDTH = 600
DECK_ID = "lady"

UUID_RE = re.compile(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)\.(png|gif)$')


def classify():
    fronts, backs, covers = {}, {}, {}
    gif_path = None
    for f in sorted(SRC.iterdir()):
        if not f.is_file():
            continue
        if "(1)" in f.name:
            continue
        m = UUID_RE.search(f.name)
        if not m:
            continue
        uuid, v, ext = m.group(1), int(m.group(2)), m.group(3)
        if ext == "gif":
            gif_path = f
            continue
        if "ornate_tarot_card_back" in f.name:
            backs.setdefault(uuid, {})[v] = f
        elif "hyperrealistic" in f.name:
            covers.setdefault(uuid, {})[v] = f
        elif "vintage_tarot_card" in f.name:
            fronts.setdefault(uuid, {})[v] = f
    return fronts, backs, covers, gif_path


def mtime(files):
    for v in (0, 1, 2, 3):
        if v in files:
            return files[v].stat().st_mtime
    return 0


def convert_fronts(fronts):
    sorted_uuids = sorted(fronts.keys(), key=lambda u: mtime(fronts[u]))
    complete = [u for u in sorted_uuids if len(fronts[u]) == 4]
    partial = [u for u in sorted_uuids if len(fronts[u]) < 4]
    prioritized = (complete + partial)[:78]
    DST_FRONT.mkdir(parents=True, exist_ok=True)
    count = 0
    for idx, uuid in enumerate(prioritized):
        for v, fp in fronts[uuid].items():
            if v > 3:
                continue
            out = DST_FRONT / f"m{idx:02d}_v{v}.jpg"
            img = Image.open(fp).convert("RGB").resize(CARD_SIZE, Image.LANCZOS)
            img.save(out, "JPEG", quality=FRONT_Q)
            count += 1
    print(f"[fronts] {count} files, {len(prioritized)} cards (m00~m{len(prioritized)-1:02d})")
    return len(prioritized)


def convert_backs(backs):
    sorted_uuids = sorted(backs.keys(), key=lambda u: mtime(backs[u]))
    DST_BACK.mkdir(parents=True, exist_ok=True)
    count = 0
    idx = 0
    for uuid in sorted_uuids:
        for v, fp in sorted(backs[uuid].items()):
            out = DST_BACK / f"{DECK_ID}_{idx}.jpg"
            img = Image.open(fp).convert("RGB").resize(CARD_SIZE, Image.LANCZOS)
            img.save(out, "JPEG", quality=BACK_Q)
            count += 1
            idx += 1
    print(f"[backs] {count} files ({DECK_ID}_0 ~ {DECK_ID}_{count - 1})")
    return count


def convert_cover(covers):
    if not covers:
        print("[cover] none — skip")
        return
    DST_INTRO.mkdir(parents=True, exist_ok=True)
    uuid = sorted(covers.keys(), key=lambda u: mtime(covers[u]))[0]
    files = covers[uuid]
    source = files.get(0) or files[min(files)]
    out = DST_INTRO / f"{DECK_ID}_cover.jpg"
    img = Image.open(source).convert("RGB")
    w, h = img.size
    if w != COVER_WIDTH:
        ratio = COVER_WIDTH / w
        img = img.resize((COVER_WIDTH, int(h * ratio)), Image.LANCZOS)
    img.save(out, "JPEG", quality=88)
    print(f"[cover] {out}")


if __name__ == "__main__":
    fronts, backs, covers, gif_path = classify()
    print(f"[scan] fronts={len(fronts)} backs={len(backs)} covers={len(covers)} gif={'yes' if gif_path else 'no'}")
    n = convert_fronts(fronts)
    b = convert_backs(backs)
    convert_cover(covers)
    print(f"\nDONE: cards={n}, backs={b}")
    print("[note] GIF 없음 → 소녀덱 girl_0.gif/webp 재사용 예정 (별도 단계)")
