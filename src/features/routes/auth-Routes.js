import express from 'express';
import * as AuthController from '../controllers/auth-Controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/auth/signup', AuthController.signup);
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh-token', AuthController.refreshToken);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/verify-token', AuthController.verifyToken);
// router.post('/auth/verify-otp', AuthController.verifyOtp);

// Protected routes
router.get('/auth/profile', authMiddleware, AuthController.getProfile);
router.put('/auth/profile', authMiddleware, AuthController.updateProfile);
router.put('/auth/change-password', authMiddleware, AuthController.changePassword);

export default router;
