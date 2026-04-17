"""
cartoon_boy 폴더 → tarot-cartoon-boy 변환 + 걸/보이 GIF 분리 + 덱 인트로 설정
- 43개 보이 카드 PNG → 261x500 JPG (mobile)
- Six of Wands GIF (cartoon_girl) → girl deck-intro 갱신
- Two of Pentacles GIF (cartoon_boy) → boy deck-intro 생성
- 4개 카드백 생성 (Page of Wands 4변형 재활용)
- 원본 전체 → _origin/cartoon_boy/
"""
import shutil
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "cartoon_boy"
DST = BASE / "client" / "public" / "tarot-cartoon-boy"
ORIGIN = BASE / "_origin" / "cartoon_boy"
DECK_INTRO = BASE / "client" / "public" / "tarot-effects" / "deck-intro"
BACKS_DIR = BASE / "client" / "public" / "tarot-backs"

TARGET_SIZE = (261, 500)
COVER_SIZE = (400, 600)  # 덱 커버 조금 더 크게
BACK_SIZE = (261, 500)
QUALITY = 85

UUID_TO_SLOT = {
    # Major Arcana
    "adf05399-a1b8-4a7b-9535-ee8b808a05a8": 0,    # Fool
    "6ca2ff98-3535-4428-9251-bc1f9fa71025": 1,    # Magician
    "5ef19f99-b65e-4816-9e6c-ccf9840c4cfb": 2,    # High Priestess
    "aaae93cf-aebc-4cfe-9e51-15c7c05a8ef6": 3,    # Empress
    "3816a1f6-175e-4d65-a998-d097a06e3e9f": 4,    # Emperor
    "0e9cbb80-3efb-4ae2-a828-8e87e558ba74": 5,    # Hierophant
    "81b595d6-58da-413c-8ec1-c7b29dfdd119": 6,    # Lovers
    "c2d2b9b8-2996-44ec-8d9b-f16dd74001bd": 7,    # Chariot
    "a9116ca8-8e99-41a1-b5f0-66c845257caf": 8,    # Strength
    "641b17b2-1241-4e1f-9f30-2547fc4ba835": 9,    # Hermit
    "6c05a3f2-8706-48c5-9d24-9f4f41245238": 10,   # Wheel of Fortune
    "08649b24-6db9-4c5f-a7fb-af93bdf4c660": 11,   # Justice
    "e2cc1557-555b-46c9-8e5f-01b03859079c": 12,   # Hanged Man
    "03cbefa5-b24d-4205-91d3-907d5e823df9": 13,   # Death
    "e242718f-0408-480f-a2c6-e09b7c384ac8": 14,   # Temperance
    "3c471c65-42e1-4846-ab8c-74e647f97509": 15,   # Devil
    "78b030ea-7d15-4c7a-b0fc-fbc2a0a4e92d": 16,   # Tower
    "7977b162-78b2-4525-8ac1-0025add0caa8": 17,   # Star
    "779dffd0-e3d1-4fcb-ae48-fef99558d0c0": 18,   # Moon
    # Wands
    "39cfed32-e6ee-43e8-9410-59482f9a5132": 23,   # Two of Wands
    "c7cfccce-699d-4bdf-9b15-0d2230bf0768": 24,   # Three of Wands
    "f00ef1dc-bae1-4d45-849e-321adcb285d1": 26,   # Five of Wands
    "d7fd4907-188b-44d2-b8a7-7fa9d0ca7dec": 31,   # Ten of Wands
    "3abe8119-586e-49a8-8deb-1a2d2644ee3b": 32,   # Page of Wands
    "aead8ef4-24fe-4958-b264-6b0569cdc657": 33,   # Knight of Wands
    # Cups
    "fafc9caa-990e-478f-a7d9-364b59f26635": 39,   # Four of Cups
    "c43a5326-1e4a-4051-b8c0-add26a291cde": 40,   # Five of Cups
    "0f4048fe-633c-4193-bb65-16824c62a9b6": 42,   # Seven of Cups
    "03d1ca58-4e31-440d-88c2-ed33540c5f00": 47,   # Knight of Cups
    "e09867b9-e799-4c73-852f-71c85c07abc7": 48,   # Queen of Cups
    # Swords
    "d1945f29-dbac-4547-aef9-ea9c06ceb98c": 50,   # Ace of Swords
    "f21fa6e0-8b3d-4d12-b312-d37abb6cc2c1": 55,   # Six of Swords
    "157078cc-58f2-444b-bdcf-66ed9c3f697f": 56,   # Seven of Swords
    "b98144d6-7e57-4be2-91d5-9ae3fd40ca49": 57,   # Eight of Swords
    "7e4e0429-b1eb-4522-9018-443f5bffccdd": 59,   # Ten of Swords
    "5375b207-bf34-4989-838d-5a0a7fd9968f": 60,   # Page of Swords
    "1338312d-6d24-408c-9036-91b8f2311bc9": 61,   # Knight of Swords
    # Pentacles
    "00238503-572e-429c-a332-0fe7d8164be5": 65,   # Two of Pentacles (PNG)
    "4d736677-4275-4ad4-aba8-b1f53b513b28": 66,   # Three of Pentacles
    "f4486b77-83e7-4e33-8103-6845aa59831b": 67,   # Four of Pentacles
    "f623f6e8-517b-4575-bf53-634061887991": 71,   # Eight of Pentacles
    "764ae34a-8dfc-4112-9d3f-3fe1b896020c": 74,   # Page of Pentacles
    "20c267d3-0a4e-4007-aeca-f77f1059cf5c": 75,   # Knight of Pentacles
}

