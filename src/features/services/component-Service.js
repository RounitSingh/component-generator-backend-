import db from '../../config/db.js';
import { components, conversations } from '../../db/schema.js';
import { and, eq, desc } from 'drizzle-orm';
import { componentModel } from '../models/component.model.js';

const requireConversationOwnership = async (conversationId, userId) => {
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
  const parsed = componentModel.CreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error('Validation failed');
    err.name = 'ZodError';
    err.issues = parsed.error.issues;
    throw err;
  }
  await requireConversationOwnership(parsed.data.conversationId, userId);
  const [row] = await db.insert(components).values({
    conversationId: parsed.data.conversationId,
    messageId: parsed.data.messageId ?? null,
    type: parsed.data.type,
    data: parsed.data.data,
  }).returning();
  return row;
};

export const listByConversation = async (userId, conversationId) => {
  await requireConversationOwnership(conversationId, userId);
  return db.select().from(components)
    .where(eq(components.conversationId, conversationId))
    .orderBy(desc(components.createdAt));
};

export const update = async (userId, id, payload) => {
  const parsed = componentModel.UpdateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error('Validation failed');
    err.name = 'ZodError';
    err.issues = parsed.error.issues;
    throw err;
  }
  const rows = await db.select().from(components).where(eq(components.id, id));
  const row = rows[0];
  if (!row) {
    const err = new Error('Component not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await requireConversationOwnership(row.conversationId, userId);
  const [updated] = await db.update(components).set({
    ...(parsed.data.type !== undefined && { type: parsed.data.type }),
    ...(parsed.data.data !== undefined && { data: parsed.data.data }),
    updatedAt: new Date(),
  }).where(eq(components.id, id)).returning();
  return updated;
};

export const remove = async (userId, id) => {
  const rows = await db.select().from(components).where(eq(components.id, id));
  const row = rows[0];
  if (!row) {
    const err = new Error('Component not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await requireConversationOwnership(row.conversationId, userId);
  await db.delete(components).where(eq(components.id, id));
  return { ok: true };
};




