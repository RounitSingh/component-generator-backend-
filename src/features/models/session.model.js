import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  refreshToken: z.string().min(1),
  expiresAt: z.string().datetime(),
  deviceInfo: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const SessionCreateSchema = SessionSchema.pick({
  userId: true,
  refreshToken: true,
  expiresAt: true,
  deviceInfo: true,
});

export const SessionUpdateSchema = z.object({
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  deviceInfo: z.string().optional(),
  isActive: z.boolean().optional(),
});

export default SessionSchema;






