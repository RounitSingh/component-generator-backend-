import db from '../../config/db.js';
import { and, eq, sql } from 'drizzle-orm';
import { components, conversations, snapshots, shareLinks } from '../../db/schema.js';
// import { z } from 'zod';
import { shareModel } from '../models/index.js';

const requireComponentOwnership = async (componentId, userId) => {
  const rows = await db.select({ id: components.id, conversationId: components.conversationId })
    .from(components)
    .where(eq(components.id, componentId));
  const comp = rows[0];
  if (!comp) {
    const err = new Error('Component not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const conv = await db.select().from(conversations)
    .where(and(eq(conversations.id, comp.conversationId), eq(conversations.userId, userId)));
  if (conv.length === 0) {
    const err = new Error('Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }
  return { component: comp, conversation: conv[0] };
};

const generateSlug = () => {
  // 22-char unguessable base62
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 22; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

export const publish = async (userId, payload) => {
  const parsed = shareModel.PublishSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error('Validation failed');
    err.name = 'ZodError';
    err.issues = parsed.error.issues;
    throw err;
  }
  const { component } = await requireComponentOwnership(parsed.data.componentId, userId);

  // Load full component data
  const [compFull] = await db.select().from(components).where(eq(components.id, component.id));

  // Create snapshot (immutable)
  const [snap] = await db.insert(snapshots).values({
    ownerId: userId,
    conversationId: compFull.conversationId,
    componentId: compFull.id,
    data: compFull.data,
  }).returning();

  // Create share link
  let slug = generateSlug();
  // Best-effort ensure uniqueness; retry a few times
  for (let i = 0; i < 3; i++) {
    try {
      const [link] = await db.insert(shareLinks).values({
        snapshotId: snap.id,
        slug,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      }).returning();
      return { snapshot: snap, link };
    } catch (e) {
      if (String(e.message || '').includes('share_links_slug_idx')) {
        slug = generateSlug();
        continue;
      }
      throw e;
    }
  }
  // Final attempt
  const [link] = await db.insert(shareLinks).values({ snapshotId: snap.id, slug }).returning();
  return { snapshot: snap, link };
};

export const revoke = async (userId, linkId) => {
  // Ensure link belongs to user via snapshot.ownerId
  const rows = await db.select({ id: shareLinks.id, snapshotId: shareLinks.snapshotId })
    .from(shareLinks)
    .where(eq(shareLinks.id, linkId));
  const link = rows[0];
  if (!link) {
    const err = new Error('Share link not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const snapRows = await db.select().from(snapshots).where(eq(snapshots.id, link.snapshotId));
  const snap = snapRows[0];
  if (!snap || snap.ownerId !== userId) {
    const err = new Error('Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }
  const [updated] = await db.update(shareLinks)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(shareLinks.id, linkId))
    .returning();
  return updated;
};

export const getPublicBySlug = async (slug) => {
  const rows = await db.select({
    id: shareLinks.id,
    slug: shareLinks.slug,
    expiresAt: shareLinks.expiresAt,
    revokedAt: shareLinks.revokedAt,
    snapshotId: shareLinks.snapshotId,
  }).from(shareLinks).where(eq(shareLinks.slug, slug));
  const link = rows[0];
  if (!link) {
    const err = new Error('Not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (link.revokedAt) {
    const err = new Error('Link revoked');
    err.code = 'GONE';
    throw err;
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    const err = new Error('Link expired');
    err.code = 'GONE';
    throw err;
  }
  const [snap] = await db.select().from(snapshots).where(eq(snapshots.id, link.snapshotId));
  if (!snap) {
    const err = new Error('Snapshot missing');
    err.code = 'NOT_FOUND';
    throw err;
  }
  // Increment view count (best-effort)
  try {
    await db.update(shareLinks)
      .set({ viewCount: sql`COALESCE(${shareLinks.viewCount}, 0) + 1`, updatedAt: new Date() })
      .where(eq(shareLinks.id, link.id));
  } catch {
    // ignore
  }
  return { link, snapshot: snap };
};


