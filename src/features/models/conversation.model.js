import { z } from 'zod';

export const ConversationSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  title: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const ConversationCreateSchema = z.object({
  title: z.string().optional(),
});

export const ConversationUpdateSchema = z.object({
  title: z.string().optional(),
  isActive: z.boolean().optional(),
});

export default ConversationSchema;






