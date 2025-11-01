import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

// Get query history for project
export const GET = withProjectAuth(async (request, _context, user, project) => {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit')) || 50;
    const offset = Number.parseInt(searchParams.get('offset')) || 0;

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
    `, [project.id, user.id, limit, offset]);

    // Get total count
    const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM query_history 
        WHERE project_id = $1 AND user_id = $2
    `, [project.id, user.id]);

    return NextResponse.json({
        history: result.rows,
        total: Number.parseInt(countResult.rows[0].total),
        limit,
        offset
    });
});