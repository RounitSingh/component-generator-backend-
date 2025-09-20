import * as ComponentService from '../services/component-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { handleError } from '../../utils/apiError.js';

export const createComponent = async (req, res) => {
  try {
    const row = await ComponentService.create(req.user.id, req.body);
    return sendResponse(res, 201, 'Component created', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to create component');
  }
};

export const listComponentsByConversation = async (req, res) => {
  try {
    const items = await ComponentService.listByConversation(req.user.id, req.params.conversationId);
    return sendResponse(res, 200, 'Components retrieved', items);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to fetch components');
  }
};

export const updateComponent = async (req, res) => {
  try {
    const row = await ComponentService.update(req.user.id, req.params.id, req.body);
    return sendResponse(res, 200, 'Component updated', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Component not found', null);
    return handleError(res, err, 'Failed to update component');
  }
};

export const deleteComponent = async (req, res) => {
  try {
    const ok = await ComponentService.remove(req.user.id, req.params.id);
    return sendResponse(res, 200, 'Component deleted', ok);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Component not found', null);
    return handleError(res, err, 'Failed to delete component');
  }
};




