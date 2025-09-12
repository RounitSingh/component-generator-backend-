import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import * as ConversationController from '../controllers/conversation-Controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/conversations', ConversationController.createConversation);
router.get('/conversations', ConversationController.listConversations);
router.get('/conversations/:id', ConversationController.getConversation);
router.patch('/conversations/:id', ConversationController.updateConversation);
router.delete('/conversations/:id', ConversationController.archiveConversation);

export default router;






