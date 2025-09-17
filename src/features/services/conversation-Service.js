import db from '../../config/db.js';
import { conversations, messages, components } from '../../db/schema.js';
import { and, eq, desc, lt } from 'drizzle-orm';
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

export const listMine = async (userId, { activeOnly = false, limit = 10, cursor = null } = {}) => {
  const whereBase = activeOnly ? and(eq(conversations.userId, userId), eq(conversations.isActive, true)) : eq(conversations.userId, userId);
  const take = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) + 1;
  let q = db.select().from(conversations).where(whereBase).orderBy(desc(conversations.updatedAt)).limit(take);
  if (cursor) {
    const cursorDate = new Date(cursor);
    q = db.select().from(conversations)
      .where(and(whereBase, lt(conversations.updatedAt, cursorDate)))
      .orderBy(desc(conversations.updatedAt))
      .limit(take);
  }
  const rows = await q;
  const hasMore = rows.length === take;
  const items = hasMore ? rows.slice(0, take - 1) : rows;
  const nextCursor = hasMore ? items[items.length - 1].updatedAt.toISOString() : null;
  return { items, nextCursor };
};

export const getById = async (id, userId) => {
  return requireOwnership(id, userId);
};

export const getDetails = async (id, userId, { messagesLimit = 200 } = {}) => {
  await requireOwnership(id, userId);
  const convo = await db.select().from(conversations).where(eq(conversations.id, id));
  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(desc(messages.createdAt))
    .limit(Math.min(Math.max(parseInt(messagesLimit, 10) || 200, 1), 500));
  const comps = await db.select().from(components)
    .where(eq(components.conversationId, id))
    .orderBy(desc(components.createdAt));
  return { conversation: convo[0], messages: msgs, components: comps };
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






