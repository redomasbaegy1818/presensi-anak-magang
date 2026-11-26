import type { AttendanceEvidenceType } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  correctAttendanceByAdmin,
  getAdminAttendanceDetail,
  getAdminAttendanceEvidenceBuffer,
  getAdminAttendanceList,
} from '../services/adminAttendanceService.js';
import {
  createParticipantResetLinkByAdmin,
  editParticipantByAdmin,
  getAdminParticipantDetail,
  getAdminParticipantsList,
  removeParticipantSafelyByAdmin,
  setParticipantStatusByAdmin,
} from '../services/adminParticipantService.js';
import {
  exportAdminAttendanceReport,
  getAdminAttendanceReport,
} from '../services/adminReportService.js';
import { getAdminOverviewSummary } from '../services/adminService.js';
import {
  getAdminAttendanceSettings,
  updateAdminAttendanceSettings,
} from '../services/adminSettingsService.js';
import {
  getAdminPermissionsList,
  reviewAdminPermission,
} from '../services/permissionService.js';
import { AppError } from '../utils/appError.js';
import type {
  AdminAttendanceQuery,
  AdminCorrectAttendanceInput,
  AdminParticipantsQuery,
  AdminParticipantStatusInput,
  AdminReportExportQuery,
  AdminReportQuery,
  AdminUpdateParticipantInput,
  AdminUpdateSettingsInput,
} from '../validation/adminSchemas.js';
import type {
  AdminPermissionsQuery,
  AdminReviewPermissionInput,
} from '../validation/permissionSchemas.js';

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

export async function handleListAdminParticipants(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as unknown as AdminParticipantsQuery;
  const result = await getAdminParticipantsList(query);
  res.status(200).json(result);
}

export async function handleGetAdminParticipantDetail(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id ?? '');
  const result = await getAdminParticipantDetail(id);
  res.status(200).json(result);
}

export async function handleUpdateAdminParticipant(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id ?? '');
  const body = req.body as AdminUpdateParticipantInput;
  const result = await editParticipantByAdmin(id, body);
  res.status(200).json(result);
}

export async function handleUpdateAdminParticipantStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id ?? '');
  const { status } = req.body as AdminParticipantStatusInput;
  const result = await setParticipantStatusByAdmin(id, status);
  res.status(200).json(result);
}

export async function handleDeleteAdminParticipant(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id ?? '');
  const result = await removeParticipantSafelyByAdmin(id);
  res.status(200).json(result);
}

export async function handleCreateParticipantResetLink(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser) {
    throw AppError.unauthorized();
  }
  const id = String(req.params.id ?? '');
  const result = await createParticipantResetLinkByAdmin(
    id,
    req.authUser.userId,
  );
  res.status(201).json(result);
}

export async function handleListAdminAttendance(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as unknown as AdminAttendanceQuery;
  const result = await getAdminAttendanceList(query);
  res.status(200).json(result);
}

export async function handleGetAdminAttendanceDetail(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id ?? '');
  const result = await getAdminAttendanceDetail(id);
  res.status(200).json(result);
}

export async function handleCorrectAdminAttendance(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser) {
    throw AppError.unauthorized();
  }
  const id = String(req.params.id ?? '');
  const body = req.body as AdminCorrectAttendanceInput;
  const result = await correctAttendanceByAdmin(id, req.authUser.userId, body);
  res.status(200).json(result);
}

export async function handleGetAdminAttendanceEvidence(
  req: Request,
  res: Response,
): Promise<void> {
  const id = String(req.params.id ?? '');
  const type = String(req.params.type ?? '') as AttendanceEvidenceType;
  const { buffer, mimeType } = await getAdminAttendanceEvidenceBuffer(id, type);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(buffer);
}

export async function handleGetAdminReports(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as unknown as AdminReportQuery;
  const report = await getAdminAttendanceReport(query);
  res.status(200).json(report);
}

export async function handleExportAdminReports(
  req: Request,
  res: Response,
): Promise<void> {
  const { format, ...query } = req.query as unknown as AdminReportExportQuery;
  const { buffer, mimeType, filename } = await exportAdminAttendanceReport(
    query,
    format,
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).send(buffer);
}

export async function handleGetAdminSettings(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await getAdminAttendanceSettings();
  res.status(200).json(result);
}

export async function handleUpdateAdminSettings(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser) {
    throw AppError.unauthorized();
  }
  const body = req.body as AdminUpdateSettingsInput;
  const result = await updateAdminAttendanceSettings(
    req.authUser.userId,
    body,
  );
  res.status(200).json(result);
}

export async function handleListAdminPermissions(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as unknown as AdminPermissionsQuery;
  const result = await getAdminPermissionsList(query);
  res.status(200).json(result);
}

export async function handleReviewAdminPermission(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.authUser) {
    throw AppError.unauthorized();
  }
  const id = String(req.params.id ?? '');
  const body = req.body as AdminReviewPermissionInput;
  const result = await reviewAdminPermission(id, req.authUser.userId, body);
  res.status(200).json(result);
}
