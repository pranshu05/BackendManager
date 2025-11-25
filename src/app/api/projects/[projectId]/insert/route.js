import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseSchema } from '@/lib/db';
import { withProjectAuth, logQueryHistory, detectQueryType, createTimer } from '@/lib/api-helpers';
import { DateTime } from 'luxon';

function normalizeDate(value) {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date) {
        const dt = DateTime.fromJSDate(value, { zone: 'utc' });
        if (dt.isValid) return dt;
    }
    let str = String(value).trim();
    if (!str) return null;
    const colonDateMatch = /^\s*(\d{1,2}):(\d{1,2}):(\d{4})\s*$/.exec(str);
    if (colonDateMatch) {
        const a = Number(colonDateMatch[1]);
        const b = Number(colonDateMatch[2]);
        const y = Number(colonDateMatch[3]);
        let day, month;
        if (a > 12) {
            day = a;
            month = b;
        }
        else if (b > 12) {
            day = b;
            month = a;
        }
        else {
            day = a;
            month = b;
        }
        str = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${y}`;
    }

    let dt = DateTime.fromISO(str, { setZone: true });
    if (dt.isValid) return dt;
    const formats = [
        'dd/MM/yyyy HH:mm:ss',
        'dd/MM/yyyy',
        'dd-MM-yyyy',
        'MM-dd-yyyy',
        'MMM dd yyyy',
        'dd MMM yyyy',
        "yyyy/MM/dd HH:mm",
        'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd',
        'MM/dd/yyyy',
        "MM/dd/yyyy HH:mm:ss",
    ];

    for (const fmt of formats) {
        dt = DateTime.fromFormat(str, fmt, { zone: 'utc' });
        if (dt.isValid) return dt;
    }

    const js = new Date(str);
    if (!Number.isNaN(js.getTime())) {
        const dt2 = DateTime.fromJSDate(js, { zone: 'utc' });
        if (dt2.isValid) return dt2;
    }
    throw new Error(`Invalid date format: ${value}`);
}

export const POST = withProjectAuth(async (request, _context, user, project) => {
    const timer = createTimer();
    try {
        const body = await request.json();
        const table = body.table;
        const providedObj = body.insertData;

        if (!project || !project.connection_string) {
            return NextResponse.json({ error: 'Project information is missing' }, { status: 400 });
        }

        if (!table || !providedObj || Object.keys(providedObj).length === 0) {
            return NextResponse.json({ error: 'Missing required fields: table, insert data' }, { status: 400 });
        }

        const connectionString = project.connection_string;
        const schema = await getDatabaseSchema(connectionString);
        const tableMeta = (schema || []).find((t) => String(t.name) === String(table));
        if (!tableMeta) return NextResponse.json({ error: `Table metadata for '${table}' not found` }, { status: 404 });

        const columns = tableMeta.columns || [];


        const validColumnNames = new Set(columns.map((c) => c.name));
        const providedcols = Object.keys(providedObj).filter((k) => validColumnNames.has(k));
        if (providedcols.length === 0) return NextResponse.json({ error: 'No valid columns provided' }, { status: 400 });

        const reqcols = columns.filter((c) => c.nullable === false && (c.default === null || c.default === undefined));
        const missingRequired = reqcols.map((c) => c.name).filter((n) => !providedcols.includes(n));
        console.log('Missing required columns:', missingRequired);
        if (missingRequired.length > 0) return NextResponse.json({ error: 'Missing required columns', missing: missingRequired }, { status: 400 });

        const colsEscaped = providedcols.map((k) => `"${k}"`);
        const params = [];
        const placeholderCasts = [];
        const parseErrors = [];

        function isDateType(type) {
            if (!type) return false;
            const t = String(type).toLowerCase();
            return t.includes('timestamp') || t.includes('date') || t.includes('time');
        }

        for (const k of providedcols) {
            const colMeta = columns.find((c) => c.name === k);
            const raw = providedObj[k];
            if (isDateType(colMeta.type)) {
                try {
                    const dt = normalizeDate(raw);
                    if (dt === null) {
                        params.push(null);
                        placeholderCasts.push(`$${params.length}`);
                        continue;
                    }
                    const lt = String(colMeta.type).toLowerCase();
                    if (lt.includes('with time zone') || lt.includes('timestamptz')) {
                        params.push(dt.toUTC().toISO());
                        placeholderCasts.push(`$${params.length}::timestamptz`);
                    } else if (lt.includes('timestamp')) {
                        params.push(dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'));
                        placeholderCasts.push(`$${params.length}::timestamp`);
                    } else if (lt.includes('date')) {
                        params.push(dt.toISODate());
                        placeholderCasts.push(`$${params.length}::date`);
                    } else if (lt.includes('time')) {
                        params.push(dt.toFormat('HH:mm:ss'));
                        placeholderCasts.push(`$${params.length}::time`);
                    } else {
                        params.push(dt.toISO());
                        placeholderCasts.push(`$${params.length}`);
                    }
                } catch (err) {
                    parseErrors.push({ column: k, value: raw, reason: err.message });
                }
            } else {
                params.push(providedObj[k]);
                placeholderCasts.push(`$${params.length}`);
            }
        }

        if (parseErrors.length) return NextResponse.json({ error: 'Invalid date formats', details: parseErrors }, { status: 400 });

        const queryText = `INSERT INTO public."${table}" (${colsEscaped.join(', ')}) VALUES (${placeholderCasts.join(', ')}) RETURNING *`;
        try {
            const insertres = await executeQuery(connectionString, queryText, params);
            const executionTime = timer.elapsed();

            // Log successful insert
            await logQueryHistory({
                projectId: project.id,
                userId: user.id,
                queryText,
                queryType: detectQueryType(queryText),
                executionTime,
                success: true
            });

            return NextResponse.json({ table, queryText, params, providedColumns: providedcols, row: insertres.rows?.[0] ?? null });
        } catch (err) {
            const executionTime = timer.elapsed();
            console.error('Insert execution error', err);

            // Log failed insert
            await logQueryHistory({
                projectId: project.id,
                userId: user.id,
                queryText,
                queryType: detectQueryType(queryText),
                executionTime,
                success: false,
                errorMessage: err.message
            });

            return NextResponse.json({ error: 'Failed to execute insert', detail: err.message }, { status: 400 });
        }
    } catch (err) {
        console.error('Insert route error', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
