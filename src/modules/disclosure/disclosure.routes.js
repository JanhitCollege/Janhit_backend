import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';
import { uploadDisclosurePdf } from './disclosure.middleware.js';
import * as disclosureController from './disclosure.controller.js';
import * as disclosureValidation from './disclosure.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================
router.get(
  '/campuses/:campusSlug/disclosures',
  disclosureController.getCampusDisclosuresPublic
);

router.get(
  '/disclosures/documents/:documentId/download',
  disclosureController.downloadDisclosureDocumentPublic
);

// ==========================================
// ADMIN ROUTES (Requires JWT Auth & Admin Role)
// ==========================================
router.post(
  '/admin/campuses/:campusId/documents',
  protect,
  restrictTo('ADMIN'),
  uploadDisclosurePdf('file', false),
  disclosureValidation.validateCreateDocument,
  disclosureController.createDisclosureDocumentAdmin
);

router.put(
  '/admin/disclosures/documents/:id',
  protect,
  restrictTo('ADMIN'),
  uploadDisclosurePdf('file', true),
  disclosureValidation.validateUpdateDocument,
  disclosureController.updateDisclosureDocumentAdmin
);

router.delete(
  '/admin/disclosures/documents/:id',
  protect,
  restrictTo('ADMIN'),
  disclosureController.deleteDisclosureDocumentAdmin
);

router.put(
  '/admin/campuses/:campusId/disclosure-details',
  protect,
  restrictTo('ADMIN'),
  disclosureValidation.validateBulkUpdateDetails,
  disclosureController.bulkUpdateCampusDetailsAdmin
);

export default router;
