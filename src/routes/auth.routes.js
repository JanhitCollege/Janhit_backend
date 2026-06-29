import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as authValidation from '../validations/auth.validation.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/signup', authValidation.validateSignup, authController.signup);
router.post('/login', authValidation.validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authValidation.validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidation.validateResetPassword, authController.resetPassword);

// Protected routes (require authorization token)
router.post('/logout', protect, authController.logout);
router.post('/change-password', protect, authValidation.validateChangePassword, authController.changePassword);
router.get('/profile', protect, authController.getProfile);

export default router;
