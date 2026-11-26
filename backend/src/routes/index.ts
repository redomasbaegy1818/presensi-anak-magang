import { Router } from 'express';
import { authRouter } from './auth.js';
import { healthRouter } from './health.js';

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
apiV1Router.use('/auth', authRouter);
