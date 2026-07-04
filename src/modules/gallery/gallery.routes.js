import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { uploadGalleryFile } from './gallery.middleware.js';
import * as galleryController from './gallery.controller.js';
import * as galleryValidation from './gallery.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================
router.get(
  '/public/campuses/:slug/gallery',
  galleryController.getPublicGallery
);

router.get(
  '/public/campuses/:slug/gallery/images',
  galleryController.getPublicGalleryImages
);

router.get(
  '/public/campuses/:slug/gallery/videos',
  galleryController.getPublicGalleryVideos
);

// ==========================================
// ADMIN ROUTES (Requires Authentication)
// ==========================================
router.post(
  '/gallery',
  protect,
  uploadGalleryFile('file'),
  galleryValidation.validateUploadPayload,
  galleryController.uploadGalleryItem
);

router.get(
  '/gallery',
  protect,
  galleryController.getGalleryList
);

router.get(
  '/gallery/:id',
  protect,
  galleryController.getGalleryItem
);

router.put(
  '/gallery/:id',
  protect,
  uploadGalleryFile('file'),
  galleryValidation.validateUpdatePayload,
  galleryController.updateGalleryItem
);

router.delete(
  '/gallery/:id',
  protect,
  galleryController.deleteGalleryItem
);

router.patch(
  '/gallery/:id/status',
  protect,
  galleryValidation.validateUpdateStatus,
  galleryController.toggleStatus
);

export default router;
