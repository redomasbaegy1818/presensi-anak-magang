import type { Request, Response } from 'express';
import { detectFaceViaService } from '../services/faceServiceClient.js';
import { AppError } from '../utils/appError.js';

export async function handleDetectFace(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    throw AppError.badRequest('Gambar wajah wajib dikirimkan.', 'IMAGE_REQUIRED');
  }

  const result = await detectFaceViaService(
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname,
  );

  res.status(200).json(result);
}
