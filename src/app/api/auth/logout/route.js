import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Logout endpoint that clears NextAuth session
// Works even if session is expired or invalid
export async function POST() {
    try {
        // Clear NextAuth session cookie
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