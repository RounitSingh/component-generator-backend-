import * as SessionService from '../services/session-Service.js';
import { sendResponse } from '../../utils/response.js';

export const createSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description } = req.body;
        const result = await SessionService.createSession(userId, { title, description });
        return sendResponse(res, 201, result.message, result.data);
    } catch (error) {
        return sendResponse(res, 400, error.message, null);
    }
};

export const getUserSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await SessionService.getUserSessions(userId);
        return sendResponse(res, 200, 'Sessions retrieved successfully', result.data);
    } catch (error) {
        return sendResponse(res, 500, error.message, null);
    }
};

export const getSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const result = await SessionService.getSession(parseInt(sessionId), userId);
        return sendResponse(res, 200, 'Session retrieved successfully', result.data);
    } catch (error) {
        if (error.message === 'Session not found') {
            return sendResponse(res, 404, error.message, null);
        }
        return sendResponse(res, 500, error.message, null);
    }
};

export const updateSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const updateData = req.body;
        const result = await SessionService.updateSession(parseInt(sessionId), userId, updateData);
        return sendResponse(res, 200, result.message, result.data);
    } catch (error) {
        if (error.message === 'Session not found') {
            return sendResponse(res, 404, error.message, null);
        }
        return sendResponse(res, 400, error.message, null);
    }
};

export const deleteSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const result = await SessionService.deleteSession(parseInt(sessionId), userId);
        return sendResponse(res, 200, result.message, null);
    } catch (error) {
        if (error.message === 'Session not found') {
            return sendResponse(res, 404, error.message, null);
        }
        return sendResponse(res, 500, error.message, null);
    }
};

export const addChatMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { role, content, messageType, metadata } = req.body;
        if (!role || !content) {
            return sendResponse(res, 400, 'Role and content are required', null);
        }
        const result = await SessionService.addChatMessage(parseInt(sessionId), userId, {
            role,
            content,
            messageType,
            metadata,
        });
        return sendResponse(res, 201, result.message, result.data);
    } catch (error) {
        if (error.message === 'Session not found') {
            return sendResponse(res, 404, error.message, null);
        }
        return sendResponse(res, 500, error.message, null);
    }
};

export const saveComponent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { name, jsxCode, cssCode, componentType, metadata } = req.body;
        if (!name || !jsxCode || !cssCode) {
            return sendResponse(res, 400, 'Name, JSX code, and CSS code are required', null);
        }
        const result = await SessionService.saveComponent(parseInt(sessionId), userId, {
            name,
            jsxCode,
            cssCode,
            componentType,
            metadata,
        });
        return sendResponse(res, 201, result.message, result.data);
    } catch (error) {
        if (error.message === 'Session not found') {
            return sendResponse(res, 404, error.message, null);
        }
        return sendResponse(res, 500, error.message, null);
    }
};

export const saveAIInteraction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { prompt, response, interactionType, targetElement, metadata } = req.body;
        if (!prompt || !response || !interactionType) {
            return sendResponse(res, 400, 'Prompt, response, and interaction type are required', null);
        }
        const result = await SessionService.saveAIInteraction(parseInt(sessionId), userId, {
            prompt,
            response,
            interactionType,
            targetElement,
            metadata,
        });
        return sendResponse(res, 201, result.message, result.data);
    } catch (error) {
        if (error.message === 'Session not found') {
            return sendResponse(res, 404, error.message, null);
        }
        return sendResponse(res, 500, error.message, null);
    }
};

export const getSessionStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await SessionService.getSessionStats(userId);
        return sendResponse(res, 200, 'Statistics retrieved successfully', result.data);
    } catch (error) {
        return sendResponse(res, 500, error.message, null);
    }
};

export const getSessionMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const messages = await SessionService.getSessionMessages(parseInt(sessionId), userId);
    return sendResponse(res, 200, 'Messages retrieved successfully', messages);
  } catch (error) {
    return sendResponse(res, 500, error.message, null);
  }
};

export const getSessionComponents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const components = await SessionService.getSessionComponents(parseInt(sessionId), userId);
    return sendResponse(res, 200, 'Components retrieved successfully', components);
  } catch (error) {
    return sendResponse(res, 500, error.message, null);
  }
};

export const getSessionInteractions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const interactions = await SessionService.getSessionInteractions(parseInt(sessionId), userId);
    return sendResponse(res, 200, 'Interactions retrieved successfully', interactions);
  } catch (error) {
    return sendResponse(res, 500, error.message, null);
  }
}; 