import { Router } from 'express';
import * as enquiryController from './enquiry.controller.js';
import * as enquiryValidation from './enquiry.validation.js';

const router = Router();

// Route configuration
router.post('/enquiries', enquiryValidation.validateEnquiry, enquiryController.createEnquiry);

export default router;
