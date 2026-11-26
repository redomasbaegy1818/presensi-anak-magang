from __future__ import annotations

from contextlib import asynccontextmanager
import hmac
from pathlib import Path
import cv2
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
import numpy as np
from app.alignment import align_face_112
from app.config import settings
from app.quality import evaluate_detected_faces
from app.recognition import FaceRecognizer
from app.scrfd import SCRFDDetector

MAX_IMAGE_BYTES = 5 * 1024 * 1024
BASE_DIR = Path(__file__).resolve().parent.parent


def _resolve_model_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    return candidate if candidate.is_absolute() else (BASE_DIR / candidate).resolve()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scrfd_path = _resolve_model_path(settings.scrfd_model_path)
    recognition_path = _resolve_model_path(settings.recognition_model_path)

    app.state.scrfd_detector = (
        SCRFDDetector(scrfd_path) if scrfd_path.is_file() else None
    )
    app.state.face_recognizer = (
        FaceRecognizer(recognition_path) if recognition_path.is_file() else None
    )
    app.state.detector_name = scrfd_path.stem
    yield
    app.state.scrfd_detector = None
    app.state.face_recognizer = None


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


async def _decode_uploaded_image(image: UploadFile) -> np.ndarray:
    raw_bytes = await image.read(MAX_IMAGE_BYTES + 1)
    if not raw_bytes or len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Invalid or oversized image.")

    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    image_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image_bgr is None or image_bgr.size == 0:
        raise HTTPException(status_code=400, detail="Could not decode image.")
    return image_bgr


@app.get("/health")
def health():
    detector = getattr(app.state, "scrfd_detector", None)
    recognizer = getattr(app.state, "face_recognizer", None)
    return {
        "status": "ok",
        "service": "magang-presensi-face-service",
        "scrfdConfigured": detector is not None,
        "recognitionConfigured": recognizer is not None,
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

    image_bgr = await _decode_uploaded_image(image)
    faces = detector.detect(image_bgr)
    assessment = evaluate_detected_faces(image_bgr, faces)

    return {
        "status": assessment.status,
        "reason": assessment.reason,
        "faceCount": assessment.face_count,
        "bbox": assessment.bbox_norm,
        "confidence": assessment.confidence,
    }


@app.post("/internal/v1/face/extract")
async def extract_face_embedding(
    image: UploadFile = File(...),
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
):
    _verify_internal_token(x_service_token)

    detector: SCRFDDetector | None = getattr(app.state, "scrfd_detector", None)
    recognizer: FaceRecognizer | None = getattr(app.state, "face_recognizer", None)
    if detector is None or recognizer is None:
        raise HTTPException(
            status_code=503,
            detail="Face detection or recognition model is not loaded.",
        )

    image_bgr = await _decode_uploaded_image(image)
    faces = detector.detect(image_bgr)
    assessment = evaluate_detected_faces(image_bgr, faces)

    if assessment.status != "face_detected":
        return {
            "status": assessment.status,
            "reason": assessment.reason,
            "faceCount": assessment.face_count,
            "bbox": assessment.bbox_norm,
            "confidence": assessment.confidence,
            "detectorName": getattr(app.state, "detector_name", "scrfd"),
            "modelName": recognizer.model_name,
            "embeddingDim": None,
            "embedding": None,
        }

    strong_faces = [f for f in faces if f.confidence >= 0.50]
    target_face = strong_faces[0] if strong_faces else faces[0]
    aligned = align_face_112(image_bgr, target_face.keypoints)
    embedding = recognizer.extract_embedding(aligned)

    return {
        "status": "face_detected",
        "reason": "ok",
        "faceCount": 1,
        "bbox": assessment.bbox_norm,
        "confidence": assessment.confidence,
        "detectorName": getattr(app.state, "detector_name", "scrfd"),
        "modelName": recognizer.model_name,
        "embeddingDim": len(embedding),
        "embedding": embedding,
    }
