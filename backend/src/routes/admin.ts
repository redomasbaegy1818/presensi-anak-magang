import { Router } from 'express';
import {
  handleCorrectAdminAttendance,
  handleGetAdminAttendanceDetail,
  handleGetAdminAttendanceEvidence,
  handleGetAdminOverview,
  handleGetAdminParticipantDetail,
  handleListAdminAttendance,
  handleListAdminParticipants,
  handleUpdateAdminParticipant,
  handleUpdateAdminParticipantStatus,
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
  adminUpdateParticipantSchema,
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
