import { NextResponse } from 'next/server';
import { pool, getDatabaseSchema, createPool, getUserDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST: Import an existing Postgres/Neon database
export async function POST(request) {
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const body = await request.json();
        const { dbType = 'postgres', host, port = 5432, username, password, database, projectName, sqlDump } = body;

        if (!host || !username || !database) {
            return NextResponse.json({ error: 'host, username and database are required' }, { status: 400 });
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
            return NextResponse.json({ error: 'Unable to connect with provided credentials' }, { status: 400 });
        }

        // Fetch schema
        let schema;
        try {
            schema = await getDatabaseSchema(connectionString);
        } catch (err) {
            console.error('Schema fetch failed', err);
            return NextResponse.json({ error: 'Unable to read database schema' }, { status: 500 });
        }

        // Insert into user_projects
        const insertResult = await pool.query(`
            INSERT INTO user_projects (user_id, project_name, database_name, description, connection_string, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id, project_name, database_name, description, created_at
        `, [
            authResult.user.id,
            projectName || `${authResult.user.id}_${database}`,
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

    } catch (error) {
        console.error('Import DB error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
