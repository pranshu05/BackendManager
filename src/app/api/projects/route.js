import { NextResponse } from 'next/server';
import { pool, createUserDatabase, getDatabaseSchema } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';

// Get all projects for authenticated user
export const GET = withAuth(async (_request, _context, user) => {
    const result = await pool.query(`
        SELECT 
            id, 
            project_name, 
            database_name, 
            description, 
            is_active, 
            created_at, 
            updated_at,
            connection_string,  -- <-- THIS WAS THE MISSING LINE
            0 as table_count
        FROM user_projects
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
    `, [user.id]);

    // Fetch table counts for each project
    const projectsWithTableCounts = await Promise.all(
        result.rows.map(async (project) => {
            try {
                // Now project.connection_string will be defined
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
});

// Create new project
export const POST = withAuth(async (request, _context, user) => {
    const { projectName, description } = await request.json();

    // Validate required fields
    if (!projectName) {
        return NextResponse.json(
            { error: 'Project name is required' },
            { status: 400 }
        );
    }

    // Check if project name already exists for this user
    const existingProject = await pool.query(
        'SELECT id FROM user_projects WHERE user_id = $1 AND project_name = $2',
        [user.id, projectName]
    );

    if (existingProject.rows.length > 0) {
        return NextResponse.json(
            { error: 'Project with this name already exists' },
            { status: 409 }
        );
    }

    // Create database for user
    const dbDetails = await createUserDatabase(user.id, projectName);

    // Store project in database
    const result = await pool.query(`
        INSERT INTO user_projects (user_id, project_name, database_name, description, connection_string)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, project_name, database_name, description, created_at
    `, [
        user.id,
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
});