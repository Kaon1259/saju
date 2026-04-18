"""
명화/ (masterpiece 타로) → tarot-masterpiece 덱 변환
- 앞면: 80 UUID → 상위 78개 × 4변형 → m00_v0..m77_v3.jpg (261x500, Q85)
- 뒷면: 3 UUID × 4변형 → /tarot-backs/masterpiece_0~11.jpg (261x500, Q88)
- GIF → masterpiece_cover.jpg + masterpiece_0.webp
"""

import re
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "명화"
DST_FRONT = BASE / "client" / "public" / "tarot-masterpiece"
DST_BACK = BASE / "client" / "public" / "tarot-backs"
DST_INTRO = BASE / "client" / "public" / "tarot-effects" / "deck-intro"
CARD_SIZE = (261, 500)
FRONT_Q = 85
BACK_Q = 88

UUID_RE = re.compile(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)\.png$')


def classify():
    backs, fronts = {}, {}
    for f in sorted(SRC.iterdir()):
        if f.suffix != ".png" or "(1)" in f.name:
            continue
        m = UUID_RE.search(f.name)
        if not m:
            continue
        uuid, v = m.group(1), int(m.group(2))
        (backs if "back_design" in f.name else fronts).setdefault(uuid, {})[v] = f
    return fronts, backs


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
            out = DST_BACK / f"masterpiece_{idx}.jpg"
            img = Image.open(fp).convert("RGB").resize(CARD_SIZE, Image.LANCZOS)
            img.save(out, "JPEG", quality=BACK_Q)
            count += 1
            idx += 1
    print(f"[backs] {count} files (masterpiece_0 ~ masterpiece_{count-1})")
    return count


def convert_gif():
    gifs = list(SRC.glob("*.gif"))
    if not gifs:
        print("[gif] none — skip")
        return
    gif_path = gifs[0]
    DST_INTRO.mkdir(parents=True, exist_ok=True)
    im = Image.open(gif_path)

    cover_out = DST_INTRO / "masterpiece_cover.jpg"
    im.seek(0)
    cover = im.convert("RGB")
    cw, ch = cover.size
    target_w = 600
    if cw != target_w:
        ratio = target_w / cw
        cover = cover.resize((target_w, int(ch * ratio)), Image.LANCZOS)
    cover.save(cover_out, "JPEG", quality=88)
    print(f"[cover] {cover_out}")

    webp_out = DST_INTRO / "masterpiece_0.webp"
    frames, durations = [], []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        frames.append(im.convert("RGBA").copy())
        durations.append(im.info.get("duration", 80))
    frames[0].save(webp_out, format="WEBP", save_all=True,
                   append_images=frames[1:], duration=durations,
                   loop=0, quality=75, method=6)
    print(f"[webp] {webp_out} ({len(frames)} frames)")


if __name__ == "__main__":
    fronts, backs = classify()
    print(f"[scan] fronts={len(fronts)} backs={len(backs)}")
    n = convert_fronts(fronts)
    b = convert_backs(backs)
    convert_gif()
    print(f"\nDONE: cards={n}, backs={b}")
