"""
모바일 최적화: client/public 의 타로 이미지를 WebP로 변환 + 사이즈 축소.

처리 대상:
- tarot-{deck}/m{NN}_v{V}.jpg → m{NN}_v{V}.webp  (196x376, q75)
- tarot-backs/{deck}_{N}.jpg → {deck}_{N}.webp  (196x376, q80)
- tarot-frames/frame_{S}_{V}.png → frame_{S}_{V}.webp (alpha 유지, 270x520, q80)
- tarot-effects/deck-intro/{deck}_cover.jpg → 동일 자리 .webp (320w, q80)
  (deck-intro의 _0.webp 인트로는 그대로 두거나 별도 옵션)

옵션:
- --deck DECK_ID  : 특정 덱만 변환 (예: --deck newclassic). 미지정 시 8개 모두.
- --keep-original : 원본 .jpg/.png 보존 (검증용). 기본은 변환 후 삭제.
- --decks-only    : 카드 + 뒷면만 (frames, deck-intro 제외)
- --frames-only   : tarot-frames 만
- --intros-only   : deck-intro 만

사용 예:
    python convert_to_webp_mobile.py --deck newclassic --keep-original
    python convert_to_webp_mobile.py --frames-only
    python convert_to_webp_mobile.py            # 전체 변환 + 원본 삭제
"""

import argparse
import sys
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent
PUBLIC = BASE / "client" / "public"

DECKS = [
    "newclassic", "jester", "masterpiece",
    "cartoon_girl", "cartoon_boy",
    "kdrama", "celestial", "lady",
]

# DECK_LIST의 backs 파일 개수 (Tarot.jsx 참조)
DECK_BACK_COUNTS = {
    "newclassic": 8, "jester": 16, "masterpiece": 12,
    "cartoon_girl": 4, "cartoon_boy": 4,
    "kdrama": 12, "celestial": 16, "lady": 16,
}

# 모바일 화면용 사이즈 (Tarot.css의 카드 표시 사이즈 기준 ×2 retina)
CARD_SIZE = (196, 376)
BACK_SIZE = (196, 376)
FRAME_SIZE = (270, 520)  # 카드보다 약간 큼 (테두리 오버레이)
COVER_WIDTH = 320

CARD_Q = 75
BACK_Q = 80
FRAME_Q = 80
COVER_Q = 80


def convert_image(src: Path, dst: Path, size, quality, keep_alpha=False):
    """src → dst (.webp). size 는 (w,h) 또는 width int (높이 자동). dst 디렉토리는 미리 존재 가정."""
    try:
        with Image.open(src) as img:
            if keep_alpha and img.mode in ("RGBA", "LA"):
                pass
            elif img.mode not in ("RGB",):
                img = img.convert("RGB")

            if isinstance(size, tuple):
                img = img.resize(size, Image.LANCZOS)
            elif isinstance(size, int):
                # 폭 기준 비율 유지
                w, h = img.size
                new_h = int(h * size / w)
                img = img.resize((size, new_h), Image.LANCZOS)

            save_kwargs = {"quality": quality, "method": 6}
            img.save(dst, "WEBP", **save_kwargs)
        return True
    except Exception as e:
        print(f"  ! FAIL {src.name}: {e}", file=sys.stderr)
        return False


def convert_deck(deck: str, keep_original: bool):
    deck_dir = PUBLIC / f"tarot-{deck.replace('_', '-') if deck.startswith('cartoon') else deck}"
    if not deck_dir.exists():
        print(f"[SKIP] {deck_dir} 없음")
        return 0, 0

    jpgs = sorted(deck_dir.glob("m*_v*.jpg"))
    if not jpgs:
        print(f"[SKIP] {deck_dir}: m*_v*.jpg 없음")
        return 0, 0

    ok = fail = 0
    for src in jpgs:
        dst = src.with_suffix(".webp")
        if convert_image(src, dst, CARD_SIZE, CARD_Q):
            if not keep_original:
                src.unlink()
            ok += 1
        else:
            fail += 1
    print(f"  [{deck}] cards: ok={ok}, fail={fail} ({len(jpgs)}개)")
    return ok, fail


def convert_backs(keep_original: bool):
    backs_dir = PUBLIC / "tarot-backs"
    if not backs_dir.exists():
        print(f"[SKIP] {backs_dir} 없음")
        return 0, 0

    ok = fail = 0
    total = 0
    for deck, n in DECK_BACK_COUNTS.items():
        for i in range(n):
            src = backs_dir / f"{deck}_{i}.jpg"
            if not src.exists():
                continue
            total += 1
            dst = src.with_suffix(".webp")
            if convert_image(src, dst, BACK_SIZE, BACK_Q):
                if not keep_original:
                    src.unlink()
                ok += 1
            else:
                fail += 1
    print(f"  backs: ok={ok}, fail={fail} ({total}개)")
    return ok, fail


def convert_frames(keep_original: bool):
    frames_dir = PUBLIC / "tarot-frames"
    if not frames_dir.exists():
        return 0, 0
    pngs = sorted(frames_dir.glob("frame_*.png"))
    ok = fail = 0
    for src in pngs:
        dst = src.with_suffix(".webp")
        if convert_image(src, dst, FRAME_SIZE, FRAME_Q, keep_alpha=True):
            if not keep_original:
                src.unlink()
            ok += 1
        else:
            fail += 1
    print(f"  frames: ok={ok}, fail={fail} ({len(pngs)}개)")
    return ok, fail


def convert_covers(keep_original: bool):
    intro_dir = PUBLIC / "tarot-effects" / "deck-intro"
    if not intro_dir.exists():
        return 0, 0
    ok = fail = 0
    for deck in DECKS:
        src = intro_dir / f"{deck}_cover.jpg"
        if not src.exists():
            continue
        dst = src.with_suffix(".webp")
        if convert_image(src, dst, COVER_WIDTH, COVER_Q):
            if not keep_original:
                src.unlink()
            ok += 1
        else:
            fail += 1
    print(f"  covers: ok={ok}, fail={fail}")
    return ok, fail


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--deck", help="단일 덱만 (예: newclassic)")
    p.add_argument("--keep-original", action="store_true", help="원본 보존 (검증용)")
    p.add_argument("--decks-only", action="store_true", help="카드+뒷면만")
    p.add_argument("--frames-only", action="store_true", help="frames만")
    p.add_argument("--intros-only", action="store_true", help="deck-intro만")
    args = p.parse_args()

    keep = args.keep_original
    print(f"=== mobile WebP 변환 (keep_original={keep}) ===")

    if args.frames_only:
        convert_frames(keep)
        return
    if args.intros_only:
        convert_covers(keep)
        return

    # 카드 변환
    target_decks = [args.deck] if args.deck else DECKS
    for deck in target_decks:
        convert_deck(deck, keep)

    if args.decks_only:
        convert_backs(keep)
        return

    # 단일 덱이 아니면 backs/frames/covers도 함께
    if not args.deck:
        convert_backs(keep)
        convert_frames(keep)
        convert_covers(keep)


if __name__ == "__main__":
    main()
