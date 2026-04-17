"""
부족카툰걸 신규 카드 변환 + 덱인트로 GIF → WebP 변환
- 35장 신규 카드 (부족카툰걸/) → 261x500 JPG → tarot-cartoon-girl/
- 원본 → _origin/cartoon_girl/
- /tarot-effects/deck-intro/*.gif → *.webp (용량 대폭 감소)
"""
import shutil
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "부족카툰걸"
DST = BASE / "client" / "public" / "tarot-cartoon-girl"
ORIGIN = BASE / "_origin" / "cartoon_girl"
DECK_INTRO = BASE / "client" / "public" / "tarot-effects" / "deck-intro"

TARGET_SIZE = (261, 500)
QUALITY = 85
WEBP_QUALITY = 80

UUID_TO_SLOT = {
    # Major
    "08649b24-6db9-4c5f-a7fb-af93bdf4c660": 11,   # Justice (girl, overwrites existing m11)
    # Wands
    "54e5a9b3-f5de-40e0-82c4-393410eeabad": 23,   # Two of Wands
    "e5b60110-475c-4c59-b853-e89ac43c72f4": 24,   # Three of Wands
    "5abc44ae-0afd-4a5a-8474-67a2e3ff8a6d": 25,   # Four of Wands
    "49761c31-67a2-4693-bbdf-7f138aa4add7": 26,   # Five of Wands
    "67c55b20-3731-40fa-916a-35c12464c2e2": 30,   # Nine of Wands
    "e1f54382-23b7-442e-9735-14193d6fc80d": 31,   # Ten of Wands
    "105cafe5-ba47-4837-adef-a307b9ca872d": 32,   # Page of Wands
    "9bbc565e-008d-4820-9417-87ab3bf06574": 33,   # Knight of Wands
    "85aded23-5c33-4ae6-a082-3c1fb8ace140": 34,   # Queen of Wands
    "f54db6fd-a33f-4e13-bbed-1f8c5e98085f": 35,   # King of Wands
    # Cups
    "4105d875-7ad9-4f25-8440-b6cbf46de3f3": 39,   # Four of Cups
    "74c0e30a-cb8b-4e07-84ba-e33487c8789a": 40,   # Five of Cups
    "7cfc5150-1bcf-499a-a427-d076e36b71ba": 41,   # Six of Cups
    "d87012d9-932b-4206-a08e-c486d916a9c5": 44,   # Nine of Cups
    "e066f19b-bc2f-459e-8e20-fd2d4e572072": 46,   # Page of Cups
    "4e962044-a28f-4a80-9063-568cf7c928b0": 47,   # Knight of Cups
    "159926c8-6401-4988-9145-0a583c1417a0": 48,   # Queen of Cups
    # Swords
    "6c7414ba-b4c0-4581-a8ad-50b38c0814ad": 51,   # Two of Swords
    "dd6ccafd-88b6-4c79-a724-bc387e613d4f": 52,   # Three of Swords
    "17bff508-1caf-4d99-9227-cd9ac9defc11": 53,   # Four of Swords
    "ff7d0a53-f9fa-42ae-98ff-462f41f9c3ce": 56,   # Seven of Swords
    "8f11ea74-d8ee-4d74-bbff-ad2c8db95f04": 58,   # Nine of Swords
    "6b1a4dc4-2434-41bb-a78e-d39b25bcd1d3": 59,   # Ten of Swords
    "b57410b4-d6e1-4152-9a86-0decb346b6b5": 60,   # Page of Swords
    # Pentacles
    "3f22ffbd-deaa-476b-892b-31ba04bf7787": 64,   # Ace of Pentacles
    "e2af940d-c119-4174-8708-ebaf927b6b24": 65,   # Two of Pentacles
    "ae4c0576-b188-4844-98ef-51c9e17856bc": 66,   # Three of Pentacles
    "eebdb858-23af-408f-941f-a35bbe6a8a78": 67,   # Four of Pentacles
    "17513113-e334-4465-947e-550326d5369f": 68,   # Five of Pentacles
    "ef00cea4-c80e-4fe5-8955-639fa8b860e6": 70,   # Seven of Pentacles
    "6b77188c-1052-4320-9770-1a8138fd20b2": 73,   # Ten of Pentacles
    "cdf370ec-c7c0-491b-a233-dc1b9067930b": 74,   # Page of Pentacles
    "ad27005a-02e5-4e77-b80a-e9c133cb0059": 75,   # Knight of Pentacles
    "32080172-e128-4305-b602-2bb255bfd14c": 76,   # Queen of Pentacles
}
# 보이 잔여 파일 (스킵)
SKIP_UUIDS = {"f21fa6e0-8b3d-4d12-b312-d37abb6cc2c1"}


