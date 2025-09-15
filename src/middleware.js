import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/'
    ];

    // Check if the route is public
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Check for session cookie on protected routes
    const sessionToken = request.cookies.get('dbuddy-session')?.value;

    if (!sessionToken && pathname.startsWith('/api/')) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    if (!sessionToken && !pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/projects/:path*',
        '/api/auth/logout',
        '/api/auth/me',
    ]
};