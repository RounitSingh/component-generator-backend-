import * as SessionService from '../services/authSession-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { handleError } from '../../utils/apiError.js';

export const createSession = async (req, res) => {
    try {
    const row = await SessionService.create(req.user.id, req.body);
    return sendResponse(res, 201, 'Session created', row);
  } catch (err) {
    return handleError(res, err, 'Failed to create session');
    }
};

export const getUserSessions = async (req, res) => {
    try {
    const items = await SessionService.listMine(req.user.id);
    return sendResponse(res, 200, 'Sessions retrieved', items);
  } catch (err) {
    return handleError(res, err, 'Failed to fetch sessions');
    }
};

export const getSession = async (req, res) => {
    try {
    const row = await SessionService.getById(req.params.sessionId, req.user.id);
    return sendResponse(res, 200, 'Session retrieved', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Session not found', null);
    return handleError(res, err, 'Failed to fetch session');
    }
};

export const updateSession = async (req, res) => {
    try {
    const row = await SessionService.update(req.params.sessionId, req.user.id, req.body);
    return sendResponse(res, 200, 'Session updated', row);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Session not found', null);
    return handleError(res, err, 'Failed to update session');
    }
};

export const deleteSession = async (req, res) => {
    try {
    await SessionService.revoke(req.params.sessionId, req.user.id);
    return sendResponse(res, 200, 'Session revoked', null);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Session not found', null);
    return handleError(res, err, 'Failed to revoke session');
  }
};
