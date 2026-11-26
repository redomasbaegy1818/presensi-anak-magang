import type { Request, Response } from 'express';
import { findParticipantByUserId } from '../repositories/participantRepository.js';
import {
  registerParticipantFace,
  verifyParticipantFace,
} from '../services/faceVerificationService.js';
import { AppError } from '../utils/appError.js';

export async function handleGetParticipantProfile(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser) {
    throw AppError.unauthorized();
  }

  const participant = await findParticipantByUserId(req.authUser.userId);
  if (!participant) {
    throw AppError.notFound('Profil peserta tidak ditemukan.');
  }

  res.status(200).json({
    profile: {
      id: participant.id,
      fullName: participant.fullName,
      nimNis: participant.nimNis,
      universitySchool: participant.universitySchool,
      major: participant.major,
      division: participant.division,
      phone: participant.phone,
      email: participant.user.email,
      internshipStartDate: participant.internshipStartDate.toISOString().slice(0, 10),
      internshipEndDate: participant.internshipEndDate.toISOString().slice(0, 10),
      status: participant.status,
      faceRegistered: Boolean(participant.faceTemplate),
      faceRegisteredAt: participant.faceTemplate?.registeredAt.toISOString() ?? null,
    },
  });
}

export async function handleRegisterParticipantFace(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser?.participant) {
    throw AppError.forbidden('Akun peserta tidak ditemukan.');
  }
  if (!req.file) {
    throw AppError.badRequest('Gambar wajah wajib dikirimkan.', 'IMAGE_REQUIRED');
  }

  const outcome = await registerParticipantFace(
    req.authUser.participant.id,
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname,
  );

  res.status(200).json(outcome);
}

export async function handleVerifyParticipantFace(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser?.participant) {
    throw AppError.forbidden('Akun peserta tidak ditemukan.');
  }
  if (!req.file) {
    throw AppError.badRequest('Gambar wajah wajib dikirimkan.', 'IMAGE_REQUIRED');
  }

  const outcome = await verifyParticipantFace(
    req.authUser.participant.id,
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname,
  );

  res.status(200).json(outcome);
}
