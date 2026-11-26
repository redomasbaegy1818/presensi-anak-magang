import { Router } from 'express';
import {
  handleGetParticipantProfile,
  handleRegisterParticipantFace,
  handleVerifyParticipantFace,
} from '../controllers/participantController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { faceRateLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleFaceImage } from '../middleware/uploadMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const participantRouter = Router();

participantRouter.use(requireAuth, requireRole('PARTICIPANT'));

participantRouter.get('/profile', asyncHandler(handleGetParticipantProfile));
participantRouter.post(
  '/face/register',
  faceRateLimiter,
  uploadSingleFaceImage,
  asyncHandler(handleRegisterParticipantFace),
);
participantRouter.post(
  '/face/verify',
  faceRateLimiter,
  uploadSingleFaceImage,
  asyncHandler(handleVerifyParticipantFace),
);
