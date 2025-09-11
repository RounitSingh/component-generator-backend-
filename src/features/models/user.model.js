import { z } from 'zod';

// User model (architecture: isVerified defaults true on signup)
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  isVerified: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const UserCreateSchema = UserSchema.pick({
  name: true,
  email: true,
  passwordHash: true,
}).extend({
  isVerified: z.boolean().default(true),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  passwordHash: z.string().min(1).optional(),
  isVerified: z.boolean().optional(),
});

export default UserSchema;


