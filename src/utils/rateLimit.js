import { redis } from '../config/redis.js';

export const consume = async (key, limit, windowSeconds) => {
  const nowBucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rl:${key}:${nowBucket}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  const allowed = count <= limit;
  const remaining = Math.max(limit - count, 0);
  const ttl = await redis.ttl(redisKey);
  const retryAfter = allowed ? 0 : (ttl > 0 ? ttl : windowSeconds);
  return { allowed, remaining, retryAfter };
};

export default { consume };


