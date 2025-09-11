// Standardized API response helpers (sendResponse-first pattern)

const build = (statusCode, message, data = null, error = null, meta = undefined) => ({
  success: statusCode >= 200 && statusCode < 300,
  message,
  ...(data !== null && { data }),
  ...(error && { error }),
  ...(meta !== undefined && { meta }),
  timestamp: new Date().toISOString(),
});

export const sendResponse = (res, statusCode, message, data = null, error = null, meta = undefined) => {
  return res
    .status(statusCode)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(build(statusCode, message, data, error, meta), null, 2));
};

// Convenience wrappers (optional)
export const ok = (res, data = null, message = 'Success', meta) =>
  sendResponse(res, 200, message, data, null, meta);

export const created = (res, data = null, message = 'Created', meta) =>
  sendResponse(res, 201, message, data, null, meta);

export const accepted = (res, data = null, message = 'Accepted', meta) =>
  sendResponse(res, 202, message, data, null, meta);

export const noContent = (res) => res.status(204).send();

// Pagination helper: keyset or offset based
export const paginated = (res, items, { nextCursor = null, prevCursor = null, total = undefined } = {}, message = 'Success') => {
  const meta = { nextCursor, prevCursor, ...(total !== undefined && { total }) };
  return sendResponse(res, 200, message, { items }, null, meta);
};

export default { sendResponse, ok, created, accepted, noContent, paginated };


