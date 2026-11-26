import { Router } from 'express';
import { handleGetParticipantProfile } from '../controllers/participantController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const participantRouter = Router();

participantRouter.use(requireAuth, requireRole('PARTICIPANT'));

participantRouter.get('/profile', asyncHandler(handleGetParticipantProfile));