BOY_GIF_UUID = "0444c76c-912d-46c6-a911-340843a97b35"  # Two of Pentacles boy GIF
GIRL_GIF_UUID = "8acbb817-3cee-473b-95c5-448c0763e68e"  # Six of Wands girl GIF


def extract_uuid(fname):
    import re
    m = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)(?:\s*\(1\))?\.(png|gif)$', fname)
    if m:
        return m.group(1), int(m.group(2)), m.group(3)
    return None, None, None


def convert_png(src, dst):
    img = Image.open(src).convert("RGB")
    img = img.resize(TARGET_SIZE, Image.LANCZOS)
    img.save(dst, "JPEG", quality=QUALITY)


def extract_gif_frame(gif_path, out_path, size=COVER_SIZE):
    """GIF 첫 프레임을 JPG로 저장"""
    img = Image.open(gif_path)
    img.seek(0)
    frame = img.convert("RGB")
    # 비율 유지 리사이즈
    frame.thumbnail(size, Image.LANCZOS)
    frame.save(out_path, "JPEG", quality=QUALITY)


def main():
    DST.mkdir(parents=True, exist_ok=True)
    ORIGIN.mkdir(parents=True, exist_ok=True)
    DECK_INTRO.mkdir(parents=True, exist_ok=True)
    BACKS_DIR.mkdir(parents=True, exist_ok=True)

    converted = 0
    skipped = 0
    moved = 0

    # 1. GIF 처리 (걸/보이 각각) — 먼저 커버/gif 생성
    girl_gif_src = SRC / f"u1271628497_soft_watercolor_cartoon_illustration_in_storybook_{GIRL_GIF_UUID}_2.gif"
    boy_gif_src = SRC / f"u1271628497_soft_watercolor_cartoon_illustration_in_storybook_{BOY_GIF_UUID}_1.gif"

    if girl_gif_src.exists():
        # Girl cover + gif 업데이트
        girl_cover = DECK_INTRO / "cartoon_girl_cover.jpg"
        girl_gif_dst = DECK_INTRO / "cartoon_girl_0.gif"
        extract_gif_frame(girl_gif_src, girl_cover)
        shutil.copy(str(girl_gif_src), str(girl_gif_dst))
        print(f"[GIRL] cover+gif updated from Six of Wands")
    else:
        print("[WARN] girl GIF not found")

    if boy_gif_src.exists():
        # Boy cover + gif 생성
        boy_cover = DECK_INTRO / "cartoon_boy_cover.jpg"
        boy_gif_dst = DECK_INTRO / "cartoon_boy_0.gif"
        extract_gif_frame(boy_gif_src, boy_cover)
        shutil.copy(str(boy_gif_src), str(boy_gif_dst))
        print(f"[BOY] cover+gif created from Two of Pentacles")
    else:
        print("[WARN] boy GIF not found")

    # 2. 카드 PNG 변환
    for f in sorted(SRC.iterdir()):
        if f.is_dir():
            continue
        uuid, variant, ext = extract_uuid(f.name)
        if uuid is None:
            # (1) 중복 등 무시
            continue

        if ext == "gif":
            # GIF는 이미 처리됨 — 원본만 이동
            pass
        elif uuid in UUID_TO_SLOT:
            slot = UUID_TO_SLOT[uuid]
            out_name = f"m{slot:02d}_v{variant}.jpg"
            try:
                convert_png(f, DST / out_name)
                converted += 1
                print(f"  [CONV] m{slot:02d}_v{variant}  <- {uuid[:8]}")
            except Exception as e:
                print(f"  [ERR] {f.name}: {e}")
                continue
        else:
            skipped += 1
            print(f"  [SKIP] {uuid[:8]} (unmapped)")

        # 원본 이동
        try:
            shutil.move(str(f), str(ORIGIN / f.name))
            moved += 1
        except Exception as e:
            print(f"  [MOVE-ERR] {f.name}: {e}")

    # 3. 보이 카드 뒷면 생성 (Page of Wands 4변형 재활용, 이미 변환된 m32에서 복사)
    page_wands_base = DST / "m32_v0.jpg"
    if page_wands_base.exists():
        for i in range(4):
            src = DST / f"m32_v{i}.jpg"
            if src.exists():
                # 뒷면용으로 복사 — 그냥 얼굴 이미지라 실용상 괜찮음
                shutil.copy(str(src), str(BACKS_DIR / f"cartoon_boy_{i}.jpg"))
        print(f"[BACKS] cartoon_boy backs created from Page of Wands variants")

    print(f"\n{'='*60}")
    print(f"Converted: {converted} | Moved: {moved} | Skipped: {skipped}")


if __name__ == "__main__":
    main()
