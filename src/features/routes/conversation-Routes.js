import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import * as ConversationController from '../controllers/conversation-Controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/conversations', ConversationController.createConversation);
router.get('/conversations', ConversationController.listConversations);
router.get('/conversations/:id', ConversationController.getConversation);
router.patch('/conversations/:id', ConversationController.updateConversation);
router.patch('/conversations/:id/archive', ConversationController.archiveConversation);
router.patch('/conversations/:id/unarchive', ConversationController.unarchiveConversation);
// Bulk delete must come before single delete to avoid route matching issues
router.delete('/conversations', ConversationController.bulkDeleteConversations);
router.delete('/conversations/:id', ConversationController.deleteConversation);

export default router;






