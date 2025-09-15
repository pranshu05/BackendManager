import { NextResponse } from 'next/server';
import { pool, getDatabaseSchema } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get database schema
export async function GET({ params }) {
    try {
        const authResult = await requireAuth();
        const { projectId } = await params;

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        // Get project connection string
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
        const schema = await getDatabaseSchema(connectionString);

        return NextResponse.json({ schema });

    } catch (error) {
        console.error('Get schema error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch database schema' },
            { status: 500 }
        );
    }
}