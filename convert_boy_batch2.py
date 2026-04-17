"""
부족카툰보이 신규 생성본 처리 (2차 배치)
- 걸 오염 파일 29개 자동 필터 → _origin/cartoon_girl/ 이동
- 보이 신규 34장 변환 (중복 3개 스킵) → tarot-cartoon-boy/
- 원본 → _origin/cartoon_boy/
"""
import shutil
from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Programs\MOBILE\saju")
SRC = BASE / "cartoon_boy"
DST_BOY = BASE / "client" / "public" / "tarot-cartoon-boy"
ORIGIN_BOY = BASE / "_origin" / "cartoon_boy"
ORIGIN_GIRL = BASE / "_origin" / "cartoon_girl"
TARGET_SIZE = (261, 500)
QUALITY = 85

# 보이 신규 UUID → 슬롯 (시각 식별 결과, 34장)
BOY_UUID_TO_SLOT = {
    # Major
    "91e8f324-b57c-4b5e-8307-3eb859e1db99": 19,   # The Sun
    "cb76364e-48fd-456e-b840-53a72e84bf5a": 20,   # Judgement
    "5c6f093d-6ac3-4321-bd51-a0ca561b8757": 21,   # The World
    # Wands
    "78d17444-a9a4-4f07-aa18-3087e57c15cc": 22,   # Ace of Wands
    "67da8318-eff0-479a-b260-061616ef9df0": 25,   # Four of Wands
    "0a3fe317-292c-4245-baab-3fcd95eaa520": 27,   # Six of Wands
    "9c4aff0a-a74b-4335-8c1d-36c7073ea114": 28,   # Seven of Wands
    "12499481-88ac-45e4-a749-63961a323b48": 29,   # Eight of Wands
    "3cd326a1-80b9-4ac2-9db0-83f24ed5fe95": 30,   # Nine of Wands
    "b28117e6-d8fd-458e-81c9-13b44e0ce911": 34,   # Queen of Wands
    "edf02227-968f-4426-97b3-cbe57b608461": 35,   # King of Wands
    # Cups
    "22b3b0b8-efca-4e4b-b1da-af7dae404804": 36,   # Ace of Cups
    "9d8e7da5-9f93-4ee6-bdbb-a29f43999d82": 38,   # Three of Cups
    "9c52c9ca-84e2-4fba-bb7f-918ed3b6d0c4": 41,   # Six of Cups
    "a0229ce0-a59f-4c58-98b1-8825eb33b2ed": 43,   # Eight of Cups
    "b0b6c212-ae0a-49ce-8ec8-ea02e71ebdc0": 44,   # Nine of Cups
    "26b53ab6-4b85-4b41-be6d-5a911dcec7db": 45,   # Ten of Cups
    "562efbe1-3569-4eee-b938-31fd087a2a78": 46,   # Page of Cups
    "56015f66-1429-48f3-8523-052adb6eddcb": 49,   # King of Cups
    # Swords
    "e85ee1cc-0651-44f1-800a-3f582f5e2d5d": 51,   # Two of Swords
    "490d8170-65c6-4ac7-b2fb-a7421459c392": 52,   # Three of Swords
    "b65aeb44-4169-41d4-b150-21a10b682041": 53,   # Four of Swords
    "04611f41-c7bf-4677-9bc4-aa0e4c263c9d": 54,   # Five of Swords
    "36842195-a604-4fac-baff-3faa35f802ba": 58,   # Nine of Swords
    "7faef0a0-101d-45ff-9c14-27d5d1ea34ae": 62,   # Queen of Swords
    "21b00029-d74a-481a-b115-814a87f047d9": 63,   # King of Swords
    # Pentacles
    "7bbfdde5-a8ba-4fb7-9644-549046770bde": 64,   # Ace of Pentacles
    "b9ff9a9d-6b9c-4ccb-8075-bba97e720a05": 68,   # Five of Pentacles
    "07f751c9-7789-4fef-96e5-625ef9da1612": 69,   # Six of Pentacles
    "a140f145-9abf-410b-ac65-8919bd508a25": 70,   # Seven of Pentacles
    "ece4852c-ae1f-4878-b2e3-00f8f62cda9b": 72,   # Nine of Pentacles
    "0ee3bdf9-3983-4ac3-a86f-3e79dd99e191": 73,   # Ten of Pentacles
    "9db865bc-5acc-4e8b-9c1a-414f45872a3a": 76,   # Queen of Pentacles
    "2f8fc14e-af00-479d-8337-24adb0691ec1": 77,   # King of Pentacles
}

# 중복 UUID (다른 UUID로 이미 m73/m77/m38 커버됨) — 스킵, 원본만 이동
BOY_DUP_SKIP = {
    "2a5e9b90-0d9e-4a65-b46b-631aa4720477",  # m73 dup
    "4bc746d4-5f58-43e1-9e85-bd97f2f43c1a",  # m77 dup
    "ccf2f605-efd1-4918-aa3c-997d605e1e92",  # m38 dup
}


def extract_uuid(fname):
    import re
    m = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d)(?:\s*\(1\))?\.png$', fname)
    return (m.group(1), int(m.group(2))) if m else (None, None)


def main():
    DST_BOY.mkdir(parents=True, exist_ok=True)
    ORIGIN_BOY.mkdir(parents=True, exist_ok=True)
    ORIGIN_GIRL.mkdir(parents=True, exist_ok=True)

    converted = 0
    boy_moved = 0
    girl_moved = 0
    dup_skipped = 0
    errors = []

    # 알려진 걸 UUID (기존 걸 원본에서 추출)
    known_girl_uuids = set()
    for f in ORIGIN_GIRL.iterdir():
        uuid, _ = extract_uuid(f.name)
        if uuid:
            known_girl_uuids.add(uuid)

    for f in sorted(SRC.iterdir()):
        if not f.name.endswith('.png'):
            continue
        uuid, variant = extract_uuid(f.name)
        if uuid is None:
            continue

        # 걸 오염 → _origin/cartoon_girl/로 이동
        if uuid in known_girl_uuids:
            shutil.move(str(f), str(ORIGIN_GIRL / f.name))
            girl_moved += 1
            print(f"  [GIRL→ORIG] {uuid[:8]} (contamination)")
            continue

        # 보이 신규
        if uuid in BOY_UUID_TO_SLOT:
            slot = BOY_UUID_TO_SLOT[uuid]
            out_name = f"m{slot:02d}_v{variant}.jpg"
            try:
                img = Image.open(f).convert("RGB").resize(TARGET_SIZE, Image.LANCZOS)
                img.save(DST_BOY / out_name, "JPEG", quality=QUALITY)
                converted += 1
                print(f"  [CONV] m{slot:02d}_v{variant}  <- {uuid[:8]}")
            except Exception as e:
                errors.append((f.name, str(e)))
                continue
            shutil.move(str(f), str(ORIGIN_BOY / f.name))
            boy_moved += 1
        elif uuid in BOY_DUP_SKIP:
            dup_skipped += 1
            shutil.move(str(f), str(ORIGIN_BOY / f.name))
            boy_moved += 1
            print(f"  [DUP-SKIP] {uuid[:8]}")
        else:
            errors.append((f.name, "unmapped"))
            print(f"  [UNMAPPED] {f.name}")

    print(f"\n{'='*60}")
    print(f"보이 변환: {converted} | 보이 이동: {boy_moved} | 걸 오염 이동: {girl_moved} | 중복 스킵: {dup_skipped}")
    if errors:
        print(f"\n에러 {len(errors)}:")
        for n, e in errors:
            print(f"  {n}: {e}")


if __name__ == "__main__":
    main()
