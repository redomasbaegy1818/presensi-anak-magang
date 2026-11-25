import { Router } from 'express';
import { env } from '../config/env.js';
import { checkDatabaseHealth } from '../lib/prisma.js';

export const healthRouter = Router();

async function checkFaceServiceHealth(): Promise<'connected' | 'unreachable'> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${env.FACE_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    return response.ok ? 'connected' : 'unreachable';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timeout);
  }
}

healthRouter.get('/health', async (_req, res) => {
  const [database, faceService] = await Promise.all([
    checkDatabaseHealth(),
    checkFaceServiceHealth(),
  ]);

  res.status(200).json({
    status: 'ok',
    service: 'magang-presensi-backend',
    timezone: env.OFFICE_TIMEZONE,
    database,
    faceService,
    timestamp: new Date().toISOString(),
  });
});
