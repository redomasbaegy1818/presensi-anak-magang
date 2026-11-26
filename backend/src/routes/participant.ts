import { Router } from 'express';
import {
  handleGetAttendanceHistory,
  handleGetParticipantProfile,
  handleGetTodayAttendance,
  handleMarkAttendance,
  handleRegisterParticipantFace,
  handleVerifyParticipantFace,
} from '../controllers/participantController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { faceRateLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleFaceImage } from '../middleware/uploadMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  attendanceHistoryQuerySchema,
  attendanceMarkBodySchema,
} from '../validation/attendanceSchemas.js';

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

participantRouter.get(
  '/attendance/today',
  asyncHandler(handleGetTodayAttendance),
);
participantRouter.post(
  '/attendance/mark',
  faceRateLimiter,
  uploadSingleFaceImage,
  validateRequest({ body: attendanceMarkBodySchema }),
  asyncHandler(handleMarkAttendance),
);
participantRouter.get(
  '/attendance/history',
  validateRequest({ query: attendanceHistoryQuerySchema }),
  asyncHandler(handleGetAttendanceHistory),
);
