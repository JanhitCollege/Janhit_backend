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

// Get list of all campuses with disclosure counts (for admin dropdown / branch selector)
router.get(
  '/admin/disclosures/campuses',
  protect,
  restrictTo('ADMIN'),
  disclosureController.getAllCampusesSummaryAdmin
);

// Get disclosures for specific campus
router.get(
  '/admin/campuses/:campusId/disclosures',
  protect,
  restrictTo('ADMIN'),
  disclosureController.getCampusDisclosuresAdmin
);

router.get(
  '/admin/campuses/:campusId/disclosure-details',
  protect,
  restrictTo('ADMIN'),
  disclosureController.getCampusDisclosuresAdmin
);

// Unified single update API for all fields (Section A, D, E & Teacher Roster)
router.put(
  '/admin/campuses/:campusId/disclosures',
  protect,
  restrictTo('ADMIN'),
  disclosureValidation.validateBulkUpdateDetails,
  disclosureController.bulkUpdateCampusDetailsAdmin
);

router.put(
  '/admin/campuses/:campusId/disclosure-details',
  protect,
  restrictTo('ADMIN'),
  disclosureValidation.validateBulkUpdateDetails,
  disclosureController.bulkUpdateCampusDetailsAdmin
);

// Batch update API for multiple selected campuses
router.put(
  '/admin/disclosures/batch',
  protect,
  restrictTo('ADMIN'),
  disclosureValidation.validateBatchUpdate,
  disclosureController.batchUpdateCampusDetailsAdmin
);

// Delete/Clear all disclosure metrics for a campus
router.delete(
  '/admin/campuses/:campusId/disclosures',
  protect,
  restrictTo('ADMIN'),
  disclosureController.clearAllCampusMetricsAdmin
);

// Delete specific disclosure metric key for a campus
router.delete(
  '/admin/campuses/:campusId/disclosures/metrics/:metricKey',
  protect,
  restrictTo('ADMIN'),
  disclosureController.deleteCampusMetricAdmin
);

// Statutory Document Management (PDF Upload, Update, Delete)
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

export default router;
