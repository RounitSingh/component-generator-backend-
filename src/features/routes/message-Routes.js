import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import * as MessageController from '../controllers/message-Controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/messages', MessageController.createMessage);
router.get('/messages/:id', MessageController.getMessage);
router.get('/conversations/:conversationId/messages', MessageController.listMessagesByConversation);

export default router;






