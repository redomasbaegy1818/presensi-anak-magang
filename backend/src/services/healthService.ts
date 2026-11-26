import { env } from '../config/env.js';
import type { DatabaseHealth } from '../lib/prisma.js';
import { getDatabaseHealth } from '../repositories/healthRepository.js';

export type FaceServiceHealth = 'connected' | 'unreachable';

export interface SystemHealthPayload {
  status: 'ok';
  service: string;
  timezone: string;
  database: DatabaseHealth;
  faceService: FaceServiceHealth;
  timestamp: string;
}

async function checkFaceServiceHealth(): Promise<FaceServiceHealth> {
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

export async function getSystemHealth(): Promise<SystemHealthPayload> {
  const [database, faceService] = await Promise.all([
    getDatabaseHealth(),
    checkFaceServiceHealth(),
  ]);

  return {
    status: 'ok',
    service: 'magang-presensi-backend',
    timezone: env.OFFICE_TIMEZONE,
    database,
    faceService,
    timestamp: new Date().toISOString(),
  };
}
