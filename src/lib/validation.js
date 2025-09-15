import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters')
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

// Project validation schemas
export const createProjectSchema = z.object({
    projectName: z.string()
        .min(1, 'Project name is required')
        .max(50, 'Project name must be less than 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Project name can only contain letters, numbers, hyphens, and underscores'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional()
});

// Table creation validation schema
export const createTableSchema = z.object({
    tableName: z.string()
        .min(1, 'Table name is required')
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Table name must start with letter or underscore'),
    columns: z.array(z.object({
        name: z.string().min(1, 'Column name is required'),
        type: z.string().min(1, 'Column type is required'),
        primaryKey: z.boolean().optional(),
        notNull: z.boolean().optional(),
        unique: z.boolean().optional(),
        defaultValue: z.string().optional()
    })).min(1, 'At least one column is required'),
    generateMockData: z.boolean().optional(),
    mockDataCount: z.number().min(1).max(1000).optional()
});

// Query validation schema
export const querySchema = z.object({
    query: z.string().min(1, 'SQL query is required'),
    naturalLanguageInput: z.string().optional()
});

// Validation helper function
export function validateInput(schema, data) {
    try {
        return { success: true, data: schema.parse(data) };
    } catch (error) {
        return {
            success: false,
            errors: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }))
        };
    }
}