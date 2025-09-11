import * as ConversationService from '../services/conversation-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { handleError } from '../../utils/apiError.js';

export const createConversation = async (req, res) => {
  try {
    const row = await ConversationService.create(req.user.id, req.body);
    return sendResponse(res, 201, 'Conversation created', row);
  } catch (err) {
    return handleError(res, err, 'Failed to create conversation');
  }
};

export const listConversations = async (req, res) => {
  try {
    const items = await ConversationService.listMine(req.user.id);
    return sendResponse(res, 200, 'Conversations retrieved', items);
  } catch (err) {
    return handleError(res, err, 'Failed to fetch conversations');
  }
};

export const getConversation = async (req, res) => {
  try {
    const row = await ConversationService.getById(req.params.id, req.user.id);
    return sendResponse(res, 200, 'Conversation retrieved', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to fetch conversation');
  }
};

export const updateConversation = async (req, res) => {
  try {
    const row = await ConversationService.update(req.params.id, req.user.id, req.body);
    return sendResponse(res, 200, 'Conversation updated', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to update conversation');
  }
};

export const archiveConversation = async (req, res) => {
  try {
    const row = await ConversationService.archive(req.params.id, req.user.id);
    return sendResponse(res, 200, 'Conversation archived', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to archive conversation');
  }
};






