import type { Request, Response } from 'express';
import { getSystemHealth } from '../services/healthService.js';

export async function handleGetHealth(_req: Request, res: Response): Promise<void> {
  const payload = await getSystemHealth();
  res.status(200).json(payload);
}
