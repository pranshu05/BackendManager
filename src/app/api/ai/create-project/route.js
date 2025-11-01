import { NextResponse } from 'next/server';
import { pool, createUserDatabase, getUserDatabaseConnection, waitForDatabaseReady } from '@/lib/db';
import { withAuth, createTimer, logQueryHistory, detectQueryType } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';
import { inferDatabaseSchema, generateCreateTableStatements } from '@/lib/ai';

// POST /api/ai/create-project Create a new project with database from natural language description

export const POST = withRateLimit(
    withAuth(async (request, _context, user) => {
        const timer = createTimer();

        const { naturalLanguageInput } = await request.json();

        // Validate required fields
        if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string' || naturalLanguageInput.trim() === '') {
            return NextResponse.json(
                { error: 'Natural language description is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        // Step 1: Use AI to infer database schema
        let schema;
        try {
            schema = await inferDatabaseSchema(naturalLanguageInput);
        } catch (aiError) {
            console.error('AI schema inference error:', aiError);
            return NextResponse.json(
                {
                    error: 'Failed to infer database schema from description',
                    details: aiError.message
                },
                { status: 400 }
            );
        }

        const { projectName, description, tables } = schema;

        // Validate project name doesn't already exist
        const existingProject = await pool.query(
            'SELECT id FROM user_projects WHERE user_id = $1 AND project_name = $2',
            [user.id, projectName]
        );

        if (existingProject.rows.length > 0) {
            return NextResponse.json(
                {
                    error: 'Project with this name already exists',
                    suggestion: 'Please modify your description to create a unique project name'
                },
                { status: 409 }
            );
        }

        // Step 2: Create database via Neon API
        let dbDetails;
        try {
            dbDetails = await createUserDatabase(user.id, projectName);
        } catch (dbError) {
            console.error('Database creation error:', dbError);
            return NextResponse.json(
                {
                    error: 'Failed to create database',
                    details: dbError.message
                },
                { status: 500 }
            );
        }

        // Step 3: Insert project metadata into user_projects table
        const projectResult = await pool.query(`
            INSERT INTO user_projects (user_id, project_name, database_name, description, connection_string)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, project_name, database_name, description, created_at
        `, [
            user.id,
            projectName,
            dbDetails.databaseName,
            description || naturalLanguageInput,
            dbDetails.connectionString
        ]);

        const project = projectResult.rows[0];

        // Step 4: Wait for database to be ready
        try {
            await waitForDatabaseReady(dbDetails.connectionString);
        } catch (waitError) {
            console.error('Database readiness check failed:', waitError);
            return NextResponse.json(
                {
                    error: 'Database was created but is not yet ready',
                    details: waitError.message,
                    project: {
                        id: project.id,
                        projectName: project.project_name,
                        databaseName: project.database_name
                    },
                    suggestion: 'Please try creating tables manually or wait a few moments and retry'
                },
                { status: 503 }
            );
        }

        // Step 5: Generate and execute CREATE TABLE statements
        const createTableSQL = generateCreateTableStatements(tables);
        const sqlStatements = createTableSQL.split(';').filter(stmt => stmt.trim() !== '');

        const userPool = await getUserDatabaseConnection(dbDetails.connectionString);
        const executionResults = [];

        try {
            for (const sql of sqlStatements) {
                const trimmedSQL = sql.trim();
                if (trimmedSQL) {
                    const queryStartTime = Date.now();
                    let errorMessage = null;

                    try {
                        await userPool.query(trimmedSQL);
                        const executionTime = Date.now() - queryStartTime;

                        executionResults.push({
                            query: trimmedSQL,
                            success: true,
                            executionTime
                        });

                        // Log successful query in query_history
                        await logQueryHistory({
                            projectId: project.id,
                            userId: user.id,
                            queryText: trimmedSQL,
                            queryType: detectQueryType(trimmedSQL),
                            naturalLanguageInput,
                            executionTimeMs: executionTime,
                            success: true
                        });

                    } catch (queryError) {
                        const executionTime = Date.now() - queryStartTime;
                        errorMessage = queryError.message;

                        executionResults.push({
                            query: trimmedSQL,
                            success: false,
                            error: errorMessage,
                            executionTime
                        });

                        // Log failed query
                        await logQueryHistory({
                            projectId: project.id,
                            userId: user.id,
                            queryText: trimmedSQL,
                            queryType: detectQueryType(trimmedSQL),
                            naturalLanguageInput,
                            executionTimeMs: executionTime,
                            success: false,
                            errorMessage
                        });

                        // Continue with next statement instead of stopping
                        console.error(`Failed to execute: ${trimmedSQL}`, queryError);
                    }
                }
            }

        } finally {
            await userPool.end();
        }

        const { executionTime: totalExecutionTime } = timer.end();
        const failedQueries = executionResults.filter(r => !r.success);

        return NextResponse.json({
            success: true,
            message: 'Project created successfully with AI-generated schema',
            project: {
                id: project.id,
                projectName: project.project_name,
                databaseName: project.database_name,
                description: project.description,
                createdAt: project.created_at
            },
            schema: {
                tables: tables.map(t => t.name),
                tablesCreated: executionResults.filter(r => r.success).length,
                tablesFailed: failedQueries.length
            },
            sql: {
                statements: sqlStatements.length,
                executed: createTableSQL
            },
            executionDetails: executionResults,
            totalExecutionTime,
            naturalLanguageInput
        });
    }),
    { isAI: true }
);