import { Router } from 'express';
import {
  handleAdminLogin,
  handleGetSession,
  handleLogout,
  handleParticipantLogin,
  handleParticipantRegister,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  adminLoginSchema,
  participantLoginSchema,
  participantRegisterSchema,
} from '../validation/authSchemas.js';
import { sessionQuerySchema } from '../validation/commonSchemas.js';

export const authRouter = Router();

authRouter.get(
  '/session',
  validateRequest({ query: sessionQuerySchema }),
  handleGetSession,
);
authRouter.get('/me', requireAuth, handleGetSession);
authRouter.post(
  '/admin/login',
  authRateLimiter,
  validateRequest({ body: adminLoginSchema }),
  asyncHandler(handleAdminLogin),
);
authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: participantLoginSchema }),
  asyncHandler(handleParticipantLogin),
);
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: participantRegisterSchema }),
  asyncHandler(handleParticipantRegister),
);
authRouter.post('/logout', asyncHandler(handleLogout));
