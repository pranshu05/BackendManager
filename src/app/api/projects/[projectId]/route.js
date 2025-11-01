import { NextResponse } from 'next/server';
import { deleteUserDatabase, pool } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

// Get specific project
export const GET = withProjectAuth(async (_request, _context, _user, project) => {
    return NextResponse.json({ 
        project: {
            id: project.id,
            project_name: project.project_name,
            database_name: project.database_name,
            connection_string: project.connection_string
        }
    });
});

// Update project
export const PUT = withProjectAuth(async (request, _context, user, project) => {
    const { projectName, description } = await request.json();

    const result = await pool.query(`
        UPDATE user_projects 
        SET project_name = COALESCE($1, project_name),
            description = COALESCE($2, description),
            updated_at = NOW()
        WHERE id = $3 AND user_id = $4 AND is_active = true
        RETURNING id, project_name, database_name, description, updated_at
    `, [projectName, description, project.id, user.id]);

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
});

// Delete project
export const DELETE = withProjectAuth(async (_request, _context, user, project) => {
    // Delete the associated database
    await deleteUserDatabase(project.database_name);

    const result = await pool.query(`
        DELETE FROM user_projects 
        WHERE id = $1 AND user_id = $2 AND is_active = true
        RETURNING id
    `, [project.id, user.id]);

    if (result.rows.length === 0) {
        return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
});