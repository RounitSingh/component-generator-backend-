import express from 'express';
import authMiddleware from '../../middleware/authMiddleware.js';
import * as QuotaController from '../controllers/quota-Controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/me/quotas', QuotaController.getMyQuota);
router.put('/me/quotas', QuotaController.updateMyQuota);

export default router;






