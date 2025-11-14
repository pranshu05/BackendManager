import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

// This API updates one history record (title or favorite status)
export const PUT = withProjectAuth(async (request, context, user, project) => {
  try {
    const { queryId } = context.params; // Query ID from the URL

    // Read updated title or favorite flag from frontend
    const { naturalLanguageInput, is_favorite } = await request.json();

    // At least one field must be provided
    if (typeof naturalLanguageInput !== 'string' && typeof is_favorite !== 'boolean') {
      return NextResponse.json(
        { error: 'A new title or favorite status is required' },
        { status: 400 }
      );
    }

    // Build SQL update fields only for provided values
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;

    // Update the title if provided
    if (typeof naturalLanguageInput === 'string') {
      updateFields.push(`natural_language_input = $${paramIndex++}`);
      queryParams.push(naturalLanguageInput.trim());
    }

    // Update favorite flag if provided
    if (typeof is_favorite === 'boolean') {
      updateFields.push(`is_favorite = $${paramIndex++}`);
      queryParams.push(is_favorite);
    }

    // Add identifiers (queryId + projectId + userId)
    queryParams.push(queryId, project.id, user.id);
    const whereIndex = paramIndex;

    // Update the record in the database
    const result = await pool.query(
      `
      UPDATE query_history
      SET ${updateFields.join(', ')}
      WHERE id = $${whereIndex}::uuid
        AND project_id = $${whereIndex + 1}
        AND user_id = $${whereIndex + 2}
      RETURNING id, natural_language_input, is_favorite, query_text, success, created_at, execution_time_ms, error_message, query_type
      `,
      queryParams
    );

    // No record found or user does not own it
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item not found or not allowed to edit' },
        { status: 404 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Query item updated successfully',
      updatedItem: result.rows[0]
    });

  } catch (error) {
    console.error('Update query item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
