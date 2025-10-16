import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;
    const sessionToken = request.cookies.get('dbuddy-session')?.value;

    // Public routes that don't require authentication
    const publicRoutes = ['/api/auth/login', '/api/auth/register'];

    // Handle root path separately
    if (pathname === '/') {
        if (sessionToken) {
            // Logged-in users can access root
            return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
            // Non-logged-in users can also access root (or redirect to login if you prefer)
            return NextResponse.next();
        }
    }

    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Check for session cookie on protected routes

    // API route protection
    if (!sessionToken && pathname.startsWith('/api/')) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    // Page protection
    if (!sessionToken && !pathname.startsWith('/api/')) {
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
        '/api/auth/logout',
        '/api/auth/me',
    ],
};