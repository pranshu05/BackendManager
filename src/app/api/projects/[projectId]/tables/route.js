import { NextResponse } from 'next/server';
import { pool, executeQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Create table
export async function POST(request, { params }) {
    try {
        const authResult = await requireAuth();
        const { projectId } = params;

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { tableName, columns } = await request.json();

        if (!tableName || !columns || !Array.isArray(columns)) {
            return NextResponse.json(
                { error: 'Table name and columns array are required' },
                { status: 400 }
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

        // Build CREATE TABLE query
        const columnDefinitions = columns.map(col => {
            let definition = `${col.name} ${col.type.toUpperCase()}`;

            if (col.primaryKey) {
                definition += ' PRIMARY KEY';
            }
            if (col.notNull && !col.primaryKey) {
                definition += ' NOT NULL';
            }
            if (col.unique) {
                definition += ' UNIQUE';
            }
            if (col.defaultValue) {
                definition += ` DEFAULT ${col.defaultValue}`;
            }

            return definition;
        }).join(', ');

        const createTableQuery = `CREATE TABLE ${tableName} (${columnDefinitions})`;

        try {
            // Execute CREATE TABLE
            await executeQuery(connectionString, createTableQuery);

            // Log the operation
            await pool.query(`
                INSERT INTO query_history (project_id, user_id, query_text, query_type, success)
                VALUES ($1, $2, $3, $4, $5)
            `, [projectId, authResult.user.id, createTableQuery, 'CREATE', true]);

            return NextResponse.json({
                message: `Table '${tableName}' created successfully`,
                tableName,
                query: createTableQuery
            });

        } catch (queryError) {
            return NextResponse.json({
                error: `Failed to create table: ${queryError.message}`,
                query: createTableQuery
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Create table error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}