import { NextResponse } from 'next/server';
import { pool, getDatabaseSchema, createPool, getUserDatabaseConnection } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';

// POST: Import an existing Postgres/Neon database
export const POST = withAuth(async (request, _context, user) => {
    const body = await request.json();
    const { host, port = 5432, username, password, database, projectName } = body;

    if (!host || !username || !database) {
        return NextResponse.json(
            { error: 'host, username and database are required' },
            { status: 400 }
        );
    }

    // Build connection string
    const encodedUser = encodeURIComponent(username);
    const encodedPass = password ? encodeURIComponent(password) : '';
    const connUserPart = encodedPass ? `${encodedUser}:${encodedPass}` : `${encodedUser}`;
    const connectionString = `postgres://${connUserPart}@${host}:${port}/${database}`;

    // Test connection
    try {
        const testPool = await getUserDatabaseConnection(connectionString);
        await testPool.query('SELECT 1');
        await testPool.end();
    } catch (err) {
        console.error('Connection test failed', err);
        return NextResponse.json(
            { error: 'Unable to connect with provided credentials' },
            { status: 400 }
        );
    }

    // Fetch schema
    let schema;
    try {
        schema = await getDatabaseSchema(connectionString);
    } catch (err) {
        console.error('Schema fetch failed', err);
        return NextResponse.json(
            { error: 'Unable to read database schema' },
            { status: 500 }
        );
    }

    // Insert into user_projects
    const insertResult = await pool.query(`
        INSERT INTO user_projects (user_id, project_name, database_name, description, connection_string, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id, project_name, database_name, description, created_at
    `, [
        user.id,
        projectName || `${user.id}_${database}`,
        database,
        `Imported from ${host}`,
        connectionString
    ]);

    const project = insertResult.rows[0];

    // Create and store pool in connection manager
    try {
        createPool(`project_${project.id}`, connectionString);
    } catch (err) {
        console.error('Failed to create pool for imported project', err);
    }

    return NextResponse.json({ message: 'Database imported', project, tables: schema });
});

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
            0 as table_count
        FROM user_projects
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
    `, [user.id]);

    return NextResponse.json({ projects: result.rows });
});