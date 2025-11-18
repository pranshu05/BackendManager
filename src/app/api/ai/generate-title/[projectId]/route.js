import { NextResponse } from 'next/server';
import { getDatabaseSchema } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';
import { withRateLimit } from '@/lib/rate-limitter';
import { generateTitleFromSql } from '@/lib/ai';

export const POST = withRateLimit(
    withProjectAuth(async (request, _context, _user, project) => {
        try {
            const { sql } = await request.json();

            if (!sql || typeof sql !== 'string') {
                return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
            }

            // Load database schema so the AI can understand table and column context
            const schema = await getDatabaseSchema(project.connection_string);

            if (schema.length === 0) {
                return NextResponse.json({ error: 'Cannot generate title, database schema is empty' }, { status: 400 });
            }

            // Generate a natural language title for the SQL query
            const title = await generateTitleFromSql(sql, schema);

            return NextResponse.json({
                success: true,
                naturalLanguageTitle: title
            });

        } catch (error) {
            return NextResponse.json(
                { error: 'Failed to generate title', details: error.message },
                { status: 500 }
            );
        }
    }),
    { isAI: true }
);
