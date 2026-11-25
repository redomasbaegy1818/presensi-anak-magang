import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type DatabaseHealth = 'connected' | 'not_configured' | 'disconnected';

/**
 * Verifies database reachability without throwing when unconfigured or offline.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!env.DATABASE_URL) {
    return 'not_configured';
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
