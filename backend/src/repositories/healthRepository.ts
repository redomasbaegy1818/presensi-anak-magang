import { checkDatabaseHealth, type DatabaseHealth } from '../lib/prisma.js';

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  return checkDatabaseHealth();
}
