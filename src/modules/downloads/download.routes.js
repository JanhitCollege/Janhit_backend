import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { uploadDownloadFile } from './download.middleware.js';
import * as downloadController from './download.controller.js';
import * as downloadValidation from './download.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================
router.get(
  '/public/downloads',
  downloadController.getDownloadsPublic
);

router.get(
  '/public/downloads/:slug',
  downloadController.getDownloadBySlugPublic
);

// ==========================================
// ADMIN ROUTES (Requires Authentication)
// ==========================================
router.post(
  '/downloads',
  protect,
  uploadDownloadFile('file'),
  downloadValidation.validateCreateDownload,
  downloadController.createDownload
);

router.get(
  '/downloads',
  protect,
  downloadController.getDownloadsAdmin
);

router.get(
  '/downloads/:id',
  protect,
  downloadController.getDownloadById
);

router.put(
  '/downloads/:id',
  protect,
  uploadDownloadFile('file'),
  downloadValidation.validateUpdateDownload,
  downloadController.updateDownload
);

router.patch(
  '/downloads/:id/status',
  protect,
  downloadController.toggleStatus
);

export default router;
