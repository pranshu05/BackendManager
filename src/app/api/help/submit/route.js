// API route to submit a new support ticket
import { NextResponse } from 'next/server';
import { createTicket } from '@/lib/help/service';

export async function POST(request) {
    try {
        const body = await request.json();
        const ticket = await createTicket(body);
        return NextResponse.json({ ok: true, ticket });
    } catch (error) {
        console.error('Error creating ticket:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Failed to create ticket' },
            { status: 400 }
        );
    }
}