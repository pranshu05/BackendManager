import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Verify that the user owns the project
export async function verifyProjectOwnership(projectId, userId) {
    const result = await pool.query(`
        SELECT id, connection_string, database_name, project_name
        FROM user_projects 
        WHERE id = $1 AND user_id = $2 AND is_active = true
    `, [projectId, userId]);

    if (result.rows.length === 0) {
        return { error: 'Project not found', status: 404 };
    }

    return { 
        success: true, 
        project: result.rows[0] 
    };
}

// Log query history to the database
export async function logQueryHistory({
    projectId,
    userId,
    queryText,
    queryType,
    naturalLanguageInput = null,
    executionTime,
    success,
    errorMessage = null
}) {
    try {
        await pool.query(`
            INSERT INTO query_history (
                project_id, user_id, query_text, query_type,
                natural_language_input, execution_time_ms, 
                success, error_message
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            projectId,
            userId,
            queryText,
            queryType,
            naturalLanguageInput,
            executionTime,
            success,
            errorMessage,
        ]);
    } catch (error) {
        console.error('Failed to log query history:', error);
        // Don't throw - logging failure shouldn't break the main operation
    }
}

// Simple SQL query type detection
export function detectQueryType(sql) {
    const upperSQL = sql.trim().toUpperCase();
    
    if (upperSQL.startsWith('SELECT')) return 'SELECT';
    if (upperSQL.startsWith('INSERT')) return 'INSERT';
    if (upperSQL.startsWith('UPDATE')) return 'UPDATE';
    if (upperSQL.startsWith('DELETE')) return 'DELETE';
    if (upperSQL.startsWith('CREATE TABLE')) return 'CREATE';
    if (upperSQL.startsWith('ALTER TABLE')) return 'ALTER';
    if (upperSQL.startsWith('DROP TABLE')) return 'DROP';
    if (upperSQL.startsWith('CREATE INDEX')) return 'CREATE';
    if (upperSQL.startsWith('DROP INDEX')) return 'DROP';
    if (upperSQL.startsWith('TRUNCATE')) return 'TRUNCATE';
    
    return 'OTHER';
}

// Standardized error response formatting
export function createErrorResponse(error, statusCode = 500) {
    const response = {
        success: false,
        error: error.message || 'An error occurred',
        timestamp: new Date().toISOString()
    };

    // Add details in development mode only
    if (process.env.NODE_ENV !== 'production' && error.stack) {
        response.stack = error.stack;
    }

    return NextResponse.json(response, { status: statusCode });
}

// Standardized success response formatting
export function createSuccessResponse(data, message = null, statusCode = 200) {
    const response = {
        success: true,
        ...data
    };

    if (message) {
        response.message = message;
    }

    return NextResponse.json(response, { status: statusCode });
}

// Wrapper for API route handlers with authentication
export function withAuth(handler) {
    return async (request, context) => {
        try {
            const authResult = await requireAuth();

            if (authResult.error) {
                return NextResponse.json(
                    { error: authResult.error },
                    { status: authResult.status }
                );
            }

            return await handler(request, context, authResult.user);

        } catch (error) {
            console.error('API route error:', error);
            return createErrorResponse(error);
        }
    };
}

// Wrapper for API route handlers with project ownership verification
export function withProjectAuth(handler) {
    return withAuth(async (request, context, user) => {
        try {
            const { projectId } = await context.params;

            if (!projectId) {
                return createErrorResponse({ message: 'Project ID is required' }, 400);
            }

            const ownershipResult = await verifyProjectOwnership(projectId, user.id);

            if (ownershipResult.error) {
                return NextResponse.json(
                    { error: ownershipResult.error },
                    { status: ownershipResult.status }
                );
            }

            return await handler(request, context, user, ownershipResult.project);

        } catch (error) {
            console.error('Project auth error:', error);
            return createErrorResponse(error);
        }
    });
}

// Timer utility for measuring execution time
export function createTimer() {
    const start = Date.now();
    return {
        elapsed: () => Date.now() - start,
        end: () => {
            const elapsed = Date.now() - start;
            return {
                executionTime: elapsed,
                executionTimeSeconds: (elapsed / 1000).toFixed(3)
            };
        }
    };
}