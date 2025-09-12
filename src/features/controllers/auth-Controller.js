import * as AuthService from '../services/auth-Service.js';
import { sendResponse } from '../../utils/apiResponse.js';
import { performanceMonitor } from '../../utils/performance.js';

const buildDeviceInfo = (req, bodyDeviceInfo = {}) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (forwardedFor ? String(forwardedFor).split(',')[0].trim() : req.ip);
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = {
    ip,
    userAgent,
    ...bodyDeviceInfo,
  };
  return deviceInfo;
};

export const signup = async (req, res) => {
  return performanceMonitor.measure('signup', async () => {
    // // console.log('Received signup request:', req.body);
    try {
      const { email, password, name, deviceInfo: bodyDeviceInfo } = req.body;
      const deviceInfo = buildDeviceInfo(req, bodyDeviceInfo);
      const result = await AuthService.signup({ email, password, name, deviceInfo });
      // result.data should include { accessToken, sessionId }
      return sendResponse(res, 201, result.message, result.data);
    } catch (error) {
      // // console.error('Signup failed:', error);
      return sendResponse(res, 400, error.message, null);
    }
  });
};

// export const verifyOtp = async (req, res) => {
//   try {
//     const { email, otp } = req.body;
//     const result = await AuthService.verifyOtp({ email, otp });
//     return sendResponse(res, 200, result.message, null);
//   } catch (error) {
//     return sendResponse(res, 400, error.message, null);
//   }
// };

export const login = async (req, res) => {
  return performanceMonitor.measure('login', async () => {
    try {
      const { email, password, deviceInfo: bodyDeviceInfo } = req.body;
      const deviceInfo = buildDeviceInfo(req, bodyDeviceInfo);
      const result = await AuthService.login({ email, password, deviceInfo });
      return sendResponse(res, 200, result.message, result.data);
    } catch (error) {
      return sendResponse(res, 401, error.message, null);
    }
  });
};

export const refreshToken = async (req, res) => {
  return performanceMonitor.measure('refreshToken', async () => {
    try {
      const { refreshToken, sessionId } = req.body;
      if (!refreshToken || !sessionId) {
        return sendResponse(res, 400, 'Refresh token is required', null);
      }
      const result = await AuthService.refreshToken({ refreshToken, sessionId });
      return sendResponse(res, 200, result.message, result.data);
    } catch (error) {
      return sendResponse(res, 401, error.message, null);
    }
  });
};

export const logout = async (req, res) => {
  return performanceMonitor.measure('logout', async () => {
    try {
      const { refreshToken, sessionId } = req.body;
      if (!refreshToken || !sessionId) {
        return sendResponse(res, 400, 'Refresh token and sessionId are required', null);
      }
      const result = await AuthService.logout({ refreshToken, sessionId });
      return sendResponse(res, 200, result.message, null);
    } catch (error) {
      return sendResponse(res, 400, error.message, null);
    }
  });
};

export const getProfile = async (req, res) => {
  return performanceMonitor.measure('getProfile', async () => {
    try {
      const userId = req.user.id;
      const result = await AuthService.getUserProfile(userId);
      return sendResponse(res, 200, 'Profile retrieved successfully', result.data);
    } catch (error) {
      return sendResponse(res, 404, error.message, null);
    }
  });
};

export const updateProfile = async (req, res) => {
  return performanceMonitor.measure('updateProfile', async () => {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      const result = await AuthService.updateUserProfile(userId, updateData);
      return sendResponse(res, 200, result.message, result.data);
    } catch (error) {
      return sendResponse(res, 400, error.message, null);
    }
  });
};

export const changePassword = async (req, res) => {
  return performanceMonitor.measure('changePassword', async () => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return sendResponse(res, 400, 'Current password and new password are required', null);
      }
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      return sendResponse(res, 200, result.message, null);
    } catch (error) {
      return sendResponse(res, 400, error.message, null);
    }
  });
};

export const verifyToken = async (req, res) => {
  return performanceMonitor.measure('verifyToken', async () => {
    try {
      const { token } = req.body;
      if (!token) {
        return sendResponse(res, 400, 'Token is required', null);
      }
      const result = await AuthService.verifyToken(token);
      return sendResponse(res, 200, 'Token is valid', {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      });
    } catch (error) {
      return sendResponse(res, 401, error.message, null);
    }
  });
};
