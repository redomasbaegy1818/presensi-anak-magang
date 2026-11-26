import {
  getProtectedFaceTemplateForVerification,
  upsertProtectedFaceTemplate,
} from '../repositories/faceTemplateRepository.js';
import { findParticipantById } from '../repositories/participantRepository.js';
import { getOrCreateAttendanceSetting } from '../repositories/settingsRepository.js';
import { AppError } from '../utils/appError.js';
import {
  computeCosineSimilarity,
  decryptEmbedding,
  encryptEmbedding,
} from '../utils/crypto.js';
import {
  extractFaceEmbeddingViaService,
  type FaceDetectionReason,
  type FaceDetectionStatus,
  type NormalizedFaceBox,
} from './faceServiceClient.js';

export type FaceVerificationState =
  | 'verified'
  | 'not_verified'
  | 'unknown_participant'
  | 'no_face'
  | 'multiple_faces'
  | 'insufficient_quality';

export interface FaceRegistrationOutcome {
  registered: boolean;
  status: 'registered' | 'no_face' | 'multiple_faces' | 'insufficient_quality';
  reason: FaceDetectionReason;
  bbox: NormalizedFaceBox | null;
  registeredAt: string | null;
  updatedAt: string | null;
  message: string;
}

export interface FaceVerificationOutcome {
  status: FaceVerificationState;
  reason: string;
  matched: boolean;
  bbox: NormalizedFaceBox | null;
  message: string;
}

export interface InternalFaceVerificationOutcome extends FaceVerificationOutcome {
  similarityScore: number | null;
  threshold: number | null;
}

function mapDetectionStatusToIssue(
  status: FaceDetectionStatus,
): 'no_face' | 'multiple_faces' | 'insufficient_quality' {
  if (status === 'no_face') return 'no_face';
  if (status === 'multiple_faces') return 'multiple_faces';
  return 'insufficient_quality';
}

export async function registerParticipantFace(
  participantId: string,
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<FaceRegistrationOutcome> {
  const participant = await findParticipantById(participantId);
  if (!participant || participant.status !== 'ACTIVE') {
    throw AppError.forbidden(
      'Status kepesertaan Anda tidak aktif untuk pendaftaran wajah.',
    );
  }

  const extracted = await extractFaceEmbeddingViaService(
    imageBuffer,
    mimeType,
    filename,
  );

  if (extracted.status !== 'face_detected' || !extracted.embedding) {
    return {
      registered: false,
      status: mapDetectionStatusToIssue(extracted.status),
      reason: extracted.reason,
      bbox: extracted.bbox,
      registeredAt: null,
      updatedAt: null,
      message: extracted.message,
    };
  }

  const encrypted = encryptEmbedding(extracted.embedding);
  const saved = await upsertProtectedFaceTemplate({
    participantId: participant.id,
    encryptedEmbedding: encrypted.encryptedEmbedding,
    encryptionIv: encrypted.encryptionIv,
    encryptionAuthTag: encrypted.encryptionAuthTag,
    detectorName: extracted.detectorName,
    modelName: extracted.modelName,
    embeddingDim: extracted.embeddingDim ?? extracted.embedding.length,
    qualityScore: extracted.confidence,
  });

  return {
    registered: true,
    status: 'registered',
    reason: 'ok',
    bbox: extracted.bbox,
    registeredAt: saved.registeredAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
    message: 'Wajah berhasil didaftarkan.',
  };
}

export async function verifyParticipantFaceInternal(
  participantId: string,
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<InternalFaceVerificationOutcome> {
  const participant = await findParticipantById(participantId);
  if (!participant || participant.status !== 'ACTIVE') {
    return {
      status: 'unknown_participant',
      reason: 'participant_unavailable',
      matched: false,
      bbox: null,
      message: 'Peserta tidak ditemukan atau status kepesertaan nonaktif.',
      similarityScore: null,
      threshold: null,
    };
  }

  const template = await getProtectedFaceTemplateForVerification(participant.id);
  if (!template) {
    return {
      status: 'unknown_participant',
      reason: 'face_not_registered',
      matched: false,
      bbox: null,
      message: 'Data wajah peserta belum terdaftar di sistem.',
      similarityScore: null,
      threshold: null,
    };
  }

  const extracted = await extractFaceEmbeddingViaService(
    imageBuffer,
    mimeType,
    filename,
  );

  if (extracted.status !== 'face_detected' || !extracted.embedding) {
    return {
      status: mapDetectionStatusToIssue(extracted.status),
      reason: extracted.reason,
      matched: false,
      bbox: extracted.bbox,
      message: extracted.message,
      similarityScore: null,
      threshold: null,
    };
  }

  if (
    template.modelName !== extracted.modelName ||
    template.embeddingDim !== extracted.embedding.length
  ) {
    return {
      status: 'unknown_participant',
      reason: 'template_incompatible',
      matched: false,
      bbox: extracted.bbox,
      message: 'Data wajah perlu didaftarkan ulang agar sesuai dengan model aktif.',
      similarityScore: null,
      threshold: null,
    };
  }

  const storedEmbedding = decryptEmbedding(
    template.encryptedEmbedding,
    template.encryptionIv,
    template.encryptionAuthTag,
  );
  const setting = await getOrCreateAttendanceSetting();
  const threshold = setting.faceMatchThreshold;
  const similarity = computeCosineSimilarity(
    extracted.embedding,
    storedEmbedding,
  );
  const matched = similarity >= threshold;

  return {
    status: matched ? 'verified' : 'not_verified',
    reason: matched ? 'matched' : 'mismatch',
    matched,
    bbox: extracted.bbox,
    message: matched
      ? 'Identitas wajah berhasil diverifikasi.'
      : 'Wajah tidak sesuai dengan profil peserta yang terdaftar.',
    similarityScore: similarity,
    threshold,
  };
}

/**
 * Strips internal similarity score/threshold before sending verification state to frontend.
 */
export async function verifyParticipantFace(
  participantId: string,
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<FaceVerificationOutcome> {
  const outcome = await verifyParticipantFaceInternal(
    participantId,
    imageBuffer,
    mimeType,
    filename,
  );

  return {
    status: outcome.status,
    reason: outcome.reason,
    matched: outcome.matched,
    bbox: outcome.bbox,
    message: outcome.message,
  };
}
