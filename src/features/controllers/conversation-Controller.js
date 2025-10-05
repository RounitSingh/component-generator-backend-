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
    const { cursor, limit, activeOnly } = req.query;
    const { items, nextCursor } = await ConversationService.listMine(req.user.id, {
      cursor: cursor || null,
      limit: limit || 10,
      activeOnly: activeOnly === 'true',
    });
    return sendResponse(res, 200, 'Conversations retrieved', { items }, null, { nextCursor });
  } catch (err) {
    return handleError(res, err, 'Failed to fetch conversations');
  }
};

export const getConversation = async (req, res) => {
  try {
    const include = req.query.include || 'summary';
    if (include === 'details') {
      const messagesLimit = req.query.messagesLimit ? parseInt(req.query.messagesLimit, 10) : undefined;
      const details = await ConversationService.getDetails(req.params.id, req.user.id, { messagesLimit });
      return sendResponse(res, 200, 'Conversation details retrieved', details);
    }
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

export const unarchiveConversation = async (req, res) => {
  try {
    const row = await ConversationService.unarchive(req.params.id, req.user.id);
    return sendResponse(res, 200, 'Conversation unarchived', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to unarchive conversation');
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const row = await ConversationService.deleteConversation(req.params.id, req.user.id);
    return sendResponse(res, 200, 'Conversation deleted', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Conversation not found', null);
    return handleError(res, err, 'Failed to delete conversation');
  }
};






