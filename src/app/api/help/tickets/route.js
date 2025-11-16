// API route to get all support tickets
import { NextResponse } from 'next/server';
import { listTickets } from '@/lib/help/service';

export async function GET() {
    try {
        const tickets = await listTickets();
        return NextResponse.json({ ok: true, tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch tickets' },
            { status: 500 }
        );
    }
}

