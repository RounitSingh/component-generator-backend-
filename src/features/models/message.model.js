import { z } from 'zod';

export const MessageSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'ai']),
  type: z.enum(['text', 'jsx', 'page']),
  data: z.any(),
  version: z.number().int().min(1).default(1),
  isEdited: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const MessageCreateSchema = MessageSchema.pick({
  conversationId: true,
  role: true,
  type: true,
  data: true,
  isEdited: true,
});

export const MessageUpdateSchema = z.object({
  data: z.any().optional(),
  version: z.number().int().min(1).optional(),
  isEdited: z.boolean().optional(),
});

export const messageModel = {
  Schema: MessageSchema,
  CreateSchema: MessageCreateSchema,
  UpdateSchema: MessageUpdateSchema,
};

export default MessageSchema;


