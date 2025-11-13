import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

// This file handles PUT requests to update a single history item
// The URL is: /api/projects/[projectId]/history/[queryId]

export const PUT = withProjectAuth(async (request, context, user, project) => {
	try {
		const { queryId } = context.params; // Gets the [queryId] from the URL
		const { naturalLanguageInput } = await request.json(); // Gets the new title from the frontend

		if (typeof naturalLanguageInput !== 'string') {
			return NextResponse.json(
				{ error: 'New title (naturalLanguageInput) must be a string' },
				{ status: 400 }
			);
		}

		// Run the SQL UPDATE query on your Neon database
		const result = await pool.query(`
			UPDATE query_history
			SET natural_language_input = $1
			WHERE id = $2::uuid  -- <-- THIS IS THE FIX
			  AND project_id = $3
			  AND user_id = $4
			RETURNING id, natural_language_input
		`, [
			naturalLanguageInput.trim(),
			queryId,
			project.id,
			user.id
		]);

		if (result.rows.length === 0) {
			// This means the query item was not found or didn't belong to the user
			return NextResponse.json(
				{ error: 'Query history item not found or you do not have permission to edit it' },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Query title updated successfully',
			updatedItem: result.rows[0]
		});

	} catch (error) {
		console.error('Update query title error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
});