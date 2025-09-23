import db from '../../config/db.js';
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

  return await db.transaction(async (tx) => {
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
    // Auto-title: if conversation has no title or has generic title and this is the first user text message, set a title
    const convoRows = await tx.select().from(conversations).where(eq(conversations.id, parsed.data.conversationId));
    const convo = convoRows[0];
    let maybeTitle = null;
    
    // Check if this is a user text message and conversation needs a title
    const needsTitle = !convo.title || 
                      convo.title === 'untitled' || 
                      convo.title === 'New Chat' || 
                      convo.title === 'untitled' ||
                      convo.title === 'New Chat';
    
    if (needsTitle && parsed.data.role === 'user' && parsed.data.type === 'text') {
      const content = typeof parsed.data.data === 'string' ? parsed.data.data : (parsed.data.data?.content || '');
      if (content && content.trim().length > 0) {
        // Clean up the content and create a meaningful title
        const cleaned = content.trim().replace(/\s+/g, ' ');
        // Take first 50 characters and add ellipsis if longer
        maybeTitle = cleaned.length > 50 ? cleaned.slice(0, 50) + '...' : cleaned;
      }
    }
    await tx.update(conversations)
      .set({ updatedAt: new Date(), ...(maybeTitle && { title: maybeTitle }) })
      .where(eq(conversations.id, parsed.data.conversationId));
    return row;
  });
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
  return { items, nextCursor };
};


