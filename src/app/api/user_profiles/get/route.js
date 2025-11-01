import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// method is GEt (returns null if no profile  found)
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const result = await pool.query(
      `SELECT id, user_id, phone_number, address, city, pincode, nationality, birth_date,
              organization_name, organization_type, joining_date, created_at, updated_at
       FROM user_profiles
       WHERE user_id = $1`,
      [authResult.user.id]
    );

    return NextResponse.json({ profile: result.rows[0] || null });
  } catch (error) {
    console.error('Get user_profiles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}