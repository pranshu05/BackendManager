import { NextResponse } from 'next/server';
import { getTicketById, updateTicket } from '@/lib/help/db';

export async function GET(request, { params }) {
    try {
        const id = parseInt(params.id);
        
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'Invalid ticket ID' },
                { status: 400 }
            );
        }
        
        const ticket = await getTicketById(id);
        
        if (!ticket) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404 }
            );
        }
        
        return NextResponse.json({ ticket });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ticket' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'Invalid ticket ID' },
                { status: 400 }
            );
        }
        
        const updates = {};
        if (body.status) updates.status = body.status;
        if (body.priority) updates.priority = body.priority;
        
        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: 'No valid updates provided' },
                { status: 400 }
            );
        }
        
        const ticket = await updateTicket(id, updates);
        
        return NextResponse.json({
            message: 'Ticket updated successfully',
            ticket
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        return NextResponse.json(
            { error: 'Failed to update ticket' },
            { status: 500 }
        );
    }
}

