#!/usr/bin/env python3
"""Generate lightweight WebP photos for the trip website.

Usage:
    python scripts/generate_web_photos.py
    python scripts/generate_web_photos.py --force
    python scripts/generate_web_photos.py --prune
    python scripts/generate_web_photos.py --source pictures/4_days_HR --output public/photos
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageOps, UnidentifiedImageError


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MANIFEST_NAME = "manifest.json"


@dataclass(frozen=True)
class SourceImage:
    """A source image and its derived output path."""

    source_path: Path
    source_relative_path: Path
    output_path: Path
    output_relative_path: Path


@dataclass
class RunStats:
    """Counters and aggregate sizes for a generator run."""

    processed: int = 0
    skipped: int = 0
    regenerated: int = 0
    failed: int = 0
    pruned: int = 0
    total_input_size: int = 0
    total_output_size: int = 0


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""

    parser = argparse.ArgumentParser(
        description="Generate website-ready WebP photos from high-resolution trip images."
    )
    parser.add_argument("--source", type=Path, default=Path("pictures/4_days_HR"))
    parser.add_argument("--output", type=Path, default=Path("public/photos"))
    parser.add_argument("--max-edge", type=int, default=1200)
    parser.add_argument("--quality", type=int, default=75)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--prune", action="store_true")
    return parser.parse_args()


def safe_stem(name: str) -> str:
    """Return a lowercase filesystem-safe filename stem."""

    stem = Path(name).stem.lower()
    stem = re.sub(r"\s+", "_", stem)
    stem = re.sub(r"[^a-z0-9._-]+", "_", stem)
    stem = re.sub(r"_+", "_", stem).strip("._-")
    return stem or "image"


def posix_path(path: Path) -> str:
    """Return a stable POSIX-style relative path for JSON output."""

    return path.as_posix()


def source_mtime(path: Path) -> float:
    """Return source modification time rounded for stable manifest comparisons."""

    return path.stat().st_mtime


def iter_source_images(source_root: Path, output_root: Path) -> list[SourceImage]:
    """Find supported source images and compute their output paths."""

    images: list[SourceImage] = []
    for source_path in sorted(source_root.rglob("*")):
        if not source_path.is_file() or source_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        source_relative = source_path.relative_to(source_root)
        output_relative = source_relative.with_name(f"{safe_stem(source_path.name)}.webp")
        images.append(
            SourceImage(
                source_path=source_path,
                source_relative_path=source_relative,
                output_path=output_root / output_relative,
                output_relative_path=output_relative,
            )
        )
    return images


def load_manifest(manifest_path: Path) -> dict[str, dict]:
    """Load the previous manifest, keyed by source relative path."""

    if not manifest_path.exists():
        return {}
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    entries = data.get("images", data if isinstance(data, list) else [])
    if not isinstance(entries, list):
        return {}
    return {
        entry["source_relative_path"]: entry
        for entry in entries
        if isinstance(entry, dict) and "source_relative_path" in entry
    }


def output_matches_manifest(image: SourceImage, previous_manifest: dict[str, dict]) -> bool:
    """Return whether an existing output is current according to source and output state."""

    if not image.output_path.exists():
        return False
    if not is_readable_image(image.output_path):
        return False

    source_stat = image.source_path.stat()
    output_stat = image.output_path.stat()
    entry = previous_manifest.get(posix_path(image.source_relative_path))
    if entry:
        return (
            entry.get("output_relative_path") == posix_path(image.output_relative_path)
            and entry.get("source_file_size") == source_stat.st_size
            and entry.get("source_mtime") == source_stat.st_mtime
            and entry.get("output_file_size") == output_stat.st_size
            and entry.get("output_mtime") == output_stat.st_mtime
        )

    return output_stat.st_mtime >= source_stat.st_mtime


def is_readable_image(path: Path) -> bool:
    """Return whether Pillow can read an image file."""

    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except (OSError, UnidentifiedImageError):
        return False


def resize_image(image: Image.Image, max_edge: int) -> Image.Image:
    """Resize an image so its longest edge is at most max_edge, without upscaling."""

    width, height = image.size
    longest_edge = max(width, height)
    if longest_edge <= max_edge:
        return image.copy()

    scale = max_edge / longest_edge
    new_size = (round(width * scale), round(height * scale))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def convert_image(image: SourceImage, max_edge: int, quality: int) -> None:
    """Convert one source image to metadata-stripped WebP."""

    image.output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_output_path = image.output_path.with_name(f".{image.output_path.name}.tmp")
    with Image.open(image.source_path) as opened:
        corrected = ImageOps.exif_transpose(opened)
        if corrected.mode not in ("RGB", "RGBA"):
            corrected = corrected.convert("RGB")
        resized = resize_image(corrected, max_edge)
        try:
            if resized.mode == "RGBA":
                resized.save(temp_output_path, "WEBP", quality=quality, method=6)
            else:
                resized.convert("RGB").save(temp_output_path, "WEBP", quality=quality, method=6)
            temp_output_path.replace(image.output_path)
        finally:
            if temp_output_path.exists():
                temp_output_path.unlink()


def detect_collisions(images: Iterable[SourceImage]) -> dict[str, list[SourceImage]]:
    """Find multiple source images that would write to the same output path."""

    by_output: dict[str, list[SourceImage]] = {}
    for image in images:
        key = str(image.output_path.resolve()).lower()
        by_output.setdefault(key, []).append(image)
    return {key: value for key, value in by_output.items() if len(value) > 1}


def prune_outputs(output_root: Path, expected_outputs: set[Path]) -> int:
    """Remove orphan WebP files from the output tree."""

    if not output_root.exists():
        return 0

    expected = {path.resolve() for path in expected_outputs}
    pruned = 0
    for output_path in sorted(output_root.rglob("*.webp")):
        if output_path.resolve() not in expected:
            output_path.unlink()
            pruned += 1
    return pruned


def build_manifest(images: Iterable[SourceImage]) -> list[dict]:
    """Build manifest entries for outputs that currently exist."""

    entries: list[dict] = []
    for image in sorted(images, key=lambda item: posix_path(item.output_relative_path)):
        if not image.output_path.exists():
            continue
        source_stat = image.source_path.stat()
        output_stat = image.output_path.stat()
        with Image.open(image.output_path) as output_image:
            width, height = output_image.size
        entries.append(
            {
                "source_relative_path": posix_path(image.source_relative_path),
                "output_relative_path": posix_path(image.output_relative_path),
                "width": width,
                "height": height,
                "source_file_size": source_stat.st_size,
                "output_file_size": output_stat.st_size,
                "source_mtime": source_stat.st_mtime,
                "output_mtime": output_stat.st_mtime,
            }
        )
    return entries


def write_manifest(manifest_path: Path, entries: list[dict]) -> None:
    """Write the manifest JSON file."""

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"images": entries}
    manifest_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def format_bytes(size: int) -> str:
    """Format a byte count for console output."""

    units = ("B", "KB", "MB", "GB")
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def print_summary(stats: RunStats, failures: list[str]) -> None:
    """Print the final run summary."""

    ratio = stats.total_output_size / stats.total_input_size if stats.total_input_size else 0
    print("\nPhoto generation summary")
    print(f"  processed: {stats.processed}")
    print(f"  skipped: {stats.skipped}")
    print(f"  regenerated: {stats.regenerated}")
    print(f"  failed: {stats.failed}")
    print(f"  pruned: {stats.pruned}")
    print(f"  total input size: {format_bytes(stats.total_input_size)}")
    print(f"  total output size: {format_bytes(stats.total_output_size)}")
    print(f"  compression ratio: {ratio:.3f}")
    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f"  - {failure}")


def main() -> int:
    """Run the photo generator."""

    args = parse_args()
    source_root = args.source.resolve()
    output_root = args.output.resolve()
    manifest_path = output_root / MANIFEST_NAME
    stats = RunStats()
    failures: list[str] = []

    if args.max_edge <= 0:
        print("--max-edge must be greater than zero", file=sys.stderr)
        return 2
    if not 0 < args.quality <= 100:
        print("--quality must be between 1 and 100", file=sys.stderr)
        return 2
    if not source_root.exists():
        print(f"Source folder does not exist: {source_root}", file=sys.stderr)
        return 2

    images = iter_source_images(source_root, output_root)
    stats.total_input_size = sum(image.source_path.stat().st_size for image in images)

    collisions = detect_collisions(images)
    colliding_sources: set[Path] = set()
    for colliding_images in collisions.values():
        sources = ", ".join(posix_path(image.source_relative_path) for image in colliding_images)
        output = posix_path(colliding_images[0].output_relative_path)
        failures.append(f"output filename collision for {output}: {sources}")
        colliding_sources.update(image.source_path for image in colliding_images)

    previous_manifest = load_manifest(manifest_path)

    if args.prune:
        stats.pruned = prune_outputs(output_root, {image.output_path for image in images})

    for image in images:
        if image.source_path in colliding_sources:
            stats.failed += 1
            continue

        try:
            should_process = args.force or not output_matches_manifest(image, previous_manifest)
            if not should_process:
                stats.skipped += 1
                continue

            existed_before = image.output_path.exists()
            convert_image(image, args.max_edge, args.quality)
            stats.processed += 1
            if existed_before:
                stats.regenerated += 1
        except (OSError, UnidentifiedImageError, ValueError) as exc:
            stats.failed += 1
            failures.append(f"{posix_path(image.source_relative_path)}: {exc}")

    manifest_entries = build_manifest(image for image in images if image.source_path not in colliding_sources)
    write_manifest(manifest_path, manifest_entries)
    stats.total_output_size = sum(entry["output_file_size"] for entry in manifest_entries)

    print_summary(stats, failures)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
