import express from 'express';
import * as SessionController from '../controllers/session-Controller.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

// All session routes require authentication
router.use(authMiddleware);

// Session management
router.post('/sessions', SessionController.createSession);
router.get('/sessions', SessionController.getUserSessions);
router.get('/sessions/stats', SessionController.getSessionStats);
router.get('/sessions/:sessionId', SessionController.getSession);
router.put('/sessions/:sessionId', SessionController.updateSession);
router.delete('/sessions/:sessionId', SessionController.deleteSession);

// Session content management
router.post('/sessions/:sessionId/messages', SessionController.addChatMessage);
router.post('/sessions/:sessionId/components', SessionController.saveComponent);
router.post('/sessions/:sessionId/interactions', SessionController.saveAIInteraction);
router.post('/sessions/:sessionId/ai-responses', SessionController.saveAIResponse);
router.get('/sessions/:sessionId/messages', SessionController.getSessionMessages);
router.get('/sessions/:sessionId/components', SessionController.getSessionComponents);
router.get('/sessions/:sessionId/interactions', SessionController.getSessionInteractions);
router.get('/sessions/:sessionId/ai-responses', SessionController.getSessionAIResponses);
router.get('/sessions/:sessionId/conversations', SessionController.getConversationSessions);

export default router; 