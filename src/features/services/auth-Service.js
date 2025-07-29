/* eslint-disable no-useless-catch */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db.js';
import { users, userTokens } from '../../db/schema.js';
import { eq, and, lt } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export const generateToken = (payload, expiresIn = jwtExpiresIn) =>
  jwt.sign(payload, jwtSecret, { expiresIn });

export const generateRefreshToken = (userId) => {
  const expiresIn = refreshTokenExpiresIn;
  const token = jwt.sign({ userId, type: 'refresh' }, jwtSecret, { expiresIn });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
  return { token, expiresAt };
};

export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hashedPassword) =>
  await bcrypt.compare(password, hashedPassword);

export const signup = async (userData) => {
  console.log('Signup called with:', userData);
  try {
    const validatedData = signupSchema.parse(userData);
    console.log('Validated data:', validatedData);
    const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email));
    console.log('Existing user query result:', existingUser);
    if (existingUser.length > 0) {
      console.log('User with this email already exists:', validatedData.email);
      throw new Error('User with this email already exists');
    }
    const hashedPassword = await hashPassword(validatedData.password);
    console.log('Password hashed');
    const [newUser] = await db.insert(users).values({
      email: validatedData.email,
      password: hashedPassword,
      name: validatedData.name,
      is_verified: true,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      is_verified: users.is_verified,
      created_at: users.created_at,
    });
    console.log('New user inserted:', newUser);
    const accessToken = generateToken({ userId: newUser.id, email: newUser.email });
    const { token: refreshToken, expiresAt } = generateRefreshToken(newUser.id);
    console.log('Tokens generated:', { accessToken, refreshToken });
    await db.insert(userTokens).values({
      user_id: newUser.id,
      token: refreshToken,
      type: 'refresh',
      expires_at: expiresAt,
    });
    console.log('Refresh token saved for user:', newUser.id);
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser,
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    console.error('Error in signup:', error);
    if (error instanceof z.ZodError) {
      const messages = Array.isArray(error.errors)
        ? error.errors.map(e => e.message).join(', ')
        : error.message || 'Validation error';
      throw new Error(`Validation error: ${messages}`);
    }
    throw error;
  }
};

export const login = async (credentials) => {
  try {
    const validatedData = loginSchema.parse(credentials);
    const userResult = await db.select().from(users).where(eq(users.email, validatedData.email));
    if (userResult.length === 0) {
      throw new Error('User not found. Please sign up first.');
    }
    const user = userResult[0];
    if (!user.is_verified) {
      throw new Error('Account is not verified. Please contact support or complete verification.');
    }
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password. Please try again.');
    }
    const accessToken = generateToken({ userId: user.id, email: user.email });
    const { token: refreshToken, expiresAt } = generateRefreshToken(user.id);
    await db.insert(userTokens).values({
      user_id: user.id,
      token: refreshToken,
      type: 'refresh',
      expires_at: expiresAt,
    });
    await cleanupExpiredTokens();
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_verified: user.is_verified,
          created_at: user.created_at,
        },
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, jwtSecret);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    const tokenResult = await db.select().from(userTokens).where(
      and(
        eq(userTokens.token, refreshToken),
        eq(userTokens.type, 'refresh'),
        eq(userTokens.is_revoked, false)
      )
    );
    if (tokenResult.length === 0) {
      throw new Error('Invalid refresh token');
    }
    const tokenRecord = tokenResult[0];
    if (new Date() > tokenRecord.expires_at) {
      throw new Error('Refresh token expired');
    }
    const userResult = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (userResult.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult[0];
    const newAccessToken = generateToken({ userId: user.id, email: user.email });
    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Invalid refresh token');
  }
};

export const logout = async (refreshToken) => {
  try {
    await db.update(userTokens)
      .set({ is_revoked: true })
      .where(
        and(
          eq(userTokens.token, refreshToken),
          eq(userTokens.type, 'refresh')
        )
      );
    return {
      success: true,
      message: 'Logout successful',
    };
  } catch (error) {
    console.error('Error during logout:', error);
    throw new Error('Logout failed');
  }
};

export const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userResult = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (userResult.length === 0) {
      throw new Error('User not found');
    }
    return {
      success: true,
      user: userResult[0],
      decoded,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    throw new Error('Invalid token');
  }
};

export const getUserProfile = async (userId) => {
  const userResult = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    is_verified: users.is_verified,
    created_at: users.created_at,
    updated_at: users.updated_at,
  }).from(users).where(eq(users.id, userId));
  if (userResult.length === 0) {
    throw new Error('User not found');
  }
  return {
    success: true,
    data: userResult[0],
  };
};

export const updateUserProfile = async (userId, updateData) => {
  try {
    const allowedFields = ['name'];
    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }
    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }
    filteredData.updated_at = new Date();
    const [updatedUser] = await db.update(users)
      .set(filteredData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        is_verified: users.is_verified,
        created_at: users.created_at,
        updated_at: users.updated_at,
      });
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  } catch (error) {
    throw error;
  }
};

export const cleanupExpiredTokens = async () => {
  try {
    await db.delete(userTokens).where(
      and(
        lt(userTokens.expires_at, new Date()),
        eq(userTokens.is_revoked, false)
      )
    );
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (userResult.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult[0];
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    const hashedNewPassword = await hashPassword(newPassword);
    await db.update(users)
      .set({ password: hashedNewPassword, updated_at: new Date() })
      .where(eq(users.id, userId));
    await db.update(userTokens)
      .set({ is_revoked: true })
      .where(
        and(
          eq(userTokens.user_id, userId),
          eq(userTokens.type, 'refresh')
        )
      );
    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error) {
    throw error;
  }
}; 