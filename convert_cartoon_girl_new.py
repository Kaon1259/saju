"""
신규 cartoon_girl 폴더 → tarot-cartoon-girl 변환 스크립트
- UUID → 카드 슬롯 매핑 (시각 식별 결과)
- 896x1344 PNG → 261x500 JPG (모바일 최적화, quality 85)
- 원본은 _origin/cartoon_girl/로 이동
"""
import shutil
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "cartoon_girl"
DST = BASE / "client" / "public" / "tarot-cartoon-girl"
ORIGIN = BASE / "_origin" / "cartoon_girl"
TARGET_SIZE = (261, 500)
QUALITY = 85

# UUID → card slot (0-77) 매핑
# Major Arcana: 0=Fool..21=World
# Wands: 22..35  Cups: 36..49  Swords: 50..63  Pentacles: 64..77
UUID_TO_SLOT = {
    "38b491c3-013a-4d27-9cdb-c344cb3c7630": 0,    # Fool
    "ea05ca60-2582-4cbf-a712-9e6f3fdf6074": 1,    # Magician
    "05414ab7-336f-42e3-a27a-9e7bc3c8f66b": 2,    # High Priestess
    "9b60cbc1-9a8c-44c1-885f-608b7410eba4": 3,    # Empress
    "7a681269-0a8e-4f04-b0c5-b366a3851ed3": 4,    # Emperor
    "0d6615f8-7bf6-4d6a-9058-a04895a081e5": 5,    # Hierophant
    "a04de8cd-a3f9-4145-a6c5-137266bbd9f0": 6,    # Lovers
    "b9f997de-e15d-47c8-a143-9c58148b6bde": 7,    # Chariot
    "43d894c0-cf75-4985-b671-f94da3529cbb": 8,    # Strength
    "5df3663c-bc22-492e-bb47-a111a563bde3": 9,    # Hermit
    "73d342ce-8ccb-4f61-a7ae-07fd9e2dd751": 10,   # Wheel of Fortune
    "2ae77db3-ef12-491d-b621-0b3f5bb01454": 11,   # Justice
    "474312f5-a455-4609-9bf9-920df6eb0c95": 12,   # Hanged Man
    "cbfe44b3-61e1-4a49-80ed-c5e83dae0a15": 13,   # Death
    "d9988293-d157-4110-9680-f423d844285a": 14,   # Temperance
    "7e31ccfe-5229-4be6-8cf8-3d3310122790": 15,   # Devil
    "1bdea037-61a7-4623-88a9-02c42b1b29fa": 16,   # Tower
    "239e4c45-86b7-40cc-a2e0-6092f131bf0f": 17,   # Star
    "5ac6ee76-a08a-4386-9f1c-7bf86d2f4b3c": 18,   # Moon
    "52333ec8-4902-4e96-ae51-0f55f5cf3906": 19,   # Sun
    "64ec9bba-bd49-426d-ae65-d9479bc1ab14": 20,   # Judgement
    "880090ad-d77e-4e6e-ba32-5e19b8eac22e": 21,   # World
    # Wands
    "b406e1ba-2baf-4e89-abe3-a34fb19d74a2": 22,   # Ace of Wands
    "07805be6-c301-4492-976e-57be2fdf0f34": 27,   # Six of Wands
    "0e907e4e-29c0-4c13-8f1c-26615f4cb58c": 28,   # Seven of Wands
    "b5158af5-32cb-447d-b6b6-40cf07272c77": 29,   # Eight of Wands
    # Cups
    "8164a103-dabf-41eb-979a-04e6979ee3a3": 36,   # Ace of Cups
    "eb696494-7450-4c59-8682-ca4a3570fb07": 37,   # Two of Cups
    "635ffbae-a39b-429d-9cef-65ca779a5cce": 38,   # Three of Cups
    "c70fc608-5504-4b10-b45d-4f2dc89d702e": 42,   # Seven of Cups
    "445e3409-a2f1-44b9-b5b8-150fabd494aa": 43,   # Eight of Cups
    "b1a5a2fb-43be-4477-ad3c-cf1896869457": 45,   # Ten of Cups (선택: clean green-dress variant)
    "d51876d4-c569-4440-9b09-851c555e73ed": 49,   # King of Cups
    # Swords
    "6acc403e-bf4f-419b-9863-19e52dc062c4": 50,   # Ace of Swords
    "b6b20898-17af-4b54-bd92-3758cd7e228d": 54,   # Five of Swords
    "62c98741-fda1-4b7c-902a-ce994a26a51a": 55,   # Six of Swords
    "2f9e3b8c-5bb6-40d2-9f35-d9ed52d655c5": 57,   # Eight of Swords
    "7a177e54-00a7-45de-8f10-e081a174c002": 61,   # Knight of Swords
    "bb5c8f60-8c34-4554-ae8e-72f1e413bb63": 62,   # Queen of Swords
    "235575a0-90eb-402b-907b-72d705d84c4a": 63,   # King of Swords
    # Pentacles
    "270766de-8f7b-4215-91e2-f4e63835ac5b": 69,   # Six of Pentacles
    "d57568fa-6bab-4d77-889f-d148ae336583": 71,   # Eight of Pentacles
    "2b037050-0063-4068-b489-af91b1e4e1bf": 72,   # Nine of Pentacles
    "4f208b57-1469-40f8-8c60-73238a7b6513": 77,   # King of Pentacles (선택: bright gold variant)
}

