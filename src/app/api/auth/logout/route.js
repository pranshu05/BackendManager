import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionCookie, clearSessionCookie } from '@/lib/auth';
import { withAuth } from '@/lib/api-helpers';

export const POST = withAuth(async (_request, _context, user) => {
    const sessionToken = getSessionCookie();

    if (sessionToken) {
        // Remove session from database
        await pool.query(
            'DELETE FROM user_sessions WHERE user_id = $1',
            [user.id]
        );
    }

    // Clear cookie
    clearSessionCookie();

    return NextResponse.json({ message: 'Logout successful' });
});