import db from '../../config/db.js';
import { sessions } from '../../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';
import { SessionCreateSchema, SessionUpdateSchema } from '../models/session.model.js';
import { redis, setJson, getJson } from '../../config/redis.js';

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
  try {
    const ttl = Math.max(1, Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
    await setJson(`session:${row.id}`, { id: row.id, userId, expiresAt: row.expiresAt, isActive: true }, ttl);
  } catch {
    // 
  }
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
  try {
    if (row) {
      const ttl = row.expiresAt ? Math.max(1, Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 1000)) : 3600;
      await setJson(`session:${row.id}`, { id: row.id, userId: row.userId, expiresAt: row.expiresAt, isActive: row.isActive }, ttl);
    }
  } catch {
    // 
  }
  return row;
};

export const revoke = async (id, userId) => {
  await requireOwnership(id, userId);
  const [row] = await db.update(sessions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning();
  try { await redis.del(`session:${id}`); } catch {
    // 
  }
  return row;
};

export const revokeAll = async (userId, { exceptId = null } = {}) => {
  const rows = await db.select().from(sessions).where(eq(sessions.userId, userId));
  let count = 0;
  for (const s of rows) {
    if (exceptId && s.id === exceptId) continue;
    if (!s.isActive) continue;
    await db.update(sessions).set({ isActive: false, updatedAt: new Date() }).where(eq(sessions.id, s.id));
    try { await redis.del(`session:${s.id}`); } catch {
      // 
    }
    count++;
  }
  return { count };
};

export const getCachedSession = async (id) => {
  try {
    return await getJson(`session:${id}`);
  } catch {
    return null;
  }
};


