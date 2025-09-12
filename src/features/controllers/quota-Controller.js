import * as QuotaService from '../services/quota-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { handleError } from '../../utils/apiError.js';

export const getMyQuota = async (req, res) => {
  try {
    const row = await QuotaService.read(req.user.id);
    return sendResponse(res, 200, 'Quota retrieved', row);
  } catch (err) {
    return handleError(res, err, 'Failed to fetch quota');
  }
};

export const updateMyQuota = async (req, res) => {
  try {
    const row = await QuotaService.update(req.user.id, req.body);
    return sendResponse(res, 200, 'Quota updated', row);
  } catch (err) {
    return handleError(res, err, 'Failed to update quota');
  }
};






