import { ZodError } from 'zod';

export const validateData = (schema, data) => {
    try {
        const validatedData = schema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.errors.map(err => err.message);
            return { success: false, errors };
        }
        return { success: false, errors: ['Validation failed'] };
    }
};

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '')
        .trim();
};

export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    const errors = [];

    if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}; 