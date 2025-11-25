import { NextResponse } from 'next/server';
import { withProjectAuth, logQueryHistory, detectQueryType, createTimer } from '@/lib/api-helpers';
import { executeQuery, getDatabaseSchema } from '@/lib/db';

// Create table
export const POST = withProjectAuth(async (request, _context, user, project) => {
    const timer = createTimer();
    const { tableName, columns } = await request.json();

    if (!tableName || !columns || !Array.isArray(columns)) {
        return NextResponse.json(
            { error: 'Table name and columns array are required' },
            { status: 400 }
        );
    }

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
        await executeQuery(project.connection_string, createTableQuery);
        const executionTime = timer.elapsed();

        // Log the operation
        await logQueryHistory({
            projectId: project.id,
            userId: user.id,
            queryText: createTableQuery,
            queryType: detectQueryType(createTableQuery),
            executionTime,
            success: true
        });

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
});

export const GET = withProjectAuth(async (request, _context, user, project) => {
    const schemaInfo = await getDatabaseSchema(project.connection_string);
    const url = new URL(request.url);
    const tableName = url.searchParams.get("table");
    const limitParam = url.searchParams.get("limit");

    // If no table specified, return all tables
    if (!tableName) {
        return NextResponse.json({ tables: schemaInfo });
    }

    // Build query with optional limit
    let query;
    let queryParams = [];

    const parsedLimit = Number.parseInt(limitParam, 10);
    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        query = `SELECT * FROM "${tableName}" LIMIT $1;`;
        queryParams = [parsedLimit];
    } else {
        query = `SELECT * FROM "${tableName}";`;
        queryParams = [];
    }

    const result = await executeQuery(project.connection_string, query, queryParams);

    return NextResponse.json({
        table: tableName,
        columns: schemaInfo.find((t) => t.name === tableName)?.columns || [],
        rows: result.rows,
    });
});