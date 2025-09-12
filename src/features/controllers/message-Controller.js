import * as MessageService from '../services/message-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { handleError } from '../../utils/apiError.js';

export const createMessage = async (req, res) => {
  try {
    const row = await MessageService.create(req.user.id, req.body);
    return sendResponse(res, 201, 'Message created', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to create message');
  }
};

export const getMessage = async (req, res) => {
  try {
    const row = await MessageService.getById(req.user.id, req.params.id);
    return sendResponse(res, 200, 'Message retrieved', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Message not found', null);
    return handleError(res, err, 'Failed to fetch message');
  }
};

export const listMessagesByConversation = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const { items, nextCursor } = await MessageService.listByConversation(req.user.id, req.params.conversationId, { cursor, limit });
    return sendResponse(res, 200, 'Messages retrieved', { items }, null, { nextCursor });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to fetch messages');
  }
};






