import type { Request, Response } from 'express';
import { getAdminOverviewSummary } from '../services/adminService.js';

export async function handleGetAdminOverview(
  req: Request,
  res: Response,
): Promise<void> {
  const overview = await getAdminOverviewSummary();
  res.status(200).json({
    admin: req.authUser ?? null,
    ...overview,
  });
}
