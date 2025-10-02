import * as ShareService from '../services/share-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { handleError } from '../../utils/apiError.js';

export const publishComponent = async (req, res) => {
  try {
    const { snapshot, link } = await ShareService.publish(req.user.id, req.body);
    return sendResponse(res, 201, 'Share link created', { snapshot, link });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Component not found', null);
    if (err.name === 'ZodError') return sendResponse(res, 400, 'Validation failed', { issues: err.issues });
    if (err.code === 'FORBIDDEN') return sendResponse(res, 403, 'Forbidden', null);
    return handleError(res, err, 'Failed to publish component');
  }
};

export const revokeLink = async (req, res) => {
  try {
    const updated = await ShareService.revoke(req.user.id, req.params.id);
    return sendResponse(res, 200, 'Share link revoked', updated);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Share link not found', null);
    if (err.code === 'FORBIDDEN') return sendResponse(res, 403, 'Forbidden', null);
    return handleError(res, err, 'Failed to revoke link');
  }
};

// Public endpoint; no auth
export const viewPublic = async (req, res) => {
  try {
    const { snapshot, link } = await ShareService.getPublicBySlug(req.params.slug);
    // Return minimal safe payload
    return sendResponse(res, 200, 'OK', {
      slug: link.slug,
      snapshotId: snapshot.id,
      data: snapshot.data,
      createdAt: snapshot.createdAt,
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return sendResponse(res, 404, 'Not found', null);
    if (err.code === 'GONE') return sendResponse(res, 410, 'Link expired or revoked', null);
    return handleError(res, err, 'Failed to fetch shared component');
  }
};


