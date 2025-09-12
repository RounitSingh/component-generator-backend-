import db from '../../config/db.js';
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
  return db.select().from(conversations).where(where).orderBy(desc(conversations.updatedAt));
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
  return row;
};

export const archive = async (id, userId) => {
  await requireOwnership(id, userId);
  const [row] = await db.update(conversations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return row;
};






