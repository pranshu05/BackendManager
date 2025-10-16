import { NextResponse } from 'next/server';
import { pool, executeQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/ai/execute-batch
 * Execute multiple confirmed SQL operations in sequence
 * Used for complex project updates with multiple operations
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

        const { projectId, operations, naturalLanguageInput } = await request.json();

        // Validate input
        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        if (!operations || !Array.isArray(operations) || operations.length === 0) {
            return NextResponse.json(
                { error: 'Operations array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Validate operation structure
        for (const op of operations) {
            if (!op.sql || typeof op.sql !== 'string' || op.sql.trim() === '') {
                return NextResponse.json(
                    { error: 'Each operation must have a valid SQL statement' },
                    { status: 400 }
                );
            }
        }

        // Verify project ownership and get connection string
        const projectResult = await pool.query(`
            SELECT connection_string, project_name
            FROM user_projects 
            WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [projectId, authResult.user.id]);

        if (projectResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Project not found or access denied' },
                { status: 404 }
            );
        }

        const connectionString = projectResult.rows[0].connection_string;
        const projectName = projectResult.rows[0].project_name;

        // Execute operations in sequence
        const executionResults = [];
        let successCount = 0;
        let failureCount = 0;
        let stopOnError = false;

        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];
            const operationStartTime = Date.now();

            if (stopOnError) {
                executionResults.push({
                    operationIndex: i,
                    type: operation.type || 'unknown',
                    target: operation.target || 'unknown',
                    sql: operation.sql,
                    status: 'skipped',
                    reason: 'Previous operation failed'
                });
                continue;
            }

            try {
                const result = await executeQuery(connectionString, operation.sql);
                const executionTime = Date.now() - operationStartTime;

                executionResults.push({
                    operationIndex: i,
                    type: operation.type || 'unknown',
                    target: operation.target || 'unknown',
                    sql: operation.sql,
                    status: 'success',
                    rowCount: result.rowCount,
                    executionTime
                });

                successCount++;

                // Log successful operation in query_history
                await pool.query(`
                    INSERT INTO query_history (
                        project_id, user_id, query_text, query_type,
                        natural_language_input, execution_time_ms, success
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    projectId,
                    authResult.user.id,
                    operation.sql,
                    operation.type || 'UPDATE',
                    naturalLanguageInput || null,
                    executionTime,
                    true
                ]);

            } catch (queryError) {
                const executionTime = Date.now() - operationStartTime;
                failureCount++;

                executionResults.push({
                    operationIndex: i,
                    type: operation.type || 'unknown',
                    target: operation.target || 'unknown',
                    sql: operation.sql,
                    status: 'failed',
                    error: queryError.message,
                    executionTime
                });

                // Log failed operation
                await pool.query(`
                    INSERT INTO query_history (
                        project_id, user_id, query_text, query_type,
                        natural_language_input, execution_time_ms, success, error_message
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    projectId,
                    authResult.user.id,
                    operation.sql,
                    operation.type || 'UPDATE',
                    naturalLanguageInput || null,
                    executionTime,
                    false,
                    queryError.message
                ]);

                // Check if this is a critical operation (CREATE/ALTER/DROP)
                const criticalTypes = ['create_table', 'alter_table', 'drop_table', 'drop_column', 'modify_column'];
                if (criticalTypes.includes(operation.type)) {
                    stopOnError = true;
                }
            }
        }

        const totalExecutionTime = Date.now() - startTime;
        const allSucceeded = failureCount === 0;
        const partialSuccess = successCount > 0 && failureCount > 0;

        return NextResponse.json({
            success: allSucceeded,
            partialSuccess,
            message: allSucceeded 
                ? 'All operations executed successfully'
                : partialSuccess
                    ? 'Some operations failed. Review the results.'
                    : 'All operations failed',
            project: {
                id: projectId,
                name: projectName
            },
            execution: {
                totalOperations: operations.length,
                successCount,
                failureCount,
                skippedCount: operations.length - successCount - failureCount,
                totalExecutionTime
            },
            results: executionResults,
            naturalLanguageInput
        }, { status: allSucceeded ? 200 : (partialSuccess ? 207 : 400) });

    } catch (error) {
        console.error('Execute batch operations error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error.message 
            },
            { status: 500 }
        );
    }
}
