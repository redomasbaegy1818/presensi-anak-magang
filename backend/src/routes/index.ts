import { Router } from 'express';
import { adminRouter } from './admin.js';
import { authRouter } from './auth.js';
import { faceRouter } from './face.js';
import { healthRouter } from './health.js';
import { participantRouter } from './participant.js';

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/admin', adminRouter);
apiV1Router.use('/participant', participantRouter);
apiV1Router.use('/face', faceRouter);
