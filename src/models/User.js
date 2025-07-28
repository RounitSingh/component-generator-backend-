import { z } from 'zod';

export const userSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    role: z.enum(['admin', 'user', 'moderator']).default('user'),
});

export const userUpdateSchema = userSchema.partial().omit({ password: true });

export const userLoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export default userSchema; 