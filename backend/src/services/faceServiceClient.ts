import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';

export type FaceDetectionStatus =
  | 'face_detected'
  | 'no_face'
  | 'multiple_faces'
  | 'low_quality';

export type FaceDetectionReason =
  | 'ok'
  | 'no_face'
  | 'multiple_faces'
  | 'low_confidence'
  | 'face_too_small'
  | 'face_too_close'
  | 'partial_face'
  | 'poor_lighting'
  | 'blurry_image';

export interface NormalizedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InternalFaceDetectResponse {
  status: FaceDetectionStatus;
  reason: FaceDetectionReason;
  faceCount: number;
  bbox: NormalizedFaceBox | null;
  confidence?: number | null;
}

interface InternalFaceExtractResponse extends InternalFaceDetectResponse {
  detectorName: string;
  modelName: string;
  embeddingDim: number | null;
  embedding: number[] | null;
}

export interface PublicFaceDetectResult {
  status: FaceDetectionStatus;
  reason: FaceDetectionReason;
  faceCount: number;
  bbox: NormalizedFaceBox | null;
  message: string;
}

export interface InternalFaceExtractResult extends PublicFaceDetectResult {
  confidence: number | null;
  detectorName: string;
  modelName: string;
  embeddingDim: number | null;
  embedding: number[] | null;
}

const INDONESIAN_REASON_MESSAGES: Record<FaceDetectionReason, string> = {
  ok: 'Wajah terdeteksi dengan jelas.',
  no_face: 'Wajah belum terdeteksi. Posisikan wajah di dalam area kamera.',
  multiple_faces: 'Pastikan hanya satu wajah yang terlihat di depan kamera.',
  low_confidence:
    'Wajah belum terlihat cukup jelas. Hadapkan wajah lurus ke kamera.',
  face_too_small: 'Posisi wajah terlalu jauh. Dekatkan wajah ke kamera.',
  face_too_close: 'Posisi wajah terlalu dekat. Mundurkan sedikit posisi Anda.',
  partial_face:
    'Sebagian wajah terpotong. Pastikan seluruh wajah berada di dalam bingkai.',
  poor_lighting:
    'Pencahayaan kurang memadai atau terlalu silau. Cari cahaya yang lebih merata.',
  blurry_image:
    'Gambar tampak buram. Tahan posisi sejenak lalu ambil gambar kembali.',
};

async function postImageToFaceService<T>(
  endpointPath: string,
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<T> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
  form.append('image', blob, filename || 'frame.jpg');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${env.FACE_SERVICE_URL}${endpointPath}`, {
      method: 'POST',
      headers: env.FACE_SERVICE_TOKEN
        ? { 'X-Service-Token': env.FACE_SERVICE_TOKEN }
        : undefined,
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw AppError.badRequest(
          'Gambar belum dapat diproses. Ambil ulang foto wajah Anda.',
          'INVALID_FACE_IMAGE',
        );
      }
      throw new AppError(
        503,
        'FACE_SERVICE_UNAVAILABLE',
        'Pemeriksaan wajah belum dapat diproses saat ini. Silakan coba beberapa saat lagi.',
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      503,
      'FACE_SERVICE_UNAVAILABLE',
      'Layanan pemeriksaan wajah sedang tidak tersedia. Silakan coba lagi sebentar.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function detectFaceViaService(
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<PublicFaceDetectResult> {
  const data = await postImageToFaceService<InternalFaceDetectResponse>(
    '/internal/v1/face/detect',
    imageBuffer,
    mimeType,
    filename,
  );

  return {
    status: data.status,
    reason: data.reason,
    faceCount: data.faceCount,
    bbox: data.bbox,
    message:
      INDONESIAN_REASON_MESSAGES[data.reason] ??
      'Pemeriksaan posisi wajah selesai.',
  };
}

export async function extractFaceEmbeddingViaService(
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<InternalFaceExtractResult> {
  const data = await postImageToFaceService<InternalFaceExtractResponse>(
    '/internal/v1/face/extract',
    imageBuffer,
    mimeType,
    filename,
  );

  return {
    status: data.status,
    reason: data.reason,
    faceCount: data.faceCount,
    bbox: data.bbox,
    confidence: data.confidence ?? null,
    detectorName: data.detectorName,
    modelName: data.modelName,
    embeddingDim: data.embeddingDim,
    embedding: data.embedding,
    message:
      INDONESIAN_REASON_MESSAGES[data.reason] ??
      'Pemrosesan wajah selesai.',
  };
}
