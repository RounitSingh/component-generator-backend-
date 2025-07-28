import { z } from 'zod';

export const courseSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    description: z.string().optional(),
    duration: z.number().positive('Duration must be positive').optional(),
});

export const courseUpdateSchema = courseSchema.partial();

export default courseSchema; 