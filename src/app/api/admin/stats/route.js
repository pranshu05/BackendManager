import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withAdminAuth } from '@/lib/api-helpers';

// GET: Fetch ticket statistics for admin dashboard
export const GET = withAdminAuth(async () => {
    try {
        // Get status counts
        const statusResult = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM support_tickets
            GROUP BY status
        `);

        // Get priority counts
        const priorityResult = await pool.query(`
            SELECT 
                priority,
                COUNT(*) as count
            FROM support_tickets
            GROUP BY priority
            ORDER BY 
                CASE priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END
        `);

        // Get category counts
        const categoryResult = await pool.query(`
            SELECT 
                category,
                COUNT(*) as count
            FROM support_tickets
            GROUP BY category
            ORDER BY count DESC
        `);

        // Get average resolution time
        const resolutionResult = await pool.query(`
            SELECT 
                AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
            FROM support_tickets
            WHERE status = 'solved' AND resolved_at IS NOT NULL
        `);

        // Get tickets created in last 7 days
        const recentResult = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM support_tickets
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        // Get total counts
        const totalResult = await pool.query(`
            SELECT 
                COUNT(*) as total_tickets,
                COUNT(*) FILTER (WHERE status = 'active') as active_tickets,
                COUNT(*) FILTER (WHERE status = 'solved') as solved_tickets,
                COUNT(*) FILTER (WHERE priority IN ('high', 'urgent')) as high_priority_tickets
            FROM support_tickets
        `);

        // Get top users with most tickets
        const topUsersResult = await pool.query(`
            SELECT 
                u.email,
                u.name,
                COUNT(st.id) as ticket_count
            FROM users u
            JOIN support_tickets st ON u.id = st.user_id
            GROUP BY u.email, u.name
            ORDER BY ticket_count DESC
            LIMIT 10
        `);

        const stats = {
            statusBreakdown: statusResult.rows.reduce((acc, row) => {
                acc[row.status] = parseInt(row.count);
                return acc;
            }, {}),
            priorityBreakdown: priorityResult.rows.reduce((acc, row) => {
                acc[row.priority] = parseInt(row.count);
                return acc;
            }, {}),
            categoryBreakdown: categoryResult.rows.reduce((acc, row) => {
                acc[row.category] = parseInt(row.count);
                return acc;
            }, {}),
            averageResolutionHours: parseFloat(resolutionResult.rows[0]?.avg_hours || 0).toFixed(2),
            recentTickets: recentResult.rows,
            totals: totalResult.rows[0],
            topUsers: topUsersResult.rows
        };

        return NextResponse.json({ stats });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
});