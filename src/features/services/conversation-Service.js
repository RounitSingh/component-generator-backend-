import db from '../../config/db.js';
import { getJson, setJson } from '../../config/redis.js';
import { conversations } from '../../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';
import { ConversationCreateSchema, ConversationUpdateSchema } from '../models/conversation.model.js';

export const requireOwnership = async (conversationId, userId) => {
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  if (rows.length === 0) {
    const err = new Error('Conversation not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return rows[0];
};

export const create = async (userId, payload) => {
  const parsed = ConversationCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error('Validation failed');
    err.name = 'ZodError';
    err.issues = parsed.error.issues;
    throw err;
  }
  const [row] = await db.insert(conversations).values({
    userId,
    title: parsed.data.title || null,
    isActive: true,
  }).returning();
  return row;
};

export const listMine = async (userId, { activeOnly = false } = {}) => {
  const where = activeOnly ? and(eq(conversations.userId, userId), eq(conversations.isActive, true)) : eq(conversations.userId, userId);
  const key = `conv:list:user:${userId}:active:${activeOnly ? 1 : 0}`;
  try {
    const cached = await getJson(key);
    if (cached) return cached;
  } catch (e) {
    console.warn('[redis] failed to read conversation list cache', e?.message || e);
  }
  const rows = await db.select().from(conversations).where(where).orderBy(desc(conversations.updatedAt));
  try { await setJson(key, rows, 120); } catch (e) {
    console.warn('[redis] failed to set conversation list cache', e?.message || e);
  }
  return rows;
};

export const getById = async (id, userId) => {
  return requireOwnership(id, userId);
};

export const update = async (id, userId, payload) => {
  await requireOwnership(id, userId);
  const parsed = ConversationUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error('Validation failed');
    err.name = 'ZodError';
    err.issues = parsed.error.issues;
    throw err;
  }
  const [row] = await db.update(conversations).set({
    ...(parsed.data.title !== undefined && { title: parsed.data.title }),
    ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    updatedAt: new Date(),
  }).where(eq(conversations.id, id)).returning();
  // Invalidate user conversation list caches
  try {
    const { redis } = await import('../../config/redis.js');
    const keys = await redis.keys(`conv:list:user:${userId}:*`);
    if (keys?.length) await redis.del(keys);
  } catch (e) {
    console.warn('[redis] failed to invalidate conversation list cache', e?.message || e);
  }
  return row;
};

export const archive = async (id, userId) => {
  await requireOwnership(id, userId);
  const [row] = await db.update(conversations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  try {
    const { redis } = await import('../../config/redis.js');
    const keys = await redis.keys(`conv:list:user:${userId}:*`);
    if (keys?.length) await redis.del(keys);
  } catch (e) {
    console.warn('[redis] failed to invalidate conversation list cache', e?.message || e);
  }
  return row;
};






