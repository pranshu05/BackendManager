import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { withProjectAuth, logQueryHistory, createTimer, detectQueryType } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';

// Execute SQL query with caching, auth, and rate limiting
export const POST = withRateLimit(
    withProjectAuth(async (request, _context, user, project) => {
        const timer = createTimer();

        try {
            const { query, naturalLanguageInput } = await request.json();

            if (!query) {
                return NextResponse.json(
                    { error: 'SQL query is required' },
                    { status: 400 }
                );
            }

            // Basic SQL injection protection
            const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE USER', 'GRANT'];
            const upperQuery = query.toUpperCase();

            if (dangerousKeywords.some(keyword =>
                upperQuery.includes(keyword) &&
                !(keyword === 'CREATE' && (upperQuery.includes('CREATE TABLE') || upperQuery.includes('CREATE INDEX')))
            )) {
                return NextResponse.json(
                    { error: 'Potentially dangerous SQL operation detected' },
                    { status: 403 }
                );
            }

            // Execute query (now uses cached connection pool)
            const result = await executeQuery(project.connection_string, query);

            // Log success
            await logQueryHistory({
                projectId: project.id,
                userId: user.id,
                queryText: query,
                queryType: detectQueryType(query),
                naturalLanguageInput,
                executionTime: timer.elapsed(),
                success: true,
            });

            return NextResponse.json({
                success: true,
                data: result.rows,
                executionTime: timer.elapsed(),
                query
            });

        } catch (queryError) {
            // Log failure
            await logQueryHistory({
                projectId: project.id,
                userId: user.id,
                queryText: request.body?.query || '',
                queryType: detectQueryType(request.body?.query || ''),
                naturalLanguageInput: request.body?.naturalLanguageInput,
                executionTime: timer.elapsed(),
                success: false,
                errorMessage: queryError.message
            });

            return NextResponse.json({
                success: false,
                error: queryError.message,
                executionTime: timer.elapsed()
            }, { status: 400 });
        }
    }),
    { isAuth: false }
);