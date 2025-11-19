import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAdminAuth } from '@/lib/api-helpers';

// GET: Fetch all support tickets for admin
export const GET = withAdminAuth(async (request) => {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = `
            SELECT 
                st.id,
                st.user_id,
                st.subject,
                st.message,
                st.category,
                st.status,
                st.priority,
                st.created_at,
                st.updated_at,
                st.resolved_at,
                st.admin_notes,
                u.email as user_email,
                u.name as user_name,
                up.phone_number as user_phone
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            query += ` AND st.status = $${paramCount}`;
            params.push(status);
        }

        if (priority) {
            paramCount++;
            query += ` AND st.priority = $${paramCount}`;
            params.push(priority);
        }

        if (category) {
            paramCount++;
            query += ` AND st.category = $${paramCount}`;
            params.push(category);
        }

        query += ` ORDER BY 
            CASE st.priority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END,
            st.created_at DESC
        `;

        query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM support_tickets st
            WHERE 1=1
        `;
        const countParams = [];
        let countParamIdx = 0;

        if (status) {
            countQuery += ` AND st.status = $${++countParamIdx}`;
            countParams.push(status);
        }
        if (priority) {
            countQuery += ` AND st.priority = $${++countParamIdx}`;
            countParams.push(priority);
        }
        if (category) {
            countQuery += ` AND st.category = $${++countParamIdx}`;
            countParams.push(category);
        }

        const countResult = await pool.query(countQuery, countParams);

        return NextResponse.json({
            tickets: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit,
            offset
        });
    } catch (error) {
        console.error('Error fetching admin tickets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tickets' },
            { status: 500 }
        );
    }
});