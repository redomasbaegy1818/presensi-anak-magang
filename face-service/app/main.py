from __future__ import annotations

from contextlib import asynccontextmanager
import hmac
from pathlib import Path
import cv2
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
import numpy as np
from app.config import settings
from app.quality import evaluate_detected_faces
from app.scrfd import SCRFDDetector

MAX_IMAGE_BYTES = 5 * 1024 * 1024
BASE_DIR = Path(__file__).resolve().parent.parent


def _resolve_model_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    return candidate if candidate.is_absolute() else (BASE_DIR / candidate).resolve()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scrfd_path = _resolve_model_path(settings.scrfd_model_path)
    app.state.scrfd_detector = None
    if scrfd_path.is_file():
        app.state.scrfd_detector = SCRFDDetector(scrfd_path)
    yield
    app.state.scrfd_detector = None


app = FastAPI(
    title="Magang Presensi Face Service",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


def _verify_internal_token(x_service_token: str | None) -> None:
    expected = settings.face_service_token
    if not expected or "REPLACE_WITH" in expected:
        raise HTTPException(
            status_code=503,
            detail="Internal face service token is not configured.",
        )
    if not x_service_token or not hmac.compare_digest(x_service_token, expected):
        raise HTTPException(status_code=401, detail="Unauthorized internal caller.")


@app.get("/health")
def health():
    detector = getattr(app.state, "scrfd_detector", None)
    return {
        "status": "ok",
        "service": "magang-presensi-face-service",
        "scrfdConfigured": detector is not None,
        "recognitionConfigured": False,
    }


@app.post("/internal/v1/face/detect")
async def detect_face(
    image: UploadFile = File(...),
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
):
    _verify_internal_token(x_service_token)

    detector: SCRFDDetector | None = getattr(app.state, "scrfd_detector", None)
    if detector is None:
        raise HTTPException(
            status_code=503,
            detail="Face detection model is not loaded.",
        )

    raw_bytes = await image.read(MAX_IMAGE_BYTES + 1)
    if not raw_bytes or len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Invalid or oversized image.")

    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    image_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image_bgr is None or image_bgr.size == 0:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    faces = detector.detect(image_bgr)
    assessment = evaluate_detected_faces(image_bgr, faces)

    return {
        "status": assessment.status,
        "reason": assessment.reason,
        "faceCount": assessment.face_count,
        "bbox": assessment.bbox_norm,
        "confidence": assessment.confidence,
    }
