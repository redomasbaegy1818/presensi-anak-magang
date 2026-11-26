import { Router } from 'express';
import {
  handleCorrectAdminAttendance,
  handleExportAdminReports,
  handleGetAdminAttendanceDetail,
  handleGetAdminAttendanceEvidence,
  handleGetAdminOverview,
  handleGetAdminParticipantDetail,
  handleGetAdminReports,
  handleGetAdminSettings,
  handleListAdminAttendance,
  handleListAdminParticipants,
  handleUpdateAdminParticipant,
  handleUpdateAdminParticipantStatus,
  handleUpdateAdminSettings,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  adminAttendanceQuerySchema,
  adminCorrectAttendanceSchema,
  adminEvidenceParamsSchema,
  adminParticipantsQuerySchema,
  adminParticipantStatusSchema,
  adminReportExportQuerySchema,
  adminReportQuerySchema,
  adminUpdateParticipantSchema,
  adminUpdateSettingsSchema,
} from '../validation/adminSchemas.js';
import { idParamSchema } from '../validation/commonSchemas.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/overview', asyncHandler(handleGetAdminOverview));

adminRouter.get(
  '/participants',
  validateRequest({ query: adminParticipantsQuerySchema }),
  asyncHandler(handleListAdminParticipants),
);
adminRouter.get(
  '/participants/:id',
  validateRequest({ params: idParamSchema }),
  asyncHandler(handleGetAdminParticipantDetail),
);
adminRouter.patch(
  '/participants/:id',
  validateRequest({ params: idParamSchema, body: adminUpdateParticipantSchema }),
  asyncHandler(handleUpdateAdminParticipant),
);
adminRouter.patch(
  '/participants/:id/status',
  validateRequest({ params: idParamSchema, body: adminParticipantStatusSchema }),
  asyncHandler(handleUpdateAdminParticipantStatus),
);

adminRouter.get(
  '/attendance',
  validateRequest({ query: adminAttendanceQuerySchema }),
  asyncHandler(handleListAdminAttendance),
);
adminRouter.get(
  '/attendance/:id',
  validateRequest({ params: idParamSchema }),
  asyncHandler(handleGetAdminAttendanceDetail),
);
adminRouter.patch(
  '/attendance/:id/correct',
  validateRequest({ params: idParamSchema, body: adminCorrectAttendanceSchema }),
  asyncHandler(handleCorrectAdminAttendance),
);
adminRouter.get(
  '/attendance/:id/evidence/:type',
  validateRequest({ params: adminEvidenceParamsSchema }),
  asyncHandler(handleGetAdminAttendanceEvidence),
);

adminRouter.get(
  '/reports',
  validateRequest({ query: adminReportQuerySchema }),
  asyncHandler(handleGetAdminReports),
);
adminRouter.get(
  '/reports/export',
  validateRequest({ query: adminReportExportQuerySchema }),
  asyncHandler(handleExportAdminReports),
);

adminRouter.get('/settings', asyncHandler(handleGetAdminSettings));
adminRouter.put(
  '/settings',
  validateRequest({ body: adminUpdateSettingsSchema }),
  asyncHandler(handleUpdateAdminSettings),
);
