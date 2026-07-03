import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { uploadImage } from '../../middleware/upload.middleware.js';
import * as facultyProfileController from './facultyProfile.controller.js';
import * as facultyProfileValidation from './facultyProfile.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================
router.get('/public/faculty', facultyProfileController.getPublicFacultyList);
router.get('/public/faculty/:id', facultyProfileController.getPublicFacultyById);

// ==========================================
// ADMIN ROUTES (Requires JWT Authentication)
// ==========================================
router.post(
  '/',
  protect,
  uploadImage('image'),
  facultyProfileValidation.validateFacultyProfilePayload,
  facultyProfileController.createFacultyProfile
);

router.patch(
  '/:id',
  protect,
  uploadImage('image'),
  facultyProfileValidation.validateFacultyProfilePayload,
  facultyProfileController.updateFacultyProfile
);

router.get('/', protect, facultyProfileController.getAllFacultyProfilesAdmin);
router.get('/:id', protect, facultyProfileController.getFacultyById);
router.patch(
  '/:id/status',
  protect,
  facultyProfileValidation.validateUpdateStatus,
  facultyProfileController.updateFacultyStatus
);

export default router;
