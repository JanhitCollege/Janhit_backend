import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import * as newsNoticeController from './newsNotice.controller.js';
import * as newsNoticeValidation from './newsNotice.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

router.get('/public/group', newsNoticeController.getGroupNewsPublic);
router.get('/public/campus/:campusSlug', newsNoticeController.getCampusNewsPublic);
router.get('/public/details/:slug', newsNoticeController.getNewsNoticeDetailsPublic);
router.get('/public/latest/news', newsNoticeController.getLatestNewsPublic);
router.get('/public/latest/notices', newsNoticeController.getLatestNoticesPublic);
router.get('/public/featured/news', newsNoticeController.getFeaturedNewsPublic);
router.get('/public/featured/notices', newsNoticeController.getFeaturedNoticesPublic);

// ==========================================
// ADMIN ROUTES (Requires JWT Authentication)
// ==========================================

router.post('/', protect, newsNoticeValidation.validateCreateNewsNotice, newsNoticeController.createNewsNotice);
router.put('/:id', protect, newsNoticeValidation.validateUpdateNewsNotice, newsNoticeController.updateNewsNotice);
router.delete('/:id', protect, newsNoticeController.deleteNewsNotice);
router.get('/admin', protect, newsNoticeController.getAllNewsNoticesAdmin);
router.get('/admin/:id', protect, newsNoticeController.getNewsNoticeById);

export default router;
