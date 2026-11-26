import { prisma } from '../lib/prisma.js';

export interface UpsertFaceTemplateInput {
  participantId: string;
  encryptedEmbedding: string;
  encryptionIv: string;
  encryptionAuthTag: string;
  detectorName: string;
  modelName: string;
  embeddingDim: number;
  qualityScore?: number | null;
}

/**
 * Stores or replaces the participant's encrypted face representation.
 * Never expose encryptedEmbedding, encryptionIv, or encryptionAuthTag via public APIs.
 */
export async function upsertProtectedFaceTemplate(
  input: UpsertFaceTemplateInput,
) {
  return prisma.faceTemplate.upsert({
    where: { participantId: input.participantId },
    create: {
      participantId: input.participantId,
      encryptedEmbedding: input.encryptedEmbedding,
      encryptionIv: input.encryptionIv,
      encryptionAuthTag: input.encryptionAuthTag,
      detectorName: input.detectorName,
      modelName: input.modelName,
      embeddingDim: input.embeddingDim,
      qualityScore: input.qualityScore ?? null,
    },
    update: {
      encryptedEmbedding: input.encryptedEmbedding,
      encryptionIv: input.encryptionIv,
      encryptionAuthTag: input.encryptionAuthTag,
      detectorName: input.detectorName,
      modelName: input.modelName,
      embeddingDim: input.embeddingDim,
      qualityScore: input.qualityScore ?? null,
    },
    select: {
      id: true,
      participantId: true,
      detectorName: true,
      modelName: true,
      embeddingDim: true,
      registeredAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Internal-only helper used exclusively by server-side face verification.
 */
export async function getProtectedFaceTemplateForVerification(
  participantId: string,
) {
  return prisma.faceTemplate.findUnique({
    where: { participantId },
    select: {
      id: true,
      participantId: true,
      encryptedEmbedding: true,
      encryptionIv: true,
      encryptionAuthTag: true,
      detectorName: true,
      modelName: true,
      embeddingDim: true,
    },
  });
}
