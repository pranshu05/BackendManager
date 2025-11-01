import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { withProjectAuth, logQueryHistory, detectQueryType, createTimer } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';

// POST /api/ai/execute-batch Execute multiple SQL statements from AI analysis in a transaction

export const POST = withRateLimit(
    withProjectAuth(async (request, _context, user, project) => {
        const timer = createTimer();

        const { operations, naturalLanguageInput } = await request.json();

        // Validate operations input
        if (!Array.isArray(operations) || operations.length === 0) {
            return NextResponse.json(
                { error: 'Operations must be a non-empty array' },
                { status: 400 }
            );
        }

        // Validate each operation has sql
        for (let i = 0; i < operations.length; i++) {
            if (!operations[i].sql || typeof operations[i].sql !== 'string') {
                return NextResponse.json(
                    { error: `Operation at index ${i} missing valid SQL statement` },
                    { status: 400 }
                );
            }
        }

        const results = [];
        const errors = [];
        let totalExecutionTime = 0;

        // Execute each operation sequentially (not in a transaction for DDL statements)
        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];
            const opTimer = createTimer();
            const detectedQueryType = operation.type || detectQueryType(operation.sql);

            try {
                const result = await executeQuery(project.connection_string, operation.sql);
                const executionTime = opTimer.elapsed();
                totalExecutionTime += executionTime;

                // Log successful query
                await logQueryHistory({
                    projectId: project.id,
                    userId: user.id,
                    queryText: operation.sql,
                    queryType: detectedQueryType,
                    naturalLanguageInput: naturalLanguageInput || null,
                    executionTimeMs: executionTime,
                    success: true
                });

                results.push({
                    index: i,
                    success: true,
                    sql: operation.sql,
                    target: operation.target,
                    type: detectedQueryType,
                    executionTime,
                    rowsAffected: result.rowCount
                });

            } catch (queryError) {
                const executionTime = opTimer.elapsed();
                totalExecutionTime += executionTime;

                // Log failed query
                await logQueryHistory({
                    projectId: project.id,
                    userId: user.id,
                    queryText: operation.sql,
                    queryType: detectedQueryType,
                    naturalLanguageInput: naturalLanguageInput || null,
                    executionTimeMs: executionTime,
                    success: false,
                    errorMessage: queryError.message
                });

                errors.push({
                    index: i,
                    success: false,
                    sql: operation.sql,
                    target: operation.target,
                    type: detectedQueryType,
                    executionTime,
                    error: queryError.message
                });

                // Stop execution on first error
                break;
            }
        }

        const overallExecutionTime = timer.elapsed();
        const allSuccessful = errors.length === 0;

        return NextResponse.json({
            success: allSuccessful,
            message: allSuccessful 
                ? 'All operations executed successfully' 
                : `Execution stopped at operation ${errors[0].index} due to error`,
            totalOperations: operations.length,
            successfulOperations: results.length,
            failedOperations: errors.length,
            results,
            errors,
            totalExecutionTime,
            overallExecutionTime
        }, { status: allSuccessful ? 200 : 400 });
    }),
    { isAI: true }
);
