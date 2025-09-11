import express from 'express';
import * as SessionController from '../controllers/session-Controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

// All session routes require authentication
router.use(authMiddleware);

// Session management (only)
router.post('/sessions', SessionController.createSession);
router.get('/sessions', SessionController.getUserSessions);
router.get('/sessions/:sessionId', SessionController.getSession);
router.put('/sessions/:sessionId', SessionController.updateSession);
router.delete('/sessions/:sessionId', SessionController.deleteSession);

export default router; 