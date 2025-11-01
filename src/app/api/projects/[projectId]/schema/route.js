import { NextResponse } from 'next/server';
import { getDatabaseSchema } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

// Get database schema
export const GET = withProjectAuth(async (_request, _context, _user, project) => {
    const schema = await getDatabaseSchema(project.connection_string);
    return NextResponse.json({ schema });
});