def extract_uuid(fname):
    import re
    m = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)(?:\s*\(1\))?\.png$', fname)
    if m:
        return m.group(1), int(m.group(2))
    return None, None


def convert_cards():
    DST.mkdir(parents=True, exist_ok=True)
    ORIGIN.mkdir(parents=True, exist_ok=True)
    converted, moved, skipped = 0, 0, 0
    for f in sorted(SRC.iterdir()):
        if not f.name.endswith('.png'):
            continue
        uuid, variant = extract_uuid(f.name)
        if uuid is None:
            continue
        if uuid in UUID_TO_SLOT:
            slot = UUID_TO_SLOT[uuid]
            out_name = f"m{slot:02d}_v{variant}.jpg"
            try:
                img = Image.open(f).convert("RGB").resize(TARGET_SIZE, Image.LANCZOS)
                img.save(DST / out_name, "JPEG", quality=QUALITY)
                converted += 1
                print(f"  [CONV] m{slot:02d}_v{variant}  <- {uuid[:8]}")
            except Exception as e:
                print(f"  [ERR] {f.name}: {e}")
                continue
        elif uuid in SKIP_UUIDS:
            skipped += 1
            print(f"  [SKIP] {uuid[:8]} (leftover)")
        else:
            print(f"  [UNMAPPED] {f.name}")
            continue
        shutil.move(str(f), str(ORIGIN / f.name))
        moved += 1
    print(f"\n카드 변환: {converted} | 이동: {moved} | 스킵: {skipped}")


def gif_to_webp(gif_path, webp_path, quality=WEBP_QUALITY):
    """GIF 애니메이션을 WebP 애니메이션으로 변환"""
    img = Image.open(gif_path)
    frames = []
    durations = []
    try:
        while True:
            frame = img.convert("RGBA")
            frames.append(frame.copy())
            durations.append(img.info.get('duration', 100))
            img.seek(img.tell() + 1)
    except EOFError:
        pass
    if not frames:
        return None
    frames[0].save(
        webp_path, "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=quality,
        method=6,  # 최고 압축 (느리지만 용량↓)
    )
    return gif_path.stat().st_size, webp_path.stat().st_size


def convert_gifs_to_webp():
    print(f"\n{'='*60}\nGIF → WebP 변환 시작")
    total_gif, total_webp = 0, 0
    for gif in sorted(DECK_INTRO.glob("*.gif")):
        webp = gif.with_suffix(".webp")
        try:
            sizes = gif_to_webp(gif, webp)
            if sizes is None:
                print(f"  [ERR] {gif.name}: no frames")
                continue
            gs, ws = sizes
            total_gif += gs
            total_webp += ws
            ratio = (1 - ws / gs) * 100
            print(f"  [WebP] {gif.name}: {gs/1024:.0f}KB → {ws/1024:.0f}KB ({ratio:.0f}% 감소)")
        except Exception as e:
            print(f"  [ERR] {gif.name}: {e}")
    if total_gif:
        print(f"\n총합: {total_gif/1024/1024:.1f}MB → {total_webp/1024/1024:.1f}MB ({(1-total_webp/total_gif)*100:.0f}% 감소)")


if __name__ == "__main__":
    convert_cards()
    convert_gifs_to_webp()
