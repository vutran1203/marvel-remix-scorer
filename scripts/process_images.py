"""Cắt nền, xoay thẳng và nén ảnh lá bài.

image/*.jpg  →  public/cards/<id>.webp  (+ scripts/contact-sheet.jpg để kiểm tra bằng mắt)

Chạy:
    pip install -r scripts/requirements.txt
    python scripts/process_images.py
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "image"
OUT = ROOT / "public" / "cards"
MAP = ROOT / "scripts" / "card-images.json"
SHEET = ROOT / "scripts" / "contact-sheet.jpg"
W, H = 400, 559  # tỉ lệ lá 63 × 88 mm

# Ảnh chụp nằm ngang có đầu lá ở bên phải → mặc định xoay ngược chiều kim đồng hồ.
# Ghi đè khi contact sheet cho thấy lá bị ngược: "cw" | "ccw" | "180" | "none"
ROTATION_OVERRIDES: dict[str, str] = {}
# Lá mà việc dò viền cắt sai (kiểm tra qua contact sheet) → dùng nguyên ảnh.
NO_WARP = {"captain-america", "rogue", "falcon", "colossus"}
ROTATIONS = {
    "cw": cv2.ROTATE_90_CLOCKWISE,
    "ccw": cv2.ROTATE_90_COUNTERCLOCKWISE,
    "180": cv2.ROTATE_180,
}


def order_points(pts: np.ndarray) -> np.ndarray:
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[s.argmin()], pts[d.argmin()], pts[s.argmax()], pts[d.argmax()]], dtype="float32")


def find_card(img: np.ndarray):
    gray = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (7, 7), 0)
    edges = cv2.dilate(cv2.Canny(gray, 30, 100), np.ones((5, 5), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    c = max(contours, key=cv2.contourArea)
    if cv2.contourArea(c) < 0.15 * img.shape[0] * img.shape[1]:
        return None
    approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
    return approx if len(approx) == 4 else cv2.boxPoints(cv2.minAreaRect(c))


def warp(img: np.ndarray, quad) -> np.ndarray:
    tl, tr, br, bl = order_points(np.array(quad))
    w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    m = cv2.getPerspectiveTransform(np.array([tl, tr, br, bl]), dst)
    return cv2.warpPerspective(img, m, (w, h))


def source_for(hash8: str, files: list[Path]) -> Path:
    matches = [f for f in files if f.stem.split("_")[-1].startswith(hash8)]
    if len(matches) != 1:
        raise SystemExit(f"hash {hash8}: tìm thấy {len(matches)} file")
    return matches[0]


def main() -> None:
    mapping: dict[str, str] = json.loads(MAP.read_text(encoding="utf-8"))
    files = sorted(SRC.glob("*.jpg"))
    OUT.mkdir(parents=True, exist_ok=True)
    fallback: list[str] = []
    thumbs: list[np.ndarray] = []

    for card_id, hash8 in mapping.items():
        img = cv2.imread(str(source_for(hash8, files)))
        quad = None if card_id in NO_WARP else find_card(img)
        if quad is None:
            fallback.append(card_id)
            card = img
        else:
            card = warp(img, quad)
        rot = ROTATION_OVERRIDES.get(card_id, "ccw" if card.shape[1] > card.shape[0] else "none")
        if rot in ROTATIONS:
            card = cv2.rotate(card, ROTATIONS[rot])
        card = cv2.resize(card, (W, H), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(OUT / f"{card_id}.webp"), card, [cv2.IMWRITE_WEBP_QUALITY, 80])
        thumb = cv2.resize(card, (120, 168))
        cv2.putText(thumb, card_id[:14], (2, 162), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
        thumbs.append(thumb)

    cols = 10
    blank = np.zeros_like(thumbs[0])
    rows = [thumbs[i:i + cols] + [blank] * (cols - len(thumbs[i:i + cols])) for i in range(0, len(thumbs), cols)]
    cv2.imwrite(str(SHEET), np.vstack([np.hstack(r) for r in rows]))

    print(f"Đã xuất {len(thumbs)} ảnh vào {OUT}")
    if fallback:
        print("Không tìm thấy viền lá (dùng nguyên ảnh):", ", ".join(fallback))


if __name__ == "__main__":
    main()
