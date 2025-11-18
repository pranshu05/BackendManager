import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    
    // Get NextAuth session token
    let token = null;
    try {
        token = await getToken({ 
            req: request, 
            secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
        });
    } catch (error) {
        console.error("Token retrieval error:", error);
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/api/auth', '/reset'];

    // Handle root path separately
    if (pathname === '/') {
        if (token) {
            // Logged-in users redirect to dashboard
            return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
            // Non-logged-in users can access root
            return NextResponse.next();
        }
    }

    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Check for session on protected routes
    // Page protection
    if (!token && !pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/',
        '/dashboard/:path*',
        '/api/projects/:path*',
        '/api/ai/:path*',
        '/profile/:path*',
    ],
};