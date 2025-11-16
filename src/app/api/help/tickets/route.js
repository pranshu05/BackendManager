import { NextResponse } from 'next/server';
import { getAllTickets, getTicketStats } from '@/lib/help/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        
        const tickets = await getAllTickets(search);
        const stats = await getTicketStats();
        
        return NextResponse.json({
            tickets,
            stats: {
                total: parseInt(stats.total) || 0,
                resolved: parseInt(stats.resolved) || 0,
                active: parseInt(stats.active) || 0,
                open: parseInt(stats.open) || 0,
                pending: parseInt(stats.pending) || 0
            }
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tickets' },
            { status: 500 }
        );
    }
}

