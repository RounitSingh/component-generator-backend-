import db from '../../config/db.js';
import { sessions } from '../../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';
import { SessionCreateSchema, SessionUpdateSchema } from '../models/session.model.js';

// Ensure the session belongs to the user
export const requireOwnership = async (sessionId, userId) => {
  const rows = await db.select().from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  if (rows.length === 0) {
    const err = new Error('Session not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return rows[0];
};

export const create = async (userId, payload) => {
  const data = SessionCreateSchema.parse(payload);
  const [row] = await db.insert(sessions).values({
    userId,
    refreshToken: data.refreshToken,
    expiresAt: new Date(data.expiresAt),
    deviceInfo: data.deviceInfo ?? null,
    isActive: true,
  }).returning();
  return row;
};

export const listMine = async (userId, { activeOnly = false } = {}) => {
  const where = activeOnly ? and(eq(sessions.userId, userId), eq(sessions.isActive, true)) : eq(sessions.userId, userId);
  return db.select().from(sessions).where(where).orderBy(desc(sessions.updatedAt));
};

export const getById = async (id, userId) => {
  return requireOwnership(id, userId);
};

export const update = async (id, userId, payload) => {
  await requireOwnership(id, userId);
  const data = SessionUpdateSchema.parse(payload);
  const [row] = await db.update(sessions).set({
    ...(data.refreshToken && { refreshToken: data.refreshToken }),
    ...(data.expiresAt && { expiresAt: new Date(data.expiresAt) }),
    ...(data.deviceInfo !== undefined && { deviceInfo: data.deviceInfo }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
    updatedAt: new Date(),
  }).where(eq(sessions.id, id)).returning();
  return row;
};

export const revoke = async (id, userId) => {
  await requireOwnership(id, userId);
  const [row] = await db.update(sessions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning();
  return row;
};

export const revokeAll = async (userId, { exceptId = null } = {}) => {
  const rows = await db.select().from(sessions).where(eq(sessions.userId, userId));
  let count = 0;
  for (const s of rows) {
    if (exceptId && s.id === exceptId) continue;
    if (!s.isActive) continue;
    await db.update(sessions).set({ isActive: false, updatedAt: new Date() }).where(eq(sessions.id, s.id));
    count++;
  }
  return { count };
};


