import { NextResponse } from 'next/server';
import { pool, executeQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Execute SQL query
export async function POST(request, { params }) {
    try {
        const authResult = await requireAuth();
        const { projectId } = await params;

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { query, naturalLanguageInput } = await request.json();

        if (!query) {
            return NextResponse.json(
                { error: 'SQL query is required' },
                { status: 400 }
            );
        }

        // Get project connection string
        const projectResult = await pool.query(`
            SELECT connection_string
            FROM user_projects 
            WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [projectId, authResult.user.id]);

        if (projectResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        const connectionString = projectResult.rows[0].connection_string;

        // Basic SQL injection protection (enhance as needed)
        const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE USER', 'GRANT'];
        const upperQuery = query.toUpperCase();

        // Allow CREATE TABLE, CREATE INDEX, etc. but block dangerous operations
        if (dangerousKeywords.some(keyword =>
            upperQuery.includes(keyword) &&
            !(keyword === 'CREATE' && (upperQuery.includes('CREATE TABLE') || upperQuery.includes('CREATE INDEX')))
        )) {
            return NextResponse.json(
                { error: 'Potentially dangerous SQL operation detected' },
                { status: 403 }
            );
        }

        const startTime = Date.now();

        try {
            const result = await executeQuery(connectionString, query);
            const executionTime = Date.now() - startTime;

            // Log query history
            await pool.query(`
                INSERT INTO query_history (project_id, user_id, query_text, natural_language_input, execution_time_ms, success)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [projectId, authResult.user.id, query, naturalLanguageInput, executionTime, true]);

            return NextResponse.json({
                success: true,
                data: result.rows,
                rowCount: result.rowCount,
                executionTime,
                query
            });

        } catch (queryError) {
            const executionTime = Date.now() - startTime;

            // Log failed query
            await pool.query(`
                INSERT INTO query_history (project_id, user_id, query_text, natural_language_input, execution_time_ms, success, error_message)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [projectId, authResult.user.id, query, naturalLanguageInput, executionTime, false, queryError.message]);

            return NextResponse.json({
                success: false,
                error: queryError.message,
                executionTime,
                query
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Query execution error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}