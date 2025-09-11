import { z } from 'zod';

export const QuotaSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  dailyLimit: z.number().int().nonnegative(),
  usedToday: z.number().int().nonnegative().default(0),
  resetAt: z.string().datetime(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const QuotaCreateSchema = QuotaSchema.pick({
  userId: true,
  dailyLimit: true,
  resetAt: true,
});

export const QuotaUpdateSchema = z.object({
  dailyLimit: z.number().int().nonnegative().optional(),
  usedToday: z.number().int().nonnegative().optional(),
  resetAt: z.string().datetime().optional(),
});

export default QuotaSchema;






