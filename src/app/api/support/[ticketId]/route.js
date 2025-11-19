import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';

// GET: Fetch a specific support ticket
export const GET = withAuth(async (_request, context, user) => {
    try {
        const { ticketId } = await context.params;

        const result = await pool.query(
            `SELECT 
                id,
                subject,
                message,
                category,
                status,
                priority,
                created_at,
                updated_at,
                resolved_at,
                admin_notes
            FROM support_tickets
            WHERE id = $1 AND user_id = $2`,
            [ticketId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Support ticket not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ ticket: result.rows[0] });
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        return NextResponse.json(
            { error: 'Failed to fetch support ticket' },
            { status: 500 }
        );
    }
});

// DELETE: Delete a support ticket (only if status is 'active' or 'inactive')
export const DELETE = withAuth(async (_request, context, user) => {
    try {
        const { ticketId } = await context.params;

        // Check if ticket exists and belongs to user
        const checkResult = await pool.query(
            `SELECT status FROM support_tickets WHERE id = $1 AND user_id = $2`,
            [ticketId, user.id]
        );

        if (checkResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Support ticket not found' },
                { status: 404 }
            );
        }

        // Allow deletion only if not solved
        if (checkResult.rows[0].status === 'solved') {
            return NextResponse.json(
                { error: 'Cannot delete solved tickets' },
                { status: 403 }
            );
        }

        await pool.query(
            `DELETE FROM support_tickets WHERE id = $1 AND user_id = $2`,
            [ticketId, user.id]
        );

        return NextResponse.json({
            message: 'Support ticket deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        return NextResponse.json(
            { error: 'Failed to delete support ticket' },
            { status: 500 }
        );
    }
});