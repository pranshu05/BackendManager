import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

// This API loads query history for a project with filters like status, type, date range, and favorites
export const GET = withProjectAuth(async (request, _context, user, project) => {
  const { searchParams } = new URL(request.url);

  // Pagination
  const limit = Number.parseInt(searchParams.get('limit')) || 50;
  const offset = Number.parseInt(searchParams.get('offset')) || 0;

  // Filters from frontend
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const dateRange = searchParams.get('dateRange');
  const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

  // Base filters: must match this project + user
  let whereClauses = ['project_id = $1', 'user_id = $2'];
  let queryParams = [project.id, user.id];
  let paramIndex = 3;

  // Success/error filter
  if (status === 'success') {
    whereClauses.push('success = true');
  } else if (status === 'error') {
    whereClauses.push('success = false');
  }

  // Query type filter
  if (type && type !== 'all') {
    whereClauses.push(`query_type = $${paramIndex++}`);
    queryParams.push(type);
  }

  // Date range filter
  if (dateRange === 'today') {
    whereClauses.push("created_at >= CAST(NOW() AS DATE)");
  } else if (dateRange === 'last7days') {
    whereClauses.push("created_at >= NOW() - interval '7 days'");
  } else if (dateRange === 'last30days') {
    whereClauses.push("created_at >= NOW() - interval '30 days'");
  }

  // Favorite filter
  if (favoritesOnly) {
    whereClauses.push('is_favorite = true');
  }

  // Final WHERE clause
  const whereString = whereClauses.join(' AND ');

  // Load history rows with all filters
  const dataQueryParams = [...queryParams, limit, offset];
  const dataQueryString = `
    SELECT 
      id,
      query_text,
      natural_language_input,
      query_type,
      execution_time_ms,
      success,
      error_message,
      created_at,
      is_favorite
    FROM query_history 
    WHERE ${whereString}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  const result = await pool.query(dataQueryString, dataQueryParams);

  // Count total rows for pagination
  const countQueryString = `
    SELECT COUNT(*) as total
    FROM query_history 
    WHERE ${whereString}
  `;
  const countResult = await pool.query(countQueryString, queryParams);

  // Send filtered data back to frontend
  return NextResponse.json({
    history: result.rows,
    total: Number.parseInt(countResult.rows[0].total),
    limit,
    offset,
    status: status || 'all',
    type: type || 'all',
    dateRange: dateRange || 'all',
    favoritesOnly
  });
});
