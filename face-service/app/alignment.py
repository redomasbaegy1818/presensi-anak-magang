from __future__ import annotations

import cv2
import numpy as np

# Standard 112x112 ArcFace 5-point reference coordinates (left eye, right eye, nose, left mouth, right mouth).
ARCFACE_DST_112 = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


def align_face_112(image_bgr: np.ndarray, keypoints: np.ndarray) -> np.ndarray:
    """Aligns and crops a detected face to 112x112 using 5-point similarity transform."""
    if keypoints.shape != (5, 2):
        raise ValueError(f"Expected (5, 2) landmarks, got {keypoints.shape}")

    src = keypoints.astype(np.float32)
    matrix, _ = cv2.estimateAffinePartial2D(
        src, ARCFACE_DST_112, method=cv2.LMEDS
    )
    if matrix is None:
        raise ValueError("Could not estimate affine transform from facial landmarks.")

    return cv2.warpAffine(
        image_bgr,
        matrix,
        (112, 112),
        flags=cv2.INTER_LINEAR,
        borderValue=(0, 0, 0),
    )
