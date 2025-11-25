import { NextResponse } from 'next/server';
import { withProjectAuth } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';
import { parseDbError } from '@/lib/ai';
import { getDatabaseSchema } from '@/lib/db';

export const POST = withRateLimit(withProjectAuth(async (request, _context, user, project) => {
    try {
        const body = await request.json();
        const { error, sql } = body;

        if (!error) {
            return NextResponse.json(
                { error: 'Missing "error" field in request body' },
                { status: 400 }
            );
        }
        let schema = null;
        try {
            schema = await getDatabaseSchema(project.connection_string);
        } catch (schemaError) {
            console.warn('Could not fetch schema for error parsing:', schemaError.message);
        }
        const parsedError = await parseDbError(error, sql, schema);
        return NextResponse.json({
            success: true, parsed: parsedError
        });

    } catch (err) {
        console.error('Error in parse-error API:', err);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to parse database error',
                details: err.message
            },
            { status: 500 }
        );
    }
}),
    { isAI: true }
);
