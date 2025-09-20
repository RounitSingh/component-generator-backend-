import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import * as ComponentController from '../controllers/component-Controller.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/conversations/:conversationId/components', (req, res, next) => {
  req.body = { ...req.body, conversationId: req.params.conversationId };
  return ComponentController.createComponent(req, res, next);
});

router.get('/conversations/:conversationId/components', ComponentController.listComponentsByConversation);
router.patch('/components/:id', ComponentController.updateComponent);
router.delete('/components/:id', ComponentController.deleteComponent);

export default router;




