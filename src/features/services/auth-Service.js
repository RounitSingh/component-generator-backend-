/* eslint-disable no-useless-catch */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db.js';
import { users, sessions } from '../../db/schema.js';
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

// In-memory cache for frequently accessed data (with TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedValue = (key) => {
  const item = cache.get(key);
  if (item && Date.now() < item.expiresAt) {
    return item.value;
  }
  cache.delete(key);
  return null;
};

const setCachedValue = (key, value, ttl = CACHE_TTL) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
};

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
  // console.log('🔐 [Signup] Starting signup process for:', userData.email);
  try {
    const validatedData = signupSchema.parse(userData);
    // console.log('✅ [Signup] Data validation passed');
    
    // Check if user exists (with cache)
    const cacheKey = `user_email_${validatedData.email}`;
    let existingUser = getCachedValue(cacheKey);
    
    if (!existingUser) {
      const userResult = await db.select().from(users).where(eq(users.email, validatedData.email));
      existingUser = userResult.length > 0 ? userResult[0] : null;
      setCachedValue(cacheKey, existingUser, 2 * 60 * 1000); // Cache for 2 minutes
    }
    
    if (existingUser) {
      // console.log('❌ [Signup] User already exists:', validatedData.email)
      throw new Error('User with this email already exists');
    }
    
    // console.log('🔑 [Signup] Hashing password...');
    // Hash password first, then create user with hashed password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // console.log('💾 [Signup] Creating user in database...');
    const [newUser] = await db.insert(users).values({
      email: validatedData.email,
      name: validatedData.name,
      passwordHash: hashedPassword,
      isVerified: true,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
    });
    
    const user = { ...newUser, passwordHash: hashedPassword };
    // console.log('✅ [Signup] User created successfully:', user.id);
    
    // Cache the new user
    setCachedValue(`user_email_${user.email}`, user);
    
    // console.log('🎉 [Signup] Signup completed successfully for:', user.email);
    return {
      success: true,
      message: 'User registered successfully. Please login to continue.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: true,
          createdAt: user.createdAt,
        },
      },
    };
  } catch (error) {
    // console.error('❌ [Signup] Error in signup:', error.message);
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
  // console.log('🔐 [Login] Starting login process for:', credentials.email);
  try {
    const validatedData = loginSchema.parse(credentials);
    // console.log('✅ [Login] Data validation passed');
    
    // Check cache first
    const cacheKey = `user_email_${validatedData.email}`;
    let user = getCachedValue(cacheKey);
    
    if (!user) {
      // console.log('🔍 [Login] User not in cache, checking database...');
      const userResult = await db.select().from(users).where(eq(users.email, validatedData.email));
      if (userResult.length === 0) {
        // console.log('❌ [Login] User not found:', validatedData.email);
        throw new Error('User not found. Please sign up first.');
      }
      user = userResult[0];
      setCachedValue(cacheKey, user, 2 * 60 * 1000); // Cache for 2 minutes
      // console.log('✅ [Login] User found in database:', user.id);
    } else {
      // console.log('✅ [Login] User found in cache:', user.id);
    }
    
    if (!user.isVerified) {
      // console.log('❌ [Login] Account not verified:', user.email);
      throw new Error('Account is not verified. Please contact support or complete verification.');
    }
    
    // console.log('🔑 [Login] Verifying password...');
    // Verify password
    const isPasswordValid = await comparePassword(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      // console.log('❌ [Login] Invalid password for:', user.email);
      throw new Error('Invalid password. Please try again.');
    }
    // console.log('✅ [Login] Password verified');
    
    // Generate tokens and save refresh token in parallel
    const [accessToken, refreshTokenData] = await Promise.all([
      generateToken({ userId: user.id, email: user.email }),
      generateRefreshToken(user.id)
    ]);
    
    // console.log('🔐 [Login] Creating session...');
    // Save refresh token as a session and get the session ID
    const [sessionRow] = await db.insert(sessions).values({
      userId: user.id,
      refreshToken: refreshTokenData.token,
      expiresAt: refreshTokenData.expiresAt,
      deviceInfo: credentials.deviceInfo || null,
      isActive: true,
    }).returning({ id: sessions.id });
    
    // console.log('✅ [Login] Session created:', sessionRow.id);
    
    // Cleanup expired tokens in background (non-blocking)
    setImmediate(() => cleanupExpiredTokens());
    
    // console.log('🎉 [Login] Login completed successfully for:', user.email);
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken: refreshTokenData.token,
        sessionId: sessionRow.id,
      },
    };
  } catch (error) {
    // console.error('❌ [Login] Error in login:', error.message);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const refreshToken = async ({ refreshToken, sessionId }) => {
  try {
    const decoded = jwt.verify(refreshToken, jwtSecret);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Check session validity and get user in parallel
    const [sessionRows, userResult] = await Promise.all([
      db.select().from(sessions).where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.refreshToken, refreshToken),
          eq(sessions.userId, decoded.userId),
          eq(sessions.isActive, true)
        )
      ),
      db.select().from(users).where(eq(users.id, decoded.userId))
    ]);
    
    if (sessionRows.length === 0) {
      throw new Error('Invalid refresh token');
    }
    
    const session = sessionRows[0];
    if (new Date() > session.expiresAt) {
      throw new Error('Refresh token expired');
    }
    
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

