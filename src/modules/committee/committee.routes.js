import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import {
  uploadCommitteeBanner,
  uploadMemberPhoto,
  uploadCommitteeDoc
} from './committee.middleware.js';
import * as committeeController from './committee.controller.js';
import * as committeeValidation from './committee.validation.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

router.get(
  '/public/committees',
  committeeController.getCommitteesPublic
);

router.get(
  '/public/committees/:slug',
  committeeController.getCommitteeBySlugPublic
);

router.get(
  '/public/campuses/:campusSlug/committees',
  committeeController.getCampusCommitteesPublic
);

router.get(
  '/public/campuses/:campusSlug/committees/:committeeSlug',
  committeeController.getCampusCommitteeBySlugPublic
);

// ==========================================
// ADMIN ROUTES (Requires Authentication)
// ==========================================

// Committee CRUD
router.post(
  '/committees',
  protect,
  uploadCommitteeBanner,
  committeeValidation.validateCreateCommittee,
  committeeController.createCommittee
);

router.get(
  '/committees',
  protect,
  committeeController.getCommitteesAdmin
);

router.get(
  '/committees/:id',
  protect,
  committeeController.getCommitteeById
);

router.put(
  '/committees/:id',
  protect,
  uploadCommitteeBanner,
  committeeValidation.validateUpdateCommittee,
  committeeController.updateCommittee
);

router.delete(
  '/committees/:id',
  protect,
  committeeController.deleteCommittee
);

router.patch(
  '/committees/:id/publish',
  protect,
  committeeController.publishCommittee
);

router.patch(
  '/committees/:id/archive',
  protect,
  committeeController.archiveCommittee
);

// Member Management
router.post(
  '/committees/:id/members',
  protect,
  uploadMemberPhoto,
  committeeValidation.validateCreateMember,
  committeeController.addMember
);

router.put(
  '/committees/:id/members/:memberId',
  protect,
  uploadMemberPhoto,
  committeeValidation.validateUpdateMember,
  committeeController.updateMember
);

router.delete(
  '/committees/:id/members/:memberId',
  protect,
  committeeController.deleteMember
);

// Document Management
router.post(
  '/committees/:id/documents',
  protect,
  uploadCommitteeDoc,
  committeeValidation.validateCreateDocument,
  committeeController.uploadDocument
);

router.delete(
  '/committees/:id/documents/:documentId',
  protect,
  committeeController.deleteDocument
);

export default router;
