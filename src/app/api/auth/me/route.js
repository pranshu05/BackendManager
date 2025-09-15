import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
    try {
        const authResult = await requireAuth();

        if (authResult.error) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        return NextResponse.json({ user: authResult.user });

    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}