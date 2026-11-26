import { Router } from 'express';
import { handleDetectFace } from '../controllers/faceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { faceRateLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleFaceImage } from '../middleware/uploadMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const faceRouter = Router();

faceRouter.use(requireAuth, faceRateLimiter);

faceRouter.post(
  '/detect',
  uploadSingleFaceImage,
  asyncHandler(handleDetectFace),
);
