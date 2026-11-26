from __future__ import annotations

from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort


class FaceRecognizer:
    """Extracts L2-normalized face embeddings from 112x112 aligned face images."""

    def __init__(self, model_path: str | Path) -> None:
        resolved = Path(model_path)
        if not resolved.is_file():
            raise FileNotFoundError(f"Recognition model not found: {resolved}")

        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 2
        self.session = ort.InferenceSession(
            str(resolved),
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name
        self.model_name = resolved.stem

    def extract_embedding(self, aligned_bgr: np.ndarray) -> list[float]:
        if aligned_bgr.shape[:2] != (112, 112):
            aligned_bgr = cv2.resize(aligned_bgr, (112, 112))

        blob = cv2.dnn.blobFromImage(
            aligned_bgr,
            1.0 / 127.5,
            (112, 112),
            (127.5, 127.5, 127.5),
            swapRB=True,
        )
        raw_out = self.session.run([self.output_name], {self.input_name: blob})[0]
        vec = np.asarray(raw_out, dtype=np.float32).reshape(-1)
        norm = float(np.linalg.norm(vec))
        if norm <= 1e-12:
            raise ValueError("Zero-norm face embedding produced.")
        normalized = vec / norm
        return [float(x) for x in normalized]
