import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import * as ShareController from '../controllers/share-Controller.js';

const router = express.Router();

// Authenticated actions
router.use('/share', authMiddleware);
router.post('/share/publish', ShareController.publishComponent);
router.post('/share/:id/revoke', ShareController.revokeLink);

// Public view, no auth
router.get('/public/share/:slug', ShareController.viewPublic);

export default router;