# 중복/보이 마스코트 UUID: 변환 스킵, 원본만 _origin으로 이동
SKIP_UUIDS = {
    "abaa94dd-b64b-4167-b9cb-64ddc4d89bac",  # 소년 마스코트
    "8477437f-06db-4ac9-b4f9-eb1d81907596",  # Ten of Cups 중복
    "ae376d56-339a-4c1f-aa9f-55baf5b9638e",  # King of Pentacles 중복
}

def extract_uuid(fname):
    # u1271628497_soft_watercolor_cartoon_illustration_in_storybook_{UUID}_{N}.png
    import re
    m = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)\.png$', fname)
    if m:
        return m.group(1), int(m.group(2))
    return None, None

def main():
    DST.mkdir(parents=True, exist_ok=True)
    ORIGIN.mkdir(parents=True, exist_ok=True)

    converted = 0
    moved = 0
    skipped = 0
    errors = []

    for f in sorted(SRC.iterdir()):
        if not f.name.endswith('.png'):
            continue
        uuid, variant = extract_uuid(f.name)
        if uuid is None:
            continue

        # 변환 대상 UUID
        if uuid in UUID_TO_SLOT:
            slot = UUID_TO_SLOT[uuid]
            out_name = f"m{slot:02d}_v{variant}.jpg"
            out_path = DST / out_name
            try:
                img = Image.open(f).convert("RGB")
                img = img.resize(TARGET_SIZE, Image.LANCZOS)
                img.save(out_path, "JPEG", quality=QUALITY)
                converted += 1
                print(f"  [CONV] m{slot:02d}_v{variant}  <- {uuid[:8]}")
            except Exception as e:
                errors.append((f.name, str(e)))
                print(f"  [ERR]  {f.name}: {e}")
                continue
        elif uuid in SKIP_UUIDS:
            skipped += 1
            print(f"  [SKIP] {uuid[:8]} (duplicate/mascot)")
        else:
            errors.append((f.name, "unmapped UUID"))
            print(f"  [UNMAPPED] {f.name}")
            continue

        # 원본 이동
        dest = ORIGIN / f.name
        shutil.move(str(f), str(dest))
        moved += 1

    print(f"\n{'='*60}")
    print(f"Converted: {converted} | Moved: {moved} | Skipped: {skipped}")
    if errors:
        print(f"Errors: {len(errors)}")
        for n, e in errors:
            print(f"  {n}: {e}")

if __name__ == "__main__":
    main()
