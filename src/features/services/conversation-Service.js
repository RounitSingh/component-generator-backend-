import db from '../../config/db.js';
import { conversations, messages, components, snapshots, shareLinks } from '../../db/schema.js';
import { and, eq, desc, lt, inArray, or, sql } from 'drizzle-orm';
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
  
  let q = db.select().from(conversations).where(whereBase).orderBy(desc(conversations.updatedAt), desc(conversations.id)).limit(take);
  
  if (cursor) {
    // Parse cursor: format is "updatedAt|id" or just "updatedAt" for backward compatibility
    let cursorDate;
    let cursorId = null;
    
    if (cursor.includes('|')) {
      const [dateStr, idStr] = cursor.split('|');
      cursorDate = new Date(dateStr);
      cursorId = idStr || null;
    } else {
      cursorDate = new Date(cursor);
    }
    
    // Use compound cursor: updatedAt < cursorDate OR (updatedAt = cursorDate AND id < cursorId)
    // This ensures we don't skip conversations with the same updatedAt timestamp
    if (cursorId) {
      // For UUID comparison, use text comparison for reliable ordering
      // Use sql.raw with proper quoting to prevent SQL injection
      const idComparison = sql`${conversations.id}::text < ${sql.raw(`'${cursorId.replace(/'/g, "''")}'`)}::text`;
      q = db.select().from(conversations)
        .where(and(
          whereBase,
          or(
            lt(conversations.updatedAt, cursorDate),
            and(
              eq(conversations.updatedAt, cursorDate),
              idComparison
            )
          )
        ))
        .orderBy(desc(conversations.updatedAt), desc(conversations.id))
        .limit(take);
    } else {
      // Fallback for old cursor format
      q = db.select().from(conversations)
        .where(and(whereBase, lt(conversations.updatedAt, cursorDate)))
        .orderBy(desc(conversations.updatedAt), desc(conversations.id))
        .limit(take);
    }
  }
  
  const rows = await q;
  const hasMore = rows.length === take;
  const items = hasMore ? rows.slice(0, take - 1) : rows;
  
  // Create compound cursor: "updatedAt|id" for more reliable pagination
  const nextCursor = hasMore && items.length > 0 
    ? `${items[items.length - 1].updatedAt.toISOString()}|${items[items.length - 1].id}` 
    : null;
  
  console.log(`[listMine] userId: ${userId}, cursor: ${cursor}, limit: ${limit}, returned: ${items.length} items, hasMore: ${hasMore}, nextCursor: ${nextCursor}`);
  
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

export const unarchive = async (id, userId) => {
  await requireOwnership(id, userId);
  const [row] = await db.update(conversations)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return row;
};

export const deleteConversation = async (id, userId) => {
  await requireOwnership(id, userId);
  
  // Use a transaction to ensure atomic deletion
  return await db.transaction(async (tx) => {
    // First, get all component IDs for this conversation to delete related snapshots
    const conversationComponents = await tx.select({ id: components.id })
      .from(components)
      .where(eq(components.conversationId, id));
    const componentIds = conversationComponents.map(c => c.id);
    
    // Delete shareLinks that reference snapshots of these components
    if (componentIds.length > 0) {
      const conversationSnapshots = await tx.select({ id: snapshots.id })
        .from(snapshots)
        .where(eq(snapshots.conversationId, id));
      const snapshotIds = conversationSnapshots.map(s => s.id);
      
      if (snapshotIds.length > 0) {
        // Delete all shareLinks for all snapshots
        await tx.delete(shareLinks).where(inArray(shareLinks.snapshotId, snapshotIds));
      }
    }
    
    // Delete snapshots that reference this conversation
    await tx.delete(snapshots).where(eq(snapshots.conversationId, id));
    
    // Delete all related messages
    await tx.delete(messages).where(eq(messages.conversationId, id));
    
    // Delete all related components
    await tx.delete(components).where(eq(components.conversationId, id));
    
    // Finally delete the conversation
    const [row] = await tx.delete(conversations)
      .where(eq(conversations.id, id))
      .returning();
    return row;
  });
};

export const bulkDeleteConversations = async (ids, userId) => {
  // Validate that all conversations belong to the user
  const validIds = Array.from(new Set(ids)).filter(Boolean);
  if (validIds.length === 0) {
    return { deletedCount: 0, deletedIds: [] };
  }

  // Verify ownership of all conversations
  const ownedConversations = await db.select({ id: conversations.id })
    .from(conversations)
    .where(and(
      inArray(conversations.id, validIds),
      eq(conversations.userId, userId)
    ));
  
  const ownedIds = ownedConversations.map(c => c.id);
  if (ownedIds.length === 0) {
    return { deletedCount: 0, deletedIds: [] };
  }

  // Use a transaction to ensure atomic deletion
  return await db.transaction(async (tx) => {
    // Get all component IDs for these conversations
    const conversationComponents = await tx.select({ id: components.id, conversationId: components.conversationId })
      .from(components)
      .where(inArray(components.conversationId, ownedIds));
    const componentIds = conversationComponents.map(c => c.id);
    
    // Delete shareLinks that reference snapshots of these components
    if (componentIds.length > 0) {
      const conversationSnapshots = await tx.select({ id: snapshots.id })
        .from(snapshots)
        .where(inArray(snapshots.conversationId, ownedIds));
      const snapshotIds = conversationSnapshots.map(s => s.id);
      
      if (snapshotIds.length > 0) {
        // Delete all shareLinks for all snapshots
        await tx.delete(shareLinks).where(inArray(shareLinks.snapshotId, snapshotIds));
      }
    }
    
    // Delete snapshots that reference these conversations
    await tx.delete(snapshots).where(inArray(snapshots.conversationId, ownedIds));
    
    // Delete all related messages
    await tx.delete(messages).where(inArray(messages.conversationId, ownedIds));
    
    // Delete all related components
    await tx.delete(components).where(inArray(components.conversationId, ownedIds));
    
    // Finally delete the conversations
    const deleted = await tx.delete(conversations)
      .where(inArray(conversations.id, ownedIds))
      .returning();
    
    return { deletedCount: deleted.length, deletedIds: deleted.map(c => c.id) };
  });
};