export const logout = async ({ refreshToken, sessionId }) => {
  try {
    await db.update(sessions)
      .set({ isActive: false })
      .where(and(eq(sessions.id, sessionId), eq(sessions.refreshToken, refreshToken)));
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
    
    // Check cache first
    const cacheKey = `user_id_${decoded.userId}`;
    let user = getCachedValue(cacheKey);
    
    if (!user) {
      const userResult = await db.select().from(users).where(eq(users.id, decoded.userId));
      if (userResult.length === 0) {
        throw new Error('User not found');
      }
      user = userResult[0];
      setCachedValue(cacheKey, user, 5 * 60 * 1000); // Cache for 5 minutes
    }
    
    return {
      success: true,
      user,
      decoded,
    };
  } catch (error) {
     console.error('Error verifying token:', error);
    throw new Error('Invalid token');
  }
};

export const getUserProfile = async (userId) => {
  // Check cache first
  const cacheKey = `user_id_${userId}`;
  let user = getCachedValue(cacheKey);
  
  if (!user) {
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      is_verified: users.isVerified,
      created_at: users.createdAt,
      updated_at: users.updatedAt,
    }).from(users).where(eq(users.id, userId));
    
    if (userResult.length === 0) {
      throw new Error('User not found');
    }
    
    user = userResult[0];
    setCachedValue(cacheKey, user, 5 * 60 * 1000); // Cache for 5 minutes
  }
  
  return {
    success: true,
    data: user,
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
    filteredData.updatedAt = new Date();
    
    const [updatedUser] = await db.update(users)
      .set(filteredData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        is_verified: users.isVerified,
        created_at: users.createdAt,
        updated_at: users.updatedAt,
      });
    
    // Update cache
    setCachedValue(`user_id_${userId}`, updatedUser);
    setCachedValue(`user_email_${updatedUser.email}`, updatedUser);
    
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
    await db.update(sessions)
      .set({ isActive: false })
      .where(lt(sessions.expiresAt, new Date()));
  } catch (error) {
     console.error('Error cleaning up expired tokens:', error);
  }
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Get user and verify current password in parallel
    const [userResult, hashedNewPassword] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      hashPassword(newPassword)
    ]);
    
    if (userResult.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult[0];
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password and revoke tokens in parallel
    await Promise.all([
      db.update(users)
        .set({ passwordHash: hashedNewPassword, updatedAt: new Date() })
        .where(eq(users.id, userId)),
      db.update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.userId, userId))
    ]);
    
    // Clear user cache
    cache.delete(`user_id_${userId}`);
    cache.delete(`user_email_${user.email}`);
    
    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error) {
    throw error;
  }
}; 

  