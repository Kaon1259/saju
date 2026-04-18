"""
classic/ 폴더 (mystical_neoclassical 스타일) → tarot-classic 덱 변환
- 228개 PNG (57 UUID × 4 variants) → m00_v0..m56_v3.jpg
- 모바일 사이즈 261x500, JPEG quality 85
- GIF → classic_cover.jpg (첫 프레임) + classic_0.webp (애니메이션)
"""

import re
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "classic"
DST = BASE / "client" / "public" / "tarot-classic"
INTRO = BASE / "client" / "public" / "tarot-effects" / "deck-intro"
TARGET_SIZE = (261, 500)
QUALITY = 85

UUID_RE = re.compile(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)\.png$')


def convert_cards():
    uuids = {}
    for f in sorted(SRC.iterdir()):
        if f.suffix != ".png":
            continue
        m = UUID_RE.search(f.name)
        if not m:
            continue
        uuid, variant = m.group(1), int(m.group(2))
        uuids.setdefault(uuid, {})[variant] = f

    def mtime(u):
        for v in (0, 1, 2, 3):
            if v in uuids[u]:
                return uuids[u][v].stat().st_mtime
        return 0

    sorted_uuids = sorted(uuids.keys(), key=mtime)
    complete = [u for u in sorted_uuids if len(uuids[u]) == 4]
    partial = [u for u in sorted_uuids if len(uuids[u]) < 4]
    prioritized = (complete + partial)[:78]

    DST.mkdir(parents=True, exist_ok=True)

    count = 0
    for idx, uuid in enumerate(prioritized):
        for v, fp in uuids[uuid].items():
            out = DST / f"m{idx:02d}_v{v}.jpg"
            img = Image.open(fp).convert("RGB").resize(TARGET_SIZE, Image.LANCZOS)
            img.save(out, "JPEG", quality=QUALITY)
            count += 1
    print(f"[cards] {count} files -> {DST}")
    return len(prioritized)


def convert_gif():
    gifs = list(SRC.glob("*.gif"))
    if not gifs:
        print("[gif] no gif found")
        return
    gif_path = gifs[0]
    INTRO.mkdir(parents=True, exist_ok=True)

    im = Image.open(gif_path)

    cover_out = INTRO / "classic_cover.jpg"
    im.seek(0)
    cover = im.convert("RGB")
    cw, ch = cover.size
    target_w = 600
    if cw != target_w:
        ratio = target_w / cw
        cover = cover.resize((target_w, int(ch * ratio)), Image.LANCZOS)
    cover.save(cover_out, "JPEG", quality=88)
    print(f"[cover] {cover_out}")

    webp_out = INTRO / "classic_0.webp"
    frames = []
    durations = []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        frames.append(im.convert("RGBA").copy())
        durations.append(im.info.get("duration", 80))
    frames[0].save(
        webp_out,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=75,
        method=6,
    )
    print(f"[webp] {webp_out} ({len(frames)} frames)")


if __name__ == "__main__":
    n = convert_cards()
    convert_gif()
    print(f"DONE: {n} cards")
