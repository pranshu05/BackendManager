import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// method is PUT (update the user info)
export async function PUT(request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const {
      phone_number = null,
      address = null,
      city = null,
      pincode = null,
      nationality = null,
      birth_date = null,
      organization_name = null,
      organization_type = null,
      joining_date = null
    } = body || {};

    // checks date formate
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (birth_date && !dateRegex.test(birth_date)) {
      return NextResponse.json({ error: 'birth_date must be in YYYY-MM-DD format' }, { status: 400 });
    }
    if (joining_date && !dateRegex.test(joining_date)) {
      return NextResponse.json({ error: 'joining_date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    // upsert using on conflict (on user_id). remember what COALESCE do !
    const result = await pool.query(
      `INSERT INTO user_profiles (
          user_id, phone_number, address, city, pincode, nationality, birth_date,
          organization_name, organization_type, joining_date, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number),
          address = COALESCE(EXCLUDED.address, user_profiles.address),
          city = COALESCE(EXCLUDED.city, user_profiles.city),
          pincode = COALESCE(EXCLUDED.pincode, user_profiles.pincode),
          nationality = COALESCE(EXCLUDED.nationality, user_profiles.nationality),
          birth_date = COALESCE(EXCLUDED.birth_date, user_profiles.birth_date),
          organization_name = COALESCE(EXCLUDED.organization_name, user_profiles.organization_name),
          organization_type = COALESCE(EXCLUDED.organization_type, user_profiles.organization_type),
          joining_date = COALESCE(EXCLUDED.joining_date, user_profiles.joining_date),
          updated_at = NOW()
        RETURNING id, user_id, phone_number, address, city, pincode, nationality, birth_date,
                  organization_name, organization_type, joining_date, created_at, updated_at
      `,
      [
        authResult.user.id,
        phone_number,
        address,
        city,
        pincode,
        nationality,
        birth_date,
        organization_name,
        organization_type,
        joining_date
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Update user_profiles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
