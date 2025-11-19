import { NextResponse } from 'next/server';
import { withAuth, isAdmin } from '@/lib/api-helpers';

// GET: Check if current user is admin
export const GET = withAuth(async (_request, _context, user) => {
    return NextResponse.json({
        isAdmin: isAdmin(user.email),
        email: user.email
    });
});