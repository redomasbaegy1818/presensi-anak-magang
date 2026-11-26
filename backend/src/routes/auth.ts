import { Router } from 'express';
import {
  handleGetSession,
  handleLogout,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { sessionQuerySchema } from '../validation/commonSchemas.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.get(
  '/session',
  validateRequest({ query: sessionQuerySchema }),
  handleGetSession,
);
authRouter.get('/me', requireAuth, handleGetSession);
authRouter.post('/logout', handleLogout);
