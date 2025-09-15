import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get specific project
export async function GET({ params }) {
    try {
        const { projectId } = await params;
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const result = await pool.query(`
            SELECT id, project_name, database_name, description, connection_string, created_at, updated_at
            FROM user_projects 
            WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [projectId, authResult.user.id]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ project: result.rows });

    } catch (error) {
        console.error('Get project error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Update project
export async function PUT(request, { params }) {
    try {
        const { projectId } = await params;
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { projectName, description } = await request.json();

        const result = await pool.query(`
            UPDATE user_projects 
            SET project_name = COALESCE($1, project_name),
                description = COALESCE($2, description),
                updated_at = NOW()
            WHERE id = $3 AND user_id = $4 AND is_active = true
            RETURNING id, project_name, database_name, description, updated_at
        `, [projectName, description, projectId, authResult.user.id]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Project updated successfully',
            project: result.rows[0]
        });

    } catch (error) {
        console.error('Update project error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Delete project
export async function DELETE({ params }) {
    try {
        const authResult = await requireAuth();
        const { projectId } = await params;

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const result = await pool.query(`
            UPDATE user_projects 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND is_active = true
            RETURNING id
        `, [projectId, authResult.user.id]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Project deleted successfully' });

    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}