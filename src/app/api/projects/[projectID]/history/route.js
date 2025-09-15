import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get query history for project
export async function GET(request, { params }) {
    try {
        const authResult = await requireAuth();
        const { projectId } = params;

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;

        const result = await pool.query(`
            SELECT 
                id,
                query_text,
                natural_language_input,
                query_type,
                execution_time_ms,
                success,
                error_message,
                created_at
            FROM query_history 
            WHERE project_id = $1 AND user_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `, [projectId, authResult.user.id, limit, offset]);

        // Get total count
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM query_history 
            WHERE project_id = $1 AND user_id = $2
        `, [projectId, authResult.user.id]);

        return NextResponse.json({
            history: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit,
            offset
        });

    } catch (error) {
        console.error('Get history error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}