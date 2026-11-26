from __future__ import annotations

from dataclasses import dataclass
import cv2
import numpy as np
from app.scrfd import DetectedFace


@dataclass(frozen=True)
class QualityAssessment:
    status: str  # face_detected | no_face | multiple_faces | low_quality
    reason: str
    face_count: int
    bbox_norm: dict[str, float] | None
    confidence: float | None


def _normalize_box(face: DetectedFace, img_w: int, img_h: int) -> dict[str, float]:
    return {
        "x": round(face.x1 / img_w, 4),
        "y": round(face.y1 / img_h, 4),
        "width": round((face.x2 - face.x1) / img_w, 4),
        "height": round((face.y2 - face.y1) / img_h, 4),
    }


def evaluate_detected_faces(
    image_bgr: np.ndarray,
    faces: list[DetectedFace],
    *,
    min_confidence: float = 0.62,
    min_face_width_ratio: float = 0.14,
    min_face_height_ratio: float = 0.18,
    max_face_width_ratio: float = 0.85,
    max_face_height_ratio: float = 0.90,
    min_brightness: float = 42.0,
    max_brightness: float = 235.0,
    min_sharpness: float = 28.0,
) -> QualityAssessment:
    img_h, img_w = image_bgr.shape[:2]

    if len(faces) == 0:
        return QualityAssessment(
            status="no_face",
            reason="no_face",
            face_count=0,
            bbox_norm=None,
            confidence=None,
        )

    # Filter extremely weak ghost detections only when a strong face exists,
    # otherwise report multiple faces when >= 2 genuine faces are present.
    strong_faces = [f for f in faces if f.confidence >= 0.50]
    if len(strong_faces) > 1:
        return QualityAssessment(
            status="multiple_faces",
            reason="multiple_faces",
            face_count=len(strong_faces),
            bbox_norm=None,
            confidence=None,
        )

    face = strong_faces[0] if len(strong_faces) == 1 else faces[0]
    bbox_norm = _normalize_box(face, img_w, img_h)

    if face.confidence < min_confidence:
        return QualityAssessment(
            status="low_quality",
            reason="low_confidence",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    box_w = face.x2 - face.x1
    box_h = face.y2 - face.y1
    width_ratio = box_w / float(img_w)
    height_ratio = box_h / float(img_h)

    if width_ratio < min_face_width_ratio or height_ratio < min_face_height_ratio:
        return QualityAssessment(
            status="low_quality",
            reason="face_too_small",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    if width_ratio > max_face_width_ratio or height_ratio > max_face_height_ratio:
        return QualityAssessment(
            status="low_quality",
            reason="face_too_close",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    edge_margin_x = max(2.0, img_w * 0.008)
    edge_margin_y = max(2.0, img_h * 0.008)
    clipped_edge = (
        face.x1 <= edge_margin_x
        or face.y1 <= edge_margin_y
        or face.x2 >= (img_w - edge_margin_x)
        or face.y2 >= (img_h - edge_margin_y)
    )
    kps_outside = bool(
        np.any(face.keypoints[:, 0] < 0)
        or np.any(face.keypoints[:, 0] > img_w)
        or np.any(face.keypoints[:, 1] < 0)
        or np.any(face.keypoints[:, 1] > img_h)
    )
    aspect_ratio = box_h / max(1.0, box_w)
    if clipped_edge or kps_outside or aspect_ratio < 0.85 or aspect_ratio > 2.0:
        return QualityAssessment(
            status="low_quality",
            reason="partial_face",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    x1_i = max(0, int(round(face.x1)))
    y1_i = max(0, int(round(face.y1)))
    x2_i = min(img_w, int(round(face.x2)))
    y2_i = min(img_h, int(round(face.y2)))
    crop = image_bgr[y1_i:y2_i, x1_i:x2_i]
    if crop.size == 0:
        return QualityAssessment(
            status="low_quality",
            reason="partial_face",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    if brightness < min_brightness or brightness > max_brightness:
        return QualityAssessment(
            status="low_quality",
            reason="poor_lighting",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    standardized = cv2.resize(gray, (112, 112), interpolation=cv2.INTER_AREA)
    sharpness = float(cv2.Laplacian(standardized, cv2.CV_64F).var())
    if sharpness < min_sharpness:
        return QualityAssessment(
            status="low_quality",
            reason="blurry_image",
            face_count=1,
            bbox_norm=bbox_norm,
            confidence=round(face.confidence, 4),
        )

    return QualityAssessment(
        status="face_detected",
        reason="ok",
        face_count=1,
        bbox_norm=bbox_norm,
        confidence=round(face.confidence, 4),
    )
