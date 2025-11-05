import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionCookie, clearSessionCookie, requireAuth } from '@/lib/auth';

export async function POST(request) {
    try {
        const sessionToken = getSessionCookie();
        const authResult = await requireAuth(request);

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        if (sessionToken) {
            // Remove session from database
            await pool.query(
                'DELETE FROM user_sessions WHERE user_id = $1',
                [authResult.user.id]
            );
        }

        // Clear cookie
        clearSessionCookie();

        return NextResponse.json({ message: 'Logout successful' });

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}