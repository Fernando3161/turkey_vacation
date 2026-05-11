from __future__ import annotations

import csv
import shutil
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener
from tqdm import tqdm
from ultralytics import YOLO


FACE_CONFIDENCE_THRESHOLD = 0.75
MIN_FACE_AREA_RATIO = 0.01

ANIMAL_CONFIDENCE_THRESHOLD = 0.60
MIN_ANIMAL_AREA_RATIO = 0.015

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
THEME_FOLDERS = ("people", "animals", "places")
ANIMAL_LABELS = {"cat", "dog"}
YOLO_MODEL_NAME = "yolov8n.pt"
FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_detector/"
    "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
)
FACE_MODEL_PATH = Path("models") / "blaze_face_short_range.tflite"


@dataclass(frozen=True)
class DetectionResult:
    found: bool
    reason: str
    confidence: float


@dataclass(frozen=True)
class CategorizationResult:
    source_path: Path
    target_path: Path | None
    category: str
    reason: str
    confidence: float
    failed: bool = False


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def ensure_face_model(root: Path) -> Path:
    model_path = root / FACE_MODEL_PATH
    if model_path.exists():
        return model_path

    model_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading MediaPipe face detection model to: {model_path}")
    urllib.request.urlretrieve(FACE_MODEL_URL, model_path)
    return model_path


def discover_images(input_folder: Path) -> list[Path]:
    if not input_folder.exists():
        return []

    return sorted(
        path
        for path in input_folder.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def load_image(path: Path) -> Image.Image:
    image = Image.open(path)
    image = ImageOps.exif_transpose(image)
    return image.convert("RGB")


def area_ratio_from_relative_bbox(bbox, image_width: int, image_height: int) -> float:
    width = max(0.0, bbox.width * image_width)
    height = max(0.0, bbox.height * image_height)
    image_area = float(image_width * image_height)
    if image_area <= 0:
        return 0.0
    return (width * height) / image_area


def detect_clear_face(face_detector, image: Image.Image) -> DetectionResult:
    image_array = np.asarray(image)
    image_height, image_width = image_array.shape[:2]
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_array)
    results = face_detector.detect(mp_image)

    best_confidence = 0.0
    best_area_ratio = 0.0

    for detection in results.detections or []:
        confidence = float(detection.categories[0].score) if detection.categories else 0.0
        bbox = detection.bounding_box
        area_ratio = (max(0, bbox.width) * max(0, bbox.height)) / float(image_width * image_height)

        if confidence > best_confidence:
            best_confidence = confidence
            best_area_ratio = area_ratio

        if confidence >= FACE_CONFIDENCE_THRESHOLD and area_ratio >= MIN_FACE_AREA_RATIO:
            return DetectionResult(
                found=True,
                reason=f"clear face detected; area_ratio={area_ratio:.4f}",
                confidence=confidence,
            )

    if best_confidence > 0:
        return DetectionResult(
            found=False,
            reason=(
                "face detection below clarity threshold; "
                f"best_confidence={best_confidence:.3f}; area_ratio={best_area_ratio:.4f}"
            ),
            confidence=best_confidence,
        )

    return DetectionResult(found=False, reason="no face detected", confidence=0.0)


def detect_cat_or_dog(yolo_model: YOLO, image: Image.Image) -> DetectionResult:
    image_array = np.asarray(image)
    image_height, image_width = image_array.shape[:2]
    image_area = float(image_width * image_height)

    results = yolo_model.predict(image_array, verbose=False)
    best_label = ""
    best_confidence = 0.0
    best_area_ratio = 0.0

    for result in results:
        names = result.names
        for box in result.boxes:
            class_id = int(box.cls[0])
            label = str(names[class_id]).lower()
            if label not in ANIMAL_LABELS:
                continue

            confidence = float(box.conf[0])
            x1, y1, x2, y2 = (float(value) for value in box.xyxy[0])
            area_ratio = max(0.0, (x2 - x1) * (y2 - y1)) / image_area if image_area > 0 else 0.0

            if confidence > best_confidence:
                best_label = label
                best_confidence = confidence
                best_area_ratio = area_ratio

            if confidence >= ANIMAL_CONFIDENCE_THRESHOLD and area_ratio >= MIN_ANIMAL_AREA_RATIO:
                return DetectionResult(
                    found=True,
                    reason=f"clear {label} detected; area_ratio={area_ratio:.4f}",
                    confidence=confidence,
                )

    if best_confidence > 0:
        return DetectionResult(
            found=False,
            reason=(
                f"{best_label} detection below clarity threshold; "
                f"best_confidence={best_confidence:.3f}; area_ratio={best_area_ratio:.4f}"
            ),
            confidence=best_confidence,
        )

    return DetectionResult(found=False, reason="no cat or dog detected", confidence=0.0)


