import db from '../../config/db.js';
import redis, { getJson, setJson } from '../../config/redis.js';
import { messages, conversations } from '../../db/schema.js';
import { and, eq, desc, lt } from 'drizzle-orm';
import { messageModel } from '../models/message.model.js';
import * as QuotaService from './quota-Service.js';

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
  const parsed = messageModel.CreateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error(parsed.error.message);
    err.name = 'ZodError';
    throw err;
  }
  await requireConversationOwnership(parsed.data.conversationId, userId);
  // Enforce daily quota before creating a message
  await QuotaService.checkAndIncrement(userId);

  const row = await db.transaction(async (tx) => {
    const latest = await tx.select({ v: messages.version })
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.conversationId))
      .orderBy(desc(messages.version))
      .limit(1);
    const nextVersion = latest[0]?.v ? latest[0].v + 1 : 1;

    const [row] = await tx.insert(messages).values({
      conversationId: parsed.data.conversationId,
      role: parsed.data.role,
      type: parsed.data.type,
      data: parsed.data.data,
      isEdited: parsed.data.isEdited ?? false,
      version: nextVersion,
    }).returning();
    // Bump conversation updatedAt so conversation ordering reflects recent activity
    await tx.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, parsed.data.conversationId));
    return row;
  });
  // Invalidate cached pages for this conversation
  try {
    const keys = await redis.keys(`msg:list:conv:${row.conversationId}:*`);
    if (keys?.length) await redis.del(keys);
  } catch (e) {
    console.warn('[redis] failed to invalidate message list cache', e?.message || e);
  }
  return row;
};

export const getById = async (userId, id) => {
  const rows = await db.select().from(messages).where(eq(messages.id, id));
  const row = rows[0];
  if (!row) {
    const err = new Error('Message not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await requireConversationOwnership(row.conversationId, userId);
  return row;
};

export const listByConversation = async (userId, conversationId, { cursor = null, limit = 50 } = {}) => {
  await requireConversationOwnership(conversationId, userId);
  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100) + 1;
  const cacheKey = `msg:list:conv:${conversationId}:cursor:${cursor || 'latest'}:take:${take}`;
  // Try cache
  try {
    const cached = await getJson(cacheKey);
    if (cached) return cached;
  } catch (e) {
    console.warn('[redis] failed to read message list cache', e?.message || e);
  }

  let q = db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(take);
  if (cursor) {
    q = db.select().from(messages)
      .where(and(eq(messages.conversationId, conversationId), lt(messages.createdAt, new Date(cursor))))
      .orderBy(desc(messages.createdAt))
      .limit(take);
  }
  const rows = await q;
  const hasMore = rows.length === take;
  const items = hasMore ? rows.slice(0, take - 1) : rows;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
  const payload = { items, nextCursor };
  // Set cache with short TTL
  try { await setJson(cacheKey, payload, 60); } catch (e) {
    console.warn('[redis] failed to set message list cache', e?.message || e);
  }
  return payload;
};


