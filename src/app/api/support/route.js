import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAuth } from '@/lib/api-helpers';

// GET: Fetch user's support tickets
export const GET = withAuth(async (_request, _context, user) => {
    try {
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
            WHERE user_id = $1
            ORDER BY created_at DESC`,
            [user.id]
        );

        return NextResponse.json({ 
            tickets: result.rows,
            count: result.rows.length 
        });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch support tickets' },
            { status: 500 }
        );
    }
});

// POST: Create a new support ticket
export const POST = withAuth(async (request, _context, user) => {
    try {
        const body = await request.json();
        const { subject, message, category = 'general', priority = 'medium' } = body;

        // Validation
        if (!subject || !subject.trim()) {
            return NextResponse.json(
                { error: 'Subject is required' },
                { status: 400 }
            );
        }

        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        if (subject.length > 255) {
            return NextResponse.json(
                { error: 'Subject must be less than 255 characters' },
                { status: 400 }
            );
        }

        // Valid categories
        const validCategories = ['general', 'technical', 'billing', 'feature_request', 'bug_report', 'other'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: 'Invalid category' },
                { status: 400 }
            );
        }

        // Valid priorities
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return NextResponse.json(
                { error: 'Invalid priority' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `INSERT INTO support_tickets (
                user_id,
                subject,
                message,
                category,
                priority,
                status,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
            RETURNING *`,
            [user.id, subject.trim(), message.trim(), category, priority]
        );

        return NextResponse.json(
            {
                message: 'Support ticket created successfully',
                ticket: result.rows[0]
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return NextResponse.json(
            { error: 'Failed to create support ticket' },
            { status: 500 }
        );
    }
});