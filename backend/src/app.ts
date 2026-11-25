import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.APP_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', healthRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan.',
    });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (env.NODE_ENV !== 'production') {
      console.error(err);
    }
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server.',
    });
  });

  return app;
}
