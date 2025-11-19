import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAdminAuth } from '@/lib/api-helpers';

// GET: Fetch a specific support ticket for admin
export const GET = withAdminAuth(async (_request, context) => {
    try {
        const { ticketId } = await context.params;

        const result = await pool.query(
            `SELECT 
                st.*,
                u.email as user_email,
                u.name as user_name,
                up.phone_number as user_phone,
                up.organization_name,
                up.organization_type
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE st.id = $1`,
            [ticketId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Support ticket not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ ticket: result.rows[0] });
    } catch (error) {
        console.error('Error fetching admin ticket:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ticket' },
            { status: 500 }
        );
    }
});

// PUT: Update ticket status and admin notes
export const PUT = withAdminAuth(async (request, context) => {
    try {
        const { ticketId } = await context.params;
        const body = await request.json();
        const { status, admin_notes, priority } = body;

        // Validate status
        const validStatuses = ['active', 'inactive', 'solved', 'in_progress'];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return NextResponse.json(
                { error: 'Invalid priority' },
                { status: 400 }
            );
        }

        // Build update query dynamically
        const updates = [];
        const params = [ticketId];
        let paramCount = 1;

        if (status !== undefined) {
            paramCount++;
            updates.push(`status = $${paramCount}`);
            params.push(status);

            // If marking as solved, set resolved_at
            if (status === 'solved') {
                paramCount++;
                updates.push(`resolved_at = $${paramCount}`);
                params.push(new Date());
            }
        }

        if (admin_notes !== undefined) {
            paramCount++;
            updates.push(`admin_notes = $${paramCount}`);
            params.push(admin_notes);
        }

        if (priority !== undefined) {
            paramCount++;
            updates.push(`priority = $${paramCount}`);
            params.push(priority);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'No fields to update' },
                { status: 400 }
            );
        }

        // Always update updated_at
        paramCount++;
        updates.push(`updated_at = $${paramCount}`);
        params.push(new Date());

        const query = `
            UPDATE support_tickets 
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Ticket updated successfully',
            ticket: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        return NextResponse.json(
            { error: 'Failed to update ticket' },
            { status: 500 }
        );
    }
});

// DELETE: Admin can delete any ticket
export const DELETE = withAdminAuth(async (_request, context) => {
    try {
        const { ticketId } = await context.params;

        const result = await pool.query(
            `DELETE FROM support_tickets WHERE id = $1 RETURNING *`,
            [ticketId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        return NextResponse.json(
            { error: 'Failed to delete ticket' },
            { status: 500 }
        );
    }
});