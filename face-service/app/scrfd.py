from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort


@dataclass(frozen=True)
class DetectedFace:
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    keypoints: np.ndarray  # shape (5, 2) in original image pixels


def _distance2bbox(points: np.ndarray, distance: np.ndarray) -> np.ndarray:
    x1 = points[:, 0] - distance[:, 0]
    y1 = points[:, 1] - distance[:, 1]
    x2 = points[:, 0] + distance[:, 2]
    y2 = points[:, 1] + distance[:, 3]
    return np.stack([x1, y1, x2, y2], axis=-1)


def _distance2kps(points: np.ndarray, distance: np.ndarray) -> np.ndarray:
    preds = []
    for i in range(0, distance.shape[1], 2):
        px = points[:, 0] + distance[:, i]
        py = points[:, 1] + distance[:, i + 1]
        preds.append(px)
        preds.append(py)
    return np.stack(preds, axis=-1)


def _nms(dets: np.ndarray, thresh: float) -> list[int]:
    if dets.shape[0] == 0:
        return []
    x1 = dets[:, 0]
    y1 = dets[:, 1]
    x2 = dets[:, 2]
    y2 = dets[:, 3]
    scores = dets[:, 4]

    areas = (x2 - x1 + 1.0) * (y2 - y1 + 1.0)
    order = scores.argsort()[::-1]

    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1 + 1.0)
        h = np.maximum(0.0, yy2 - yy1 + 1.0)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)

        inds = np.where(ovr <= thresh)[0]
        order = order[inds + 1]
    return keep


class SCRFDDetector:
    """SCRFD ONNX face detector returning bounding boxes, confidence, and 5 keypoints."""

    def __init__(
        self,
        model_path: str | Path,
        input_size: tuple[int, int] = (640, 640),
        nms_thresh: float = 0.4,
    ) -> None:
        resolved = Path(model_path)
        if not resolved.is_file():
            raise FileNotFoundError(f"SCRFD model not found: {resolved}")

        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 2
        self.session = ort.InferenceSession(
            str(resolved),
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [o.name for o in self.session.get_outputs()]
        self.input_size = input_size
        self.nms_thresh = nms_thresh
        self._center_cache: dict[tuple[int, int, int, int], np.ndarray] = {}

        num_outputs = len(self.output_names)
        if num_outputs == 6:
            self.fmc = 3
            self.feat_stride_fpn = [8, 16, 32]
            self.use_kps = False
        elif num_outputs == 9:
            self.fmc = 3
            self.feat_stride_fpn = [8, 16, 32]
            self.use_kps = True
        elif num_outputs == 10:
            self.fmc = 5
            self.feat_stride_fpn = [8, 16, 32, 64, 128]
            self.use_kps = False
        elif num_outputs == 15:
            self.fmc = 5
            self.feat_stride_fpn = [8, 16, 32, 64, 128]
            self.use_kps = True
        else:
            raise ValueError(f"Unsupported SCRFD output count: {num_outputs}")

    def _get_anchor_centers(
        self, height: int, width: int, stride: int, num_anchors: int
    ) -> np.ndarray:
        key = (height, width, stride, num_anchors)
        cached = self._center_cache.get(key)
        if cached is not None:
            return cached

        anchor_centers = np.stack(
            np.mgrid[:height, :width][::-1], axis=-1
        ).astype(np.float32)
        anchor_centers = (anchor_centers * stride).reshape((-1, 2))
        if num_anchors > 1:
            anchor_centers = np.stack(
                [anchor_centers] * num_anchors, axis=1
            ).reshape((-1, 2))

        if len(self._center_cache) < 64:
            self._center_cache[key] = anchor_centers
        return anchor_centers

    def detect(
        self,
        image_bgr: np.ndarray,
        score_thresh: float = 0.45,
        max_faces: int = 10,
    ) -> list[DetectedFace]:
        if image_bgr.size == 0:
            return []

        img_h, img_w = image_bgr.shape[:2]
        input_w, input_h = self.input_size

        im_ratio = float(img_h) / float(img_w)
        model_ratio = float(input_h) / float(input_w)
        if im_ratio > model_ratio:
            new_height = input_h
            new_width = max(1, int(new_height / im_ratio))
        else:
            new_width = input_w
            new_height = max(1, int(new_width * im_ratio))

        det_scale = float(new_height) / float(img_h)
        resized = cv2.resize(image_bgr, (new_width, new_height))
        det_img = np.zeros((input_h, input_w, 3), dtype=np.uint8)
        det_img[:new_height, :new_width, :] = resized

        blob = cv2.dnn.blobFromImage(
            det_img,
            1.0 / 128.0,
            (input_w, input_h),
            (127.5, 127.5, 127.5),
            swapRB=True,
        )
        net_outs = self.session.run(self.output_names, {self.input_name: blob})

        scores_list: list[np.ndarray] = []
        bboxes_list: list[np.ndarray] = []
        kpss_list: list[np.ndarray] = []

        for idx, stride in enumerate(self.feat_stride_fpn):
            scores = net_outs[idx].reshape(-1)
            bbox_preds = net_outs[idx + self.fmc].reshape(-1, 4) * stride

            height = input_h // stride
            width = input_w // stride
            num_anchors = max(1, scores.shape[0] // (height * width))
            anchor_centers = self._get_anchor_centers(
                height, width, stride, num_anchors
            )

            pos_inds = np.where(scores >= score_thresh)[0]
            if pos_inds.size == 0:
                continue

            bboxes = _distance2bbox(anchor_centers, bbox_preds)
            scores_list.append(scores[pos_inds])
            bboxes_list.append(bboxes[pos_inds])

            if self.use_kps:
                kps_preds = net_outs[idx + self.fmc * 2].reshape(-1, 10) * stride
                kpss = _distance2kps(anchor_centers, kps_preds)
                kpss_list.append(kpss[pos_inds].reshape(-1, 5, 2))

        if not scores_list:
            return []

        scores_all = np.concatenate(scores_list, axis=0)
        bboxes_all = np.concatenate(bboxes_list, axis=0) / det_scale
        pre_det = np.hstack((bboxes_all, scores_all[:, None])).astype(
            np.float32, copy=False
        )
        order = scores_all.argsort()[::-1]
        pre_det = pre_det[order, :]

        keep = _nms(pre_det, self.nms_thresh)[:max_faces]
        det = pre_det[keep, :]

        if self.use_kps and kpss_list:
            kpss_all = np.concatenate(kpss_list, axis=0) / det_scale
            kpss_all = kpss_all[order, :, :][keep, :, :]
        else:
            kpss_all = np.zeros((det.shape[0], 5, 2), dtype=np.float32)

        results: list[DetectedFace] = []
        for idx_row in range(det.shape[0]):
            x1 = float(np.clip(det[idx_row, 0], 0.0, float(img_w)))
            y1 = float(np.clip(det[idx_row, 1], 0.0, float(img_h)))
            x2 = float(np.clip(det[idx_row, 2], 0.0, float(img_w)))
            y2 = float(np.clip(det[idx_row, 3], 0.0, float(img_h)))
            conf = float(det[idx_row, 4])
            if x2 <= x1 or y2 <= y1:
                continue
            results.append(
                DetectedFace(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    confidence=conf,
                    keypoints=kpss_all[idx_row],
                )
            )
        return results
