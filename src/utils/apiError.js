import { ZodError } from 'zod';

const base = (statusCode, message, error = null, details = undefined) => ({
  success: false,
  message,
  ...(error && { error }),
  ...(details !== undefined && { details }),
  timestamp: new Date().toISOString(),
});

export const mapZod = (err) =>
  err.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })) ?? [{ message: err.message }];

export const badRequest = (res, message = 'Bad Request', details) => {
  return res
    .status(400)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(400, message, null, details), null, 2));
};

export const unauthorized = (res, message = 'Unauthorized') => {
  return res
    .status(401)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(401, message), null, 2));
};

export const forbidden = (res, message = 'Forbidden') => {
  return res
    .status(403)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(403, message), null, 2));
};

export const notFound = (res, message = 'Not Found') => {
  return res
    .status(404)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(404, message), null, 2));
};

export const conflict = (res, message = 'Conflict') => {
  return res
    .status(409)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(409, message), null, 2));
};

export const unprocessable = (res, message = 'Unprocessable Entity', details) => {
  return res
    .status(422)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(422, message, null, details), null, 2));
};

export const serverError = (res, message = 'Internal Server Error', error = null) => {
  return res
    .status(500)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(base(500, message, error ? [{ message: error.message }] : null), null, 2));
};

// Helper to auto-handle Zod errors and generic errors
export const handleError = (res, err, fallbackMessage = 'Request failed') => {
  if (err instanceof ZodError) {
    return badRequest(res, 'Validation failed', mapZod(err));
  }
  return serverError(res, fallbackMessage, err);
};

export default {
  mapZod,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,
  handleError,
};






