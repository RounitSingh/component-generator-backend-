import { z } from 'zod';

export const PublishSchema = z.object({
  componentId: z.string().uuid(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const RevokeSchema = z.object({
  linkId: z.string().uuid(),
});


