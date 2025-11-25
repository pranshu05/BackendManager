import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { withProjectAuth, logQueryHistory, detectQueryType, createTimer } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';

// POST /api/ai/execute-confirmed Execute a confirmed SQL statement from AI analysis

export const POST = withRateLimit(
    withProjectAuth(async (request, _context, user, project) => {
        const timer = createTimer();

        const { sql, naturalLanguageInput, queryType } = await request.json();

        // Validate SQL input
        if (typeof sql !== 'string' || sql.trim() === '') {
            return NextResponse.json(
                { error: 'SQL statement must be a non-empty string' },
                { status: 400 }
            );
        }

        // Determine query type from SQL if not provided
        const detectedQueryType = queryType || detectQueryType(sql);

        // Execute the SQL
        try {
            const result = await executeQuery(project.connection_string, sql);
            const executionTime = timer.elapsed();

            // Log successful query
            await logQueryHistory({
                projectId: project.id,
                userId: user.id,
                queryText: sql,
                queryType: detectedQueryType,
                naturalLanguageInput: naturalLanguageInput || null,
                executionTime: executionTime,
                success: true
            });

            return NextResponse.json({
                success: true,
                message: 'Query executed successfully',
                data: result.rows,
                executionTime,
                query: sql,
                queryType: detectedQueryType
            });

        } catch (queryError) {
            const executionTime = timer.elapsed();

            // Log failed query
            await logQueryHistory({
                projectId: project.id,
                userId: user.id,
                queryText: sql,
                queryType: detectedQueryType,
                naturalLanguageInput: naturalLanguageInput || null,
                executionTime: executionTime,
                success: false,
                errorMessage: queryError.message
            });

            return NextResponse.json({
                success: false,
                error: 'Query execution failed',
                details: queryError.message,
                executionTime,
                query: sql,
                queryType: detectedQueryType
            }, { status: 400 });
        }
    }),
    { isAI: true }
);