import { z } from 'zod';

export const ComponentSchema = z.object({
  id: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().nullable().optional(),
  type: z.string(),
  data: z.any(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const ComponentCreateSchema = ComponentSchema.pick({
  conversationId: true,
  messageId: true,
  type: true,
  data: true,
});

export const ComponentUpdateSchema = z.object({
  type: z.string().optional(),
  data: z.any().optional(),
});

export const componentModel = {
  Schema: ComponentSchema,
  CreateSchema: ComponentCreateSchema,
  UpdateSchema: ComponentUpdateSchema,
};

export default ComponentSchema;









