import { NextResponse } from 'next/server';
import { pool, createUserDatabase, getUserDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { inferDatabaseSchema, generateCreateTableStatements } from '@/lib/ai';

/**
 * POST /api/ai/create-project
 * Create a new project with database from natural language description
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

        const { naturalLanguageInput } = await request.json();

        if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string' || naturalLanguageInput.trim() === '') {
            return NextResponse.json(
                { error: 'Natural language description is required' },
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
            [authResult.user.id, projectName]
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
            dbDetails = await createUserDatabase(authResult.user.id, projectName);
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
            authResult.user.id,
            projectName,
            dbDetails.databaseName,
            description || naturalLanguageInput,
            dbDetails.connectionString
        ]);

        const project = projectResult.rows[0];

        // Step 4: Generate and execute CREATE TABLE statements
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
                        await pool.query(`
                            INSERT INTO query_history (
                                project_id, user_id, query_text, query_type, 
                                natural_language_input, execution_time_ms, success
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `, [
                            project.id,
                            authResult.user.id,
                            trimmedSQL,
                            'CREATE',
                            naturalLanguageInput,
                            executionTime,
                            true
                        ]);

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
                        await pool.query(`
                            INSERT INTO query_history (
                                project_id, user_id, query_text, query_type,
                                natural_language_input, execution_time_ms, success, error_message
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        `, [
                            project.id,
                            authResult.user.id,
                            trimmedSQL,
                            'CREATE',
                            naturalLanguageInput,
                            executionTime,
                            false,
                            errorMessage
                        ]);

                        // Continue with next statement instead of stopping
                        console.error(`Failed to execute: ${trimmedSQL}`, queryError);
                    }
                }
            }

        } finally {
            await userPool.end();
        }

        const totalExecutionTime = Date.now() - startTime;
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

    } catch (error) {
        console.error('Create project with AI error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error.message 
            },
            { status: 500 }
        );
    }
}
