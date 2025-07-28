// Unified response function
export const sendResponse = (res, statusCode, message, data = null, error = null) => {
    const response = {
        success: statusCode >= 200 && statusCode < 300,
        message,
        ...(data && { data }),
        ...(error && { error }),
        timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).set('Content-Type', 'application/json').send(JSON.stringify(response, null, 2));
};

// Success responses
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
    return sendResponse(res, statusCode, message, data);
};

// Error responses
export const sendError = (res, statusCode = 500, message = 'Internal server error', error = null) => {
    return sendResponse(res, statusCode, message, null, error);
};

// Validation error response
export const sendValidationError = (res, errors) => {
    return sendResponse(res, 400, 'Validation failed', null, errors);
};

// Not found response
export const sendNotFound = (res, message = 'Resource not found') => {
    return sendResponse(res, 404, message);
};

// Unauthorized response
export const sendUnauthorized = (res, message = 'Unauthorized') => {
    return sendResponse(res, 401, message);
};

// Forbidden response
export const sendForbidden = (res, message = 'Forbidden') => {
    return sendResponse(res, 403, message);
}; 