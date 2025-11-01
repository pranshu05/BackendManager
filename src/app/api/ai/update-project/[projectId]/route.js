import { NextResponse } from 'next/server';
import { getDatabaseSchema } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';
import { analyzeProjectUpdateRequest } from '@/lib/ai';

// POST /api/ai/update-project Analyze natural language update request for existing project. Returns proposed SQL operations with risk assessment

export const POST = withRateLimit(
    withProjectAuth(async (request, _context, _user, projectData) => {
        const { naturalLanguageInput } = await request.json();

        if (typeof naturalLanguageInput !== 'string' || naturalLanguageInput.trim() === '') {
            return NextResponse.json(
                { error: 'Natural language update description must be a non-empty string' },
                { status: 400 }
            );
        }

        // Fetch current database schema
        let schema = [];
        try {
            schema = await getDatabaseSchema(projectData.connection_string);
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
                projectData.project_name
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
                id: projectData.id,
                name: projectData.project_name,
                database: projectData.database_name
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
                    .map(op => ({ type: op.type, target: op.target, explaination: op.explaination }))
            },
            naturalLanguageInput
        });
    }),
    { isAI: true }
);