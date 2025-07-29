import * as AuthService from '../services/auth-Service.js';
import { sendResponse } from '../../utils/response.js';

export const signup = async (req, res) => {
  console.log('Received signup request:', req.body);
  try {
    const { email, password, name } = req.body;
    const result = await AuthService.signup({ email, password, name });
    console.log('Signup successful, result:', result);
    return sendResponse(res, 201, result.message, result.data);
  } catch (error) {
    console.error('Signup failed:', error);
    return sendResponse(res, 400, error.message, null);
  }
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
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    return sendResponse(res, 200, result.message, result.data);
  } catch (error) {
    return sendResponse(res, 401, error.message, null);
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendResponse(res, 400, 'Refresh token is required', null);
    }
    const result = await AuthService.refreshToken(refreshToken);
    return sendResponse(res, 200, result.message, result.data);
  } catch (error) {
    return sendResponse(res, 401, error.message, null);
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendResponse(res, 400, 'Refresh token is required', null);
    }
    const result = await AuthService.logout(refreshToken);
    return sendResponse(res, 200, result.message, null);
  } catch (error) {
    return sendResponse(res, 400, error.message, null);
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await AuthService.getUserProfile(userId);
    return sendResponse(res, 200, 'Profile retrieved successfully', result.data);
  } catch (error) {
    return sendResponse(res, 404, error.message, null);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    const result = await AuthService.updateUserProfile(userId, updateData);
    return sendResponse(res, 200, result.message, result.data);
  } catch (error) {
    return sendResponse(res, 400, error.message, null);
  }
};

export const changePassword = async (req, res) => {
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
};

export const verifyToken = async (req, res) => {
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
};
