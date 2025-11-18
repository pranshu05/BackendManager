import { executeQuery, getDatabaseSchema } from '@/lib/db';
import { withProjectAuth, logQueryHistory, detectQueryType, createTimer } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';
import { generateOptimizationSuggestions } from '@/lib/ai';

export const GET = withProjectAuth(async (request, context, user, project) => {
    try {
        const connectionString = project.connection_string;

        // Fetch current database schema using the standardized function
        const schema = await getDatabaseSchema(connectionString);

        if (!schema || schema.length === 0) {
            return NextResponse.json({
                success: true,
                totalSuggestions: 0,
                queryPerformance: [],
                missingIndexes: [],
                schemaImprovements: [],
                potentialIssues: [],
                warning: 'No tables found in the database. Create some tables first to get optimization suggestions.'
            });
        }

        // Use AI to generate optimization suggestions
        const suggestions = await generateOptimizationSuggestions(schema);

        return NextResponse.json({
            success: true,
            source: 'ai',
            ...suggestions
        });

    } catch (error) {
        console.error('Optimization fetch error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to generate optimization suggestions',
                details: error.message 
            },
            { status: 500 }
        );
    }
});

export const POST = withProjectAuth(async (request, context, user, project) => {
    const timer = createTimer();
    
    try {
        const { projectId } = await context.params;
        const body = await request.json();
        const { action, sql, description } = body;

        if (!action || !sql) {
            return NextResponse.json(
                { error: 'Missing action or SQL statement' },
                { status: 400 }
            );
        }

        const connectionString = project.connection_string;
        const queryType = detectQueryType(sql);

        // Execute the optimization SQL
        const result = await executeQuery(connectionString, sql);
        const executionTime = timer.getTime();

        // Log the query to history with optimization context
        await logQueryHistory({
            projectId,
            userId: user.id,
            queryText: sql,
            queryType,
            naturalLanguageInput: description || 'Database optimization suggestion',
            executionTime,
            success: true,
            errorMessage: null
        });

        return NextResponse.json({
            success: true,
            action,
            message: 'Optimization applied successfully',
            executionTime,
            result: result?.rows || []
        });

    } catch (error) {
        const executionTime = timer.getTime();
        console.error('Optimization action error:', error);

        // Log the failed query to history
        try {
            const { projectId } = await context.params;
            const body = await request.json();
            const { sql, description } = body;
            const queryType = detectQueryType(sql);

            await logQueryHistory({
                projectId,
                userId: user.id,
                queryText: sql,
                queryType,
                naturalLanguageInput: description || 'Database optimization suggestion',
                executionTime,
                success: false,
                errorMessage: error.message
            });
        } catch (logError) {
            console.error('Failed to log error to history:', logError);
        }

        return NextResponse.json(
            { error: 'Failed to apply optimization', details: error.message },
            { status: 500 }
        );
    }
});