import { NextResponse } from 'next/server';
import { pool, getDatabaseSchema } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { analyzeCreateTableRequest, analyzeAddColumnRequest, generateSQLFromNaturalLanguage } from '@/lib/ai';

// POST /api/ai/analyze-request, Analyze natural language input and propose SQL (no execution)

export async function POST(request) {
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { naturalLanguageInput, projectId, actionType, tableName } = await request.json();

        // Validate input
        if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string' || naturalLanguageInput.trim() === '') {
            return NextResponse.json(
                { error: 'Natural language input is required' },
                { status: 400 }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Verify project ownership
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

        // Fetch current database schema
        let schema = [];
        try {
            schema = await getDatabaseSchema(connectionString);
        } catch (schemaError) {
            console.error('Error fetching schema:', schemaError);
            // Continue with empty schema if fetch fails
        }

        // Route to appropriate AI function based on actionType
        let result;
        try {
            switch (actionType) {
                case 'create_table':
                    result = await analyzeCreateTableRequest(naturalLanguageInput, schema);
                    break;

                case 'add_column':
                    result = await analyzeAddColumnRequest(naturalLanguageInput, schema, tableName);
                    break;

                case 'auto':
                case 'general':
                default:
                    // Let AI determine the action type
                    result = await generateSQLFromNaturalLanguage(naturalLanguageInput, schema);
                    break;
            }

            // Ensure result has the required structure
            if (!result.proposed_sql || !result.explanation) {
                throw new Error('Invalid response structure from AI');
            }

            // Add metadata
            result.projectId = projectId;
            result.schema = schema.map(t => ({
                name: t.name,
                columns: t.columns.map(c => ({ name: c.name, type: c.type }))
            }));

            return NextResponse.json({
                success: true,
                ...result
            });

        } catch (aiError) {
            console.error('AI analysis error:', aiError);
            return NextResponse.json(
                {
                    error: 'Failed to analyze request',
                    details: aiError.message
                },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Analyze request error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error.message
            },
            { status: 500 }
        );
    }
}
