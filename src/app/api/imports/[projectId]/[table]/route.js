import { NextResponse } from 'next/server';
import { pool, getPool, createPool } from '@/lib/db';

async function ensurePoolForProject(projectId) {
    const key = `project_${projectId}`;
    let p = getPool(key);
    if (p) return p;

    // Fetch connection string from main DB
    const res = await pool.query('SELECT connection_string FROM user_projects WHERE id = $1 AND is_active = true', [projectId]);
    if (res.rows.length === 0) throw new Error('Project not found');

    const connectionString = res.rows[0].connection_string;
    if (!connectionString) throw new Error('No connection string available for project');

    p = createPool(key, connectionString);
    return p;
}

async function getAllowedColumns(p, table) {
    const q = `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`;
    const r = await p.query(q, [table]);
    return r.rows.map(rw => rw.column_name);
}

export async function GET(request, { params }) {
    try {
        const { projectId, table } = params;
        const p = await ensurePoolForProject(projectId);

        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (id) {
            const result = await p.query(`SELECT * FROM public."${table}" WHERE id = $1 LIMIT 1`, [id]);
            return NextResponse.json({ rows: result.rows });
        }

        // default list
        const result = await p.query(`SELECT * FROM public."${table}" LIMIT 200`);
        return NextResponse.json({ rows: result.rows });
    } catch (err) {
        console.error('Import GET error', err);
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const { projectId, table } = params;
        const p = await ensurePoolForProject(projectId);

        const body = await request.json();
        const allowed = await getAllowedColumns(p, table);
        const cols = Object.keys(body).filter(k => allowed.includes(k));

        if (cols.length === 0) return NextResponse.json({ error: 'No valid columns provided' }, { status: 400 });

        const values = cols.map((c, i) => `$${i + 1}`);
        const paramsArr = cols.map(c => body[c]);

        const insertQuery = `INSERT INTO public."${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${values.join(',')}) RETURNING *`;
        const result = await p.query(insertQuery, paramsArr);
        return NextResponse.json({ row: result.rows[0] });
    } catch (err) {
        console.error('Import POST error', err);
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { projectId, table } = params;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

        const p = await ensurePoolForProject(projectId);
        const body = await request.json();
        const allowed = await getAllowedColumns(p, table);
        const cols = Object.keys(body).filter(k => allowed.includes(k));

        if (cols.length === 0) return NextResponse.json({ error: 'No valid columns provided' }, { status: 400 });

        const setClause = cols.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
        const paramsArr = cols.map(c => body[c]);
        paramsArr.push(id);

        const updateQuery = `UPDATE public."${table}" SET ${setClause} WHERE id = $${paramsArr.length} RETURNING *`;
        const result = await p.query(updateQuery, paramsArr);
        return NextResponse.json({ row: result.rows[0] });
    } catch (err) {
        console.error('Import PUT error', err);
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { projectId, table } = params;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

        const p = await ensurePoolForProject(projectId);
        const result = await p.query(`DELETE FROM public."${table}" WHERE id = $1 RETURNING *`, [id]);
        return NextResponse.json({ row: result.rows[0] });
    } catch (err) {
        console.error('Import DELETE error', err);
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
    }
}
