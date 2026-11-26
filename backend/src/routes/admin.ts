import { Router } from 'express';
import {
  handleCorrectAdminAttendance,
  handleCreateParticipantResetLink,
  handleDeleteAdminParticipant,
  handleExportAdminReports,
  handleGetAdminAttendanceDetail,
  handleGetAdminAttendanceEvidence,
  handleGetAdminOverview,
  handleGetAdminParticipantDetail,
  handleGetAdminReports,
  handleGetAdminSettings,
  handleListAdminAttendance,
  handleListAdminParticipants,
  handleListAdminPermissions,
  handleReviewAdminPermission,
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
import {
  adminPermissionsQuerySchema,
  adminReviewPermissionSchema,
} from '../validation/permissionSchemas.js';

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
adminRouter.delete(
  '/participants/:id',
  validateRequest({ params: idParamSchema }),
  asyncHandler(handleDeleteAdminParticipant),
);
adminRouter.post(
  '/participants/:id/reset-password-link',
  validateRequest({ params: idParamSchema }),
  asyncHandler(handleCreateParticipantResetLink),
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

adminRouter.get(
  '/permissions',
  validateRequest({ query: adminPermissionsQuerySchema }),
  asyncHandler(handleListAdminPermissions),
);
adminRouter.patch(
  '/permissions/:id/review',
  validateRequest({ params: idParamSchema, body: adminReviewPermissionSchema }),
  asyncHandler(handleReviewAdminPermission),
);
