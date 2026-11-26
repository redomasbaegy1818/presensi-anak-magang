import { type NextFunction, type Request, type Response, Router } from 'express';
import { adminRouter } from './admin.js';
import { authRouter } from './auth.js';
import { faceRouter } from './face.js';
import { healthRouter } from './health.js';
import { participantRouter } from './participant.js';

function noStoreSensitiveCache(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private',
  );
  res.setHeader('Pragma', 'no-cache');
  next();
}

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
apiV1Router.use('/auth', noStoreSensitiveCache, authRouter);
apiV1Router.use('/admin', noStoreSensitiveCache, adminRouter);
apiV1Router.use('/participant', noStoreSensitiveCache, participantRouter);
apiV1Router.use('/face', noStoreSensitiveCache, faceRouter);