def next_available_path(target_folder: Path, filename: str) -> Path:
    candidate = target_folder / filename
    if not candidate.exists():
        return candidate

    stem = candidate.stem
    suffix = candidate.suffix
    for index in range(1, 1000):
        candidate = target_folder / f"{stem}_{index:03d}{suffix}"
        if not candidate.exists():
            return candidate

    raise FileExistsError(f"Could not find an available filename for {target_folder / filename}")


def safe_copy(source_path: Path, target_folder: Path) -> Path:
    target_folder.mkdir(parents=True, exist_ok=True)
    target_path = next_available_path(target_folder, source_path.name)
    shutil.copy2(source_path, target_path)
    return target_path


def categorize_image(source_path: Path, output_folder: Path, face_detector, yolo_model: YOLO) -> CategorizationResult:
    try:
        image = load_image(source_path)
    except (OSError, UnidentifiedImageError) as error:
        return CategorizationResult(
            source_path=source_path,
            target_path=None,
            category="failed",
            reason=f"failed to load image: {error}",
            confidence=0.0,
            failed=True,
        )

    try:
        face_result = detect_clear_face(face_detector, image)
        if face_result.found:
            target_path = safe_copy(source_path, output_folder / "people")
            return CategorizationResult(
                source_path=source_path,
                target_path=target_path,
                category="people",
                reason=face_result.reason,
                confidence=face_result.confidence,
            )

        animal_result = detect_cat_or_dog(yolo_model, image)
        if animal_result.found:
            target_path = safe_copy(source_path, output_folder / "animals")
            return CategorizationResult(
                source_path=source_path,
                target_path=target_path,
                category="animals",
                reason=f"{face_result.reason}; {animal_result.reason}",
                confidence=animal_result.confidence,
            )

        target_path = safe_copy(source_path, output_folder / "places")
        return CategorizationResult(
            source_path=source_path,
            target_path=target_path,
            category="places",
            reason=f"{face_result.reason}; {animal_result.reason}",
            confidence=max(face_result.confidence, animal_result.confidence),
        )
    except Exception as error:
        return CategorizationResult(
            source_path=source_path,
            target_path=None,
            category="failed",
            reason=f"failed during categorization: {error}",
            confidence=0.0,
            failed=True,
        )


def write_log(log_path: Path, results: Iterable[CategorizationResult]) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["source_path", "target_path", "category", "reason", "confidence"],
        )
        writer.writeheader()
        for result in results:
            writer.writerow(
                {
                    "source_path": str(result.source_path),
                    "target_path": str(result.target_path) if result.target_path else "",
                    "category": result.category,
                    "reason": result.reason,
                    "confidence": f"{result.confidence:.4f}",
                }
            )


def print_summary(results: list[CategorizationResult]) -> None:
    counts = {theme: 0 for theme in THEME_FOLDERS}
    failed_count = 0

    for result in results:
        if result.failed:
            failed_count += 1
        elif result.category in counts:
            counts[result.category] += 1

    print()
    print("Categorization summary")
    print("----------------------")
    print(f"Total images scanned: {len(results)}")
    print(f"Copied to people:     {counts['people']}")
    print(f"Copied to animals:    {counts['animals']}")
    print(f"Copied to places:     {counts['places']}")
    print(f"Failed images:        {failed_count}")


def ensure_output_folders(output_folder: Path) -> None:
    for theme in THEME_FOLDERS:
        (output_folder / theme).mkdir(parents=True, exist_ok=True)


def main() -> int:
    register_heif_opener()

    root = repo_root()
    input_folder = root / "pictures" / "2_selected_pictures"
    output_folder = root / "pictures" / "3_sorted_theme_pictures"
    log_path = output_folder / "categorization_log.csv"

    ensure_output_folders(output_folder)
    image_paths = discover_images(input_folder)

    print(f"Input folder:  {input_folder}")
    print(f"Output folder: {output_folder}")
    print(f"Images found:  {len(image_paths)}")

    if not image_paths:
        write_log(log_path, [])
        print_summary([])
        print(f"Log written to: {log_path}")
        return 0

    face_model_path = ensure_face_model(root)
    yolo_model = YOLO(YOLO_MODEL_NAME)
    results: list[CategorizationResult] = []

    face_options = vision.FaceDetectorOptions(
        base_options=BaseOptions(model_asset_path=str(face_model_path)),
        min_detection_confidence=FACE_CONFIDENCE_THRESHOLD,
    )

    with vision.FaceDetector.create_from_options(face_options) as face_detector:
        for image_path in tqdm(image_paths, desc="Categorizing images", unit="image"):
            results.append(categorize_image(image_path, output_folder, face_detector, yolo_model))

    write_log(log_path, results)
    print_summary(results)
    print(f"Log written to: {log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
