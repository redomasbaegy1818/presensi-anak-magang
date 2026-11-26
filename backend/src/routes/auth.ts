import { Router } from 'express';
import {
  handleAdminLogin,
  handleGetSession,
  handleLogout,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { adminLoginSchema } from '../validation/authSchemas.js';
import { sessionQuerySchema } from '../validation/commonSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.get(
  '/session',
  validateRequest({ query: sessionQuerySchema }),
  handleGetSession,
);
authRouter.get('/me', requireAuth, handleGetSession);
authRouter.post(
  '/admin/login',
  validateRequest({ body: adminLoginSchema }),
  asyncHandler(handleAdminLogin),
);
authRouter.post('/logout', asyncHandler(handleLogout));
