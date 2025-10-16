import { NextResponse } from 'next/server';
import { pool, executeQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/ai/execute-confirmed
 * Execute a confirmed SQL statement from AI analysis
 */
export async function POST(request) {
    const startTime = Date.now();
    
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { projectId, sql, naturalLanguageInput, queryType } = await request.json();

        // Validate input
        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        if (!sql || typeof sql !== 'string' || sql.trim() === '') {
            return NextResponse.json(
                { error: 'SQL statement is required' },
                { status: 400 }
            );
        }

        // Verify project ownership and get connection string
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

        // Determine query type from SQL if not provided
        const detectedQueryType = queryType || detectQueryType(sql);

        // Execute the SQL
        try {
            const result = await executeQuery(connectionString, sql);
            const executionTime = Date.now() - startTime;

            // Log successful query in query_history
            await pool.query(`
                INSERT INTO query_history (
                    project_id, user_id, query_text, query_type,
                    natural_language_input, execution_time_ms, success
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                projectId,
                authResult.user.id,
                sql,
                detectedQueryType,
                naturalLanguageInput || null,
                executionTime,
                true
            ]);

            return NextResponse.json({
                success: true,
                message: 'Query executed successfully',
                data: result.rows,
                rowCount: result.rowCount,
                executionTime,
                query: sql,
                queryType: detectedQueryType
            });

        } catch (queryError) {
            const executionTime = Date.now() - startTime;

            // Log failed query in query_history
            await pool.query(`
                INSERT INTO query_history (
                    project_id, user_id, query_text, query_type,
                    natural_language_input, execution_time_ms, success, error_message
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                projectId,
                authResult.user.id,
                sql,
                detectedQueryType,
                naturalLanguageInput || null,
                executionTime,
                false,
                queryError.message
            ]);

            return NextResponse.json({
                success: false,
                error: 'Query execution failed',
                details: queryError.message,
                executionTime,
                query: sql,
                queryType: detectedQueryType
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Execute confirmed query error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * Helper function to detect query type from SQL statement
 * @param {string} sql - SQL statement
 * @returns {string} - Query type
 */
function detectQueryType(sql) {
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
    
    return 'OTHER';
}
