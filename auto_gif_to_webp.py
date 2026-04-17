"""
GIF → WebP 자동 변환 유틸리티

사용법:
  python auto_gif_to_webp.py                           # deck-intro/ 전체 스캔
  python auto_gif_to_webp.py path/to/dir               # 지정 폴더 스캔
  python auto_gif_to_webp.py path/to/file.gif          # 단일 파일
  python auto_gif_to_webp.py --keep-gif                # 변환 후 원본 GIF 유지 (기본: 삭제)
  python auto_gif_to_webp.py --quality 85              # WebP 품질 지정 (기본 80)

동작:
  - GIF를 애니메이션 WebP로 변환 (loop 유지, duration 유지, method=6 고압축)
  - 변환 성공 시 원본 GIF 삭제 (--keep-gif 주면 보존)
  - 전후 크기 비교 출력
"""
import sys
import argparse
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent
DEFAULT_TARGET = BASE / "client" / "public" / "tarot-effects" / "deck-intro"


def gif_to_webp(gif_path: Path, quality: int = 80) -> tuple[int, int] | None:
    """단일 GIF를 같은 폴더에 .webp로 변환. (gif_size, webp_size) 리턴."""
    webp_path = gif_path.with_suffix(".webp")
    img = Image.open(gif_path)
    frames, durations = [], []
    try:
        while True:
            frames.append(img.convert("RGBA").copy())
            durations.append(img.info.get("duration", 100))
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
        method=6,
    )
    return gif_path.stat().st_size, webp_path.stat().st_size


def collect_gifs(target: Path) -> list[Path]:
    if target.is_file():
        return [target] if target.suffix.lower() == ".gif" else []
    if target.is_dir():
        return sorted(target.rglob("*.gif"))
    return []


def main():
    parser = argparse.ArgumentParser(description="GIF → WebP 자동 변환")
    parser.add_argument("path", nargs="?", default=str(DEFAULT_TARGET),
                        help=f"변환 대상 (기본: {DEFAULT_TARGET})")
    parser.add_argument("--keep-gif", action="store_true", help="변환 후 원본 GIF 유지")
    parser.add_argument("--quality", type=int, default=80, help="WebP 품질 0-100 (기본 80)")
    args = parser.parse_args()

    target = Path(args.path).resolve()
    gifs = collect_gifs(target)
    if not gifs:
        print(f"GIF 없음: {target}")
        sys.exit(0)

    print(f"대상: {target}")
    print(f"GIF {len(gifs)}개 발견\n")

    total_gif, total_webp = 0, 0
    ok, fail = 0, 0
    for gif in gifs:
        try:
            sizes = gif_to_webp(gif, quality=args.quality)
            if sizes is None:
                print(f"  [SKIP] {gif.name}: 프레임 없음")
                fail += 1
                continue
            gs, ws = sizes
            total_gif += gs
            total_webp += ws
            ratio = (1 - ws / gs) * 100
            action = "유지" if args.keep_gif else "삭제"
            print(f"  [OK] {gif.name}: {gs/1024:.0f}KB → {ws/1024:.0f}KB ({ratio:+.0f}%) / 원본 {action}")
            if not args.keep_gif:
                gif.unlink()
            ok += 1
        except Exception as e:
            print(f"  [ERR] {gif.name}: {e}")
            fail += 1

    print(f"\n성공 {ok} / 실패 {fail}")
    if total_gif:
        print(f"총합: {total_gif/1024/1024:.1f}MB → {total_webp/1024/1024:.1f}MB ({(1-total_webp/total_gif)*100:.0f}% 감소)")


if __name__ == "__main__":
    main()
