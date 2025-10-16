import { NextResponse } from 'next/server';
import { pool, getDatabaseSchema } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { analyzeProjectUpdateRequest } from '@/lib/ai';

/**
 * POST /api/ai/update-project
 * Analyze natural language update request for existing project
 * Returns proposed SQL operations with risk assessment
 */
export async function POST(request) {
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { naturalLanguageInput, projectId } = await request.json();

        // Validate input
        if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string' || naturalLanguageInput.trim() === '') {
            return NextResponse.json(
                { error: 'Natural language update description is required' },
                { status: 400 }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Verify project ownership and get details
        const projectResult = await pool.query(`
            SELECT id, project_name, database_name, connection_string, description
            FROM user_projects 
            WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [projectId, authResult.user.id]);

        if (projectResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Project not found or access denied' },
                { status: 404 }
            );
        }

        const project = projectResult.rows[0];
        const connectionString = project.connection_string;

        // Fetch current database schema
        let schema = [];
        try {
            schema = await getDatabaseSchema(connectionString);
        } catch (schemaError) {
            console.error('Error fetching schema:', schemaError);
            return NextResponse.json(
                { 
                    error: 'Failed to fetch current database schema',
                    details: schemaError.message 
                },
                { status: 500 }
            );
        }

        if (schema.length === 0) {
            return NextResponse.json(
                { 
                    error: 'Database schema is empty. Use /api/ai/create-project to initialize the database first.' 
                },
                { status: 400 }
            );
        }

        // Use AI to analyze update request with schema context
        let analysisResult;
        try {
            analysisResult = await analyzeProjectUpdateRequest(
                naturalLanguageInput, 
                schema, 
                project.project_name
            );
        } catch (aiError) {
            console.error('AI analysis error:', aiError);
            return NextResponse.json(
                { 
                    error: 'Failed to analyze update request',
                    details: aiError.message 
                },
                { status: 400 }
            );
        }

        // Categorize operations by risk level
        const riskSummary = {
            low: analysisResult.operations.filter(op => op.risk_level === 'low').length,
            medium: analysisResult.operations.filter(op => op.risk_level === 'medium').length,
            high: analysisResult.operations.filter(op => op.risk_level === 'high').length
        };

        // Prepare response
        return NextResponse.json({
            success: true,
            project: {
                id: project.id,
                name: project.project_name,
                database: project.database_name
            },
            currentSchema: schema.map(t => ({
                name: t.name,
                columns: t.columns.map(c => ({
                    name: c.name,
                    type: c.type,
                    nullable: c.nullable,
                    constraint: c.constraint
                }))
            })),
            updateAnalysis: {
                operations: analysisResult.operations,
                summary: analysisResult.summary,
                estimatedImpact: analysisResult.estimated_impact || 'Impact assessment not available',
                requiresConfirmation: analysisResult.requires_confirmation
            },
            riskAssessment: {
                totalOperations: analysisResult.operations.length,
                riskBreakdown: riskSummary,
                highRiskOperations: analysisResult.operations
                    .filter(op => op.risk_level === 'high')
                    .map(op => ({ type: op.type, target: op.target, explanation: op.explanation }))
            },
            naturalLanguageInput
        });

    } catch (error) {
        console.error('Update project analysis error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error.message 
            },
            { status: 500 }
        );
    }
}
