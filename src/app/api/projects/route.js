import { NextResponse } from 'next/server';
import { pool, createUserDatabase, getDatabaseSchema } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get all projects for authenticated user
export async function GET() {
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const result = await pool.query(`
            SELECT id, project_name, database_name, description, is_active, created_at, updated_at, connection_string
            FROM user_projects 
            WHERE user_id = $1 AND is_active = true
            ORDER BY created_at DESC
        `, [authResult.user.id]);

        // Fetch table counts for each project
        const projectsWithTableCounts = await Promise.all(
            result.rows.map(async (project) => {
                try {
                    const schemaInfo = await getDatabaseSchema(project.connection_string);
                    const tableCount = schemaInfo.length;
                    return {
                        ...project,
                        table_count: tableCount,
                        connection_string: undefined // Remove connection_string from response for security
                    };
                } catch (error) {
                    console.error(`Error fetching schema for project ${project.id}:`, error);
                    return {
                        ...project,
                        table_count: 0,
                        connection_string: undefined
                    };
                }
            })
        );

        return NextResponse.json({ projects: projectsWithTableCounts });

    } catch (error) {
        console.error('Get projects error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Create new project
export async function POST(request) {
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { projectName, description } = await request.json();

        if (!projectName) {
            return NextResponse.json(
                { error: 'Project name is required' },
                { status: 400 }
            );
        }

        // Check if project name already exists for this user
        const existingProject = await pool.query(
            'SELECT id FROM user_projects WHERE user_id = $1 AND project_name = $2',
            [authResult.user.id, projectName]
        );

        if (existingProject.rows.length > 0) {
            return NextResponse.json(
                { error: 'Project with this name already exists' },
                { status: 409 }
            );
        }

        // Create database for user
        const dbDetails = await createUserDatabase(authResult.user.id, projectName);

        // Store project in database
        const result = await pool.query(`
            INSERT INTO user_projects (user_id, project_name, database_name, description, connection_string)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, project_name, database_name, description, created_at
            `, [
            authResult.user.id,
            projectName,
            dbDetails.databaseName,
            description || '',
            dbDetails.connectionString
        ]);

        const project = result.rows[0];

        return NextResponse.json({
            message: 'Project created successfully',
            project
        });

    } catch (error) {
        console.error('Create project error:', error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}