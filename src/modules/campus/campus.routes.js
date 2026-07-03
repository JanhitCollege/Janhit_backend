import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import * as campusController from './campus.controller.js';
import * as campusValidation from './campus.validation.js';

const router = Router();

// All campus endpoints require authentication
router.use(protect);

// Routes
router.post('/', campusValidation.validateCreateCampus, campusController.createCampus);
router.get('/', campusController.getAllCampuses);
router.get('/:id', campusController.getCampusById);
router.put('/:id', campusValidation.validateUpdateCampus, campusController.updateCampus);
router.patch('/:id/status', campusValidation.validateUpdateCampusStatus, campusController.updateCampusStatus);

export default router;
