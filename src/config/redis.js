import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisUrl = import.meta.env.REDIS_URL || import.meta.env.UPSTASH_REDIS_REST_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableAutoPipelining: true,
});

export const connectRedis = async () => {
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  try {
    await redis.connect();
  } catch (err) {
    // Allow app to run without Redis; callers should handle absence gracefully
    // eslint-disable-next-line no-console
    console.error('[redis] connection failed:', err?.message || err);
  }
};

export const getJson = async (key) => {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
};

export const setJson = async (key, value, ttlSeconds) => {
  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, payload, 'EX', ttlSeconds);
  } else {
    await redis.set(key, payload);
  }
};

export default redis;


