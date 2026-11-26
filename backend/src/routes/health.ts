import { Router } from 'express';
import { handleGetHealth } from '../controllers/healthController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthRouter = Router();

healthRouter.get('/health', asyncHandler(handleGetHealth));
