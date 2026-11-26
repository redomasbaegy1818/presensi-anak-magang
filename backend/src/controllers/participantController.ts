import type { Request, Response } from 'express';
import { findParticipantByUserId } from '../repositories/participantRepository.js';
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
