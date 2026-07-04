import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import * as admissionLeadController from './admissionLead.controller.js';
import * as admissionLeadValidation from './admissionLead.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================
router.post('/admission-leads', admissionLeadValidation.validateCreateAdmissionLead, admissionLeadController.createAdmissionLead);

// ==========================================
// ADMIN ROUTES (Requires Authentication)
// ==========================================
router.get('/admin/admission-leads', protect, admissionLeadController.getAllAdmissionLeads);
router.get('/admin/admission-leads/:id', protect, admissionLeadController.getAdmissionLeadById);
router.patch('/admin/admission-leads/:id/status', protect, admissionLeadValidation.validateUpdateAdmissionLeadStatus, admissionLeadController.updateAdmissionLeadStatus);

export default router;
