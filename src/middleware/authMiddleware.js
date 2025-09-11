import jwt from 'jsonwebtoken';
import { sendResponse } from '../utils/apiResponse.js';
import db from '../config/db.js';
import { sessions } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { getJson } from '../config/redis.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, 'Access token is required', null);
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    const decoded = jwt.verify(token, jwtSecret);

    // Optional: enforce active session via X-Session-Id
    const sessionId = req.header('X-Session-Id');
    if (sessionId) {
      // First check Redis cache for fast path
      let s = null;
      try {
        s = await getJson(`session:${sessionId}`);
      } catch {}
      if (!s) {
        const rows = await db.select().from(sessions)
          .where(and(eq(sessions.id, sessionId), eq(sessions.userId, decoded.userId)));
        s = rows[0];
      }
      if (!s || !s.isActive) {
        return sendResponse(res, 401, 'Inactive or invalid session', null);
      }
      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
        return sendResponse(res, 401, 'Session expired', null);
      }
      req.session = { id: s.id };
    }

    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
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

      if (!s || !s.isActive) {

        return sendResponse(res, 401, 'Inactive or invalid session', null);

      }

      if (s.expiresAt && new Date(s.expiresAt) < new Date()) {

        return sendResponse(res, 401, 'Session expired', null);

      }

      req.session = { id: s.id };

    }



    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };

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


