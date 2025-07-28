import jwt from 'jsonwebtoken';
import { sendResponse } from '../utils/response.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, 'Access token is required', null);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, jwtSecret);

    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, 'Token has expired', null);
    } else if (error.name === 'JsonWebTokenError') {
      return sendResponse(res, 401, 'Invalid token', null);
    } else {
      return sendResponse(res, 500, 'Token verification failed', null);
    }
  }
};

export default authMiddleware;
