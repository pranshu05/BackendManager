import { NextResponse } from 'next/server';
import { pool, executeQuery, getDatabaseSchema } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

function escapeIdentifier(name) {
    return '"' + String(name).replace(/"/g, '""') + '"';
}

function handledatatype(value, dataType, nullable) {
    if (value === null || typeof value === 'undefined') return null;

    const v = value;
    const dt = String(dataType || '').toLowerCase();
    if (v === '' && nullable) return null;

    // Integer types
    if (dt.includes('int') || dt === 'integer' || dt === 'smallint' || dt === 'bigint') {
        const n = Number(v);
        if (!Number.isInteger(n)) throw new Error('Invalid integer value');
        return n;
    }

    // Numeric/decimal/real
    if (dt === 'numeric' || dt === 'decimal' || dt === 'real' || dt === 'double precision' || dt === 'float') {
        const n = Number(v);
        if (Number.isNaN(n)) throw new Error('Invalid numeric value');
        return n;
    }

    // Boolean
    if (dt === 'boolean') {
        if (v === true || v === false) return v;
        if (v === 'true' || v === '1' || v === 1) return true;
        if (v === 'false' || v === '0' || v === 0) return false;
        throw new Error('Invalid boolean value');
    }

    // JSON
    if (dt === 'json') {
        if (typeof v === 'object') return v;
        try {
            return JSON.parse(String(v));
        } catch (e) {
            throw new Error('Invalid JSON value');
        }
    }

    // Timestamp/date/time - accept strings or ISO dates
    if (dt.includes('timestamp') || dt.includes('date') || dt.includes('time')) {
        // Let the DB parse timestamp strings; ensure it's a string
        return String(v);
    }

    // UUID - basic validation
    if (dt === 'uuid') {
        const s = String(v);
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(s)) throw new Error('Invalid UUID value');
        return s;
    }

    // Default: treat as text-like, return string
    return String(v);
}

export async function POST(request) {
    try {
        const authResult = await requireAuth();
        if (authResult.error) 
        {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const body = await request.json();
        const { projectId, table, pkColumn, pkValue, column, newValue, oldValue } = body || {};

        if (!projectId || !table || !column || (typeof pkValue === 'undefined')) {
            return NextResponse.json({ error: 'Missing required fields: projectId, table, pkValue, column' }, { status: 400 });
        }

        const projRes = await pool.query(
            'SELECT connection_string FROM user_projects WHERE id = $1 AND user_id = $2 AND is_active = true',
            [projectId, authResult.user.id]
        );

        if (projRes.rows.length === 0) {
            return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
        }

        const connectionString = projRes.rows[0].connection_string;

        // Validate schema
        let schema;
        try {
            schema = await getDatabaseSchema(connectionString);
        } catch (e) {
            console.error('Failed to load schema for project DB:', e);
            return NextResponse.json({ error: 'Failed to load project database schema' }, { status: 500 });
        }

        const tableMeta = schema.find(t => t.name === table || t.name === String(table));
        if (!tableMeta) {
            return NextResponse.json({ error: 'Table not found in project database' }, { status: 400 });
        }

        // Determine pk column metadata
        let pkMeta = null;
        if (pkColumn) pkMeta = tableMeta.columns.find(c => c.name === pkColumn);
        if (!pkMeta) pkMeta = tableMeta.columns.find(c => c.constraint === 'PRIMARY KEY');
        if (!pkMeta) {
            return NextResponse.json({ error: 'Primary key column could not be determined' }, { status: 400 });
        }

        const colMeta = tableMeta.columns.find(c => c.name === column);
        if (!colMeta) {
            return NextResponse.json({ error: 'Column not found in table metadata' }, { status: 400 });
        }

        // Coerce new value according to column type
        let coercedNew;
        let coercedPk;
        try {
            coercedNew = handledatatype(newValue, colMeta.type || colMeta.data_type, colMeta.nullable);
            coercedPk = handledatatype(pkValue, pkMeta.type || pkMeta.data_type, pkMeta.nullable);
        } catch (e) {
            return NextResponse.json({ error: `Validation failed for value: ${e.message}` }, { status: 400 });
        }
        const safeTable = escapeIdentifier(table);
        const safeCol = escapeIdentifier(column);
        const safePk = escapeIdentifier(pkMeta.name);

        // Building queries
        let queryText;
        let params;
        if (typeof oldValue !== 'undefined') {
            queryText = `UPDATE ${safeTable} SET ${safeCol} = $1 WHERE ${safePk} = $2 AND (${safeCol} IS NOT DISTINCT FROM $3) RETURNING *`;
            params = [coercedNew, coercedPk, oldValue];
        } else {
            queryText = `UPDATE ${safeTable} SET ${safeCol} = $1 WHERE ${safePk} = $2 RETURNING *`;
            params = [coercedNew, coercedPk];
        }

        let updateRes;
        try {
            updateRes = await executeQuery(connectionString, queryText, params);
        } catch (err) {
            console.error('User DB update error:', err);
            return NextResponse.json({ error: 'Failed to execute update on project database', detail: err.message }, { status: 400 });
        }

        if (!updateRes || updateRes.rows.length === 0) {
            return NextResponse.json({ error: 'Update failed (row not found or value mismatch)' }, { status: 409 });
        }

        const updatedRow = updateRes.rows[0];

        try {
            await pool.query(
                'INSERT INTO query_history (project_id, user_id, query_text, query_type, success) VALUES ($1,$2,$3,$4,$5)',
                [projectId, authResult.user.id, queryText, 'UPDATE', true]
            );
        } catch (logErr) {
            console.error('Failed to log update:', logErr);
        }

        return NextResponse.json({ message: 'Update successful', row: updatedRow });

    } catch (error) {
        console.error('Update route error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}