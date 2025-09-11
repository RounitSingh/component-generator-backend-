import db from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { quotas } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { QuotaCreateSchema, QuotaUpdateSchema } from '../models/quota.model.js';

const nextMidnightUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
};

export const getOrCreate = async (userId) => {
  const rows = await db.select().from(quotas).where(eq(quotas.userId, userId));
  if (rows.length) return rows[0];
  const defaultLimit = 200; // adjust as needed
  const [row] = await db.insert(quotas).values({
    userId,
    dailyLimit: defaultLimit,
    usedToday: 0,
    resetAt: nextMidnightUtc(),
  }).returning();
  return row;
};

export const read = async (userId) => getOrCreate(userId);

export const update = async (userId, payload) => {
  const parsed = QuotaUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    const err = new Error(parsed.error.message);
    err.name = 'ZodError';
    throw err;
  }
  const existing = await getOrCreate(userId);
  const [row] = await db.update(quotas).set({
    ...(parsed.data.dailyLimit !== undefined && { dailyLimit: parsed.data.dailyLimit }),
    ...(parsed.data.usedToday !== undefined && { usedToday: parsed.data.usedToday }),
    ...(parsed.data.resetAt !== undefined && { resetAt: new Date(parsed.data.resetAt) }),
    updatedAt: new Date(),
  }).where(eq(quotas.id, existing.id)).returning();
  return row;
};

export const checkAndIncrement = async (userId) => {
  // Fast-path using Redis counter; fallback to DB if Redis unavailable
  try {
    const q = await getOrCreate(userId);
    const dayKey = new Date().toISOString().slice(0,10);
    const key = `quota:${userId}:${dayKey}`;
    const used = await redis.incr(key);
    if (used === 1) {
      const ttl = Math.ceil((nextMidnightUtc().getTime() - Date.now()) / 1000);
      await redis.expire(key, ttl);
    }
    if (used > q.dailyLimit) {
      // Roll back counter one step to avoid permanent overshoot
      await redis.decr(key);
      const err = new Error('Daily quota exceeded');
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }
    // Optionally sync periodically to DB (best-effort)
    return { ...q, usedToday: used };
  } catch {
    // Fallback to original DB-based logic
    return await db.transaction(async (tx) => {
      const rows = await tx.select().from(quotas).where(eq(quotas.userId, userId));
      let q = rows[0];
      if (!q) {
        const [created] = await tx.insert(quotas).values({ userId, dailyLimit: 200, usedToday: 0, resetAt: nextMidnightUtc() }).returning();
        q = created;
      }
      const now = new Date();
      let usedToday = q.usedToday;
      let resetAt = q.resetAt;
      if (resetAt && now > resetAt) {
        usedToday = 0;
        resetAt = nextMidnightUtc();
      }
      if (usedToday >= q.dailyLimit) {
        const err = new Error('Daily quota exceeded');
        err.code = 'QUOTA_EXCEEDED';
        throw err;
      }
      const [row] = await tx.update(quotas).set({ usedToday: usedToday + 1, resetAt, updatedAt: new Date() })
        .where(eq(quotas.id, q.id)).returning();
      return row;
    });
  }
};






