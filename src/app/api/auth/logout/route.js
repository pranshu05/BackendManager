import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSessionCookie, clearSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

// Logout endpoint that clears both legacy and NextAuth sessions
// Works even if session is expired or invalid
export async function POST() {
    try {
        const sessionToken = await getSessionCookie();

        if (sessionToken) {
            // Try to remove session from database if it exists
            // Don't fail if it doesn't - just clear the cookies
            try {
                await pool.query(
                    'DELETE FROM user_sessions WHERE session_token = $1',
                    [sessionToken]
                );
            } catch (error) {
                console.error('Error deleting session from DB:', error);
                // Continue anyway - we still want to clear the cookies
            }
        }

        // Clear legacy session cookie
        await clearSessionCookie();

        // Also clear NextAuth session cookie
        const cookieStore = await cookies();
        
        // Clear the next-auth.session-token cookie (development/HTTP)
        cookieStore.set('next-auth.session-token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
            expires: new Date(0)
        });
        
        // Clear the __Secure prefix version (production/HTTPS)
        cookieStore.set('__Secure-next-auth.session-token', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
            expires: new Date(0)
        });

        return NextResponse.json({ 
            success: true,
            message: 'Logout successful',
            redirect: '/' 
        });
    } catch (error) {
        console.error('Logout error:', error);
        
        // Even on error, try to clear cookies
        try {
            await clearSessionCookie();
            const cookieStore = await cookies();
            cookieStore.set('next-auth.session-token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 0,
                expires: new Date(0)
            });
        } catch (e) {
            console.error('Failed to clear cookies:', e);
        }
        
        return NextResponse.json({ 
            success: false,
            error: 'Logout failed',
            redirect: '/' 
        }, { status: 500 });
    }
}